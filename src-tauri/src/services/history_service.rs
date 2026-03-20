use rusqlite::Connection;

use crate::models::{AnswerRecord, PackStatistics, Session, WeakQuestion};
use crate::repositories::history_repo;

/// 回答記録を1件保存する
pub fn save_answer_record(
    connection: &Connection,
    record: &AnswerRecord,
) -> Result<(), Box<dyn std::error::Error>> {
    history_repo::insert_answer_record(connection, record)
}

/// パックごとの学習履歴を取得する
pub fn get_learning_history(
    connection: &Connection,
    pack_id: &str,
) -> Result<Vec<AnswerRecord>, Box<dyn std::error::Error>> {
    history_repo::get_learning_history(connection, pack_id)
}

/// パック統計情報を集計する（正答率等）
pub fn get_pack_statistics(
    connection: &Connection,
    pack_id: &str,
) -> Result<PackStatistics, Box<dyn std::error::Error>> {
    history_repo::get_pack_statistics(connection, pack_id)
}

/// セッション一覧を取得する（session_id でグルーピング、新しい順）
pub fn get_sessions(
    connection: &Connection,
    pack_id: &str,
) -> Result<Vec<Session>, Box<dyn std::error::Error>> {
    history_repo::get_sessions(connection, pack_id)
}

/// 同一パックの過去セッションの最高正答率を取得する（現在のセッションを除外可能）
pub fn get_best_session_accuracy(
    connection: &Connection,
    pack_id: &str,
    exclude_session_id: Option<&str>,
) -> Result<Option<f64>, Box<dyn std::error::Error>> {
    history_repo::get_best_session_accuracy(connection, pack_id, exclude_session_id)
}

/// 弱点問題を抽出する（2回以上回答かつ直近5回の正答率80%未満、正答率の低い順）
pub fn get_weak_questions(
    connection: &Connection,
    pack_id: &str,
) -> Result<Vec<WeakQuestion>, Box<dyn std::error::Error>> {
    history_repo::get_weak_questions(connection, pack_id)
}

#[cfg(test)]
mod tests {
    use crate::repositories::question_repo::insert_questions;
    use crate::repositories::quiz_pack_repo::insert_quiz_pack;
    use crate::repositories::test_helpers::{open_test_connection, sample_history, sample_pack};

    use super::*;

    // --- save_answer_record ---

    #[test]
    fn saves_answer_record_and_retrieves_it() {
        let conn = open_test_connection();
        let pack = sample_pack();
        insert_quiz_pack(&conn, &pack).unwrap();
        insert_questions(&conn, &pack.id, &pack.questions).unwrap();

        let record = &sample_history()[0];
        save_answer_record(&conn, record).unwrap();

        let history = get_learning_history(&conn, &pack.id).unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].question_id, "q1");
        assert_eq!(history[0].user_answer, "0");
        assert!(!history[0].is_correct);
    }

    // --- get_learning_history ---

    #[test]
    fn returns_empty_history_for_unknown_pack() {
        let conn = open_test_connection();
        let history = get_learning_history(&conn, "nonexistent").unwrap();
        assert!(history.is_empty());
    }

    #[test]
    fn returns_history_in_chronological_order() {
        let conn = open_test_connection();
        let pack = sample_pack();
        insert_quiz_pack(&conn, &pack).unwrap();
        insert_questions(&conn, &pack.id, &pack.questions).unwrap();

        for record in &sample_history() {
            save_answer_record(&conn, record).unwrap();
        }

        let history = get_learning_history(&conn, &pack.id).unwrap();
        assert_eq!(history.len(), 5);
        // 時系列順であることを確認
        for i in 1..history.len() {
            assert!(history[i].answered_at >= history[i - 1].answered_at);
        }
    }

    // --- get_pack_statistics ---

    #[test]
    fn returns_zero_statistics_for_empty_pack() {
        let conn = open_test_connection();
        let stats = get_pack_statistics(&conn, "nonexistent").unwrap();
        assert_eq!(stats.total_answers, 0);
        assert_eq!(stats.correct_answers, 0);
        assert!((stats.accuracy_rate - 0.0).abs() < f64::EPSILON);
        assert_eq!(stats.weak_eligible_count, 0);
    }

    #[test]
    fn calculates_correct_statistics() {
        let conn = open_test_connection();
        let pack = sample_pack();
        insert_quiz_pack(&conn, &pack).unwrap();
        insert_questions(&conn, &pack.id, &pack.questions).unwrap();

        for record in &sample_history() {
            save_answer_record(&conn, record).unwrap();
        }

        let stats = get_pack_statistics(&conn, &pack.id).unwrap();
        assert_eq!(stats.pack_id, "security-pack");
        assert_eq!(stats.total_answers, 5);
        assert_eq!(stats.correct_answers, 2);
        assert!((stats.accuracy_rate - 0.4).abs() < f64::EPSILON);
        // sample_history: q1を2回、q2を2回、q3を1回回答 → 2回以上はq1, q2の2問
        assert_eq!(stats.weak_eligible_count, 2);
    }

    // --- get_weak_questions ---

    #[test]
    fn returns_no_weak_questions_when_all_answered_once() {
        let conn = open_test_connection();
        let pack = sample_pack();
        insert_quiz_pack(&conn, &pack).unwrap();
        insert_questions(&conn, &pack.id, &pack.questions).unwrap();

        // q3のみ1回回答 → 2回以上の条件を満たさない
        save_answer_record(&conn, &sample_history()[4]).unwrap();

        let weak = get_weak_questions(&conn, &pack.id).unwrap();
        assert!(weak.is_empty());
    }

    // --- get_best_session_accuracy ---

    #[test]
    fn returns_none_for_best_accuracy_when_no_sessions() {
        let conn = open_test_connection();
        let best = get_best_session_accuracy(&conn, "nonexistent", None).unwrap();
        assert!(best.is_none());
    }

    #[test]
    fn returns_best_accuracy_excluding_current_session() {
        let conn = open_test_connection();
        let pack = sample_pack();
        insert_quiz_pack(&conn, &pack).unwrap();
        insert_questions(&conn, &pack.id, &pack.questions).unwrap();

        // 過去セッション: 1問中1問正解 = 100%
        save_answer_record(
            &conn,
            &crate::models::AnswerRecord {
                pack_id: "security-pack".to_string(),
                question_id: "q1".to_string(),
                is_correct: true,
                user_answer: "1".to_string(),
                answered_at: "2026-03-10T10:00:00Z".to_string(),
                session_id: "past-session".to_string(),
            },
        )
        .unwrap();

        let best =
            get_best_session_accuracy(&conn, &pack.id, Some("current-session")).unwrap();
        assert!(best.is_some());
        assert!((best.unwrap() - 1.0).abs() < f64::EPSILON);
    }

    #[test]
    fn returns_weak_questions_sorted_by_accuracy_asc() {
        let conn = open_test_connection();
        let pack = sample_pack();
        insert_quiz_pack(&conn, &pack).unwrap();
        insert_questions(&conn, &pack.id, &pack.questions).unwrap();

        for record in &sample_history() {
            save_answer_record(&conn, record).unwrap();
        }

        let weak = get_weak_questions(&conn, &pack.id).unwrap();
        // q2: 0/2 = 0.0, q1: 1/2 = 0.5（q3は1回のみなので除外）
        assert_eq!(weak.len(), 2);
        assert_eq!(weak[0].question_id, "q2");
        assert!((weak[0].accuracy_rate - 0.0).abs() < f64::EPSILON);
        assert_eq!(weak[0].answer_count, 2);
        assert_eq!(weak[0].last_user_answer, "false");

        assert_eq!(weak[1].question_id, "q1");
        assert!((weak[1].accuracy_rate - 0.5).abs() < f64::EPSILON);
        assert_eq!(weak[1].answer_count, 2);
    }
}
