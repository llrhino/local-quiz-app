use serde::{Deserialize, Serialize};

use super::Question;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuizPack {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub source: String,
    pub imported_at: String,
    pub updated_at: Option<String>,
    pub questions: Vec<Question>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuizPackSummary {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub source: String,
    pub question_count: usize,
    pub imported_at: String,
    pub updated_at: Option<String>,
    pub last_studied_at: Option<String>,
    pub all_correct: bool,
    pub correct_rate: Option<f64>,
}
