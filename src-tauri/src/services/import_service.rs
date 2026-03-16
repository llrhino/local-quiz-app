use std::path::Path;

use rusqlite::Connection;
use serde::Deserialize;

use crate::models::QuizPack;
use crate::repositories::{question_repo, quiz_pack_repo};
use crate::services::validation_service::validate_questions;

/// JSONファイルのトップレベル構造
#[derive(Debug, Deserialize)]
struct RawQuizPackFile {
    pack: RawPackInfo,
    questions: Vec<serde_json::Value>,
}

/// JSONファイル内の pack オブジェクト
#[derive(Debug, Deserialize)]
struct RawPackInfo {
    id: String,
    name: String,
    description: Option<String>,
}

/// ファイルを読み込み、BOM付きUTF-8を処理する
fn read_file(path: &Path) -> Result<String, String> {
    let bytes = std::fs::read(path).map_err(|e| format!("ファイルの読み込みに失敗しました: {e}"))?;

    let content = String::from_utf8(bytes)
        .map_err(|_| "ファイルが有効なUTF-8ではありません".to_string())?;

    // BOM (U+FEFF) を除去
    Ok(content.strip_prefix('\u{FEFF}').unwrap_or(&content).to_string())
}

/// JSON文字列をパースし、構造を検証する
fn parse_json(content: &str) -> Result<RawQuizPackFile, String> {
    // まずJSONとして有効かチェック
    let value: serde_json::Value =
        serde_json::from_str(content).map_err(|e| format!("JSON構文エラー: {e}"))?;

    let obj = value
        .as_object()
        .ok_or("JSONファイルはオブジェクト（{{ ... }}）である必要があります")?;

    // pack フィールドのチェック
    let pack_value = obj
        .get("pack")
        .ok_or("必須フィールド「pack」がありません。クイズパックのメタ情報を含む \"pack\" オブジェクトを追加してください")?;

    let pack_obj = pack_value.as_object().ok_or(
        "「pack」フィールドはオブジェクトである必要があります（例: { \"id\": \"...\", \"name\": \"...\" }）",
    )?;

    if !pack_obj.contains_key("id") {
        return Err(
            "必須フィールド「pack.id」がありません。パックの一意なIDを指定してください（例: \"my-quiz-pack\"）"
                .to_string(),
        );
    }

    if !pack_obj.contains_key("name") {
        return Err(
            "必須フィールド「pack.name」がありません。パックの表示名を指定してください"
                .to_string(),
        );
    }

    // questions フィールドのチェック
    let questions_value = obj.get("questions").ok_or(
        "必須フィールド「questions」がありません。問題の配列を含む \"questions\" フィールドを追加してください",
    )?;

    if !questions_value.is_array() {
        return Err(
            "「questions」フィールドは配列である必要があります（例: \"questions\": [ ... ]）"
                .to_string(),
        );
    }

    // 構造チェック通過後、serdeでデシリアライズ
    serde_json::from_value::<RawQuizPackFile>(value)
        .map_err(|e| format!("JSONの構造が不正です: {e}"))
}

/// JSON文字列をパースしてDBに保存する内部関数
fn import_from_content(content: &str, connection: &Connection, force: bool) -> Result<QuizPack, String> {
    // 1. JSONパース
    let raw = parse_json(content)?;

    // 2. パックID一意性チェック
    let existing = quiz_pack_repo::get_quiz_pack(connection, &raw.pack.id)
        .map_err(|e| format!("DB検索に失敗しました: {e}"))?;

    if existing.is_some() && !force {
        return Err(format!(
            "パックID '{}' は既にインポートされています",
            raw.pack.id
        ));
    }

    // 3. 問題バリデーション
    let questions = validate_questions(&raw.questions)?;

    if existing.is_some() {
        // 更新インポート
        update_import(connection, &raw, questions)
    } else {
        // 新規インポート
        create_import(connection, &raw, questions)
    }
}

/// 新規インポート処理
fn create_import(
    connection: &Connection,
    raw: &RawQuizPackFile,
    questions: Vec<crate::models::Question>,
) -> Result<QuizPack, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let pack = QuizPack {
        id: raw.pack.id.clone(),
        name: raw.pack.name.clone(),
        description: raw.pack.description.clone(),
        source: "imported".to_string(),
        imported_at: now,
        updated_at: None,
        questions,
    };

    let tx = connection
        .unchecked_transaction()
        .map_err(|e| format!("トランザクション開始に失敗しました: {e}"))?;

    quiz_pack_repo::insert_quiz_pack(&tx, &pack).map_err(|e| format!("パック保存に失敗しました: {e}"))?;

    question_repo::insert_questions(&tx, &pack.id, &pack.questions)
        .map_err(|e| format!("問題保存に失敗しました: {e}"))?;

    tx.commit()
        .map_err(|e| format!("コミットに失敗しました: {e}"))?;

    Ok(pack)
}

/// 更新インポート処理
fn update_import(
    connection: &Connection,
    raw: &RawQuizPackFile,
    questions: Vec<crate::models::Question>,
) -> Result<QuizPack, String> {
    use crate::repositories::history_repo;
    use crate::services::save_service;

    let now = chrono::Utc::now().to_rfc3339();
    let pack_id = &raw.pack.id;

    let tx = connection
        .unchecked_transaction()
        .map_err(|e| format!("トランザクション開始に失敗しました: {e}"))?;

    // 1. 旧問題リストを取得（履歴リセット判定用）
    let old_questions = question_repo::get_questions_by_pack(&tx, pack_id)
        .map_err(|e| format!("旧問題の取得に失敗しました: {e}"))?;

    // 2. パックメタ情報を更新
    quiz_pack_repo::update_quiz_pack(
        &tx,
        pack_id,
        &raw.pack.name,
        raw.pack.description.as_deref(),
        questions.len(),
        &now,
    )
    .map_err(|e| format!("パック更新に失敗しました: {e}"))?;

    // 3. 旧問題を削除 → 新問題を挿入
    question_repo::delete_questions_by_pack(&tx, pack_id)
        .map_err(|e| format!("旧問題の削除に失敗しました: {e}"))?;
    question_repo::insert_questions(&tx, pack_id, &questions)
        .map_err(|e| format!("問題保存に失敗しました: {e}"))?;

    // 4. 履歴リセット判定 → 該当問題の履歴を削除
    let reset_targets = save_service::detect_reset_targets(&old_questions, &questions);
    if !reset_targets.is_empty() {
        history_repo::delete_history_for_questions(&tx, pack_id, &reset_targets)
            .map_err(|e| format!("履歴リセットに失敗しました: {e}"))?;
    }

    tx.commit()
        .map_err(|e| format!("コミットに失敗しました: {e}"))?;

    // 更新後のパックを返す
    let pack = quiz_pack_repo::get_quiz_pack(connection, pack_id)
        .map_err(|e| format!("パック取得に失敗しました: {e}"))?
        .ok_or_else(|| format!("更新後のパック '{pack_id}' が見つかりません"))?;

    Ok(pack)
}

/// ファイルパスからクイズパックをインポートする
pub fn import_quiz_pack(path: &Path, connection: &Connection, force: bool) -> Result<QuizPack, String> {
    let content = read_file(path)?;
    import_from_content(&content, connection, force)
}

/// JSON文字列からクイズパックをインポートする
pub fn import_quiz_pack_from_str(json: &str, connection: &Connection, force: bool) -> Result<QuizPack, String> {
    import_from_content(json, connection, force)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Question;
    use crate::repositories::test_helpers::open_test_connection;
    use std::io::Write;
    use tempfile::NamedTempFile;

    /// テスト用の有効なJSONを返すヘルパー
    fn valid_json() -> &'static str {
        r#"{
            "pack": {
                "id": "test-pack",
                "name": "テストパック",
                "description": "テスト用"
            },
            "questions": [
                {
                    "id": "q1",
                    "type": "multiple_choice",
                    "question": "1+1は？",
                    "choices": [
                        {"text": "1"},
                        {"text": "2"}
                    ],
                    "answer": 1
                },
                {
                    "id": "q2",
                    "type": "true_false",
                    "question": "地球は丸い",
                    "answer": true
                },
                {
                    "id": "q3",
                    "type": "text_input",
                    "question": "日本の首都は？",
                    "answer": "東京"
                }
            ]
        }"#
    }

    /// テスト用のJSONファイルを作成するヘルパー
    fn write_temp_file(content: &str) -> NamedTempFile {
        let mut file = NamedTempFile::new().expect("一時ファイルの作成に成功すること");
        file.write_all(content.as_bytes())
            .expect("一時ファイルへの書き込みに成功すること");
        file
    }

    // --- BOM付きUTF-8ファイル読み込み ---

    #[test]
    fn bom付きutf8ファイルを正しく読み込める() {
        let mut content = Vec::new();
        content.extend_from_slice(&[0xEF, 0xBB, 0xBF]); // UTF-8 BOM
        content.extend_from_slice(valid_json().as_bytes());

        let mut file = NamedTempFile::new().expect("一時ファイルの作成に成功すること");
        file.write_all(&content)
            .expect("一時ファイルへの書き込みに成功すること");

        let result = read_file(file.path());
        assert!(result.is_ok(), "BOM付きファイルを読み込めること");
        assert!(
            !result.unwrap().starts_with('\u{FEFF}'),
            "BOMが除去されていること"
        );
    }

    #[test]
    fn bom無しutf8ファイルも正しく読み込める() {
        let file = write_temp_file(valid_json());
        let result = read_file(file.path());
        assert!(result.is_ok(), "BOM無しファイルも読み込めること");
    }

    #[test]
    fn 存在しないファイルでエラーを返す() {
        let result = read_file(Path::new("/nonexistent/file.json"));
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("ファイルの読み込みに失敗しました"));
    }

    // --- JSONパース ---

    #[test]
    fn 有効なjsonをパースできる() {
        let result = parse_json(valid_json());
        assert!(result.is_ok(), "有効なJSONがパースできること");
        let raw = result.unwrap();
        assert_eq!(raw.pack.id, "test-pack");
        assert_eq!(raw.pack.name, "テストパック");
        assert_eq!(raw.questions.len(), 3);
    }

    #[test]
    fn 不正なjson構文でエラーを返す() {
        let result = parse_json("{ invalid json }");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("JSON構文エラー"), "エラーメッセージ: {err}");
    }

    #[test]
    fn packフィールドが欠けている場合エラーを返す() {
        let json = r#"{ "questions": [] }"#;
        let result = parse_json(json);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            err.contains("pack"),
            "エラーにpackフィールドが含まれること: {err}"
        );
    }

    #[test]
    fn questionsフィールドが欠けている場合エラーを返す() {
        let json = r#"{ "pack": { "id": "p1", "name": "test" } }"#;
        let result = parse_json(json);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            err.contains("questions"),
            "エラーにquestionsフィールドが含まれること: {err}"
        );
    }

    #[test]
    fn pack_idが欠けている場合エラーを返す() {
        let json = r#"{ "pack": { "name": "test" }, "questions": [] }"#;
        let result = parse_json(json);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            err.contains("pack.id"),
            "エラーにpack.idフィールドが含まれること: {err}"
        );
    }

    #[test]
    fn pack_nameが欠けている場合エラーを返す() {
        let json = r#"{ "pack": { "id": "p1" }, "questions": [] }"#;
        let result = parse_json(json);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            err.contains("pack.name"),
            "エラーにpack.nameフィールドが含まれること: {err}"
        );
    }

    #[test]
    fn questionsが配列でない場合エラーを返す() {
        let json = r#"{ "pack": { "id": "p1", "name": "test" }, "questions": "not_array" }"#;
        let result = parse_json(json);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            err.contains("questions"),
            "エラーにquestionsフィールドが含まれること: {err}"
        );
    }

    #[test]
    fn 空のjsonオブジェクトでエラーを返す() {
        let result = parse_json("{}");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            err.contains("pack"),
            "エラーにpackフィールドが含まれること: {err}"
        );
    }

    // --- 問題タイプバリデーション ---

    #[test]
    fn 不正な問題タイプでエラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "essay",
            "question": "テスト",
            "answer": "テスト"
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Question ID: q1"));
        assert!(err.contains("Field: type"));
        assert!(err.contains("essay"));
    }

    #[test]
    fn typeフィールドが欠けている場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "question": "テスト",
            "answer": "テスト"
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Field: type"));
    }

    // --- 選択肢整合性バリデーション ---

    #[test]
    fn multiple_choiceで選択肢が1個の場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "multiple_choice",
            "question": "テスト",
            "choices": [{"text": "1"}],
            "answer": 0
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Question ID: q1"));
        assert!(err.contains("Field: choices"));
        assert!(err.contains("2〜4個"));
    }

    #[test]
    fn multiple_choiceで選択肢が5個の場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "multiple_choice",
            "question": "テスト",
            "choices": [
                {"text": "1"},
                {"text": "2"},
                {"text": "3"},
                {"text": "4"},
                {"text": "5"}
            ],
            "answer": 0
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("5個"));
    }

    #[test]
    fn multiple_choiceでchoicesが欠けている場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "multiple_choice",
            "question": "テスト",
            "answer": 0
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Field: choices"));
    }

    // --- 正答整合性バリデーション ---

    #[test]
    fn multiple_choiceでanswerが選択肢の範囲外の場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "multiple_choice",
            "question": "テスト",
            "choices": [
                {"text": "1"},
                {"text": "2"}
            ],
            "answer": 2
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Question ID: q1"));
        assert!(err.contains("Field: answer"));
        assert!(err.contains("範囲外"));
    }

    #[test]
    fn true_falseでanswerが文字列の場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "true_false",
            "question": "テスト",
            "answer": "yes"
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("true または false"));
    }

    #[test]
    fn text_inputでanswerが空の場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "text_input",
            "question": "テスト",
            "answer": ""
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("回答が空です"));
    }

    #[test]
    fn answerフィールドが欠けている場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "text_input",
            "question": "テスト"
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Field: answer"));
        assert!(err.contains("必須フィールドがありません"));
    }

    // --- 問題ID一意性 ---

    #[test]
    fn パック内で問題idが重複している場合エラーを返す() {
        let questions = vec![
            serde_json::json!({
                "id": "q1",
                "type": "true_false",
                "question": "テスト1",
                "answer": true
            }),
            serde_json::json!({
                "id": "q1",
                "type": "true_false",
                "question": "テスト2",
                "answer": false
            }),
        ];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("問題IDが重複しています"));
    }

    // --- 正常系バリデーション ---

    #[test]
    fn 有効な問題リストをバリデーション通過できる() {
        let raw = parse_json(valid_json()).unwrap();
        let result = validate_questions(&raw.questions);
        assert!(result.is_ok(), "有効な問題がバリデーションを通過すること");
        assert_eq!(result.unwrap().len(), 3);
    }

    // --- パックID一意性（DB連携） ---

    #[test]
    fn 既存パックidと重複する場合エラーを返す() {
        let connection = open_test_connection();
        let file = write_temp_file(valid_json());

        // 1回目のインポートは成功する
        let result = import_quiz_pack(file.path(), &connection, false);
        assert!(result.is_ok(), "1回目のインポートは成功すること");

        // 2回目は重複エラー
        let file2 = write_temp_file(valid_json());
        let result = import_quiz_pack(file2.path(), &connection, false);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("既にインポートされています"));
    }

    // --- 正常系: フルインポート ---

    #[test]
    fn 有効なjsonファイルをインポートしてdbに保存できる() {
        let connection = open_test_connection();
        let file = write_temp_file(valid_json());

        let result = import_quiz_pack(file.path(), &connection, false);
        assert!(result.is_ok(), "インポートが成功すること");

        let pack = result.unwrap();
        assert_eq!(pack.id, "test-pack");
        assert_eq!(pack.name, "テストパック");
        assert_eq!(pack.questions.len(), 3);

        // DBに保存されていることを確認
        let stored = quiz_pack_repo::get_quiz_pack(&connection, "test-pack")
            .expect("DB検索に成功すること")
            .expect("パックが存在すること");
        assert_eq!(stored.name, "テストパック");
        assert_eq!(stored.questions.len(), 3);
        assert_eq!(stored.questions, pack.questions);
    }

    #[test]
    fn bom付きファイルでフルインポートが成功する() {
        let connection = open_test_connection();

        let mut content = Vec::new();
        content.extend_from_slice(&[0xEF, 0xBB, 0xBF]);
        content.extend_from_slice(valid_json().as_bytes());

        let mut file = NamedTempFile::new().expect("一時ファイルの作成に成功すること");
        file.write_all(&content)
            .expect("一時ファイルへの書き込みに成功すること");

        let result = import_quiz_pack(file.path(), &connection, false);
        assert!(result.is_ok(), "BOM付きファイルのインポートが成功すること");
    }

    #[test]
    fn descriptionが省略されたパックをインポートできる() {
        let json = r#"{
            "pack": { "id": "no-desc", "name": "説明なし" },
            "questions": [
                {
                    "id": "q1",
                    "type": "true_false",
                    "question": "テスト",
                    "answer": true
                }
            ]
        }"#;
        let connection = open_test_connection();
        let file = write_temp_file(json);

        let result = import_quiz_pack(file.path(), &connection, false);
        assert!(result.is_ok());
        assert!(result.unwrap().description.is_none());
    }

    #[test]
    fn explanationが省略された問題をインポートできる() {
        let json = r#"{
            "pack": { "id": "no-exp", "name": "テスト" },
            "questions": [
                {
                    "id": "q1",
                    "type": "text_input",
                    "question": "テスト",
                    "answer": "回答"
                }
            ]
        }"#;
        let connection = open_test_connection();
        let file = write_temp_file(json);

        let result = import_quiz_pack(file.path(), &connection, false);
        assert!(result.is_ok());
    }

    // --- import_quiz_pack_from_str ---

    #[test]
    fn json文字列から直接インポートできる() {
        let connection = open_test_connection();
        let result = import_quiz_pack_from_str(valid_json(), &connection, false);
        assert!(result.is_ok(), "JSON文字列からインポートが成功すること");

        let pack = result.unwrap();
        assert_eq!(pack.id, "test-pack");
        assert_eq!(pack.name, "テストパック");
        assert_eq!(pack.questions.len(), 3);
    }

    #[test]
    fn json文字列からの重複インポートはエラーを返す() {
        let connection = open_test_connection();
        let _ = import_quiz_pack_from_str(valid_json(), &connection, false);

        let result = import_quiz_pack_from_str(valid_json(), &connection, false);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("既にインポートされています"));
    }

    // --- 更新インポート ---

    #[test]
    fn 更新インポートで学習履歴が保持される() {
        use crate::models::AnswerRecord;
        use crate::repositories::history_repo;

        let connection = open_test_connection();
        // 初回インポート
        import_quiz_pack_from_str(valid_json(), &connection, false).unwrap();

        // q1に履歴を追加
        history_repo::insert_answer_record(
            &connection,
            &AnswerRecord {
                pack_id: "test-pack".to_string(),
                question_id: "q1".to_string(),
                is_correct: true,
                user_answer: "1".to_string(),
                answered_at: "2026-03-10T10:00:00Z".to_string(),
                session_id: "test-session".to_string(),
            },
        ).unwrap();

        // 問題文のみ変更（正答は同じ）→ 履歴保持される
        let updated_json = r#"{
            "pack": { "id": "test-pack", "name": "更新パック", "description": "更新版" },
            "questions": [
                {
                    "id": "q1",
                    "type": "multiple_choice",
                    "question": "1+1は何ですか？",
                    "choices": [{"text": "1"}, {"text": "2"}],
                    "answer": 1
                },
                {
                    "id": "q2",
                    "type": "true_false",
                    "question": "地球は丸い",
                    "answer": true
                }
            ]
        }"#;

        let result = import_quiz_pack_from_str(updated_json, &connection, true);
        assert!(result.is_ok(), "更新インポートが成功すること: {:?}", result.err());

        let pack = result.unwrap();
        assert_eq!(pack.name, "更新パック");
        assert_eq!(pack.description.as_deref(), Some("更新版"));
        assert_eq!(pack.questions.len(), 2);
        assert!(pack.updated_at.is_some(), "updated_atが設定されること");

        // q1の履歴が保持されていること
        let q1_history: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM learning_history WHERE pack_id = 'test-pack' AND question_id = 'q1';",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(q1_history, 1, "q1の履歴が保持されること");
    }

    #[test]
    fn 更新インポートで正答変更された問題の履歴がリセットされる() {
        use crate::models::AnswerRecord;
        use crate::repositories::history_repo;

        let connection = open_test_connection();
        import_quiz_pack_from_str(valid_json(), &connection, false).unwrap();

        // q1, q2に履歴追加
        for qid in ["q1", "q2"] {
            history_repo::insert_answer_record(
                &connection,
                &AnswerRecord {
                    pack_id: "test-pack".to_string(),
                    question_id: qid.to_string(),
                    is_correct: true,
                    user_answer: "a".to_string(),
                    answered_at: "2026-03-10T10:00:00Z".to_string(),
                    session_id: "test-session".to_string(),
                },
            ).unwrap();
        }

        // q1の正答を変更（answer: 1→0）
        let updated_json = r#"{
            "pack": { "id": "test-pack", "name": "テストパック" },
            "questions": [
                {
                    "id": "q1",
                    "type": "multiple_choice",
                    "question": "1+1は？",
                    "choices": [{"text": "1"}, {"text": "2"}],
                    "answer": 0
                },
                {
                    "id": "q2",
                    "type": "true_false",
                    "question": "地球は丸い",
                    "answer": true
                }
            ]
        }"#;

        import_quiz_pack_from_str(updated_json, &connection, true).unwrap();

        // q1の履歴がリセットされていること
        let q1_history: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM learning_history WHERE pack_id = 'test-pack' AND question_id = 'q1';",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(q1_history, 0, "q1の履歴がリセットされること");

        // q2の履歴は保持されていること
        let q2_history: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM learning_history WHERE pack_id = 'test-pack' AND question_id = 'q2';",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(q2_history, 1, "q2の履歴が保持されること");
    }

    #[test]
    fn 問題idが変わった場合に旧idの履歴が孤立する() {
        use crate::models::AnswerRecord;
        use crate::repositories::history_repo;

        let connection = open_test_connection();
        import_quiz_pack_from_str(valid_json(), &connection, false).unwrap();

        // q1に履歴追加
        history_repo::insert_answer_record(
            &connection,
            &AnswerRecord {
                pack_id: "test-pack".to_string(),
                question_id: "q1".to_string(),
                is_correct: true,
                user_answer: "1".to_string(),
                answered_at: "2026-03-10T10:00:00Z".to_string(),
                session_id: "test-session".to_string(),
            },
        ).unwrap();

        // q1をq_newに変更（旧q1の履歴は孤立する）
        let updated_json = r#"{
            "pack": { "id": "test-pack", "name": "テストパック" },
            "questions": [
                {
                    "id": "q_new",
                    "type": "multiple_choice",
                    "question": "1+1は？",
                    "choices": [{"text": "1"}, {"text": "2"}],
                    "answer": 1
                }
            ]
        }"#;

        import_quiz_pack_from_str(updated_json, &connection, true).unwrap();

        // 旧q1の履歴が残っている（孤立）
        let q1_history: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM learning_history WHERE pack_id = 'test-pack' AND question_id = 'q1';",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(q1_history, 1, "旧q1の履歴が孤立して残ること");
    }

    #[test]
    fn 明示的なパック削除では履歴も削除される() {
        use crate::models::AnswerRecord;
        use crate::repositories::history_repo;

        let connection = open_test_connection();
        import_quiz_pack_from_str(valid_json(), &connection, false).unwrap();

        history_repo::insert_answer_record(
            &connection,
            &AnswerRecord {
                pack_id: "test-pack".to_string(),
                question_id: "q1".to_string(),
                is_correct: true,
                user_answer: "1".to_string(),
                answered_at: "2026-03-10T10:00:00Z".to_string(),
                session_id: "test-session".to_string(),
            },
        ).unwrap();

        quiz_pack_repo::delete_quiz_pack(&connection, "test-pack").unwrap();

        let history_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM learning_history WHERE pack_id = 'test-pack';",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(history_count, 0, "パック削除で履歴もCASCADE削除されること");
    }

    #[test]
    fn 更新インポートの途中失敗時にrollbackされる() {
        let connection = open_test_connection();
        import_quiz_pack_from_str(valid_json(), &connection, false).unwrap();

        // バリデーションエラーになるJSONで更新インポート
        let invalid_json = r#"{
            "pack": { "id": "test-pack", "name": "更新パック" },
            "questions": [
                {
                    "id": "q1",
                    "type": "text_input",
                    "question": "テスト",
                    "answer": ""
                }
            ]
        }"#;

        let result = import_quiz_pack_from_str(invalid_json, &connection, true);
        assert!(result.is_err(), "バリデーションエラーになること");

        // 元のパックが残っていること
        let pack = quiz_pack_repo::get_quiz_pack(&connection, "test-pack")
            .unwrap()
            .unwrap();
        assert_eq!(pack.name, "テストパック", "元のパック名が残ること");
        assert_eq!(pack.questions.len(), 3, "元の問題数が残ること");
    }

    #[test]
    fn force_falseで既存パックの更新インポートはエラーを返す() {
        let connection = open_test_connection();
        import_quiz_pack_from_str(valid_json(), &connection, false).unwrap();

        let result = import_quiz_pack_from_str(valid_json(), &connection, false);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("既にインポートされています"));
    }

    #[test]
    fn サンプルパックjsonをインポートできる() {
        let connection = open_test_connection();
        let sample_json = include_str!("../../resources/sample-quiz-pack.json");
        let result = import_quiz_pack_from_str(sample_json, &connection, false);
        assert!(
            result.is_ok(),
            "サンプルパックのインポートに失敗: {}",
            result.unwrap_err()
        );

        let pack = result.unwrap();
        assert_eq!(pack.id, "sample-security-basics");
        assert!(!pack.questions.is_empty());
    }

    // --- multi_select バリデーション ---

    #[test]
    fn multi_selectの有効な問題がバリデーションを通過する() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "multi_select",
            "question": "暗号化プロトコルはどれか？",
            "choices": [
                {"text": "TLS"},
                {"text": "HTTP"},
                {"text": "IPsec"},
                {"text": "DNS"}
            ],
            "answer": [0, 2]
        })];
        let result = validate_questions(&questions);
        assert!(result.is_ok(), "有効なmulti_select問題がバリデーションを通過すること: {:?}", result.err());
    }

    #[test]
    fn multi_selectでchoicesが欠けている場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "multi_select",
            "question": "テスト",
            "answer": [0, 1]
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Field: choices"));
    }

    #[test]
    fn multi_selectで選択肢が1個の場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "multi_select",
            "question": "テスト",
            "choices": [{"text": "1"}],
            "answer": [0]
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("2〜6個"));
    }

    #[test]
    fn multi_selectで選択肢が7個の場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "multi_select",
            "question": "テスト",
            "choices": [
                {"text": "1"}, {"text": "2"}, {"text": "3"}, {"text": "4"},
                {"text": "5"}, {"text": "6"}, {"text": "7"}
            ],
            "answer": [0, 1]
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("7個"));
    }

    #[test]
    fn multi_selectでanswerが配列でない場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "multi_select",
            "question": "テスト",
            "choices": [{"text": "1"}, {"text": "2"}],
            "answer": 0
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Field: answer"));
    }

    #[test]
    fn multi_selectでanswer配列が空の場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "multi_select",
            "question": "テスト",
            "choices": [{"text": "1"}, {"text": "2"}],
            "answer": []
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("1個以上"));
    }

    #[test]
    fn multi_selectでanswerインデックスが範囲外の場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "multi_select",
            "question": "テスト",
            "choices": [{"text": "1"}, {"text": "2"}],
            "answer": [0, 3]
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("範囲外"));
    }

    #[test]
    fn multi_selectでanswerインデックスが重複している場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "multi_select",
            "question": "テスト",
            "choices": [{"text": "1"}, {"text": "2"}, {"text": "3"}],
            "answer": [0, 0]
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("重複"));
    }

    #[test]
    fn multi_selectを含むパックをdbにインポートできる() {
        let json = r#"{
            "pack": { "id": "ms-pack", "name": "複数選択テスト" },
            "questions": [
                {
                    "id": "q1",
                    "type": "multi_select",
                    "question": "暗号化プロトコルはどれか？",
                    "choices": [
                        {"text": "TLS"},
                        {"text": "HTTP"},
                        {"text": "IPsec"},
                        {"text": "DNS"}
                    ],
                    "answer": [0, 2],
                    "explanation": "TLSとIPsecは暗号化プロトコル"
                }
            ]
        }"#;
        let connection = open_test_connection();
        let result = import_quiz_pack_from_str(json, &connection, false);
        assert!(result.is_ok(), "multi_selectパックのインポートに失敗: {:?}", result.err());

        let pack = result.unwrap();
        assert_eq!(pack.questions.len(), 1);
        match &pack.questions[0] {
            Question::MultiSelect { answer, .. } => {
                assert_eq!(answer, &vec![0, 2]);
            }
            _ => panic!("multi_selectとしてインポートされるべき"),
        }
    }

    #[test]
    fn 複数のエラーがまとめて報告される() {
        let questions = vec![
            serde_json::json!({
                "id": "q1",
                "type": "essay",
                "question": "テスト",
                "answer": "テスト"
            }),
            serde_json::json!({
                "id": "q2",
                "type": "true_false",
                "question": "テスト",
                "answer": "yes"
            }),
        ];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        // 2つのエラーが含まれている
        assert!(err.contains("q1"));
        assert!(err.contains("q2"));
    }
}
