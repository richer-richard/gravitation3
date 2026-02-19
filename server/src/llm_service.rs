use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::{
        sse::{Event, KeepAlive, Sse},
        IntoResponse, Json,
    },
    routing::{get, post},
    Router,
};
use reqwest::Client;
use serde_json::json;
use std::convert::Infallible;
use std::env;
use std::sync::Arc;

use provider_adapters::types::{ChatRequest, StreamEvent};
use provider_adapters::{anthropic, deepseek, gemini, moonshot, openai};

/// Shared state for the LLM service.
#[derive(Clone)]
pub struct LlmState {
    pub client: Arc<Client>,
}

/// Build the Axum router for the LLM proxy service.
pub fn router() -> Router {
    let state = LlmState {
        client: Arc::new(Client::new()),
    };

    Router::new()
        .route("/health", get(health))
        .route("/api/chat", post(chat))
        .route("/api/chat/stream", post(chat_stream))
        .route("/api/providers", get(list_providers))
        .with_state(state)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Resolve the API key: check `X-Provider-Key` header first, then fall back to
/// environment variables named `<PROVIDER>_API_KEY`.
fn resolve_api_key(headers: &HeaderMap, provider: &str) -> Result<String, (StatusCode, String)> {
    // Header takes priority
    if let Some(val) = headers.get("x-provider-key") {
        if let Ok(s) = val.to_str() {
            if !s.is_empty() {
                return Ok(s.to_string());
            }
        }
    }

    // Fall back to environment variable
    let env_key = match provider {
        "openai" => "OPENAI_API_KEY",
        "anthropic" => "ANTHROPIC_API_KEY",
        "gemini" | "google" => "GEMINI_API_KEY",
        "deepseek" => "DEEPSEEK_API_KEY",
        "moonshot" | "kimi" => "MOONSHOT_API_KEY",
        _ => return Err((StatusCode::BAD_REQUEST, format!("Unknown provider: {}", provider))),
    };

    env::var(env_key).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            format!(
                "No API key provided. Set {} or pass X-Provider-Key header.",
                env_key
            ),
        )
    })
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async fn health() -> impl IntoResponse {
    Json(json!({ "status": "ok", "service": "llm" }))
}

async fn list_providers() -> impl IntoResponse {
    Json(json!({
        "providers": [
            {
                "id": "openai",
                "name": "OpenAI",
                "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini", "o3-mini"],
                "env_key": "OPENAI_API_KEY"
            },
            {
                "id": "anthropic",
                "name": "Anthropic",
                "models": ["claude-sonnet-4-20250514", "claude-haiku-35-20241022", "claude-opus-4-20250514"],
                "env_key": "ANTHROPIC_API_KEY"
            },
            {
                "id": "gemini",
                "name": "Google Gemini",
                "models": ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
                "env_key": "GEMINI_API_KEY"
            },
            {
                "id": "deepseek",
                "name": "DeepSeek",
                "models": ["deepseek-chat", "deepseek-reasoner"],
                "env_key": "DEEPSEEK_API_KEY"
            },
            {
                "id": "moonshot",
                "name": "Moonshot / Kimi",
                "models": ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
                "env_key": "MOONSHOT_API_KEY"
            }
        ]
    }))
}

/// Non-streaming chat completion that dispatches to the correct provider adapter.
async fn chat(
    State(state): State<LlmState>,
    headers: HeaderMap,
    Json(request): Json<ChatRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let api_key = resolve_api_key(&headers, &request.provider)?;
    let client = &state.client;

    let result = match request.provider.as_str() {
        "openai" => openai::send_request(client, &api_key, &request).await,
        "anthropic" => anthropic::send_request(client, &api_key, &request).await,
        "gemini" | "google" => gemini::send_request(client, &api_key, &request).await,
        "deepseek" => deepseek::send_request(client, &api_key, &request).await,
        "moonshot" | "kimi" => moonshot::send_request(client, &api_key, &request).await,
        other => Err(format!("Unknown provider: {}", other)),
    };

    match result {
        Ok(response) => Ok(Json(json!(response))),
        Err(e) => Err((StatusCode::BAD_GATEWAY, e)),
    }
}

/// SSE streaming chat completion that dispatches to the correct provider adapter
/// and re-emits a unified stream of `StreamEvent` objects.
async fn chat_stream(
    State(state): State<LlmState>,
    headers: HeaderMap,
    Json(request): Json<ChatRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let api_key = resolve_api_key(&headers, &request.provider)?;
    let client = &state.client;
    let provider = request.provider.clone();

    let upstream = match provider.as_str() {
        "openai" => openai::send_stream(client, &api_key, &request).await,
        "anthropic" => anthropic::send_stream(client, &api_key, &request).await,
        "gemini" | "google" => gemini::send_stream(client, &api_key, &request).await,
        "deepseek" => deepseek::send_stream(client, &api_key, &request).await,
        "moonshot" | "kimi" => moonshot::send_stream(client, &api_key, &request).await,
        other => Err(format!("Unknown provider: {}", other)),
    }
    .map_err(|e| (StatusCode::BAD_GATEWAY, e))?;

    let byte_stream = upstream.bytes_stream();

    let stream = async_stream::stream! {
        use futures::StreamExt;

        let mut byte_stream = std::pin::pin!(byte_stream);
        let mut buffer = String::new();

        while let Some(chunk_result) = byte_stream.next().await {
            match chunk_result {
                Ok(bytes) => {
                    let text = String::from_utf8_lossy(&bytes);
                    buffer.push_str(&text);

                    // Process complete lines from the buffer
                    while let Some(pos) = buffer.find("\n\n") {
                        let complete = buffer[..pos + 2].to_string();
                        buffer = buffer[pos + 2..].to_string();

                        let events: Vec<StreamEvent> = match provider.as_str() {
                            "openai" => openai::parse_stream_chunk(&complete),
                            "anthropic" => anthropic::parse_stream_chunk(&complete),
                            "gemini" | "google" => gemini::parse_stream_chunk(&complete),
                            "deepseek" => deepseek::parse_stream_chunk(&complete),
                            "moonshot" | "kimi" => moonshot::parse_stream_chunk(&complete),
                            _ => vec![],
                        };

                        for evt in events {
                            if let Ok(data) = serde_json::to_string(&evt) {
                                yield Ok::<Event, Infallible>(Event::default().data(data));
                            }
                        }
                    }
                }
                Err(e) => {
                    let err_event = StreamEvent {
                        event_type: "error".to_string(),
                        content: None,
                        usage: None,
                        message: Some(e.to_string()),
                    };
                    if let Ok(data) = serde_json::to_string(&err_event) {
                        yield Ok::<Event, Infallible>(Event::default().data(data));
                    }
                    break;
                }
            }
        }

        // Flush remaining buffer
        if !buffer.trim().is_empty() {
            let events: Vec<StreamEvent> = match provider.as_str() {
                "openai" => openai::parse_stream_chunk(&buffer),
                "anthropic" => anthropic::parse_stream_chunk(&buffer),
                "gemini" | "google" => gemini::parse_stream_chunk(&buffer),
                "deepseek" => deepseek::parse_stream_chunk(&buffer),
                "moonshot" | "kimi" => moonshot::parse_stream_chunk(&buffer),
                _ => vec![],
            };

            for evt in events {
                if let Ok(data) = serde_json::to_string(&evt) {
                    yield Ok::<Event, Infallible>(Event::default().data(data));
                }
            }
        }
    };

    Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}
