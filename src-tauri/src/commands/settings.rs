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
pub async fn open_file_dialog(app: AppHandle) -> Option<String> {
    let (tx, rx) = std::sync::mpsc::channel::<Option<String>>();

    app.dialog()
        .file()
        .add_filter("JSON ファイル", &["json"])
        .pick_file(move |file| {
            let _ = tx.send(file.map(|path| path.to_string()));
        });

    // ブロッキング recv を別スレッドで実行し、コマンドスレッドをブロックしない
    tauri::async_runtime::spawn_blocking(move || rx.recv().unwrap_or(None))
        .await
        .unwrap_or(None)
}
