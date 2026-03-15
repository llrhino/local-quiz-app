pub(crate) mod migrations;

use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;

pub struct Database {
    connection: Mutex<Connection>,
}

impl Database {
    pub fn new(path: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let connection = Connection::open(path)?;
        connection.pragma_update(None, "journal_mode", "WAL")?;
        connection.pragma_update(None, "foreign_keys", true)?;
        migrations::run(&connection)?;

        Ok(Self {
            connection: Mutex::new(connection),
        })
    }

    pub fn with_connection<T>(
        &self,
        f: impl FnOnce(&Connection) -> Result<T, Box<dyn std::error::Error>>,
    ) -> Result<T, Box<dyn std::error::Error>> {
        let connection = self.connection.lock().expect("database mutex poisoned");
        f(&connection)
    }
}

#[cfg(test)]
mod tests {
    use super::Database;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temporary_database_path() -> PathBuf {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();

        std::env::temp_dir().join(format!("local-quiz-app-db-{unique_suffix}.sqlite3"))
    }

    fn open_test_database() -> (Database, PathBuf) {
        let path = temporary_database_path();
        let database = Database::new(path.clone()).expect("test database should be created");
        (database, path)
    }

    #[test]
    fn initializes_database_file_and_enables_wal_mode() {
        let (database, path) = open_test_database();

        assert!(path.exists(), "database file should be created");

        let journal_mode = database
            .with_connection(|connection| {
                let mode = connection
                    .query_row("PRAGMA journal_mode;", [], |row| row.get::<_, String>(0))?;
                Ok(mode)
            })
            .expect("journal mode should be readable");

        assert_eq!(journal_mode, "wal");

        std::fs::remove_file(path).expect("test database file should be removed");
    }

    #[test]
    fn enables_foreign_keys() {
        let (database, path) = open_test_database();

        let foreign_keys: i64 = database
            .with_connection(|connection| {
                let enabled = connection.query_row("PRAGMA foreign_keys;", [], |row| row.get(0))?;
                Ok(enabled)
            })
            .expect("foreign_keys pragma should be readable");

        assert_eq!(foreign_keys, 1);

        std::fs::remove_file(path).expect("test database file should be removed");
    }

    #[test]
    fn creates_schema_objects_and_default_settings() {
        let (database, path) = open_test_database();

        let (table_count, index_count, settings): (i64, i64, Vec<(String, String)>) = database
            .with_connection(|connection| {
                let table_count = connection.query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name IN ('quiz_packs', 'questions', 'learning_history', 'app_settings');",
                    [],
                    |row| row.get(0),
                )?;
                let index_count = connection.query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name IN ('idx_questions_pack_id', 'idx_history_pack_question', 'idx_history_answered_at');",
                    [],
                    |row| row.get(0),
                )?;
                let mut statement = connection.prepare(
                    "SELECT key, value FROM app_settings ORDER BY key ASC;",
                )?;
                let settings = statement
                    .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
                    .collect::<Result<Vec<_>, _>>()?;

                Ok((table_count, index_count, settings))
            })
            .expect("schema should be queryable");

        assert_eq!(table_count, 4);
        assert_eq!(index_count, 3);
        assert_eq!(
            settings,
            vec![
                ("question_order".to_string(), "sequential".to_string()),
                ("theme".to_string(), "light".to_string()),
            ]
        );

        std::fs::remove_file(path).expect("test database file should be removed");
    }

    #[test]
    fn records_schema_version_after_migrations() {
        let (database, path) = open_test_database();

        let (user_version, source_exists, updated_at_exists): (i64, bool, bool) = database
            .with_connection(|connection| {
                let version = connection.query_row("PRAGMA user_version;", [], |row| row.get(0))?;
                let columns: Vec<String> = connection
                    .prepare("PRAGMA table_info(quiz_packs);")?
                    .query_map([], |row| row.get(1))?
                    .collect::<Result<Vec<_>, _>>()?;
                Ok((
                    version,
                    columns.iter().any(|column| column == "source"),
                    columns.iter().any(|column| column == "updated_at"),
                ))
            })
            .expect("schema version should be readable");

        assert_eq!(user_version, 3);
        assert!(source_exists);
        assert!(updated_at_exists);

        std::fs::remove_file(path).expect("test database file should be removed");
    }
}
