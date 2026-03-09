use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerRecord {
    pub pack_id: String,
    pub question_id: String,
    pub is_correct: bool,
    pub user_answer: String,
    pub answered_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackStatistics {
    pub pack_id: String,
    pub total_answers: usize,
    pub correct_answers: usize,
    pub accuracy_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeakQuestion {
    pub question_id: String,
    pub question_text: String,
    pub answer_count: usize,
    pub accuracy_rate: f64,
    pub last_user_answer: String,
}
