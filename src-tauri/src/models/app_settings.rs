use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub question_order: String,
    pub theme: String,
    pub shuffle_choices: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            question_order: "sequential".to_string(),
            theme: "light".to_string(),
            shuffle_choices: "false".to_string(),
        }
    }
}
