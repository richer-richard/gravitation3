use gravitation3_server::config::Config;
use gravitation3_server::cors;
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
    let cors_layer = cors::cors_layer(&cfg.cors_origins);

    info!("Gravitation\u{00b3} server starting...");
    info!("  LLM   service on port {}", cfg.llm_port);
    info!("  Data  service on port {}", cfg.data_port);
    info!("  Model service on port {}", cfg.model_port);
    info!("  Models directory: {}", cfg.models_dir);

    gravitation3_server::spawn_services(&cfg, cors_layer).await;
}
