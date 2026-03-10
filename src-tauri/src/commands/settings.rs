use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::db::Database;
use crate::models::AppSettings;

#[tauri::command]
pub fn get_settings(_database: State<'_, Database>) -> Result<AppSettings, String> {
    Ok(AppSettings::default())
}

#[tauri::command]
pub fn update_setting(
    _key: String,
    _value: String,
    _database: State<'_, Database>,
) -> Result<(), String> {
    Ok(())
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
