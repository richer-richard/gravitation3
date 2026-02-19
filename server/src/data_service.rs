use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/// A single data record submitted from a simulation client.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DataRecord {
    pub sim_id: String,
    pub timestamp: f64,
    pub data: Value,
}

/// Request body for the submit endpoint.
#[derive(Debug, Deserialize)]
pub struct SubmitRequest {
    pub sim_id: String,
    pub timestamp: f64,
    pub data: Value,
}

/// Shared state: an in-memory store keyed by simulation ID.
#[derive(Clone)]
pub struct DataState {
    pub store: Arc<RwLock<HashMap<String, Vec<DataRecord>>>>,
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn router() -> Router {
    let state = DataState {
        store: Arc::new(RwLock::new(HashMap::new())),
    };

    Router::new()
        .route("/api/health", get(health))
        .route("/api/data/submit", post(submit))
        .route("/api/data/get/{sim_id}", get(get_data))
        .route("/api/data/latest/{sim_id}", get(get_latest))
        .route("/api/data/list", get(list_sims))
        .route("/api/data/clear/{sim_id}", post(clear_sim))
        .route("/api/data/clear_all", post(clear_all))
        .with_state(state)
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async fn health() -> impl IntoResponse {
    Json(json!({ "status": "ok", "service": "data" }))
}

/// Accept a data record and append it to the in-memory store.
async fn submit(
    State(state): State<DataState>,
    Json(body): Json<SubmitRequest>,
) -> impl IntoResponse {
    let record = DataRecord {
        sim_id: body.sim_id.clone(),
        timestamp: body.timestamp,
        data: body.data,
    };

    let mut store = state.store.write().await;
    store
        .entry(body.sim_id.clone())
        .or_default()
        .push(record);

    (
        StatusCode::CREATED,
        Json(json!({ "status": "ok", "sim_id": body.sim_id })),
    )
}

/// Return all records for a given simulation ID.
async fn get_data(
    State(state): State<DataState>,
    Path(sim_id): Path<String>,
) -> impl IntoResponse {
    let store = state.store.read().await;
    match store.get(&sim_id) {
        Some(records) => Json(json!({ "sim_id": sim_id, "count": records.len(), "records": records })),
        None => Json(json!({ "sim_id": sim_id, "count": 0, "records": [] })),
    }
}

/// Return only the latest record for a given simulation ID.
async fn get_latest(
    State(state): State<DataState>,
    Path(sim_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let store = state.store.read().await;
    match store.get(&sim_id).and_then(|v| v.last()) {
        Some(record) => Ok(Json(json!({ "sim_id": sim_id, "record": record }))),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": format!("No data for sim_id: {}", sim_id) })),
        )),
    }
}

/// List all simulation IDs and their record counts.
async fn list_sims(State(state): State<DataState>) -> impl IntoResponse {
    let store = state.store.read().await;
    let sims: Vec<Value> = store
        .iter()
        .map(|(id, records)| {
            json!({ "sim_id": id, "count": records.len() })
        })
        .collect();
    Json(json!({ "simulations": sims }))
}

/// Clear all records for a specific simulation ID.
async fn clear_sim(
    State(state): State<DataState>,
    Path(sim_id): Path<String>,
) -> impl IntoResponse {
    let mut store = state.store.write().await;
    store.remove(&sim_id);
    Json(json!({ "status": "ok", "cleared": sim_id }))
}

/// Clear all data for all simulations.
async fn clear_all(State(state): State<DataState>) -> impl IntoResponse {
    let mut store = state.store.write().await;
    store.clear();
    Json(json!({ "status": "ok", "message": "all data cleared" }))
}
