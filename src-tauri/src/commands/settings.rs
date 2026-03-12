use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::db::Database;
use crate::models::AppSettings;
use crate::services::settings_service;

#[tauri::command]
pub fn get_settings(database: State<'_, Database>) -> Result<AppSettings, String> {
    database
        .with_connection(|connection| {
            let settings = settings_service::get_settings(connection)?;
            Ok(settings)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_setting(
    key: String,
    value: String,
    database: State<'_, Database>,
) -> Result<(), String> {
    database
        .with_connection(|connection| {
            settings_service::update_setting(connection, &key, &value)?;
            Ok(())
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_file_dialog(app: AppHandle) -> Option<String> {
    let file = app
        .dialog()
        .file()
        .add_filter("JSON ファイル", &["json"])
        .blocking_pick_file();

    file.map(|path| path.to_string())
}
