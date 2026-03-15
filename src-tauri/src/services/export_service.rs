use rusqlite::Connection;
use serde::Serialize;

use crate::models::Question;
use crate::repositories::quiz_pack_repo;

/// エクスポート用のJSON構造（インポート形式と同一）
#[derive(Debug, Serialize)]
struct ExportPackFile {
    pack: ExportPackInfo,
    questions: Vec<Question>,
}

/// エクスポート用の pack オブジェクト
#[derive(Debug, Serialize)]
struct ExportPackInfo {
    id: String,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    schema_version: String,
}

/// クイズパックをインポート可能なJSON文字列に変換する
pub fn export_quiz_pack_to_json(connection: &Connection, pack_id: &str) -> Result<String, String> {
    let pack = quiz_pack_repo::get_quiz_pack(connection, pack_id)
        .map_err(|e| format!("DB検索に失敗しました: {e}"))?
        .ok_or_else(|| format!("クイズパック '{pack_id}' が見つかりません"))?;

    let export = ExportPackFile {
        pack: ExportPackInfo {
            id: pack.id,
            name: pack.name,
            description: pack.description,
            schema_version: "1.1".to_string(),
        },
        questions: pack.questions,
    };

    serde_json::to_string_pretty(&export).map_err(|e| format!("JSONシリアライズに失敗しました: {e}"))
}

/// クイズパックをJSON文字列に変換してファイルに書き出す
pub fn export_quiz_pack_to_file(
    connection: &Connection,
    pack_id: &str,
    file_path: &std::path::Path,
) -> Result<(), String> {
    let json = export_quiz_pack_to_json(connection, pack_id)?;
    std::fs::write(file_path, json).map_err(|e| format!("ファイルの書き込みに失敗しました: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::test_helpers::open_test_connection;
    use crate::services::import_service;

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
                    "answer": "東京",
                    "explanation": "解説テスト"
                }
            ]
        }"#
    }

    /// テスト用にパックをDBに保存するヘルパー
    fn setup_pack(connection: &Connection) {
        import_service::import_quiz_pack_from_str(valid_json(), connection)
            .expect("テストデータのインポートに成功すること");
    }

    #[test]
    fn エクスポートしたjsonがインポート可能な形式である() {
        let connection = open_test_connection();
        setup_pack(&connection);

        let json = export_quiz_pack_to_json(&connection, "test-pack")
            .expect("エクスポートに成功すること");

        // エクスポートしたJSONを別の接続にインポートできることを確認
        let connection2 = open_test_connection();
        let result = import_service::import_quiz_pack_from_str(&json, &connection2);
        assert!(
            result.is_ok(),
            "エクスポートしたJSONが再インポートできること: {:?}",
            result.err()
        );

        let reimported = result.unwrap();
        assert_eq!(reimported.id, "test-pack");
        assert_eq!(reimported.name, "テストパック");
        assert_eq!(reimported.description, Some("テスト用".to_string()));
        assert_eq!(reimported.questions.len(), 3);
    }

    #[test]
    fn エクスポートjsonにimported_atが含まれない() {
        let connection = open_test_connection();
        setup_pack(&connection);

        let json = export_quiz_pack_to_json(&connection, "test-pack")
            .expect("エクスポートに成功すること");

        let value: serde_json::Value =
            serde_json::from_str(&json).expect("JSONパースに成功すること");

        assert!(
            value.get("pack").unwrap().get("importedAt").is_none(),
            "imported_at がエクスポートJSONに含まれないこと"
        );
        assert!(
            value.get("pack").unwrap().get("imported_at").is_none(),
            "imported_at がエクスポートJSONに含まれないこと"
        );
    }

    #[test]
    fn 存在しないパックidでエラーを返す() {
        let connection = open_test_connection();

        let result = export_quiz_pack_to_json(&connection, "nonexistent");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("見つかりません"));
    }

    #[test]
    fn descriptionがnoneのパックをエクスポートできる() {
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
        import_service::import_quiz_pack_from_str(json, &connection)
            .expect("テストデータのインポートに成功すること");

        let exported = export_quiz_pack_to_json(&connection, "no-desc")
            .expect("エクスポートに成功すること");

        let value: serde_json::Value =
            serde_json::from_str(&exported).expect("JSONパースに成功すること");
        assert!(
            value.get("pack").unwrap().get("description").is_none(),
            "description が null/None の場合はフィールド自体が省略されること"
        );
    }

    #[test]
    fn ファイルにエクスポートできる() {
        let connection = open_test_connection();
        setup_pack(&connection);

        let dir = tempfile::tempdir().expect("一時ディレクトリの作成に成功すること");
        let file_path = dir.path().join("exported.json");

        export_quiz_pack_to_file(&connection, "test-pack", &file_path)
            .expect("ファイルエクスポートに成功すること");

        // ファイルが存在し、再インポートできることを確認
        let content = std::fs::read_to_string(&file_path).expect("ファイル読み込みに成功すること");
        let connection2 = open_test_connection();
        let result = import_service::import_quiz_pack_from_str(&content, &connection2);
        assert!(result.is_ok(), "ファイルからの再インポートに成功すること");
    }

    #[test]
    fn エクスポートjsonにschema_version_1_1が含まれる() {
        let connection = open_test_connection();
        setup_pack(&connection);

        let json = export_quiz_pack_to_json(&connection, "test-pack")
            .expect("エクスポートに成功すること");

        let value: serde_json::Value =
            serde_json::from_str(&json).expect("JSONパースに成功すること");

        assert_eq!(
            value.get("pack").and_then(|pack| pack.get("schema_version")),
            Some(&serde_json::Value::String("1.1".to_string()))
        );
    }

    #[test]
    fn 四種類の問題を含むjsonを往復して同一データを復元できる() {
        let json = r#"{
            "pack": {
                "id": "round-trip-pack",
                "name": "総合問題集 2026",
                "description": "日本語を含む round-trip 検証"
            },
            "questions": [
                {
                    "id": "mc-1",
                    "type": "multiple_choice",
                    "question": "Rustの所有権で正しい説明は？",
                    "choices": [
                        {"text": "複数の可変参照を常に許可する"},
                        {"text": "同時に1つの可変参照だけを許可する"}
                    ],
                    "answer": 1,
                    "explanation": ""
                },
                {
                    "id": "ms-1",
                    "type": "multi_select",
                    "question": "HTTPメソッドをすべて選んでください",
                    "choices": [
                        {"text": "GET"},
                        {"text": "POST"},
                        {"text": "STYLE"}
                    ],
                    "answer": [0, 1]
                },
                {
                    "id": "tf-1",
                    "type": "true_false",
                    "question": "SQLiteは組み込み型DBである",
                    "answer": true,
                    "explanation": ""
                },
                {
                    "id": "text-1",
                    "type": "text_input",
                    "question": "日本の首都をひらがなで答えてください",
                    "answer": "とうきょう"
                }
            ]
        }"#;
        let source_connection = open_test_connection();
        import_service::import_quiz_pack_from_str(json, &source_connection)
            .expect("初回インポートに成功すること");

        let exported = export_quiz_pack_to_json(&source_connection, "round-trip-pack")
            .expect("エクスポートに成功すること");

        let destination_connection = open_test_connection();
        let reimported = import_service::import_quiz_pack_from_str(&exported, &destination_connection)
            .expect("再インポートに成功すること");

        let original: serde_json::Value =
            serde_json::from_str(json).expect("元JSONのパースに成功すること");
        let exported_value: serde_json::Value =
            serde_json::from_str(&exported).expect("エクスポートJSONのパースに成功すること");

        assert_eq!(reimported.id, "round-trip-pack");
        assert_eq!(reimported.name, "総合問題集 2026");
        assert_eq!(
            reimported.description,
            Some("日本語を含む round-trip 検証".to_string())
        );
        assert_eq!(reimported.questions.len(), 4);
        assert_eq!(exported_value["questions"][0]["type"], original["questions"][0]["type"]);
        assert_eq!(exported_value["questions"][0]["question"], original["questions"][0]["question"]);
        assert_eq!(exported_value["questions"][0]["answer"], original["questions"][0]["answer"]);
        assert_eq!(exported_value["questions"][0]["choices"], original["questions"][0]["choices"]);
        assert_eq!(exported_value["questions"][1]["type"], original["questions"][1]["type"]);
        assert_eq!(exported_value["questions"][1]["question"], original["questions"][1]["question"]);
        assert_eq!(exported_value["questions"][1]["answer"], original["questions"][1]["answer"]);
        assert_eq!(exported_value["questions"][1]["choices"], original["questions"][1]["choices"]);
        assert_eq!(exported_value["questions"][2]["type"], original["questions"][2]["type"]);
        assert_eq!(exported_value["questions"][2]["question"], original["questions"][2]["question"]);
        assert_eq!(exported_value["questions"][2]["answer"], original["questions"][2]["answer"]);
        assert_eq!(exported_value["questions"][3]["type"], original["questions"][3]["type"]);
        assert_eq!(exported_value["questions"][3]["question"], original["questions"][3]["question"]);
        assert_eq!(exported_value["questions"][3]["answer"], original["questions"][3]["answer"]);
        assert!(
            exported_value["questions"][1]["explanation"].is_null(),
            "省略された解説は null に正規化されること"
        );
        assert!(
            exported_value["questions"][0]["explanation"].is_null(),
            "空文字の解説は null に正規化されること"
        );
        assert!(
            exported_value["questions"][2]["explanation"].is_null(),
            "空文字の解説は null に正規化されること"
        );
        assert!(
            exported_value["questions"][3]["explanation"].is_null(),
            "省略された解説は null に正規化されること"
        );
    }

    #[test]
    fn 問題の内容が元データと一致する() {
        let connection = open_test_connection();
        setup_pack(&connection);

        let json = export_quiz_pack_to_json(&connection, "test-pack")
            .expect("エクスポートに成功すること");

        let value: serde_json::Value =
            serde_json::from_str(&json).expect("JSONパースに成功すること");
        let questions = value.get("questions").unwrap().as_array().unwrap();

        // multiple_choice
        let q1 = &questions[0];
        assert_eq!(q1["type"], "multiple_choice");
        assert_eq!(q1["id"], "q1");
        assert_eq!(q1["answer"], 1);
        assert_eq!(q1["choices"].as_array().unwrap().len(), 2);

        // true_false
        let q2 = &questions[1];
        assert_eq!(q2["type"], "true_false");
        assert_eq!(q2["id"], "q2");
        assert_eq!(q2["answer"], true);

        // text_input
        let q3 = &questions[2];
        assert_eq!(q3["type"], "text_input");
        assert_eq!(q3["id"], "q3");
        assert_eq!(q3["answer"], "東京");
        assert_eq!(q3["explanation"], "解説テスト");
    }
}
