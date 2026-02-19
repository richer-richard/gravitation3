use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
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

/// Return information about available simulations and model capabilities.
async fn models_info() -> impl IntoResponse {
    Json(json!({
        "service": "model",
        "version": "0.1.0",
        "simulations": [
            {
                "id": "three_body",
                "name": "Three-Body Problem",
                "description": "Gravitational three-body simulation using Newtonian mechanics"
            },
            {
                "id": "double_pendulum",
                "name": "Double Pendulum",
                "description": "Chaotic double pendulum system"
            },
            {
                "id": "lorenz",
                "name": "Lorenz Attractor",
                "description": "Lorenz system demonstrating deterministic chaos"
            },
            {
                "id": "rossler",
                "name": "Rossler Attractor",
                "description": "Rossler system with spiral-type strange attractor"
            },
            {
                "id": "double_gyre",
                "name": "Double Gyre",
                "description": "Double-gyre flow model for fluid mixing"
            },
            {
                "id": "malkus_waterwheel",
                "name": "Malkus Waterwheel",
                "description": "Malkus-Lorenz waterwheel chaotic system"
            }
        ]
    }))
}

/// Predict endpoint: currently a lightweight stub that acknowledges the
/// simulation type and returns placeholder data. This will be wired to the
/// physics engine or an ML model in a future iteration.
async fn predict(
    Path(simulation): Path<String>,
    Json(body): Json<PredictRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let valid_sims = [
        "three_body",
        "double_pendulum",
        "lorenz",
        "rossler",
        "double_gyre",
        "malkus_waterwheel",
    ];

    if !valid_sims.contains(&simulation.as_str()) {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": format!("Unknown simulation: {}", simulation),
                "available": valid_sims,
            })),
        ));
    }

    // Stub response -- in the future this will run the physics engine or
    // invoke a trained ML model to produce predicted trajectories.
    Ok(Json(json!({
        "simulation": simulation,
        "steps": body.steps,
        "dt": body.dt,
        "status": "stub",
        "message": format!(
            "Prediction endpoint for '{}' is a stub. Integrate physics-engine or ML model here.",
            simulation
        ),
        "predicted_states": []
    })))
}
