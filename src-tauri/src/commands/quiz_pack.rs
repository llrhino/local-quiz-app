use std::path::Path;

use tauri::State;

use crate::db::Database;
use crate::models::{Question, QuizPack, QuizPackSummary};
use crate::repositories::{question_repo, quiz_pack_repo};
use crate::services::{export_service, import_service, save_service};

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

#[tauri::command]
pub fn save_quiz_pack(
    pack_id: Option<String>,
    name: String,
    description: Option<String>,
    questions: Vec<Question>,
    database: State<'_, Database>,
) -> Result<QuizPack, String> {
    database
        .with_connection(|connection| {
            let pack = save_quiz_pack_impl(connection, pack_id, name, description, questions)?;
            Ok(pack)
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_quiz_pack(
    pack_id: String,
    file_path: String,
    database: State<'_, Database>,
) -> Result<(), String> {
    database
        .with_connection(|connection| {
            export_service::export_quiz_pack_to_file(
                connection,
                &pack_id,
                Path::new(&file_path),
            )?;
            Ok(())
        })
        .map_err(|e| e.to_string())
}

fn save_quiz_pack_impl(
    connection: &rusqlite::Connection,
    pack_id: Option<String>,
    name: String,
    description: Option<String>,
    questions: Vec<Question>,
) -> Result<QuizPack, Box<dyn std::error::Error>> {
    save_service::save_quiz_pack(connection, pack_id, name, description, questions)
        .map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use crate::models::{Choice, Question};
    use crate::repositories::test_helpers::open_test_connection;

    use super::save_quiz_pack_impl;

    fn sample_questions() -> Vec<Question> {
        vec![
            Question::MultipleChoice {
                id: "ignored-1".to_string(),
                question: "最も安全な通信方式はどれか".to_string(),
                choices: vec![
                    Choice {
                        text: "HTTP".to_string(),
                    },
                    Choice { text: "HTTPS".to_string() },
                ],
                answer: 1,
                explanation: Some("TLS により保護される".to_string()),
            },
            Question::TrueFalse {
                id: "ignored-2".to_string(),
                question: "TLS は暗号化に使われる".to_string(),
                answer: true,
                explanation: None,
            },
            Question::TextInput {
                id: "ignored-3".to_string(),
                question: "公開鍵暗号の代表例を答えよ".to_string(),
                answer: "RSA".to_string(),
                explanation: None,
            },
            Question::MultiSelect {
                id: "ignored-4".to_string(),
                question: "共通鍵暗号を選べ".to_string(),
                choices: vec![
                    Choice { text: "AES".to_string() },
                    Choice { text: "RSA".to_string() },
                    Choice { text: "DES".to_string() },
                ],
                answer: vec![0, 2],
                explanation: Some("AES と DES".to_string()),
            },
        ]
    }

    #[test]
    fn save_quiz_pack_creates_pack_and_questions_in_single_transaction() {
        let connection = open_test_connection();

        let saved = save_quiz_pack_impl(
            &connection,
            None,
            "新規作成パック".to_string(),
            Some("作成テスト".to_string()),
            sample_questions(),
        )
        .expect("pack should be saved");

        assert_eq!(saved.name, "新規作成パック");
        assert_eq!(saved.description.as_deref(), Some("作成テスト"));
        assert_eq!(saved.source, "created");
        assert_eq!(saved.updated_at, None);
        assert_eq!(saved.questions.len(), 4);
        assert!(uuid::Uuid::parse_str(&saved.id).is_ok(), "UUID v4 が生成されること");
        assert_eq!(question_id(&saved.questions[0]), "q1");
        assert_eq!(question_id(&saved.questions[1]), "q2");
        assert_eq!(question_id(&saved.questions[2]), "q3");
        assert_eq!(question_id(&saved.questions[3]), "q4");

        let question_count: i64 = connection
            .query_row(
                "SELECT question_count FROM quiz_packs WHERE id = ?1;",
                [&saved.id],
                |row| row.get(0),
            )
            .expect("question_count should be readable");
        assert_eq!(question_count, 4);

        let stored_ids: Vec<String> = connection
            .prepare(
                "SELECT question_id FROM questions WHERE pack_id = ?1 ORDER BY sort_order ASC;",
            )
            .expect("statement should prepare")
            .query_map([&saved.id], |row| row.get(0))
            .expect("rows should be readable")
            .collect::<Result<Vec<_>, _>>()
            .expect("rows should collect");
        assert_eq!(stored_ids, vec!["q1", "q2", "q3", "q4"]);
    }

    #[test]
    fn save_quiz_pack_rolls_back_when_validation_fails() {
        let connection = open_test_connection();

        let result = save_quiz_pack_impl(
            &connection,
            None,
            "不正パック".to_string(),
            None,
            vec![Question::TextInput {
                id: "ignored".to_string(),
                question: "空文字は不可".to_string(),
                answer: "".to_string(),
                explanation: None,
            }],
        );

        assert!(result.is_err(), "バリデーションエラーになること");

        let pack_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM quiz_packs;", [], |row| row.get(0))
            .expect("pack count should be readable");
        let question_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM questions;", [], |row| row.get(0))
            .expect("question count should be readable");

        assert_eq!(pack_count, 0);
        assert_eq!(question_count, 0);
    }

    fn question_id(question: &Question) -> &str {
        match question {
            Question::MultipleChoice { id, .. }
            | Question::TrueFalse { id, .. }
            | Question::TextInput { id, .. }
            | Question::MultiSelect { id, .. } => id,
        }
    }
}
