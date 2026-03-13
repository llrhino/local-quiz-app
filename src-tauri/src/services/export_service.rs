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
        assert_eq!(q1["answer"], "b");
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
