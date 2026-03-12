use tauri::State;

use crate::db::Database;
use crate::models::{AnswerRecord, PackStatistics, WeakQuestion};
use crate::services::history_service;

#[tauri::command]
pub fn save_answer_record(
    record: AnswerRecord,
    database: State<'_, Database>,
) -> Result<(), String> {
    database
        .with_connection(|connection| {
            history_service::save_answer_record(connection, &record)?;
            Ok(())
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_learning_history(
    pack_id: String,
    database: State<'_, Database>,
) -> Result<Vec<AnswerRecord>, String> {
    database
        .with_connection(|connection| {
            let history = history_service::get_learning_history(connection, &pack_id)?;
            Ok(history)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_pack_statistics(
    pack_id: String,
    database: State<'_, Database>,
) -> Result<PackStatistics, String> {
    database
        .with_connection(|connection| {
            let stats = history_service::get_pack_statistics(connection, &pack_id)?;
            Ok(stats)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_weak_questions(
    pack_id: String,
    database: State<'_, Database>,
) -> Result<Vec<WeakQuestion>, String> {
    database
        .with_connection(|connection| {
            let weak = history_service::get_weak_questions(connection, &pack_id)?;
            Ok(weak)
        })
        .map_err(|e| e.to_string())
}
