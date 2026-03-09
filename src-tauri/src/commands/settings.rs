use tauri::State;

use crate::db::Database;
use crate::models::AppSettings;

#[tauri::command]
pub fn get_settings(_database: State<'_, Database>) -> Result<AppSettings, String> {
    Ok(AppSettings::default())
}

#[tauri::command]
pub fn update_setting(_key: String, _value: String, _database: State<'_, Database>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn open_file_dialog() -> Option<String> {
    None
}
