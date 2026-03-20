#[cfg(debug_assertions)]
use tauri::Manager;

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .init();

    log::info!("Starting Airalogy Player application");

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::workspace::open_workspace,
            commands::workspace::scan_workspace,
            commands::workspace::get_recent_workspaces,
            commands::workspace::set_last_opened_protocol,
            commands::workspace::check_first_launch,
            commands::workspace::open_example_workspace,
            commands::file::read_file,
            commands::file::write_file,
            commands::file::list_files,
            commands::file::create_directory,
            commands::file::delete_file,
            commands::var_cards::list_var_cards,
            commands::var_cards::get_var_card,
            commands::var_cards::clone_var_card,
            commands::var_cards::save_var_card,
            commands::var_cards::delete_var_card,
            commands::service::list_ssh_profiles,
            commands::service::test_ssh_connection,
        ])
        .setup(|_app| {
            log::info!("Airalogy Player setup complete");

            #[cfg(debug_assertions)]
            {
                let window = _app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}

fn main() {
    run();
}
