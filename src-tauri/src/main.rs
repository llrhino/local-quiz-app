fn main() {
    local_quiz_app_lib::build_app()
        .run(tauri::generate_context!())
        .expect("error while running local quiz app");
}
