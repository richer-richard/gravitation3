// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod bridge;
mod commands;
mod state;

use state::SimulationManager;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .manage(Mutex::new(SimulationManager::new()))
        .invoke_handler(tauri::generate_handler![
            commands::list_models,
            commands::select_model,
            commands::set_params,
            commands::set_running,
            commands::set_steps_per_frame,
            commands::reset_simulation,
            commands::get_frame,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
