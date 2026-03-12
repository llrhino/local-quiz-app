use std::path::Path;

use tauri::State;

use crate::db::Database;
use crate::models::{Question, QuizPack, QuizPackSummary};
use crate::repositories::{question_repo, quiz_pack_repo};
use crate::services::import_service;

const SAMPLE_PACK_JSON: &str = include_str!("../../resources/sample-quiz-pack.json");

#[tauri::command]
pub fn import_quiz_pack(
    file_path: String,
    database: State<'_, Database>,
) -> Result<QuizPack, String> {
    database
        .with_connection(|connection| {
            let pack = import_service::import_quiz_pack(Path::new(&file_path), connection)?;
            Ok(pack)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_quiz_packs(database: State<'_, Database>) -> Result<Vec<QuizPackSummary>, String> {
    database
        .with_connection(|connection| {
            let packs = quiz_pack_repo::list_quiz_packs(connection)?;
            Ok(packs)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_quiz_pack(pack_id: String, database: State<'_, Database>) -> Result<QuizPack, String> {
    database
        .with_connection(|connection| {
            let pack = quiz_pack_repo::get_quiz_pack(connection, &pack_id)?;
            match pack {
                Some(pack) => Ok(pack),
                None => Err(format!("クイズパック '{pack_id}' が見つかりません").into()),
            }
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_quiz_pack(pack_id: String, database: State<'_, Database>) -> Result<(), String> {
    database
        .with_connection(|connection| {
            quiz_pack_repo::delete_quiz_pack(connection, &pack_id)?;
            Ok(())
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn seed_sample_pack(database: State<'_, Database>) -> Result<QuizPack, String> {
    database
        .with_connection(|connection| {
            let pack = import_service::import_quiz_pack_from_str(SAMPLE_PACK_JSON, connection)?;
            Ok(pack)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_questions_by_pack(
    pack_id: String,
    database: State<'_, Database>,
) -> Result<Vec<Question>, String> {
    database
        .with_connection(|connection| {
            let questions = question_repo::get_questions_by_pack(connection, &pack_id)?;
            Ok(questions)
        })
        .map_err(|e| e.to_string())
}
