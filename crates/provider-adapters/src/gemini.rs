use serde_json::{json, Value};

use super::types::{ChatRequest, ChatResponse, StreamEvent, Usage};

const GEMINI_API_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models";

/// Build the request URL for Gemini. The API key is passed as a query parameter.
fn build_url(model: &str, api_key: &str, stream: bool) -> String {
    let action = if stream {
        "streamGenerateContent?alt=sse"
    } else {
        "generateContent"
    };
    format!(
        "{}/{}:{}{}key={}",
        GEMINI_API_URL,
        model,
        action,
        if stream { "&" } else { "?" },
        api_key
    )
}

/// Build the Gemini API request body.
///
/// Gemini uses `contents[].parts[]` for messages and `systemInstruction` for
/// system prompts. Role names differ: "user" stays "user", but "assistant"
/// becomes "model".
fn build_request_body(request: &ChatRequest) -> Value {
    let mut system_text: Option<String> = None;
    let mut contents: Vec<Value> = Vec::new();

    for msg in &request.messages {
        if msg.role == "system" {
            system_text = Some(msg.content.clone());
        } else {
            let role = match msg.role.as_str() {
                "assistant" => "model",
                other => other,
            };
            contents.push(json!({
                "role": role,
                "parts": [{ "text": msg.content }]
            }));
        }
    }

    let mut body = json!({
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": request.max_tokens,
            "temperature": request.temperature,
        }
    });

    if let Some(sys) = system_text {
        body["systemInstruction"] = json!({
            "parts": [{ "text": sys }]
        });
    }

    body
}

/// Send a non-streaming request to the Gemini API.
pub async fn send_request(
    client: &reqwest::Client,
    api_key: &str,
    request: &ChatRequest,
) -> Result<ChatResponse, String> {
    let url = build_url(&request.model, api_key, false);
    let body = build_request_body(request);

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Gemini request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response
            .text()
            .await
            .unwrap_or_else(|_| "unknown error".to_string());
        return Err(format!("Gemini API error ({}): {}", status, text));
    }

    let data: Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Gemini response: {}", e))?;

    let content = data["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let input_tokens = data["usageMetadata"]["promptTokenCount"]
        .as_u64()
        .unwrap_or(0) as u32;
    let output_tokens = data["usageMetadata"]["candidatesTokenCount"]
        .as_u64()
        .unwrap_or(0) as u32;

    Ok(ChatResponse {
        content,
        thinking: None,
        usage: Usage {
            input_tokens,
            output_tokens,
        },
    })
}

/// Send a streaming request to the Gemini API.
pub async fn send_stream(
    client: &reqwest::Client,
    api_key: &str,
    request: &ChatRequest,
) -> Result<reqwest::Response, String> {
    let url = build_url(&request.model, api_key, true);
    let body = build_request_body(request);

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Gemini stream request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response
            .text()
            .await
            .unwrap_or_else(|_| "unknown error".to_string());
        return Err(format!("Gemini stream API error ({}): {}", status, text));
    }

    Ok(response)
}

/// Parse an SSE chunk from Gemini's streaming format into unified StreamEvents.
///
/// Gemini streaming returns `data: <json>` lines where each JSON object
/// contains `candidates[0].content.parts[0].text` for content deltas.
pub fn parse_stream_chunk(chunk: &str) -> Vec<StreamEvent> {
    let mut events = Vec::new();

    for line in chunk.lines() {
        let line = line.trim();
        if !line.starts_with("data: ") {
            continue;
        }
        let data = &line[6..];

        if let Ok(parsed) = serde_json::from_str::<Value>(data) {
            // Extract text content
            if let Some(text) = parsed["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                if !text.is_empty() {
                    events.push(StreamEvent {
                        event_type: "content".to_string(),
                        content: Some(text.to_string()),
                        usage: None,
                        message: None,
                    });
                }
            }

            // Extract usage metadata
            if let Some(usage_meta) = parsed.get("usageMetadata") {
                if !usage_meta.is_null() {
                    let input_tokens =
                        usage_meta["promptTokenCount"].as_u64().unwrap_or(0) as u32;
                    let output_tokens =
                        usage_meta["candidatesTokenCount"].as_u64().unwrap_or(0) as u32;
                    if input_tokens > 0 || output_tokens > 0 {
                        events.push(StreamEvent {
                            event_type: "usage".to_string(),
                            content: None,
                            usage: Some(Usage {
                                input_tokens,
                                output_tokens,
                            }),
                            message: None,
                        });
                    }
                }
            }

            // Check for finish reason
            if let Some(reason) = parsed["candidates"][0]["finishReason"].as_str() {
                if reason == "STOP" || reason == "MAX_TOKENS" {
                    events.push(StreamEvent {
                        event_type: "done".to_string(),
                        content: None,
                        usage: None,
                        message: None,
                    });
                }
            }
        }
    }

    events
}
