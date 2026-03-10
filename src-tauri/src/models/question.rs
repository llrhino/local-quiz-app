use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QuestionType {
    MultipleChoice,
    TrueFalse,
    TextInput,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Choice {
    pub id: String,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Question {
    MultipleChoice {
        id: String,
        question: String,
        choices: Vec<Choice>,
        answer: String,
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

        assert!(result.is_ok(), "true_false問題はbooleanのanswerを受け付ける必要がある");
    }

    #[test]
    fn multiple_choice_questionを期待するjson形状でシリアライズできる() {
        let question = Question::MultipleChoice {
            id: "network-001".to_string(),
            question: "AESの鍵長として一般的なものはどれか".to_string(),
            choices: vec![
                Choice {
                    id: "a".to_string(),
                    text: "128ビット".to_string(),
                },
                Choice {
                    id: "b".to_string(),
                    text: "256ビット".to_string(),
                },
            ],
            answer: "b".to_string(),
            explanation: Some("AES-256が代表例".to_string()),
        };

        let value = serde_json::to_value(&question).expect("multiple_choice問題をシリアライズできること");

        assert_eq!(value["type"], "multiple_choice");
        assert_eq!(value["id"], "network-001");
        assert_eq!(value["question"], "AESの鍵長として一般的なものはどれか");
        assert_eq!(value["answer"], "b");
        assert_eq!(value["choices"].as_array().map(|choices| choices.len()), Some(2));
    }
}
