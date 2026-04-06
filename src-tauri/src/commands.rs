use crate::state::{ModelInfo, SimulationManager};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

#[derive(Serialize)]
pub struct ParamInfo {
    pub name: String,
    pub label: String,
    pub min: f64,
    pub max: f64,
    pub default: f64,
    pub step: f64,
}

#[tauri::command]
pub fn list_models(state: State<'_, Mutex<SimulationManager>>) -> Vec<ModelInfo> {
    let mgr = state.lock().unwrap();
    mgr.list_models()
}

#[tauri::command]
pub fn select_model(
    id: String,
    state: State<'_, Mutex<SimulationManager>>,
) -> Result<Vec<ParamInfo>, String> {
    let mut mgr = state.lock().unwrap();
    match mgr.select_model(&id) {
        Some(schema) => Ok(schema
            .into_iter()
            .map(|p| ParamInfo {
                name: p.name.to_string(),
                label: p.label.to_string(),
                min: p.min,
                max: p.max,
                default: p.default,
                step: p.step,
            })
            .collect()),
        None => Err(format!("Unknown model: {}", id)),
    }
}

#[tauri::command]
pub fn set_params(
    params: HashMap<String, f64>,
    state: State<'_, Mutex<SimulationManager>>,
) -> Result<(), String> {
    let mut mgr = state.lock().unwrap();
    mgr.set_params(&params);
    Ok(())
}

#[tauri::command]
pub fn set_running(
    running: bool,
    state: State<'_, Mutex<SimulationManager>>,
) -> Result<(), String> {
    let mut mgr = state.lock().unwrap();
    mgr.set_running(running);
    Ok(())
}

#[tauri::command]
pub fn set_steps_per_frame(
    steps: usize,
    state: State<'_, Mutex<SimulationManager>>,
) -> Result<(), String> {
    let mut mgr = state.lock().unwrap();
    mgr.set_steps_per_frame(steps);
    Ok(())
}

#[tauri::command]
pub fn reset_simulation(state: State<'_, Mutex<SimulationManager>>) -> Result<(), String> {
    let mut mgr = state.lock().unwrap();
    mgr.reset();
    Ok(())
}

#[tauri::command]
pub fn get_frame(state: State<'_, Mutex<SimulationManager>>) -> tauri::ipc::Response {
    let mut mgr = state.lock().unwrap();
    let bytes = mgr.get_frame().to_vec();
    tauri::ipc::Response::new(bytes)
}
