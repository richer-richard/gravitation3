use std::env;

pub struct Config {
    pub llm_port: u16,
    pub data_port: u16,
    pub model_port: u16,
    pub models_dir: String,
    pub cors_origins: Vec<String>,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            llm_port: env::var("LLM_PORT").ok().and_then(|v| v.parse().ok()).unwrap_or(5001),
            data_port: env::var("DATA_PORT").ok().and_then(|v| v.parse().ok()).unwrap_or(5002),
            model_port: env::var("MODEL_PORT").ok().and_then(|v| v.parse().ok()).unwrap_or(5003),
            models_dir: env::var("MODELS_DIR").unwrap_or_else(|_| "models".to_string()),
            cors_origins: env::var("CORS_ORIGINS")
                .unwrap_or_else(|_| "http://localhost:3000".to_string())
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
        }
    }
}
