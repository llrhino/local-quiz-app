#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    local_quiz_app_lib::build_app()
        .run(tauri::generate_context!())
        .expect("error while running local quiz app");
}

#[cfg(test)]
mod tests {
    #[test]
    fn windows_subsystem_is_configured_for_release_builds() {
        let source = include_str!("main.rs");
        let header = source
            .split("#[cfg(test)]")
            .next()
            .expect("テスト定義より前のソースを取得できること");

        assert!(
            header.contains(r#"#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]"#),
            "Windows リリースビルドでコンソールを表示しない設定が必要"
        );
    }
}
