use tauri::State;

use crate::db::Database;
use crate::models::{AnswerRecord, PackStatistics, WeakQuestion};

#[tauri::command]
pub fn save_answer_record(_record: AnswerRecord, _database: State<'_, Database>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn get_learning_history(_pack_id: String, _database: State<'_, Database>) -> Result<Vec<AnswerRecord>, String> {
    Ok(Vec::new())
}

#[tauri::command]
pub fn get_pack_statistics(pack_id: String, _database: State<'_, Database>) -> Result<PackStatistics, String> {
    Ok(PackStatistics {
        pack_id,
        total_answers: 0,
        correct_answers: 0,
        accuracy_rate: 0.0,
    })
}

#[tauri::command]
pub fn get_weak_questions(_pack_id: String, _database: State<'_, Database>) -> Result<Vec<WeakQuestion>, String> {
    Ok(Vec::new())
}
