pub mod commands;
pub mod db;
pub mod models;
pub mod repositories;
pub mod services;

use tauri::Manager;

pub fn build_app() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_dir)?;

            let database = db::Database::new(app_dir.join("local-quiz-app.db"))?;
            app.manage(database);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::quiz_pack::import_quiz_pack,
            commands::quiz_pack::list_quiz_packs,
            commands::quiz_pack::get_quiz_pack,
            commands::quiz_pack::delete_quiz_pack,
            commands::quiz_pack::seed_sample_pack,
            commands::quiz_pack::get_questions_by_pack,
            commands::history::save_answer_record,
            commands::history::get_learning_history,
            commands::history::get_pack_statistics,
            commands::history::get_sessions,
            commands::history::get_weak_questions,
            commands::settings::get_settings,
            commands::settings::update_setting,
            commands::settings::open_file_dialog,
            commands::settings::open_save_file_dialog,
            commands::quiz_pack::export_quiz_pack,
        ])
}

#[cfg(test)]
mod tests {
    use super::build_app;

    #[test]
    fn app_builder_is_constructed() {
        let _app = build_app();
    }
}
