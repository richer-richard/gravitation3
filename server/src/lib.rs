pub mod config;
pub mod cors;
pub mod data_service;
pub mod llm_service;
pub mod model_service;

use config::Config;
use tower_http::cors::CorsLayer;

/// Build all three service routers with CORS middleware applied.
/// Returns (llm_router, data_router, model_router).
pub fn build_services(cors: CorsLayer) -> (axum::Router, axum::Router, axum::Router) {
    let llm_app = llm_service::router().layer(cors.clone());
    let data_app = data_service::router().layer(cors.clone());
    let model_app = model_service::router().layer(cors);
    (llm_app, data_app, model_app)
}

/// Spawn all three services on their configured ports. Returns join handles.
pub async fn spawn_services(cfg: &Config, cors: CorsLayer) {
    let (llm_app, data_app, model_app) = build_services(cors);

    let llm_port = cfg.llm_port;
    let data_port = cfg.data_port;
    let model_port = cfg.model_port;

    let llm_handle = tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", llm_port))
            .await
            .expect("Failed to bind LLM service port");
        tracing::info!("LLM service listening on {}", llm_port);
        axum::serve(listener, llm_app).await.unwrap();
    });

    let data_handle = tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", data_port))
            .await
            .expect("Failed to bind Data service port");
        tracing::info!("Data service listening on {}", data_port);
        axum::serve(listener, data_app).await.unwrap();
    });

    let model_handle = tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", model_port))
            .await
            .expect("Failed to bind Model service port");
        tracing::info!("Model service listening on {}", model_port);
        axum::serve(listener, model_app).await.unwrap();
    });

    let _ = tokio::try_join!(llm_handle, data_handle, model_handle);
}
