use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerRecord {
    pub pack_id: String,
    pub question_id: String,
    pub is_correct: bool,
    pub user_answer: String,
    pub answered_at: String,
    pub session_id: String,
}

/// セッション単位の集計結果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub session_id: String,
    pub started_at: String,
    pub total_answers: usize,
    pub correct_answers: usize,
    pub accuracy_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackStatistics {
    pub pack_id: String,
    pub total_answers: usize,
    pub correct_answers: usize,
    pub accuracy_rate: f64,
    /// 弱点判定対象の問題数（回答2回以上の問題数）
    pub weak_eligible_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeakQuestion {
    pub question_id: String,
    pub question_text: String,
    pub answer_count: usize,
    pub accuracy_rate: f64,
    pub last_user_answer: String,
    pub question_type: String,
    pub correct_answer: String,
    pub choices_json: Option<String>,
    pub explanation: Option<String>,
    pub last_is_correct: bool,
}
