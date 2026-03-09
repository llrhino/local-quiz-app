use rusqlite::Connection;

pub fn run(connection: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    connection.execute_batch(
        "
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
        ",
    )?;

    Ok(())
}
