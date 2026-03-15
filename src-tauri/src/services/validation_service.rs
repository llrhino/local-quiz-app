use std::collections::HashSet;

use serde_json::Value;

use crate::models::Question;

pub fn validate_questions(questions: &[Value]) -> Result<Vec<Question>, String> {
    let mut errors: Vec<String> = Vec::new();
    let mut seen_ids: HashSet<String> = HashSet::new();
    let mut parsed_questions: Vec<Question> = Vec::new();

    for value in questions {
        let question_id = value
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("(不明)");

        if !seen_ids.insert(question_id.to_string()) {
            errors.push(format!(
                "Question ID: {question_id} / Field: id / Error: パック内で問題IDが重複しています"
            ));
        }

        match validate_question(value) {
            Ok(question) => parsed_questions.push(question),
            Err(error) => errors.push(error),
        }
    }

    if errors.is_empty() {
        Ok(parsed_questions)
    } else {
        Err(errors.join("\n"))
    }
}

pub fn validate_question(value: &Value) -> Result<Question, String> {
    let question_id = value
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("(不明)");
    let mut errors = Vec::new();

    let question_type = match value.get("type").and_then(|v| v.as_str()) {
        Some(t @ ("multiple_choice" | "true_false" | "text_input" | "multi_select")) => t,
        Some(invalid) => {
            errors.push(format!(
                "Question ID: {question_id} / Field: type / Error: 不正な問題タイプです: {invalid}"
            ));
            ""
        }
        None => {
            errors.push(format!(
                "Question ID: {question_id} / Field: type / Error: 必須フィールドがありません"
            ));
            ""
        }
    };

    if value.get("id").and_then(|v| v.as_str()).is_none() {
        errors.push(format!(
            "Question ID: {question_id} / Field: id / Error: 必須フィールドがありません"
        ));
    }

    if value.get("question").and_then(|v| v.as_str()).is_none() {
        errors.push(format!(
            "Question ID: {question_id} / Field: question / Error: 必須フィールドがありません"
        ));
    }

    match question_type {
        "multiple_choice" => validate_multiple_choice(value, question_id, &mut errors),
        "true_false" => validate_true_false(value, question_id, &mut errors),
        "text_input" => validate_text_input(value, question_id, &mut errors),
        "multi_select" => validate_multi_select(value, question_id, &mut errors),
        _ => {}
    }

    if !errors.is_empty() {
        return Err(errors.join("\n"));
    }

    serde_json::from_value(value.clone())
        .map_err(|e| format!("問題のデシリアライズに失敗しました: {e}"))
}

fn validate_multiple_choice(value: &Value, question_id: &str, errors: &mut Vec<String>) {
    let choices = match value.get("choices").and_then(|v| v.as_array()) {
        Some(c) => c,
        None => {
            errors.push(format!(
                "Question ID: {question_id} / Field: choices / Error: 必須フィールドがありません"
            ));
            return;
        }
    };

    let count = choices.len();
    if !(2..=4).contains(&count) {
        errors.push(format!(
            "Question ID: {question_id} / Field: choices / Error: 選択肢は2〜4個である必要があります（現在: {count}個）"
        ));
    }

    match value.get("answer").and_then(|v| v.as_u64()) {
        Some(answer) => {
            if answer as usize >= count {
                errors.push(format!(
                    "Question ID: {question_id} / Field: answer / Error: 回答インデックスが選択肢の範囲外です: {answer}（選択肢数: {count}）"
                ));
            }
        }
        None => {
            errors.push(format!(
                "Question ID: {question_id} / Field: answer / Error: 必須フィールドがありません（選択肢のインデックスを整数で指定してください）"
            ));
        }
    }
}

fn validate_true_false(value: &Value, question_id: &str, errors: &mut Vec<String>) {
    match value.get("answer") {
        Some(v) if v.is_boolean() => {}
        Some(_) => {
            errors.push(format!(
                "Question ID: {question_id} / Field: answer / Error: true または false である必要があります"
            ));
        }
        None => {
            errors.push(format!(
                "Question ID: {question_id} / Field: answer / Error: 必須フィールドがありません"
            ));
        }
    }
}

fn validate_text_input(value: &Value, question_id: &str, errors: &mut Vec<String>) {
    match value.get("answer").and_then(|v| v.as_str()) {
        Some(answer) if answer.is_empty() => {
            errors.push(format!(
                "Question ID: {question_id} / Field: answer / Error: 回答が空です"
            ));
        }
        Some(_) => {}
        None => {
            errors.push(format!(
                "Question ID: {question_id} / Field: answer / Error: 必須フィールドがありません"
            ));
        }
    }
}

fn validate_multi_select(value: &Value, question_id: &str, errors: &mut Vec<String>) {
    let choices = match value.get("choices").and_then(|v| v.as_array()) {
        Some(c) => c,
        None => {
            errors.push(format!(
                "Question ID: {question_id} / Field: choices / Error: 必須フィールドがありません"
            ));
            return;
        }
    };

    let count = choices.len();
    if !(2..=6).contains(&count) {
        errors.push(format!(
            "Question ID: {question_id} / Field: choices / Error: 選択肢は2〜6個である必要があります（現在: {count}個）"
        ));
    }

    match value.get("answer").and_then(|v| v.as_array()) {
        Some(answer_array) => {
            if answer_array.is_empty() {
                errors.push(format!(
                    "Question ID: {question_id} / Field: answer / Error: 回答配列は1個以上の要素が必要です"
                ));
            }

            let mut seen_indices: HashSet<u64> = HashSet::new();
            for (i, elem) in answer_array.iter().enumerate() {
                match elem.as_u64() {
                    Some(idx) => {
                        if idx as usize >= count {
                            errors.push(format!(
                                "Question ID: {question_id} / Field: answer[{i}] / Error: 回答インデックスが選択肢の範囲外です: {idx}（選択肢数: {count}）"
                            ));
                        }
                        if !seen_indices.insert(idx) {
                            errors.push(format!(
                                "Question ID: {question_id} / Field: answer / Error: 回答インデックスが重複しています: {idx}"
                            ));
                        }
                    }
                    None => {
                        errors.push(format!(
                            "Question ID: {question_id} / Field: answer[{i}] / Error: 回答インデックスは整数である必要があります"
                        ));
                    }
                }
            }
        }
        None => {
            errors.push(format!(
                "Question ID: {question_id} / Field: answer / Error: 必須フィールドがありません（選択肢のインデックスの配列で指定してください）"
            ));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::validate_question;

    #[test]
    fn validate_question_returns_parsed_multiple_choice_question() {
        let value = serde_json::json!({
            "id": "q1",
            "type": "multiple_choice",
            "question": "1+1は？",
            "choices": [
                { "text": "1" },
                { "text": "2" }
            ],
            "answer": 1
        });

        let question = validate_question(&value).expect("valid question should pass");

        match question {
            crate::models::Question::MultipleChoice { id, answer, .. } => {
                assert_eq!(id, "q1");
                assert_eq!(answer, 1);
            }
            _ => panic!("multiple_choice として解釈されるべき"),
        }
    }

    #[test]
    fn validate_question_returns_error_for_duplicate_multi_select_answers() {
        let value = serde_json::json!({
            "id": "q2",
            "type": "multi_select",
            "question": "正しいものを選べ",
            "choices": [
                { "text": "A" },
                { "text": "B" }
            ],
            "answer": [0, 0]
        });

        let err = validate_question(&value).expect_err("duplicate answers should fail");
        assert!(err.contains("回答インデックスが重複しています"), "error: {err}");
    }
}
