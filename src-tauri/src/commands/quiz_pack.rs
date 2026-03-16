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
pub fn detect_reset_targets(
    pack_id: String,
    questions: Vec<Question>,
    database: State<'_, Database>,
) -> Result<Vec<String>, String> {
    database
        .with_connection(|connection| {
            let old_questions = question_repo::get_questions_by_pack(connection, &pack_id)?;
            // save と同じリナンバーを適用してから差分検出
            let renumbered: Vec<Question> = questions
                .into_iter()
                .enumerate()
                .map(|(i, q)| renumber_question(q, format!("q{}", i + 1)))
                .collect();
            let targets = save_service::detect_reset_targets(&old_questions, &renumbered);
            Ok(targets)
        })
        .map_err(|e| e.to_string())
}

fn renumber_question(question: Question, id: String) -> Question {
    match question {
        Question::MultipleChoice { question, choices, answer, explanation, .. } => {
            Question::MultipleChoice { id, question, choices, answer, explanation }
        }
        Question::TrueFalse { question, answer, explanation, .. } => {
            Question::TrueFalse { id, question, answer, explanation }
        }
        Question::TextInput { question, answer, explanation, .. } => {
            Question::TextInput { id, question, answer, explanation }
        }
        Question::MultiSelect { question, choices, answer, explanation, .. } => {
            Question::MultiSelect { id, question, choices, answer, explanation }
        }
    }
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

    #[test]
    fn save_quiz_pack_updates_existing_pack() {
        let connection = open_test_connection();

        // まず新規作成
        let created = save_quiz_pack_impl(
            &connection,
            None,
            "初期パック".to_string(),
            Some("初期説明".to_string()),
            sample_questions(),
        )
        .expect("pack should be created");

        // 更新（問題を2つに減らし、パック名を変更）
        let updated_questions = vec![
            Question::MultipleChoice {
                id: "q1".to_string(),
                question: "更新後の問題".to_string(),
                choices: vec![
                    Choice { text: "A".to_string() },
                    Choice { text: "B".to_string() },
                ],
                answer: 0,
                explanation: None,
            },
            Question::TrueFalse {
                id: "q2".to_string(),
                question: "更新後のTF".to_string(),
                answer: false,
                explanation: None,
            },
        ];

        let updated = save_quiz_pack_impl(
            &connection,
            Some(created.id.clone()),
            "更新パック".to_string(),
            Some("更新説明".to_string()),
            updated_questions,
        )
        .expect("pack should be updated");

        assert_eq!(updated.id, created.id);
        assert_eq!(updated.name, "更新パック");
        assert_eq!(updated.description.as_deref(), Some("更新説明"));
        assert_eq!(updated.questions.len(), 2);
        assert!(updated.updated_at.is_some(), "updated_atが設定されること");

        // DB上のquestion_countが更新されていること
        let question_count: i64 = connection
            .query_row(
                "SELECT question_count FROM quiz_packs WHERE id = ?1;",
                [&updated.id],
                |row| row.get(0),
            )
            .expect("question_count should be readable");
        assert_eq!(question_count, 2);

        // 旧問題が削除されて新問題のみ残ること
        let stored_ids: Vec<String> = connection
            .prepare(
                "SELECT question_id FROM questions WHERE pack_id = ?1 ORDER BY sort_order ASC;",
            )
            .expect("statement should prepare")
            .query_map([&updated.id], |row| row.get(0))
            .expect("rows should be readable")
            .collect::<Result<Vec<_>, _>>()
            .expect("rows should collect");
        assert_eq!(stored_ids, vec!["q1", "q2"]);
    }

    #[test]
    fn save_quiz_pack_update_resets_history_for_changed_questions() {
        use crate::models::AnswerRecord;
        use crate::repositories::history_repo;

        let connection = open_test_connection();

        // 新規作成
        let created = save_quiz_pack_impl(
            &connection,
            None,
            "履歴テスト".to_string(),
            None,
            sample_questions(),
        )
        .expect("pack should be created");

        // q1, q2 に履歴を追加
        for qid in ["q1", "q2"] {
            history_repo::insert_answer_record(
                &connection,
                &AnswerRecord {
                    pack_id: created.id.clone(),
                    question_id: qid.to_string(),
                    is_correct: true,
                    user_answer: "a".to_string(),
                    answered_at: "2026-03-10T10:00:00Z".to_string(),
                    session_id: "test-session".to_string(),
                },
            )
            .expect("history should be inserted");
        }

        // q1のcorrect_answerを変更、q2は変更なし
        let updated_questions = vec![
            Question::MultipleChoice {
                id: "q1".to_string(),
                question: "最も安全な通信方式はどれか".to_string(),
                choices: vec![
                    Choice { text: "HTTP".to_string() },
                    Choice { text: "HTTPS".to_string() },
                ],
                answer: 0, // 1→0 に変更
                explanation: None,
            },
            Question::TrueFalse {
                id: "q2".to_string(),
                question: "TLS は暗号化に使われる".to_string(),
                answer: true, // 変更なし
                explanation: None,
            },
        ];

        save_quiz_pack_impl(
            &connection,
            Some(created.id.clone()),
            "履歴テスト".to_string(),
            None,
            updated_questions,
        )
        .expect("pack should be updated");

        // q1の履歴がリセットされていること
        let q1_history: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM learning_history WHERE pack_id = ?1 AND question_id = 'q1';",
                [&created.id],
                |row| row.get(0),
            )
            .expect("should query");
        assert_eq!(q1_history, 0, "q1の履歴がリセットされること");

        // q2の履歴が残っていること
        let q2_history: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM learning_history WHERE pack_id = ?1 AND question_id = 'q2';",
                [&created.id],
                |row| row.get(0),
            )
            .expect("should query");
        assert_eq!(q2_history, 1, "q2の履歴が保持されること");
    }

    #[test]
    fn save_quiz_pack_update_fails_for_nonexistent_pack() {
        let connection = open_test_connection();

        let result = save_quiz_pack_impl(
            &connection,
            Some("nonexistent-id".to_string()),
            "存在しないパック".to_string(),
            None,
            sample_questions(),
        );

        assert!(result.is_err(), "存在しないパックIDではエラーになること");
    }
}
