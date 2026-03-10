use tauri::State;

use crate::db::Database;
use crate::models::{Question, QuizPack, QuizPackSummary};

#[tauri::command]
pub fn import_quiz_pack(
    _file_path: String,
    _database: State<'_, Database>,
) -> Result<QuizPack, String> {
    Err("Quiz pack import is not implemented yet.".to_string())
}

#[tauri::command]
pub fn list_quiz_packs(_database: State<'_, Database>) -> Result<Vec<QuizPackSummary>, String> {
    Ok(Vec::new())
}

#[tauri::command]
pub fn get_quiz_pack(pack_id: String, _database: State<'_, Database>) -> Result<QuizPack, String> {
    Err(format!("Quiz pack '{pack_id}' was not found."))
}

#[tauri::command]
pub fn delete_quiz_pack(_pack_id: String, _database: State<'_, Database>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn get_questions_by_pack(
    _pack_id: String,
    _database: State<'_, Database>,
) -> Result<Vec<Question>, String> {
    Ok(Vec::new())
}
