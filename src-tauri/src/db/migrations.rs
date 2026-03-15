use rusqlite::{params, Connection};

const CURRENT_SCHEMA_VERSION: i64 = 3;

pub fn run(connection: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    let current_version: i64 =
        connection.query_row("PRAGMA user_version;", [], |row| row.get(0))?;

    if current_version > CURRENT_SCHEMA_VERSION {
        return Err(format!(
            "database schema version {current_version} is newer than supported version {CURRENT_SCHEMA_VERSION}"
        )
        .into());
    }

    if current_version < 1 {
        migrate_to_v1(connection)?;
    }

    if current_version < 2 {
        migrate_to_v2(connection)?;
    }

    if current_version < 3 {
        migrate_to_v3(connection)?;
    }

    Ok(())
}

fn migrate_to_v1(connection: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    connection.execute_batch(
        "
        BEGIN;

        CREATE TABLE IF NOT EXISTS quiz_packs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            question_count INTEGER NOT NULL DEFAULT 0,
            imported_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS questions (
            id TEXT PRIMARY KEY,
            pack_id TEXT NOT NULL,
            question_id TEXT NOT NULL,
            question_type TEXT NOT NULL,
            question_text TEXT NOT NULL,
            choices_json TEXT,
            correct_answer TEXT NOT NULL,
            explanation TEXT DEFAULT '',
            sort_order INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (pack_id) REFERENCES quiz_packs(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_questions_pack_id ON questions(pack_id);

        CREATE TABLE IF NOT EXISTS learning_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pack_id TEXT NOT NULL,
            question_id TEXT NOT NULL,
            is_correct INTEGER NOT NULL,
            user_answer TEXT DEFAULT '',
            answered_at TEXT NOT NULL,
            FOREIGN KEY (pack_id) REFERENCES quiz_packs(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_history_pack_question ON learning_history(pack_id, question_id);
        CREATE INDEX IF NOT EXISTS idx_history_answered_at ON learning_history(answered_at);

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        INSERT OR IGNORE INTO app_settings (key, value) VALUES ('question_order', 'sequential');
        INSERT OR IGNORE INTO app_settings (key, value) VALUES ('theme', 'light');

        PRAGMA user_version = 1;

        COMMIT;
        ",
    )?;

    Ok(())
}

/// V2: learning_history に session_id カラムを追加し、既存データをバックフィルする。
/// 既存レコードは pack_id ごとに回答時刻順で30分以上の間隔があれば別セッションとして扱う。
fn migrate_to_v2(connection: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    connection.execute_batch(
        "ALTER TABLE learning_history ADD COLUMN session_id TEXT DEFAULT '';
         CREATE INDEX IF NOT EXISTS idx_history_session_id ON learning_history(session_id);",
    )?;

    // 既存データのバックフィル: pack_id ごとに30分ルールでセッションIDを割り当てる
    backfill_session_ids(connection)?;

    connection.execute_batch("PRAGMA user_version = 2;")?;

    Ok(())
}

/// V3: quiz_packs に source / updated_at カラムを追加する。
fn migrate_to_v3(connection: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    connection.execute_batch(
        "ALTER TABLE quiz_packs ADD COLUMN source TEXT NOT NULL DEFAULT 'imported';
         ALTER TABLE quiz_packs ADD COLUMN updated_at TEXT DEFAULT NULL;
         PRAGMA user_version = 3;",
    )?;

    Ok(())
}

/// 既存のlearning_historyレコードにsession_idをバックフィルする。
/// pack_id ごとに回答時刻順で30分以上の間隔があれば別セッションとみなす。
fn backfill_session_ids(connection: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    const SESSION_GAP_SECS: i64 = 30 * 60;

    let mut select = connection.prepare(
        "SELECT DISTINCT pack_id FROM learning_history ORDER BY pack_id;",
    )?;
    let pack_ids: Vec<String> = select
        .query_map([], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    let mut select_records = connection.prepare(
        "SELECT id, answered_at FROM learning_history WHERE pack_id = ?1 ORDER BY answered_at ASC, id ASC;",
    )?;
    let mut update = connection.prepare(
        "UPDATE learning_history SET session_id = ?1 WHERE id = ?2;",
    )?;

    for pack_id in &pack_ids {
        let records: Vec<(i64, String)> = select_records
            .query_map(params![pack_id], |row| Ok((row.get(0)?, row.get(1)?)))?
            .collect::<Result<Vec<_>, _>>()?;

        if records.is_empty() {
            continue;
        }

        let mut current_session_id = uuid::Uuid::new_v4().to_string();
        let mut prev_time = chrono::DateTime::parse_from_rfc3339(&records[0].1)
            .map(|dt| dt.timestamp())
            .unwrap_or(0);

        update.execute(params![current_session_id, records[0].0])?;

        for (id, answered_at) in records.iter().skip(1) {
            let curr_time = chrono::DateTime::parse_from_rfc3339(answered_at)
                .map(|dt| dt.timestamp())
                .unwrap_or(0);

            if curr_time - prev_time > SESSION_GAP_SECS {
                current_session_id = uuid::Uuid::new_v4().to_string();
            }

            update.execute(params![current_session_id, id])?;
            prev_time = curr_time;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn open_v1_connection() -> Connection {
        let connection = Connection::open_in_memory().expect("in-memory database should open");
        connection
            .pragma_update(None, "foreign_keys", true)
            .expect("foreign_keys should be enabled");
        migrate_to_v1(&connection).expect("v1 migration should succeed");
        connection
    }

    /// テスト用のquiz_packを挿入する（FK制約を満たすため）
    fn insert_test_pack(connection: &Connection, pack_id: &str) {
        connection
            .execute(
                "INSERT INTO quiz_packs (id, name, question_count, imported_at) VALUES (?1, 'test', 0, '2026-01-01T00:00:00Z');",
                params![pack_id],
            )
            .expect("test pack should be inserted");
    }

    #[test]
    fn migrate_v2_adds_session_id_column() {
        let conn = open_v1_connection();
        insert_test_pack(&conn, "p1");
        migrate_to_v2(&conn).expect("v2 migration should succeed");

        // session_id カラムが存在することを確認
        let version: i64 = conn
            .query_row("PRAGMA user_version;", [], |row| row.get(0))
            .unwrap();
        assert_eq!(version, 2);

        // session_id カラムにデータを書き込めることを確認
        conn.execute(
            "INSERT INTO learning_history (pack_id, question_id, is_correct, user_answer, answered_at, session_id)
             VALUES ('p1', 'q1', 1, 'a', '2026-03-10T10:00:00Z', 'sess-1');",
            [],
        )
        .expect("insert with session_id should succeed");
    }

    #[test]
    fn migrate_v2_backfills_existing_records_into_sessions() {
        let conn = open_v1_connection();
        insert_test_pack(&conn, "p1");

        // V1スキーマでデータ挿入（session_idカラムなし）
        conn.execute(
            "INSERT INTO learning_history (pack_id, question_id, is_correct, user_answer, answered_at) VALUES ('p1', 'q1', 1, 'a', '2026-03-10T10:00:00Z');",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO learning_history (pack_id, question_id, is_correct, user_answer, answered_at) VALUES ('p1', 'q2', 0, 'b', '2026-03-10T10:05:00Z');",
            [],
        ).unwrap();
        // 31分後 → 別セッション
        conn.execute(
            "INSERT INTO learning_history (pack_id, question_id, is_correct, user_answer, answered_at) VALUES ('p1', 'q1', 1, 'a', '2026-03-10T10:36:00Z');",
            [],
        ).unwrap();

        migrate_to_v2(&conn).expect("v2 migration should succeed");

        // session_id が割り当てられていることを確認
        let mut stmt = conn
            .prepare("SELECT session_id FROM learning_history ORDER BY answered_at ASC;")
            .unwrap();
        let session_ids: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(session_ids.len(), 3);
        // 最初の2つは同じセッション
        assert_eq!(session_ids[0], session_ids[1]);
        // 3つ目は別セッション
        assert_ne!(session_ids[1], session_ids[2]);
        // 空文字ではないこと
        assert!(!session_ids[0].is_empty());
        assert!(!session_ids[2].is_empty());
    }

    #[test]
    fn migrate_v3_adds_source_and_updated_at_columns() {
        let conn = open_v1_connection();
        migrate_to_v2(&conn).expect("v2 migration should succeed");
        migrate_to_v3(&conn).expect("v3 migration should succeed");

        let version: i64 = conn
            .query_row("PRAGMA user_version;", [], |row| row.get(0))
            .expect("schema version should be readable");
        assert_eq!(version, 3);

        conn.execute(
            "INSERT INTO quiz_packs (id, name, question_count, imported_at)
             VALUES ('pack-v3', 'test', 0, '2026-01-01T00:00:00Z');",
            [],
        )
        .expect("insert into v3 schema should succeed");

        let (source, updated_at): (String, Option<String>) = conn
            .query_row(
                "SELECT source, updated_at FROM quiz_packs WHERE id = 'pack-v3';",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("new columns should be readable");

        assert_eq!(source, "imported");
        assert_eq!(updated_at, None);
    }

    #[test]
    fn run_migrates_v2_database_to_v3() {
        let conn = open_v1_connection();
        migrate_to_v2(&conn).expect("v2 migration should succeed");

        run(&conn).expect("run should migrate to latest schema");

        let version: i64 = conn
            .query_row("PRAGMA user_version;", [], |row| row.get(0))
            .expect("schema version should be readable");
        assert_eq!(version, 3);

        let columns: Vec<String> = conn
            .prepare("PRAGMA table_info(quiz_packs);")
            .expect("table info query should prepare")
            .query_map([], |row| row.get(1))
            .expect("table info query should execute")
            .collect::<Result<Vec<_>, _>>()
            .expect("column names should be collected");
        assert!(columns.contains(&"source".to_string()));
        assert!(columns.contains(&"updated_at".to_string()));
    }
}
