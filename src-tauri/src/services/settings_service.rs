use rusqlite::Connection;

use crate::models::AppSettings;
use crate::repositories::settings_repo;

/// すべての設定を取得する
pub fn get_settings(connection: &Connection) -> Result<AppSettings, Box<dyn std::error::Error>> {
    settings_repo::get_settings(connection)
}

/// 設定を更新する（キーと値のバリデーション付き）
pub fn update_setting(
    connection: &Connection,
    key: &str,
    value: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    validate_setting(key, value)?;
    settings_repo::update_setting(connection, key, value)
}

/// キーと値の組み合わせを検証する
fn validate_setting(key: &str, value: &str) -> Result<(), Box<dyn std::error::Error>> {
    match key {
        "question_order" => {
            if !matches!(value, "sequential" | "random") {
                return Err(format!(
                    "question_order の値が不正です: '{value}'（sequential または random を指定してください）"
                )
                .into());
            }
        }
        "theme" => {
            if !matches!(value, "light" | "dark") {
                return Err(format!(
                    "theme の値が不正です: '{value}'（light または dark を指定してください）"
                )
                .into());
            }
        }
        _ => {
            return Err(
                format!("不明な設定キーです: '{key}'（question_order または theme を指定してください）")
                    .into(),
            );
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::repositories::test_helpers::{default_settings, open_test_connection};

    use super::*;

    // --- get_settings ---

    #[test]
    fn returns_default_settings() {
        let conn = open_test_connection();
        let settings = get_settings(&conn).unwrap();
        assert_eq!(settings.question_order, default_settings().question_order);
        assert_eq!(settings.theme, default_settings().theme);
    }

    // --- update_setting ---

    #[test]
    fn updates_question_order_to_random() {
        let conn = open_test_connection();
        update_setting(&conn, "question_order", "random").unwrap();
        let settings = get_settings(&conn).unwrap();
        assert_eq!(settings.question_order, "random");
    }

    #[test]
    fn updates_question_order_to_sequential() {
        let conn = open_test_connection();
        update_setting(&conn, "question_order", "random").unwrap();
        update_setting(&conn, "question_order", "sequential").unwrap();
        let settings = get_settings(&conn).unwrap();
        assert_eq!(settings.question_order, "sequential");
    }

    #[test]
    fn updates_theme_to_dark() {
        let conn = open_test_connection();
        update_setting(&conn, "theme", "dark").unwrap();
        let settings = get_settings(&conn).unwrap();
        assert_eq!(settings.theme, "dark");
    }

    #[test]
    fn updates_theme_to_light() {
        let conn = open_test_connection();
        update_setting(&conn, "theme", "dark").unwrap();
        update_setting(&conn, "theme", "light").unwrap();
        let settings = get_settings(&conn).unwrap();
        assert_eq!(settings.theme, "light");
    }

    #[test]
    fn rejects_invalid_key() {
        let conn = open_test_connection();
        let result = update_setting(&conn, "unknown_key", "value");
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("unknown_key"), "エラーメッセージにキー名が含まれること: {err}");
    }

    #[test]
    fn rejects_invalid_value_for_question_order() {
        let conn = open_test_connection();
        let result = update_setting(&conn, "question_order", "invalid");
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(
            err.contains("invalid"),
            "エラーメッセージに不正な値が含まれること: {err}"
        );
    }

    #[test]
    fn rejects_invalid_value_for_theme() {
        let conn = open_test_connection();
        let result = update_setting(&conn, "theme", "blue");
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(
            err.contains("blue"),
            "エラーメッセージに不正な値が含まれること: {err}"
        );
    }
}
