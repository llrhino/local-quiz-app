use std::collections::HashSet;
use std::path::Path;

use rusqlite::Connection;
use serde::Deserialize;

use crate::models::{Question, QuizPack};
use crate::repositories::{question_repo, quiz_pack_repo};

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
    serde_json::from_str::<RawQuizPackFile>(content).map_err(|e| format!("JSON構文エラー: {e}"))
}

/// 各問題のバリデーションを行う
fn validate_questions(questions: &[serde_json::Value]) -> Result<Vec<Question>, String> {
    let mut errors: Vec<String> = Vec::new();
    let mut seen_ids: HashSet<String> = HashSet::new();
    let mut parsed_questions: Vec<Question> = Vec::new();

    for value in questions {
        let question_id = value
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("(不明)");

        // 問題タイプのチェック
        let question_type = match value.get("type").and_then(|v| v.as_str()) {
            Some(t @ ("multiple_choice" | "true_false" | "text_input")) => t,
            Some(invalid) => {
                errors.push(format!(
                    "Question ID: {question_id} / Field: type / Error: 不正な問題タイプです: {invalid}"
                ));
                continue;
            }
            None => {
                errors.push(format!(
                    "Question ID: {question_id} / Field: type / Error: 必須フィールドがありません"
                ));
                continue;
            }
        };

        // 必須フィールドチェック: id
        if value.get("id").and_then(|v| v.as_str()).is_none() {
            errors.push(format!(
                "Question ID: {question_id} / Field: id / Error: 必須フィールドがありません"
            ));
        }

        // 必須フィールドチェック: question
        if value.get("question").and_then(|v| v.as_str()).is_none() {
            errors.push(format!(
                "Question ID: {question_id} / Field: question / Error: 必須フィールドがありません"
            ));
        }

        // 問題ID一意性チェック
        if !seen_ids.insert(question_id.to_string()) {
            errors.push(format!(
                "Question ID: {question_id} / Field: id / Error: パック内で問題IDが重複しています"
            ));
        }

        // タイプ別バリデーション
        match question_type {
            "multiple_choice" => {
                validate_multiple_choice(value, question_id, &mut errors);
            }
            "true_false" => {
                validate_true_false(value, question_id, &mut errors);
            }
            "text_input" => {
                validate_text_input(value, question_id, &mut errors);
            }
            _ => unreachable!(),
        }
    }

    if !errors.is_empty() {
        return Err(errors.join("\n"));
    }

    // バリデーション通過後、serde でデシリアライズ
    for value in questions {
        let question: Question = serde_json::from_value(value.clone())
            .map_err(|e| format!("問題のデシリアライズに失敗しました: {e}"))?;
        parsed_questions.push(question);
    }

    Ok(parsed_questions)
}

/// multiple_choice 問題のバリデーション
fn validate_multiple_choice(
    value: &serde_json::Value,
    question_id: &str,
    errors: &mut Vec<String>,
) {
    // choices のチェック
    let choices = match value.get("choices").and_then(|v| v.as_array()) {
        Some(c) => c,
        None => {
            errors.push(format!(
                "Question ID: {question_id} / Field: choices / Error: 必須フィールドがありません"
            ));
            return;
        }
    };

    let count = choices.len();
    if !(2..=4).contains(&count) {
        errors.push(format!(
            "Question ID: {question_id} / Field: choices / Error: 選択肢は2〜4個である必要があります（現在: {count}個）"
        ));
    }

    // 各選択肢に id と text があるか
    let choice_ids: Vec<&str> = choices
        .iter()
        .filter_map(|c| c.get("id").and_then(|v| v.as_str()))
        .collect();

    // answer のチェック
    match value.get("answer").and_then(|v| v.as_str()) {
        Some(answer) => {
            if !choice_ids.contains(&answer) {
                errors.push(format!(
                    "Question ID: {question_id} / Field: answer / Error: 回答が選択肢内に存在しません: {answer}"
                ));
            }
        }
        None => {
            errors.push(format!(
                "Question ID: {question_id} / Field: answer / Error: 必須フィールドがありません"
            ));
        }
    }
}

/// true_false 問題のバリデーション
fn validate_true_false(value: &serde_json::Value, question_id: &str, errors: &mut Vec<String>) {
    match value.get("answer") {
        Some(v) if v.is_boolean() => {}
        Some(_) => {
            errors.push(format!(
                "Question ID: {question_id} / Field: answer / Error: true または false である必要があります"
            ));
        }
        None => {
            errors.push(format!(
                "Question ID: {question_id} / Field: answer / Error: 必須フィールドがありません"
            ));
        }
    }
}

/// text_input 問題のバリデーション
fn validate_text_input(value: &serde_json::Value, question_id: &str, errors: &mut Vec<String>) {
    match value.get("answer").and_then(|v| v.as_str()) {
        Some(answer) if answer.is_empty() => {
            errors.push(format!(
                "Question ID: {question_id} / Field: answer / Error: 回答が空です"
            ));
        }
        Some(_) => {}
        None => {
            errors.push(format!(
                "Question ID: {question_id} / Field: answer / Error: 必須フィールドがありません"
            ));
        }
    }
}

/// JSON文字列をパースしてDBに保存する内部関数
fn import_from_content(content: &str, connection: &Connection) -> Result<QuizPack, String> {
    // 1. JSONパース
    let raw = parse_json(content)?;

    // 2. パックID一意性チェック
    let existing = quiz_pack_repo::get_quiz_pack(connection, &raw.pack.id)
        .map_err(|e| format!("DB検索に失敗しました: {e}"))?;
    if existing.is_some() {
        return Err(format!(
            "パックID '{}' は既にインポートされています",
            raw.pack.id
        ));
    }

    // 3. 問題バリデーション
    let questions = validate_questions(&raw.questions)?;

    // 4. QuizPack を組み立て
    let now = chrono::Utc::now().to_rfc3339();
    let pack = QuizPack {
        id: raw.pack.id,
        name: raw.pack.name,
        description: raw.pack.description,
        imported_at: now,
        questions,
    };

    // 5. トランザクション内でDB保存
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

/// ファイルパスからクイズパックをインポートする
pub fn import_quiz_pack(path: &Path, connection: &Connection) -> Result<QuizPack, String> {
    let content = read_file(path)?;
    import_from_content(&content, connection)
}

/// JSON文字列からクイズパックをインポートする
pub fn import_quiz_pack_from_str(json: &str, connection: &Connection) -> Result<QuizPack, String> {
    import_from_content(json, connection)
}

#[cfg(test)]
mod tests {
    use super::*;
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
                        {"id": "a", "text": "1"},
                        {"id": "b", "text": "2"}
                    ],
                    "answer": "b"
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
        assert!(result.unwrap_err().contains("JSON構文エラー"));
    }

    #[test]
    fn packフィールドが欠けている場合エラーを返す() {
        let json = r#"{ "questions": [] }"#;
        let result = parse_json(json);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("JSON構文エラー"));
    }

    #[test]
    fn questionsフィールドが欠けている場合エラーを返す() {
        let json = r#"{ "pack": { "id": "p1", "name": "test" } }"#;
        let result = parse_json(json);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("JSON構文エラー"));
    }

    #[test]
    fn pack_idが欠けている場合エラーを返す() {
        let json = r#"{ "pack": { "name": "test" }, "questions": [] }"#;
        let result = parse_json(json);
        assert!(result.is_err());
    }

    #[test]
    fn pack_nameが欠けている場合エラーを返す() {
        let json = r#"{ "pack": { "id": "p1" }, "questions": [] }"#;
        let result = parse_json(json);
        assert!(result.is_err());
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
            "choices": [{"id": "a", "text": "1"}],
            "answer": "a"
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
                {"id": "a", "text": "1"},
                {"id": "b", "text": "2"},
                {"id": "c", "text": "3"},
                {"id": "d", "text": "4"},
                {"id": "e", "text": "5"}
            ],
            "answer": "a"
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
            "answer": "a"
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Field: choices"));
    }

    // --- 正答整合性バリデーション ---

    #[test]
    fn multiple_choiceでanswerが選択肢に存在しない場合エラーを返す() {
        let questions = vec![serde_json::json!({
            "id": "q1",
            "type": "multiple_choice",
            "question": "テスト",
            "choices": [
                {"id": "a", "text": "1"},
                {"id": "b", "text": "2"}
            ],
            "answer": "c"
        })];
        let result = validate_questions(&questions);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Question ID: q1"));
        assert!(err.contains("Field: answer"));
        assert!(err.contains("選択肢内に存在しません"));
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
        let result = import_quiz_pack(file.path(), &connection);
        assert!(result.is_ok(), "1回目のインポートは成功すること");

        // 2回目は重複エラー
        let file2 = write_temp_file(valid_json());
        let result = import_quiz_pack(file2.path(), &connection);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("既にインポートされています"));
    }

    // --- 正常系: フルインポート ---

    #[test]
    fn 有効なjsonファイルをインポートしてdbに保存できる() {
        let connection = open_test_connection();
        let file = write_temp_file(valid_json());

        let result = import_quiz_pack(file.path(), &connection);
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

        let result = import_quiz_pack(file.path(), &connection);
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

        let result = import_quiz_pack(file.path(), &connection);
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

        let result = import_quiz_pack(file.path(), &connection);
        assert!(result.is_ok());
    }

    // --- import_quiz_pack_from_str ---

    #[test]
    fn json文字列から直接インポートできる() {
        let connection = open_test_connection();
        let result = import_quiz_pack_from_str(valid_json(), &connection);
        assert!(result.is_ok(), "JSON文字列からインポートが成功すること");

        let pack = result.unwrap();
        assert_eq!(pack.id, "test-pack");
        assert_eq!(pack.name, "テストパック");
        assert_eq!(pack.questions.len(), 3);
    }

    #[test]
    fn json文字列からの重複インポートはエラーを返す() {
        let connection = open_test_connection();
        let _ = import_quiz_pack_from_str(valid_json(), &connection);

        let result = import_quiz_pack_from_str(valid_json(), &connection);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("既にインポートされています"));
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
