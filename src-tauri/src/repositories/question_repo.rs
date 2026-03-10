use std::error::Error;

use rusqlite::{params, Connection};

use crate::models::{Choice, Question, QuestionType};

type RepoResult<T> = Result<T, Box<dyn Error>>;

pub fn insert_questions(
    connection: &Connection,
    pack_id: &str,
    questions: &[Question],
) -> RepoResult<()> {
    let mut statement = connection.prepare(
        "INSERT INTO questions (
            id,
            pack_id,
            question_id,
            question_type,
            question_text,
            choices_json,
            correct_answer,
            explanation,
            sort_order
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9);",
    )?;

    for (index, question) in questions.iter().enumerate() {
        let row_id = format!("{pack_id}_{}", question.id());
        let question_type = question.question_type().as_db_value();
        let question_text = question.question_text();
        let choices_json = question.choices_json()?;
        let correct_answer = question.correct_answer();
        let explanation = question.explanation().unwrap_or_default();

        statement.execute(params![
            row_id,
            pack_id,
            question.id(),
            question_type,
            question_text,
            choices_json,
            correct_answer,
            explanation,
            index as i64
        ])?;
    }

    Ok(())
}

pub fn get_questions_by_pack(connection: &Connection, pack_id: &str) -> RepoResult<Vec<Question>> {
    let mut statement = connection.prepare(
        "SELECT question_id, question_type, question_text, choices_json, correct_answer, explanation
         FROM questions
         WHERE pack_id = ?1
         ORDER BY sort_order ASC, question_id ASC;",
    )?;

    let rows = statement.query_map([pack_id], |row| {
        let question_type: String = row.get(1)?;
        let explanation: String = row.get(5)?;

        let question = match question_type.as_str() {
            "multiple_choice" => {
                let choices_json: String = row.get(3)?;
                let choices =
                    serde_json::from_str::<Vec<Choice>>(&choices_json).map_err(|error| {
                        rusqlite::Error::FromSqlConversionFailure(
                            3,
                            rusqlite::types::Type::Text,
                            Box::new(error),
                        )
                    })?;
                Question::MultipleChoice {
                    id: row.get(0)?,
                    question: row.get(2)?,
                    choices,
                    answer: row.get(4)?,
                    explanation: if explanation.is_empty() {
                        None
                    } else {
                        Some(explanation)
                    },
                }
            }
            "true_false" => {
                let answer: String = row.get(4)?;
                Question::TrueFalse {
                    id: row.get(0)?,
                    question: row.get(2)?,
                    answer: answer == "true",
                    explanation: if explanation.is_empty() {
                        None
                    } else {
                        Some(explanation)
                    },
                }
            }
            "text_input" => Question::TextInput {
                id: row.get(0)?,
                question: row.get(2)?,
                answer: row.get(4)?,
                explanation: if explanation.is_empty() {
                    None
                } else {
                    Some(explanation)
                },
            },
            other => {
                return Err(rusqlite::Error::FromSqlConversionFailure(
                    1,
                    rusqlite::types::Type::Text,
                    format!("unknown question type: {other}").into(),
                ));
            }
        };

        Ok(question)
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

trait QuestionPersistenceExt {
    fn id(&self) -> &str;
    fn question_text(&self) -> &str;
    fn explanation(&self) -> Option<&str>;
    fn correct_answer(&self) -> String;
    fn choices_json(&self) -> Result<Option<String>, serde_json::Error>;
    fn question_type(&self) -> QuestionType;
}

impl QuestionPersistenceExt for Question {
    fn id(&self) -> &str {
        match self {
            Question::MultipleChoice { id, .. }
            | Question::TrueFalse { id, .. }
            | Question::TextInput { id, .. } => id,
        }
    }

    fn question_text(&self) -> &str {
        match self {
            Question::MultipleChoice { question, .. }
            | Question::TrueFalse { question, .. }
            | Question::TextInput { question, .. } => question,
        }
    }

    fn explanation(&self) -> Option<&str> {
        match self {
            Question::MultipleChoice { explanation, .. }
            | Question::TrueFalse { explanation, .. }
            | Question::TextInput { explanation, .. } => explanation.as_deref(),
        }
    }

    fn correct_answer(&self) -> String {
        match self {
            Question::MultipleChoice { answer, .. } | Question::TextInput { answer, .. } => {
                answer.clone()
            }
            Question::TrueFalse { answer, .. } => answer.to_string(),
        }
    }

    fn choices_json(&self) -> Result<Option<String>, serde_json::Error> {
        match self {
            Question::MultipleChoice { choices, .. } => serde_json::to_string(choices).map(Some),
            Question::TrueFalse { .. } | Question::TextInput { .. } => Ok(None),
        }
    }

    fn question_type(&self) -> QuestionType {
        match self {
            Question::MultipleChoice { .. } => QuestionType::MultipleChoice,
            Question::TrueFalse { .. } => QuestionType::TrueFalse,
            Question::TextInput { .. } => QuestionType::TextInput,
        }
    }
}

trait QuestionTypePersistenceExt {
    fn as_db_value(self) -> &'static str;
}

impl QuestionTypePersistenceExt for QuestionType {
    fn as_db_value(self) -> &'static str {
        match self {
            QuestionType::MultipleChoice => "multiple_choice",
            QuestionType::TrueFalse => "true_false",
            QuestionType::TextInput => "text_input",
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::repositories::quiz_pack_repo::insert_quiz_pack;
    use crate::repositories::test_helpers::{open_test_connection, sample_pack};

    use super::get_questions_by_pack;

    #[test]
    fn bulk_inserts_and_selects_questions_by_pack() {
        let connection = open_test_connection();
        let pack = sample_pack();

        insert_quiz_pack(&connection, &pack).expect("quiz pack should be inserted");
        super::insert_questions(&connection, &pack.id, &pack.questions)
            .expect("questions should be inserted");

        let stored =
            get_questions_by_pack(&connection, &pack.id).expect("questions should be loaded");

        assert_eq!(stored, pack.questions);
    }
}
