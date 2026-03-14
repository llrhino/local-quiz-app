use rusqlite::Connection;

use crate::models::{AnswerRecord, PackStatistics, WeakQuestion};
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

/// 弱点問題を抽出する（2回以上回答かつ正答率の低い順）
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
