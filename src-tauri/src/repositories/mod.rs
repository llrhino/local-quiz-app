pub mod history_repo;
pub mod question_repo;
pub mod quiz_pack_repo;
pub mod settings_repo;

#[cfg(test)]
pub(crate) mod test_helpers {
    use rusqlite::Connection;

    use crate::db::migrations;
    use crate::models::{AnswerRecord, AppSettings, Choice, Question, QuizPack};

    pub fn open_test_connection() -> Connection {
        let connection = Connection::open_in_memory().expect("in-memory database should open");
        connection
            .pragma_update(None, "foreign_keys", true)
            .expect("foreign_keys should be enabled");
        migrations::run(&connection).expect("migrations should succeed");
        connection
    }

    pub fn sample_pack() -> QuizPack {
        QuizPack {
            id: "security-pack".to_string(),
            name: "セキュリティ基礎".to_string(),
            description: Some("基本用語の確認".to_string()),
            imported_at: "2026-03-10T09:00:00Z".to_string(),
            questions: vec![
                Question::MultipleChoice {
                    id: "q1".to_string(),
                    question: "AESで一般的な鍵長はどれか".to_string(),
                    choices: vec![
                        Choice {
                            text: "64ビット".to_string(),
                        },
                        Choice {
                            text: "256ビット".to_string(),
                        },
                    ],
                    answer: 1,
                    explanation: Some("AES-256 が代表例".to_string()),
                },
                Question::TrueFalse {
                    id: "q2".to_string(),
                    question: "TLS は暗号化通信に使われる".to_string(),
                    answer: true,
                    explanation: Some("Web 通信保護に使われる".to_string()),
                },
                Question::TextInput {
                    id: "q3".to_string(),
                    question: "公開鍵暗号の代表例を1つ答えよ".to_string(),
                    answer: "RSA".to_string(),
                    explanation: None,
                },
            ],
        }
    }

    pub fn sample_history() -> Vec<AnswerRecord> {
        vec![
            AnswerRecord {
                pack_id: "security-pack".to_string(),
                question_id: "q1".to_string(),
                is_correct: false,
                user_answer: "0".to_string(),
                answered_at: "2026-03-10T10:00:00Z".to_string(),
            },
            AnswerRecord {
                pack_id: "security-pack".to_string(),
                question_id: "q1".to_string(),
                is_correct: true,
                user_answer: "1".to_string(),
                answered_at: "2026-03-10T10:05:00Z".to_string(),
            },
            AnswerRecord {
                pack_id: "security-pack".to_string(),
                question_id: "q2".to_string(),
                is_correct: false,
                user_answer: "false".to_string(),
                answered_at: "2026-03-10T10:10:00Z".to_string(),
            },
            AnswerRecord {
                pack_id: "security-pack".to_string(),
                question_id: "q2".to_string(),
                is_correct: false,
                user_answer: "false".to_string(),
                answered_at: "2026-03-10T10:15:00Z".to_string(),
            },
            AnswerRecord {
                pack_id: "security-pack".to_string(),
                question_id: "q3".to_string(),
                is_correct: true,
                user_answer: "RSA".to_string(),
                answered_at: "2026-03-10T10:20:00Z".to_string(),
            },
        ]
    }

    pub fn default_settings() -> AppSettings {
        AppSettings {
            question_order: "sequential".to_string(),
            theme: "light".to_string(),
            shuffle_choices: "false".to_string(),
        }
    }
}
