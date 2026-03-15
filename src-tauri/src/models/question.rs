use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QuestionType {
    MultipleChoice,
    TrueFalse,
    TextInput,
    MultiSelect,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Choice {
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Question {
    MultipleChoice {
        id: String,
        question: String,
        choices: Vec<Choice>,
        answer: usize,
        explanation: Option<String>,
    },
    TrueFalse {
        id: String,
        question: String,
        answer: bool,
        explanation: Option<String>,
    },
    TextInput {
        id: String,
        question: String,
        answer: String,
        explanation: Option<String>,
    },
    MultiSelect {
        id: String,
        question: String,
        choices: Vec<Choice>,
        answer: Vec<usize>,
        explanation: Option<String>,
    },
}

#[cfg(test)]
mod tests {
    use super::{Choice, Question};

    #[test]
    fn true_false_questionをbooleanのanswerでデシリアライズできる() {
        let json = r#"{
            "id": "security-001",
            "type": "true_false",
            "question": "TLSは暗号化通信に使われる",
            "answer": true,
            "explanation": "Web通信の保護に使われる"
        }"#;

        let result = serde_json::from_str::<Question>(json);

        assert!(
            result.is_ok(),
            "true_false問題はbooleanのanswerを受け付ける必要がある"
        );
    }

    #[test]
    fn multi_select_questionを配列のanswerでデシリアライズできる() {
        let json = r#"{
            "id": "ms-001",
            "type": "multi_select",
            "question": "暗号化プロトコルはどれか？",
            "choices": [
                {"text": "TLS"},
                {"text": "HTTP"},
                {"text": "IPsec"},
                {"text": "DNS"}
            ],
            "answer": [0, 2],
            "explanation": "TLSとIPsecは暗号化プロトコル"
        }"#;

        let result = serde_json::from_str::<Question>(json);

        assert!(
            result.is_ok(),
            "multi_select問題は配列のanswerを受け付ける必要がある: {:?}",
            result.err()
        );

        match result.unwrap() {
            Question::MultiSelect { answer, choices, .. } => {
                assert_eq!(answer, vec![0, 2]);
                assert_eq!(choices.len(), 4);
            }
            _ => panic!("multi_selectとしてデシリアライズされるべき"),
        }
    }

    #[test]
    fn multi_select_questionを期待するjson形状でシリアライズできる() {
        let question = Question::MultiSelect {
            id: "ms-001".to_string(),
            question: "暗号化プロトコルはどれか？".to_string(),
            choices: vec![
                Choice { text: "TLS".to_string() },
                Choice { text: "HTTP".to_string() },
            ],
            answer: vec![0],
            explanation: None,
        };

        let value = serde_json::to_value(&question).expect("multi_select問題をシリアライズできること");
        assert_eq!(value["type"], "multi_select");
        assert_eq!(value["answer"], serde_json::json!([0]));
    }

    #[test]
    fn multiple_choice_questionを期待するjson形状でシリアライズできる() {
        let question = Question::MultipleChoice {
            id: "network-001".to_string(),
            question: "AESの鍵長として一般的なものはどれか".to_string(),
            choices: vec![
                Choice {
                    text: "128ビット".to_string(),
                },
                Choice {
                    text: "256ビット".to_string(),
                },
            ],
            answer: 1,
            explanation: Some("AES-256が代表例".to_string()),
        };

        let value =
            serde_json::to_value(&question).expect("multiple_choice問題をシリアライズできること");

        assert_eq!(value["type"], "multiple_choice");
        assert_eq!(value["id"], "network-001");
        assert_eq!(value["question"], "AESの鍵長として一般的なものはどれか");
        assert_eq!(value["answer"], 1);
        assert_eq!(
            value["choices"].as_array().map(|choices| choices.len()),
            Some(2)
        );
    }
}
