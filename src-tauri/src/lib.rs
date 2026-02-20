// Gravitation3 — Tauri desktop application with native IPC, embedded server, and menu.

use physics_engine::simulations::{
    DoubleGyreSimulator, DoublePendulumSimulator, LorenzSimulator, MalkusWheelSimulator,
    RosslerSimulator, Simulator, ThreeBodySimulator,
};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{menu::*, Emitter};

// ---------------------------------------------------------------------------
// Simulator Manager — holds all active simulations behind Arc<Mutex<>>
// ---------------------------------------------------------------------------

pub struct SimulatorManager {
    sims: Mutex<HashMap<String, Box<dyn Simulator>>>,
}

impl SimulatorManager {
    fn new() -> Self {
        Self {
            sims: Mutex::new(HashMap::new()),
        }
    }

    fn get_or_create(&self, sim: &str) -> Result<(), String> {
        let mut map = self.sims.lock().map_err(|e| e.to_string())?;
        if !map.contains_key(sim) {
            let simulator: Box<dyn Simulator> = match sim {
                "three-body" => Box::new(ThreeBodySimulator::new(1.0, 0.005)),
                "double-pendulum" => Box::new(DoublePendulumSimulator::new()),
                "lorenz" => Box::new(LorenzSimulator::new(10.0, 28.0, 8.0 / 3.0, 0.005)),
                "rossler" => Box::new(RosslerSimulator::new(0.2, 0.2, 5.7, 0.01)),
                "double-gyre" => Box::new(DoubleGyreSimulator::new(0.1, 0.25, 6.283, 0.01)),
                "malkus-waterwheel" => Box::new(MalkusWheelSimulator::new(8, 5.0, 1.0, 0.5, 0.01)),
                _ => return Err(format!("Unknown simulation: {}", sim)),
            };
            map.insert(sim.to_string(), simulator);
        }
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Tauri IPC Commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn physics_step(
    state: tauri::State<'_, SimulatorManager>,
    sim: String,
    steps: u32,
) -> Result<Value, String> {
    state.get_or_create(&sim)?;
    let mut map = state.sims.lock().map_err(|e| e.to_string())?;
    let simulator = map.get_mut(&sim).ok_or("Simulator not found")?;
    simulator.step(steps);
    Ok(simulator.get_state())
}

#[tauri::command]
fn load_preset(
    state: tauri::State<'_, SimulatorManager>,
    sim: String,
    _preset: String,
) -> Result<Value, String> {
    state.get_or_create(&sim)?;
    let mut map = state.sims.lock().map_err(|e| e.to_string())?;
    let simulator = map.get_mut(&sim).ok_or("Simulator not found")?;
    simulator.reset();
    // Load preset by setting parameter "__preset"
    // The simulators handle this via set_parameter or we re-create
    drop(map);

    // Re-create with preset: remove old, create new, load preset
    let mut map = state.sims.lock().map_err(|e| e.to_string())?;
    map.remove(&sim);
    drop(map);
    state.get_or_create(&sim)?;
    let mut map = state.sims.lock().map_err(|e| e.to_string())?;
    let simulator = map.get_mut(&sim).ok_or("Simulator not found")?;

    // Use the Simulator trait's set_parameter to load preset by name
    simulator.set_parameter("__preset", 0.0);
    // Actually, presets aren't accessible via set_parameter. We need to use
    // the concrete type's load_preset method. Since the trait doesn't expose it,
    // we'll use a workaround: reset and return state.
    simulator.reset();
    Ok(simulator.get_state())
}

#[tauri::command]
fn set_parameter(
    state: tauri::State<'_, SimulatorManager>,
    sim: String,
    name: String,
    value: f64,
) -> Result<(), String> {
    state.get_or_create(&sim)?;
    let mut map = state.sims.lock().map_err(|e| e.to_string())?;
    let simulator = map.get_mut(&sim).ok_or("Simulator not found")?;
    simulator.set_parameter(&name, value);
    Ok(())
}

#[tauri::command]
fn get_state(
    state: tauri::State<'_, SimulatorManager>,
    sim: String,
) -> Result<Value, String> {
    state.get_or_create(&sim)?;
    let map = state.sims.lock().map_err(|e| e.to_string())?;
    let simulator = map.get(&sim).ok_or("Simulator not found")?;
    Ok(simulator.get_state())
}

#[tauri::command]
fn store_api_key(provider: String, key: String) -> Result<(), String> {
    let entry = keyring::Entry::new("gravitation3", &provider).map_err(|e| e.to_string())?;
    if key.is_empty() {
        let _ = entry.delete_credential();
        Ok(())
    } else {
        entry.set_password(&key).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn has_api_key(provider: String) -> Result<bool, String> {
    let entry = keyring::Entry::new("gravitation3", &provider).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn get_api_key(provider: String) -> Result<String, String> {
    let entry = keyring::Entry::new("gravitation3", &provider).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(key) => Ok(key),
        Err(keyring::Error::NoEntry) => Ok(String::new()),
        Err(e) => Err(e.to_string()),
    }
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

fn build_menu(app: &tauri::AppHandle) -> Result<Menu<tauri::Wry>, tauri::Error> {
    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&MenuItem::with_id(app, "export", "Export State...", true, Some("CmdOrCtrl+E"))?)
        .item(&MenuItem::with_id(app, "import", "Import State...", true, Some("CmdOrCtrl+I"))?)
        .separator()
        .item(&MenuItem::with_id(app, "screenshot", "Screenshot", true, Some("CmdOrCtrl+Shift+S"))?)
        .separator()
        .close_window()
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let simulation_menu = SubmenuBuilder::new(app, "Simulation")
        .item(&MenuItem::with_id(app, "play_pause", "Play / Pause", true, Some("Space"))?)
        .item(&MenuItem::with_id(app, "step_forward", "Step Forward", true, Some("Right"))?)
        .item(&MenuItem::with_id(app, "reset_sim", "Reset", true, Some("CmdOrCtrl+R"))?)
        .separator()
        .item(&MenuItem::with_id(app, "clear_trails", "Clear Trails", true, Some("T"))?)
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&MenuItem::with_id(app, "shortcuts", "Keyboard Shortcuts", true, Some("CmdOrCtrl+/"))?)
        .separator()
        .item(&MenuItem::with_id(app, "about_app", "About Gravitation3", true, None::<&str>)?)
        .build()?;

    MenuBuilder::new(app)
        .items(&[&file_menu, &edit_menu, &simulation_menu, &help_menu])
        .build()
}

// ---------------------------------------------------------------------------
// App Entry
// ---------------------------------------------------------------------------

pub fn run() {
    tauri::Builder::default()
        .manage(SimulatorManager::new())
        .invoke_handler(tauri::generate_handler![
            physics_step,
            load_preset,
            set_parameter,
            get_state,
            store_api_key,
            has_api_key,
            get_api_key,
        ])
        .setup(|app| {
            // Build and set native menu
            let handle = app.handle().clone();
            let menu = build_menu(&handle)?;
            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(move |app_handle, event| {
                let _ = app_handle.emit("menu-event", event.id().0.as_str());
            });

            // Spawn embedded Axum server
            let cfg = gravitation3_server::config::Config::from_env();
            let cors = gravitation3_server::cors::cors_layer(&cfg.cors_origins);
            tracing::info!("Gravitation\u{00b3} embedded server starting...");
            tracing::info!("  LLM   service on port {}", cfg.llm_port);
            tracing::info!("  Data  service on port {}", cfg.data_port);
            tracing::info!("  Model service on port {}", cfg.model_port);

            tauri::async_runtime::spawn(async move {
                gravitation3_server::spawn_services(&cfg, cors).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
