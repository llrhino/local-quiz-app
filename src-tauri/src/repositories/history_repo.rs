use std::error::Error;

use rusqlite::{params, Connection};

use crate::models::{AnswerRecord, PackStatistics, WeakQuestion};

type RepoResult<T> = Result<T, Box<dyn Error>>;

pub fn insert_answer_record(connection: &Connection, record: &AnswerRecord) -> RepoResult<()> {
    connection.execute(
        "INSERT INTO learning_history (pack_id, question_id, is_correct, user_answer, answered_at)
         VALUES (?1, ?2, ?3, ?4, ?5);",
        params![
            record.pack_id,
            record.question_id,
            if record.is_correct { 1 } else { 0 },
            record.user_answer,
            record.answered_at
        ],
    )?;

    Ok(())
}

pub fn get_learning_history(
    connection: &Connection,
    pack_id: &str,
) -> RepoResult<Vec<AnswerRecord>> {
    let mut statement = connection.prepare(
        "SELECT pack_id, question_id, is_correct, user_answer, answered_at
         FROM learning_history
         WHERE pack_id = ?1
         ORDER BY answered_at ASC, id ASC;",
    )?;

    let rows = statement.query_map([pack_id], |row| {
        Ok(AnswerRecord {
            pack_id: row.get(0)?,
            question_id: row.get(1)?,
            is_correct: row.get::<_, i64>(2)? != 0,
            user_answer: row.get(3)?,
            answered_at: row.get(4)?,
        })
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

pub fn get_pack_statistics(connection: &Connection, pack_id: &str) -> RepoResult<PackStatistics> {
    let (total_answers, correct_answers): (i64, i64) = connection.query_row(
        "SELECT COUNT(*), COALESCE(SUM(is_correct), 0)
         FROM learning_history
         WHERE pack_id = ?1;",
        [pack_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;

    let accuracy_rate = if total_answers == 0 {
        0.0
    } else {
        correct_answers as f64 / total_answers as f64
    };

    Ok(PackStatistics {
        pack_id: pack_id.to_string(),
        total_answers: total_answers as usize,
        correct_answers: correct_answers as usize,
        accuracy_rate,
    })
}

/// 弱点問題を抽出する。
/// 抽出条件: 全期間の回答回数が2回以上 かつ 直近5回の正答率が80%未満の問題。
/// 回答数が2〜4回の場合は、その全回答を「直近N回」として扱う（閾値は同じ80%未満）。
/// accuracy_rate は直近5回の正答率、answer_count は全期間の回答回数。
/// 正答率の低い順に返す。
pub fn get_weak_questions(connection: &Connection, pack_id: &str) -> RepoResult<Vec<WeakQuestion>> {
    let mut statement = connection.prepare(
        "WITH ranked AS (
            SELECT
                pack_id,
                question_id,
                is_correct,
                ROW_NUMBER() OVER (
                    PARTITION BY pack_id, question_id
                    ORDER BY answered_at DESC, id DESC
                ) AS rn
            FROM learning_history
            WHERE pack_id = ?1
         ),
         total_counts AS (
            SELECT
                question_id,
                COUNT(*) AS answer_count
            FROM learning_history
            WHERE pack_id = ?1
            GROUP BY question_id
            HAVING COUNT(*) >= 2
         ),
         recent_stats AS (
            SELECT
                r.question_id,
                CAST(COALESCE(SUM(r.is_correct), 0) AS REAL) / COUNT(*) AS accuracy_rate
            FROM ranked r
            WHERE r.rn <= 5
            GROUP BY r.question_id
         )
         SELECT
            tc.question_id,
            q.question_text,
            tc.answer_count,
            rs.accuracy_rate,
            (
                SELECT lh2.user_answer
                FROM learning_history lh2
                WHERE lh2.pack_id = ?1
                  AND lh2.question_id = tc.question_id
                ORDER BY lh2.answered_at DESC, lh2.id DESC
                LIMIT 1
            ) AS last_user_answer
         FROM total_counts tc
         JOIN recent_stats rs ON rs.question_id = tc.question_id
         JOIN questions q ON q.pack_id = ?1 AND q.question_id = tc.question_id
         WHERE rs.accuracy_rate < 0.8
         ORDER BY rs.accuracy_rate ASC, tc.answer_count DESC, tc.question_id ASC;",
    )?;

    let rows = statement.query_map([pack_id], |row| {
        Ok(WeakQuestion {
            question_id: row.get(0)?,
            question_text: row.get(1)?,
            answer_count: row.get::<_, i64>(2)? as usize,
            accuracy_rate: row.get(3)?,
            last_user_answer: row.get(4)?,
        })
    })?;

    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

#[cfg(test)]
mod tests {
    use crate::repositories::question_repo::insert_questions;
    use crate::repositories::quiz_pack_repo::insert_quiz_pack;
    use crate::repositories::test_helpers::{open_test_connection, sample_history, sample_pack};

    use super::{
        get_learning_history, get_pack_statistics, get_weak_questions, insert_answer_record,
    };

    #[test]
    fn inserts_and_lists_learning_history_in_answer_order() {
        let connection = open_test_connection();
        let pack = sample_pack();
        let history = sample_history();

        insert_quiz_pack(&connection, &pack).expect("quiz pack should be inserted");
        insert_questions(&connection, &pack.id, &pack.questions)
            .expect("questions should be inserted");

        for record in &history {
            insert_answer_record(&connection, record).expect("history should be inserted");
        }

        let stored =
            get_learning_history(&connection, &pack.id).expect("history should be returned");

        assert_eq!(stored.len(), history.len());
        assert_eq!(stored[0].answered_at, "2026-03-10T10:00:00Z");
        assert_eq!(stored[4].answered_at, "2026-03-10T10:20:00Z");
    }

    #[test]
    fn aggregates_pack_statistics_and_weak_questions() {
        let connection = open_test_connection();
        let pack = sample_pack();
        let history = sample_history();

        insert_quiz_pack(&connection, &pack).expect("quiz pack should be inserted");
        insert_questions(&connection, &pack.id, &pack.questions)
            .expect("questions should be inserted");

        for record in &history {
            insert_answer_record(&connection, record).expect("history should be inserted");
        }

        let statistics =
            get_pack_statistics(&connection, &pack.id).expect("statistics should be returned");
        assert_eq!(statistics.pack_id, pack.id);
        assert_eq!(statistics.total_answers, 5);
        assert_eq!(statistics.correct_answers, 2);
        assert!((statistics.accuracy_rate - 0.4).abs() < f64::EPSILON);

        let weak_questions =
            get_weak_questions(&connection, &pack.id).expect("weak questions should be returned");
        assert_eq!(weak_questions.len(), 2);
        assert_eq!(weak_questions[0].question_id, "q2");
        assert_eq!(
            weak_questions[0].question_text,
            "TLS は暗号化通信に使われる"
        );
        assert_eq!(weak_questions[0].answer_count, 2);
        assert!((weak_questions[0].accuracy_rate - 0.0).abs() < f64::EPSILON);
        assert_eq!(weak_questions[0].last_user_answer, "false");
        assert_eq!(weak_questions[1].question_id, "q1");
        assert!((weak_questions[1].accuracy_rate - 0.5).abs() < f64::EPSILON);
    }

    #[test]
    fn excludes_questions_with_perfect_accuracy_from_weak_questions() {
        let connection = open_test_connection();
        let pack = sample_pack();

        insert_quiz_pack(&connection, &pack).expect("quiz pack should be inserted");
        insert_questions(&connection, &pack.id, &pack.questions)
            .expect("questions should be inserted");

        // q1: 2回正解（正答率100%）→ 弱点に含めない
        for _ in 0..2 {
            insert_answer_record(
                &connection,
                &crate::models::AnswerRecord {
                    pack_id: "security-pack".to_string(),
                    question_id: "q1".to_string(),
                    is_correct: true,
                    user_answer: "1".to_string(),
                    answered_at: "2026-03-10T10:00:00Z".to_string(),
                },
            )
            .expect("history should be inserted");
        }

        // q2: 2回不正解（正答率0%）→ 弱点に含める
        for _ in 0..2 {
            insert_answer_record(
                &connection,
                &crate::models::AnswerRecord {
                    pack_id: "security-pack".to_string(),
                    question_id: "q2".to_string(),
                    is_correct: false,
                    user_answer: "false".to_string(),
                    answered_at: "2026-03-10T10:05:00Z".to_string(),
                },
            )
            .expect("history should be inserted");
        }

        let weak = get_weak_questions(&connection, &pack.id)
            .expect("weak questions should be returned");

        assert_eq!(weak.len(), 1, "正答率100%のq1は弱点に含まれないこと");
        assert_eq!(weak[0].question_id, "q2");
    }

    /// 直近5回全正解で弱点から「卒業」するパターン。
    /// 全10回のうち前半5回は不正解、後半5回は正解 → 直近5回の正答率100% → 弱点ではない。
    #[test]
    fn graduates_from_weak_when_recent_five_are_all_correct() {
        let connection = open_test_connection();
        let pack = sample_pack();

        insert_quiz_pack(&connection, &pack).expect("quiz pack should be inserted");
        insert_questions(&connection, &pack.id, &pack.questions)
            .expect("questions should be inserted");

        // q1: 前半5回不正解
        for i in 0..5 {
            insert_answer_record(
                &connection,
                &crate::models::AnswerRecord {
                    pack_id: "security-pack".to_string(),
                    question_id: "q1".to_string(),
                    is_correct: false,
                    user_answer: "0".to_string(),
                    answered_at: format!("2026-03-10T10:{:02}:00Z", i),
                },
            )
            .expect("history should be inserted");
        }
        // q1: 後半5回正解
        for i in 5..10 {
            insert_answer_record(
                &connection,
                &crate::models::AnswerRecord {
                    pack_id: "security-pack".to_string(),
                    question_id: "q1".to_string(),
                    is_correct: true,
                    user_answer: "1".to_string(),
                    answered_at: format!("2026-03-10T10:{:02}:00Z", i),
                },
            )
            .expect("history should be inserted");
        }

        let weak = get_weak_questions(&connection, &pack.id)
            .expect("weak questions should be returned");

        assert!(
            weak.is_empty(),
            "直近5回全正解なら弱点から卒業すること"
        );
    }

    /// 直近5回の正答率がちょうど80%（4/5）の場合は弱点ではない。
    #[test]
    fn not_weak_when_recent_accuracy_is_exactly_eighty_percent() {
        let connection = open_test_connection();
        let pack = sample_pack();

        insert_quiz_pack(&connection, &pack).expect("quiz pack should be inserted");
        insert_questions(&connection, &pack.id, &pack.questions)
            .expect("questions should be inserted");

        // q1: 1回不正解 + 4回正解 = 4/5 = 80%
        insert_answer_record(
            &connection,
            &crate::models::AnswerRecord {
                pack_id: "security-pack".to_string(),
                question_id: "q1".to_string(),
                is_correct: false,
                user_answer: "0".to_string(),
                answered_at: "2026-03-10T10:00:00Z".to_string(),
            },
        )
        .expect("history should be inserted");

        for i in 1..5 {
            insert_answer_record(
                &connection,
                &crate::models::AnswerRecord {
                    pack_id: "security-pack".to_string(),
                    question_id: "q1".to_string(),
                    is_correct: true,
                    user_answer: "1".to_string(),
                    answered_at: format!("2026-03-10T10:{:02}:00Z", i),
                },
            )
            .expect("history should be inserted");
        }

        let weak = get_weak_questions(&connection, &pack.id)
            .expect("weak questions should be returned");

        assert!(
            weak.is_empty(),
            "直近5回の正答率80%は弱点ではないこと"
        );
    }

    /// 直近5回の正答率が60%（3/5）の場合は弱点である。
    #[test]
    fn weak_when_recent_accuracy_is_sixty_percent() {
        let connection = open_test_connection();
        let pack = sample_pack();

        insert_quiz_pack(&connection, &pack).expect("quiz pack should be inserted");
        insert_questions(&connection, &pack.id, &pack.questions)
            .expect("questions should be inserted");

        // q1: 2回不正解 + 3回正解 = 3/5 = 60%
        for i in 0..2 {
            insert_answer_record(
                &connection,
                &crate::models::AnswerRecord {
                    pack_id: "security-pack".to_string(),
                    question_id: "q1".to_string(),
                    is_correct: false,
                    user_answer: "0".to_string(),
                    answered_at: format!("2026-03-10T10:{:02}:00Z", i),
                },
            )
            .expect("history should be inserted");
        }
        for i in 2..5 {
            insert_answer_record(
                &connection,
                &crate::models::AnswerRecord {
                    pack_id: "security-pack".to_string(),
                    question_id: "q1".to_string(),
                    is_correct: true,
                    user_answer: "1".to_string(),
                    answered_at: format!("2026-03-10T10:{:02}:00Z", i),
                },
            )
            .expect("history should be inserted");
        }

        let weak = get_weak_questions(&connection, &pack.id)
            .expect("weak questions should be returned");

        assert_eq!(weak.len(), 1, "直近5回の正答率60%は弱点であること");
        assert_eq!(weak[0].question_id, "q1");
        assert!((weak[0].accuracy_rate - 0.6).abs() < f64::EPSILON);
        assert_eq!(weak[0].answer_count, 5);
    }

    /// 回答数が2〜4回の場合、その全回答を「直近N回」として扱う。
    /// answer_countは全期間の回答回数を返す。
    #[test]
    fn uses_all_answers_as_recent_when_fewer_than_five() {
        let connection = open_test_connection();
        let pack = sample_pack();

        insert_quiz_pack(&connection, &pack).expect("quiz pack should be inserted");
        insert_questions(&connection, &pack.id, &pack.questions)
            .expect("questions should be inserted");

        // q1: 3回回答、1回正解2回不正解 = 1/3 ≈ 33% → 弱点
        insert_answer_record(
            &connection,
            &crate::models::AnswerRecord {
                pack_id: "security-pack".to_string(),
                question_id: "q1".to_string(),
                is_correct: true,
                user_answer: "1".to_string(),
                answered_at: "2026-03-10T10:00:00Z".to_string(),
            },
        )
        .expect("history should be inserted");
        for i in 1..3 {
            insert_answer_record(
                &connection,
                &crate::models::AnswerRecord {
                    pack_id: "security-pack".to_string(),
                    question_id: "q1".to_string(),
                    is_correct: false,
                    user_answer: "0".to_string(),
                    answered_at: format!("2026-03-10T10:{:02}:00Z", i),
                },
            )
            .expect("history should be inserted");
        }

        let weak = get_weak_questions(&connection, &pack.id)
            .expect("weak questions should be returned");

        assert_eq!(weak.len(), 1);
        assert_eq!(weak[0].question_id, "q1");
        assert_eq!(weak[0].answer_count, 3);
        // 正答率は全回答（=直近N回と同じ）で計算される
        assert!((weak[0].accuracy_rate - 1.0 / 3.0).abs() < f64::EPSILON);
    }

    /// accuracy_rateが直近5回ベースであることを確認する。
    /// 全期間では50%だが、直近5回では80%なら弱点ではない。
    #[test]
    fn accuracy_rate_is_based_on_recent_five_not_all_time() {
        let connection = open_test_connection();
        let pack = sample_pack();

        insert_quiz_pack(&connection, &pack).expect("quiz pack should be inserted");
        insert_questions(&connection, &pack.id, &pack.questions)
            .expect("questions should be inserted");

        // q1: 前半5回不正解、後半5回のうち4回正解1回不正解
        // 全期間: 4/10 = 40%, 直近5回: 4/5 = 80%
        for i in 0..5 {
            insert_answer_record(
                &connection,
                &crate::models::AnswerRecord {
                    pack_id: "security-pack".to_string(),
                    question_id: "q1".to_string(),
                    is_correct: false,
                    user_answer: "0".to_string(),
                    answered_at: format!("2026-03-10T10:{:02}:00Z", i),
                },
            )
            .expect("history should be inserted");
        }
        // 6番目: 不正解
        insert_answer_record(
            &connection,
            &crate::models::AnswerRecord {
                pack_id: "security-pack".to_string(),
                question_id: "q1".to_string(),
                is_correct: false,
                user_answer: "0".to_string(),
                answered_at: "2026-03-10T10:05:00Z".to_string(),
            },
        )
        .expect("history should be inserted");
        // 7-10番目: 正解
        for i in 6..10 {
            insert_answer_record(
                &connection,
                &crate::models::AnswerRecord {
                    pack_id: "security-pack".to_string(),
                    question_id: "q1".to_string(),
                    is_correct: true,
                    user_answer: "1".to_string(),
                    answered_at: format!("2026-03-10T10:{:02}:00Z", i),
                },
            )
            .expect("history should be inserted");
        }

        let weak = get_weak_questions(&connection, &pack.id)
            .expect("weak questions should be returned");

        // 直近5回: 1不正解 + 4正解 = 80% → 弱点ではない
        assert!(
            weak.is_empty(),
            "直近5回の正答率が80%なら弱点ではないこと（全期間では40%でも）"
        );
    }
}
