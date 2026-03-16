use rusqlite::Connection;
use serde_json::Value;

use crate::models::QuizPack;
use crate::models::Question;
use crate::repositories::{history_repo, question_repo, quiz_pack_repo};
use crate::services::validation_service::validate_questions;

pub fn save_quiz_pack(
    connection: &Connection,
    pack_id: Option<String>,
    name: String,
    description: Option<String>,
    questions: Vec<Question>,
) -> Result<QuizPack, String> {
    let validated_questions = validate_and_renumber_questions(questions)?;

    match pack_id {
        None => create_quiz_pack(connection, name, description, validated_questions),
        Some(id) => update_quiz_pack(connection, &id, name, description, validated_questions),
    }
}

fn create_quiz_pack(
    connection: &Connection,
    name: String,
    description: Option<String>,
    questions: Vec<Question>,
) -> Result<QuizPack, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let pack = QuizPack {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        description,
        source: "created".to_string(),
        imported_at: now,
        updated_at: None,
        questions,
    };

    let tx = connection
        .unchecked_transaction()
        .map_err(|e| format!("トランザクション開始に失敗しました: {e}"))?;

    quiz_pack_repo::insert_quiz_pack(&tx, &pack)
        .map_err(|e| format!("パック保存に失敗しました: {e}"))?;
    question_repo::insert_questions(&tx, &pack.id, &pack.questions)
        .map_err(|e| format!("問題保存に失敗しました: {e}"))?;

    tx.commit()
        .map_err(|e| format!("コミットに失敗しました: {e}"))?;

    Ok(pack)
}

fn update_quiz_pack(
    connection: &Connection,
    pack_id: &str,
    name: String,
    description: Option<String>,
    questions: Vec<Question>,
) -> Result<QuizPack, String> {
    let now = chrono::Utc::now().to_rfc3339();

    let tx = connection
        .unchecked_transaction()
        .map_err(|e| format!("トランザクション開始に失敗しました: {e}"))?;

    // 1. 旧問題リストを取得（履歴リセット判定用）
    let old_questions = question_repo::get_questions_by_pack(&tx, pack_id)
        .map_err(|e| format!("旧問題の取得に失敗しました: {e}"))?;

    // 2. パックメタ情報を更新
    quiz_pack_repo::update_quiz_pack(
        &tx,
        pack_id,
        &name,
        description.as_deref(),
        questions.len(),
        &now,
    )
    .map_err(|e| format!("パック更新に失敗しました: {e}"))?;

    // 3. 旧問題を削除 → 新問題を挿入
    question_repo::delete_questions_by_pack(&tx, pack_id)
        .map_err(|e| format!("旧問題の削除に失敗しました: {e}"))?;
    question_repo::insert_questions(&tx, pack_id, &questions)
        .map_err(|e| format!("問題保存に失敗しました: {e}"))?;

    // 4. 履歴リセット判定 → 該当問題の履歴を削除
    let reset_targets = detect_reset_targets(&old_questions, &questions);
    if !reset_targets.is_empty() {
        history_repo::delete_history_for_questions(&tx, pack_id, &reset_targets)
            .map_err(|e| format!("履歴リセットに失敗しました: {e}"))?;
    }

    tx.commit()
        .map_err(|e| format!("コミットに失敗しました: {e}"))?;

    // 更新後のパックを返す
    let pack = quiz_pack_repo::get_quiz_pack(connection, pack_id)
        .map_err(|e| format!("パック取得に失敗しました: {e}"))?
        .ok_or_else(|| format!("更新後のパック '{pack_id}' が見つかりません"))?;

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

/// 旧問題と新問題を比較し、学習履歴のリセットが必要な問題IDを返す。
/// リセット対象: correct_answer / question_type / 選択肢数 のいずれかが変更された問題。
pub fn detect_reset_targets(
    old_questions: &[Question],
    new_questions: &[Question],
) -> Vec<String> {
    use std::collections::HashMap;

    let old_map: HashMap<&str, &Question> = old_questions
        .iter()
        .map(|q| (question_id(q), q))
        .collect();

    new_questions
        .iter()
        .filter_map(|new_q| {
            let new_id = question_id(new_q);
            old_map.get(new_id).and_then(|old_q| {
                let needs_reset = question_correct_answer(old_q) != question_correct_answer(new_q)
                    || question_type_str(old_q) != question_type_str(new_q)
                    || choices_count(old_q) != choices_count(new_q);
                if needs_reset {
                    Some(new_id.to_string())
                } else {
                    None
                }
            })
        })
        .collect()
}

fn question_id(q: &Question) -> &str {
    match q {
        Question::MultipleChoice { id, .. }
        | Question::TrueFalse { id, .. }
        | Question::TextInput { id, .. }
        | Question::MultiSelect { id, .. } => id,
    }
}

fn question_correct_answer(q: &Question) -> String {
    match q {
        Question::MultipleChoice { answer, .. } => answer.to_string(),
        Question::TrueFalse { answer, .. } => answer.to_string(),
        Question::TextInput { answer, .. } => answer.clone(),
        Question::MultiSelect { answer, .. } => {
            answer.iter().map(|i| i.to_string()).collect::<Vec<_>>().join(",")
        }
    }
}

fn question_type_str(q: &Question) -> &'static str {
    match q {
        Question::MultipleChoice { .. } => "multiple_choice",
        Question::TrueFalse { .. } => "true_false",
        Question::TextInput { .. } => "text_input",
        Question::MultiSelect { .. } => "multi_select",
    }
}

fn choices_count(q: &Question) -> usize {
    match q {
        Question::MultipleChoice { choices, .. } | Question::MultiSelect { choices, .. } => {
            choices.len()
        }
        Question::TrueFalse { .. } | Question::TextInput { .. } => 0,
    }
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

#[cfg(test)]
mod tests {
    use crate::models::{Choice, Question};
    use super::detect_reset_targets;

    fn mc(id: &str, answer: usize, choices: usize) -> Question {
        Question::MultipleChoice {
            id: id.to_string(),
            question: "問題文".to_string(),
            choices: (0..choices).map(|i| Choice { text: format!("選択肢{i}") }).collect(),
            answer,
            explanation: None,
        }
    }

    fn tf(id: &str, answer: bool) -> Question {
        Question::TrueFalse {
            id: id.to_string(),
            question: "問題文".to_string(),
            answer,
            explanation: None,
        }
    }

    fn text(id: &str, answer: &str) -> Question {
        Question::TextInput {
            id: id.to_string(),
            question: "問題文".to_string(),
            answer: answer.to_string(),
            explanation: None,
        }
    }

    fn ms(id: &str, answer: Vec<usize>, choices: usize) -> Question {
        Question::MultiSelect {
            id: id.to_string(),
            question: "問題文".to_string(),
            choices: (0..choices).map(|i| Choice { text: format!("選択肢{i}") }).collect(),
            answer,
            explanation: None,
        }
    }

    #[test]
    fn correct_answer変更でリセット対象になる() {
        let old = vec![mc("q1", 0, 3)];
        let new = vec![mc("q1", 1, 3)];
        assert_eq!(detect_reset_targets(&old, &new), vec!["q1"]);
    }

    #[test]
    fn question_type変更でリセット対象になる() {
        let old = vec![mc("q1", 0, 2)];
        let new = vec![tf("q1", true)];
        assert_eq!(detect_reset_targets(&old, &new), vec!["q1"]);
    }

    #[test]
    fn 選択肢数変更でリセット対象になる() {
        let old = vec![mc("q1", 0, 3)];
        let new = vec![mc("q1", 0, 4)];
        assert_eq!(detect_reset_targets(&old, &new), vec!["q1"]);
    }

    #[test]
    fn 選択肢テキストのみ変更ではリセットしない() {
        let old = vec![Question::MultipleChoice {
            id: "q1".to_string(),
            question: "問題文".to_string(),
            choices: vec![
                Choice { text: "旧テキスト".to_string() },
                Choice { text: "選択肢1".to_string() },
            ],
            answer: 0,
            explanation: None,
        }];
        let new = vec![Question::MultipleChoice {
            id: "q1".to_string(),
            question: "問題文".to_string(),
            choices: vec![
                Choice { text: "新テキスト".to_string() },
                Choice { text: "選択肢1".to_string() },
            ],
            answer: 0,
            explanation: None,
        }];
        assert!(detect_reset_targets(&old, &new).is_empty());
    }

    #[test]
    fn 問題文変更ではリセットしない() {
        let old = vec![mc("q1", 0, 2)];
        let new = vec![Question::MultipleChoice {
            id: "q1".to_string(),
            question: "変更後の問題文".to_string(),
            choices: vec![
                Choice { text: "選択肢0".to_string() },
                Choice { text: "選択肢1".to_string() },
            ],
            answer: 0,
            explanation: None,
        }];
        assert!(detect_reset_targets(&old, &new).is_empty());
    }

    #[test]
    fn 問題追加は既存に影響しない() {
        let old = vec![mc("q1", 0, 2)];
        let new = vec![mc("q1", 0, 2), mc("q2", 1, 3)];
        assert!(detect_reset_targets(&old, &new).is_empty());
    }

    #[test]
    fn 問題削除は孤立履歴として残る_リセット対象に含まれない() {
        let old = vec![mc("q1", 0, 2), mc("q2", 1, 2)];
        let new = vec![mc("q1", 0, 2)];
        assert!(detect_reset_targets(&old, &new).is_empty());
    }

    #[test]
    fn 複数問題の混合パターン() {
        let old = vec![
            mc("q1", 0, 3),   // 正答変更 → リセット
            tf("q2", true),    // 変更なし
            text("q3", "RSA"), // 正答変更 → リセット
            ms("q4", vec![0, 2], 3), // 選択肢数変更 → リセット
        ];
        let new = vec![
            mc("q1", 1, 3),
            tf("q2", true),
            text("q3", "AES"),
            ms("q4", vec![0, 2], 4),
        ];
        let targets = detect_reset_targets(&old, &new);
        assert_eq!(targets, vec!["q1", "q3", "q4"]);
    }

    #[test]
    fn true_false正答変更でリセット対象になる() {
        let old = vec![tf("q1", true)];
        let new = vec![tf("q1", false)];
        assert_eq!(detect_reset_targets(&old, &new), vec!["q1"]);
    }

    #[test]
    fn multi_select正答変更でリセット対象になる() {
        let old = vec![ms("q1", vec![0, 1], 3)];
        let new = vec![ms("q1", vec![0, 2], 3)];
        assert_eq!(detect_reset_targets(&old, &new), vec!["q1"]);
    }

    #[test]
    fn 解説変更ではリセットしない() {
        let old = vec![Question::MultipleChoice {
            id: "q1".to_string(),
            question: "問題文".to_string(),
            choices: vec![
                Choice { text: "選択肢0".to_string() },
                Choice { text: "選択肢1".to_string() },
            ],
            answer: 0,
            explanation: Some("旧解説".to_string()),
        }];
        let new = vec![Question::MultipleChoice {
            id: "q1".to_string(),
            question: "問題文".to_string(),
            choices: vec![
                Choice { text: "選択肢0".to_string() },
                Choice { text: "選択肢1".to_string() },
            ],
            answer: 0,
            explanation: Some("新解説".to_string()),
        }];
        assert!(detect_reset_targets(&old, &new).is_empty());
    }
}
