use std::error::Error;

use rusqlite::{params, Connection, OptionalExtension};

use crate::models::{QuizPack, QuizPackSummary};

use super::question_repo;

type RepoResult<T> = Result<T, Box<dyn Error>>;

pub fn insert_quiz_pack(connection: &Connection, pack: &QuizPack) -> RepoResult<()> {
    connection.execute(
        "INSERT INTO quiz_packs (id, name, description, question_count, imported_at)
         VALUES (?1, ?2, ?3, ?4, ?5);",
        params![
            pack.id,
            pack.name,
            pack.description.as_deref().unwrap_or(""),
            pack.questions.len() as i64,
            pack.imported_at
        ],
    )?;

    Ok(())
}

pub fn list_quiz_packs(connection: &Connection) -> RepoResult<Vec<QuizPackSummary>> {
    let mut statement = connection.prepare(
        "SELECT
            qp.id,
            qp.name,
            qp.description,
            qp.question_count,
            qp.imported_at,
            MAX(lh.answered_at) AS last_studied_at
         FROM quiz_packs qp
         LEFT JOIN learning_history lh ON lh.pack_id = qp.id
         GROUP BY qp.id, qp.name, qp.description, qp.question_count, qp.imported_at
         ORDER BY qp.imported_at DESC, qp.id ASC;",
    )?;

    let rows = statement.query_map([], |row| {
        let description: String = row.get(2)?;
        Ok(QuizPackSummary {
            id: row.get(0)?,
            name: row.get(1)?,
            description: if description.is_empty() {
                None
            } else {
                Some(description)
            },
            question_count: row.get::<_, i64>(3)? as usize,
            imported_at: row.get(4)?,
            last_studied_at: row.get(5)?,
        })
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

pub fn get_quiz_pack(connection: &Connection, pack_id: &str) -> RepoResult<Option<QuizPack>> {
    let pack = connection
        .query_row(
            "SELECT id, name, description, imported_at
             FROM quiz_packs
             WHERE id = ?1;",
            [pack_id],
            |row| {
                let description: String = row.get(2)?;
                Ok(QuizPack {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: if description.is_empty() {
                        None
                    } else {
                        Some(description)
                    },
                    imported_at: row.get(3)?,
                    questions: Vec::new(),
                })
            },
        )
        .optional()?;

    match pack {
        Some(mut pack) => {
            pack.questions = question_repo::get_questions_by_pack(connection, &pack.id)?;
            Ok(Some(pack))
        }
        None => Ok(None),
    }
}

pub fn delete_quiz_pack(connection: &Connection, pack_id: &str) -> RepoResult<()> {
    connection.execute("DELETE FROM quiz_packs WHERE id = ?1;", [pack_id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::repositories::question_repo;
    use crate::repositories::test_helpers::{open_test_connection, sample_pack};

    use super::{delete_quiz_pack, get_quiz_pack, insert_quiz_pack, list_quiz_packs};

    #[test]
    fn inserts_and_lists_and_gets_quiz_pack() {
        let connection = open_test_connection();
        let pack = sample_pack();

        insert_quiz_pack(&connection, &pack).expect("quiz pack should be inserted");
        question_repo::insert_questions(&connection, &pack.id, &pack.questions)
            .expect("questions should be inserted");

        let summaries = list_quiz_packs(&connection).expect("quiz pack list should be returned");
        assert_eq!(summaries.len(), 1);
        assert_eq!(summaries[0].id, pack.id);
        assert_eq!(summaries[0].question_count, 3);
        assert_eq!(summaries[0].last_studied_at, None);

        let stored = get_quiz_pack(&connection, "security-pack")
            .expect("quiz pack lookup should succeed")
            .expect("quiz pack should exist");
        assert_eq!(stored.name, pack.name);
        assert_eq!(stored.description, pack.description);
        assert_eq!(stored.questions, pack.questions);
    }

    #[test]
    fn deletes_quiz_pack_and_cascades_questions_and_history() {
        let connection = open_test_connection();
        let pack = sample_pack();

        insert_quiz_pack(&connection, &pack).expect("quiz pack should be inserted");
        question_repo::insert_questions(&connection, &pack.id, &pack.questions)
            .expect("questions should be inserted");

        crate::repositories::history_repo::insert_answer_record(
            &connection,
            &crate::repositories::test_helpers::sample_history()[0],
        )
        .expect("history should be inserted");

        delete_quiz_pack(&connection, &pack.id).expect("quiz pack delete should succeed");

        let remaining_questions: i64 = connection
            .query_row("SELECT COUNT(*) FROM questions;", [], |row| row.get(0))
            .expect("question count should be readable");
        let remaining_history: i64 = connection
            .query_row("SELECT COUNT(*) FROM learning_history;", [], |row| {
                row.get(0)
            })
            .expect("history count should be readable");

        assert_eq!(remaining_questions, 0);
        assert_eq!(remaining_history, 0);
        assert!(get_quiz_pack(&connection, &pack.id)
            .expect("lookup after delete should succeed")
            .is_none());
    }
}
