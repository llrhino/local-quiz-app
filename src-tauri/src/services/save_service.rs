use rusqlite::Connection;
use serde_json::Value;

use crate::models::QuizPack;
use crate::models::Question;
use crate::repositories::{question_repo, quiz_pack_repo};
use crate::services::validation_service::validate_questions;

pub fn save_quiz_pack(
    connection: &Connection,
    pack_id: Option<String>,
    name: String,
    description: Option<String>,
    questions: Vec<Question>,
) -> Result<QuizPack, String> {
    if pack_id.is_some() {
        return Err("更新パスは未実装です".to_string());
    }

    let validated_questions = validate_and_renumber_questions(questions)?;
    let now = chrono::Utc::now().to_rfc3339();
    let pack = QuizPack {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        description,
        source: "created".to_string(),
        imported_at: now,
        updated_at: None,
        questions: validated_questions,
    };

    let tx = connection
        .unchecked_transaction()
        .map_err(|e| format!("トランザクション開始に失敗しました: {e}"))?;

    quiz_pack_repo::insert_quiz_pack(&tx, &pack).map_err(|e| format!("パック保存に失敗しました: {e}"))?;
    question_repo::insert_questions(&tx, &pack.id, &pack.questions)
        .map_err(|e| format!("問題保存に失敗しました: {e}"))?;

    tx.commit()
        .map_err(|e| format!("コミットに失敗しました: {e}"))?;

    Ok(pack)
}

fn validate_and_renumber_questions(questions: Vec<Question>) -> Result<Vec<Question>, String> {
    let normalized = questions
        .into_iter()
        .enumerate()
        .map(|(index, question)| reassign_question_id(question, format!("q{}", index + 1)))
        .collect::<Vec<_>>();

    let values = normalized
        .iter()
        .map(serde_json::to_value)
        .collect::<Result<Vec<Value>, _>>()
        .map_err(|e| format!("問題のシリアライズに失敗しました: {e}"))?;

    validate_questions(&values)
}

fn reassign_question_id(question: Question, id: String) -> Question {
    match question {
        Question::MultipleChoice {
            question,
            choices,
            answer,
            explanation,
            ..
        } => Question::MultipleChoice {
            id,
            question,
            choices,
            answer,
            explanation,
        },
        Question::TrueFalse {
            question,
            answer,
            explanation,
            ..
        } => Question::TrueFalse {
            id,
            question,
            answer,
            explanation,
        },
        Question::TextInput {
            question,
            answer,
            explanation,
            ..
        } => Question::TextInput {
            id,
            question,
            answer,
            explanation,
        },
        Question::MultiSelect {
            question,
            choices,
            answer,
            explanation,
            ..
        } => Question::MultiSelect {
            id,
            question,
            choices,
            answer,
            explanation,
        },
    }
}
