use std::error::Error;

use rusqlite::{params, Connection, OptionalExtension};

use crate::models::AppSettings;

type RepoResult<T> = Result<T, Box<dyn Error>>;

pub fn get_settings(connection: &Connection) -> RepoResult<AppSettings> {
    let question_order = get_setting_value(connection, "question_order")?
        .unwrap_or_else(|| "sequential".to_string());
    let theme = get_setting_value(connection, "theme")?.unwrap_or_else(|| "light".to_string());
    let shuffle_choices = get_setting_value(connection, "shuffle_choices")?
        .unwrap_or_else(|| "false".to_string());

    Ok(AppSettings {
        question_order,
        theme,
        shuffle_choices,
    })
}

pub fn update_setting(connection: &Connection, key: &str, value: &str) -> RepoResult<()> {
    connection.execute(
        "INSERT INTO app_settings (key, value)
         VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value;",
        params![key, value],
    )?;

    Ok(())
}

fn get_setting_value(connection: &Connection, key: &str) -> RepoResult<Option<String>> {
    Ok(connection
        .query_row(
            "SELECT value FROM app_settings WHERE key = ?1;",
            [key],
            |row| row.get(0),
        )
        .optional()?)
}

#[cfg(test)]
mod tests {
    use crate::repositories::test_helpers::{default_settings, open_test_connection};

    use super::{get_settings, update_setting};

    #[test]
    fn gets_default_settings_and_updates_values() {
        let connection = open_test_connection();

        let defaults = get_settings(&connection).expect("default settings should be returned");
        assert_eq!(defaults.question_order, default_settings().question_order);
        assert_eq!(defaults.theme, default_settings().theme);

        update_setting(&connection, "question_order", "random")
            .expect("question_order should be updated");
        update_setting(&connection, "theme", "dark").expect("theme should be updated");

        let updated = get_settings(&connection).expect("updated settings should be returned");
        assert_eq!(updated.question_order, "random");
        assert_eq!(updated.theme, "dark");
    }
}
