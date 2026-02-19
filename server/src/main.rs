mod config;
mod cors;
mod data_service;
mod llm_service;
mod model_service;

use config::Config;
use tracing::info;

#[tokio::main]
async fn main() {
    // Load .env if present (ignore errors -- file may not exist)
    let _ = dotenv::dotenv();

    // Initialise structured logging
    tracing_subscriber::fmt::init();

    // Load configuration from environment variables (with sensible defaults)
    let cfg = Config::from_env();

    // Build CORS layer from configured origins
    let cors = cors::cors_layer(&cfg.cors_origins);

    // Build the three service routers with CORS middleware
    let llm_app = llm_service::router().layer(cors.clone());
    let data_app = data_service::router().layer(cors.clone());
    let model_app = model_service::router().layer(cors);

    info!("Gravitation\u{00b3} server starting...");
    info!("  LLM   service on port {}", cfg.llm_port);
    info!("  Data  service on port {}", cfg.data_port);
    info!("  Model service on port {}", cfg.model_port);
    info!("  Models directory: {}", cfg.models_dir);

    let llm_port = cfg.llm_port;
    let data_port = cfg.data_port;
    let model_port = cfg.model_port;

    // Spawn each service on its own port; all three run concurrently.
    let llm_handle = tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", llm_port))
            .await
            .expect("Failed to bind LLM service port");
        info!("LLM service listening on {}", llm_port);
        axum::serve(listener, llm_app).await.unwrap();
    });

    let data_handle = tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", data_port))
            .await
            .expect("Failed to bind Data service port");
        info!("Data service listening on {}", data_port);
        axum::serve(listener, data_app).await.unwrap();
    });

    let model_handle = tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", model_port))
            .await
            .expect("Failed to bind Model service port");
        info!("Model service listening on {}", model_port);
        axum::serve(listener, model_app).await.unwrap();
    });

    // Wait for all services (they run indefinitely until the process is killed)
    let _ = tokio::try_join!(llm_handle, data_handle, model_handle);
}
