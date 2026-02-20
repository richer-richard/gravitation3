use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use physics_engine::simulations::{
    DoubleGyreSimulator, DoublePendulumSimulator, LorenzSimulator, MalkusWheelSimulator,
    RosslerSimulator, ThreeBodySimulator,
};
use serde::Deserialize;
use serde_json::{json, Value};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct PredictRequest {
    /// Current state vector or body positions to predict from.
    pub state: Value,
    /// Number of time steps to predict forward.
    #[serde(default = "default_steps")]
    pub steps: u32,
    /// Integration timestep (dt).
    #[serde(default = "default_dt")]
    pub dt: f64,
}

fn default_steps() -> u32 {
    100
}

fn default_dt() -> f64 {
    0.01
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn router() -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/api/models/info", get(models_info))
        .route("/api/{simulation}/predict", post(predict))
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async fn health() -> impl IntoResponse {
    Json(json!({ "status": "ok", "service": "model" }))
}

async fn models_info() -> impl IntoResponse {
    Json(json!({
        "service": "model",
        "version": "0.2.0",
        "simulations": [
            { "id": "three_body", "name": "Three-Body Problem", "description": "Gravitational three-body simulation using Newtonian mechanics" },
            { "id": "double_pendulum", "name": "Double Pendulum", "description": "Chaotic double pendulum system" },
            { "id": "lorenz", "name": "Lorenz Attractor", "description": "Lorenz system demonstrating deterministic chaos" },
            { "id": "rossler", "name": "Rossler Attractor", "description": "Rossler system with spiral-type strange attractor" },
            { "id": "double_gyre", "name": "Double Gyre", "description": "Double-gyre flow model for fluid mixing" },
            { "id": "malkus_waterwheel", "name": "Malkus Waterwheel", "description": "Malkus-Lorenz waterwheel chaotic system" }
        ]
    }))
}

/// Predict endpoint: runs the physics engine forward from the given state.
async fn predict(
    Path(simulation): Path<String>,
    Json(body): Json<PredictRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let steps = body.steps;
    let dt = body.dt;

    let predicted_states: Vec<Value> = match simulation.as_str() {
        "three_body" => predict_lorenz_like(
            || {
                let mut sim = ThreeBodySimulator::new(
                    body.state.get("g").and_then(|v| v.as_f64()).unwrap_or(1.0),
                    dt,
                );
                sim.load_preset("figure8");
                sim
            },
            steps,
        ),
        "lorenz" => {
            let sigma = body.state.get("sigma").and_then(|v| v.as_f64()).unwrap_or(10.0);
            let rho = body.state.get("rho").and_then(|v| v.as_f64()).unwrap_or(28.0);
            let beta = body.state.get("beta").and_then(|v| v.as_f64()).unwrap_or(8.0 / 3.0);
            let mut sim = LorenzSimulator::new(sigma, rho, beta, dt);
            sim.load_preset("classic");
            let mut states = Vec::with_capacity(steps as usize);
            for _ in 0..steps {
                sim.step(1);
                states.push(serde_json::to_value(sim.get_state()).unwrap_or_default());
            }
            states
        }
        "rossler" => {
            let a = body.state.get("a").and_then(|v| v.as_f64()).unwrap_or(0.2);
            let b = body.state.get("b").and_then(|v| v.as_f64()).unwrap_or(0.2);
            let c = body.state.get("c").and_then(|v| v.as_f64()).unwrap_or(5.7);
            let mut sim = RosslerSimulator::new(a, b, c, dt);
            sim.load_preset("classic");
            let mut states = Vec::with_capacity(steps as usize);
            for _ in 0..steps {
                sim.step(1);
                states.push(serde_json::to_value(sim.get_state()).unwrap_or_default());
            }
            states
        }
        "double_pendulum" => {
            let mut sim = DoublePendulumSimulator::new();
            let mut states = Vec::with_capacity(steps as usize);
            for _ in 0..steps {
                sim.step(1);
                states.push(serde_json::to_value(sim.get_state()).unwrap_or_default());
            }
            states
        }
        "double_gyre" => {
            let a = body.state.get("A").and_then(|v| v.as_f64()).unwrap_or(0.1);
            let eps = body.state.get("epsilon").and_then(|v| v.as_f64()).unwrap_or(0.25);
            let omega = body.state.get("omega").and_then(|v| v.as_f64()).unwrap_or(6.283);
            let mut sim = DoubleGyreSimulator::new(a, eps, omega, dt);
            sim.load_preset("standard");
            let mut states = Vec::with_capacity(steps as usize);
            for _ in 0..steps {
                sim.step(1);
                states.push(serde_json::to_value(sim.get_state()).unwrap_or_default());
            }
            states
        }
        "malkus_waterwheel" => {
            let inflow = body.state.get("inflow_rate").and_then(|v| v.as_f64()).unwrap_or(5.0);
            let leak = body.state.get("leak_rate").and_then(|v| v.as_f64()).unwrap_or(1.0);
            let damping = body.state.get("damping").and_then(|v| v.as_f64()).unwrap_or(0.5);
            let mut sim = MalkusWheelSimulator::new(8, inflow, leak, damping, dt);
            sim.load_preset("chaotic");
            let mut states = Vec::with_capacity(steps as usize);
            for _ in 0..steps {
                sim.step(1);
                states.push(serde_json::to_value(sim.get_state()).unwrap_or_default());
            }
            states
        }
        _ => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(json!({ "error": format!("Unknown simulation: {}", simulation) })),
            ));
        }
    };

    Ok(Json(json!({
        "simulation": simulation,
        "steps": steps,
        "dt": dt,
        "status": "ok",
        "predicted_states": predicted_states,
    })))
}

fn predict_lorenz_like<S>(
    create: impl FnOnce() -> S,
    steps: u32,
) -> Vec<Value>
where
    S: physics_engine::simulations::Simulator,
{
    let mut sim = create();
    let mut states = Vec::with_capacity(steps as usize);
    for _ in 0..steps {
        sim.step(1);
        states.push(sim.get_state());
    }
    states
}
