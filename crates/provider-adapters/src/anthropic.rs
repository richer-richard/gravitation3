use serde_json::{json, Value};

use super::types::{ChatRequest, ChatResponse, StreamEvent, Usage};

const ANTHROPIC_API_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";

/// Build the Anthropic Messages API request body from our unified ChatRequest.
/// Anthropic requires the system message in a separate top-level field and uses
/// `x-api-key` / `anthropic-version` headers instead of Bearer auth.
fn build_request_body(request: &ChatRequest) -> Value {
    let mut system_text: Option<String> = None;
    let mut messages: Vec<Value> = Vec::new();

    for msg in &request.messages {
        if msg.role == "system" {
            // Anthropic expects system as a separate top-level field.
            system_text = Some(msg.content.clone());
        } else {
            messages.push(json!({
                "role": msg.role,
                "content": msg.content,
            }));
        }
    }

    let mut body = json!({
        "model": request.model,
        "messages": messages,
        "max_tokens": request.max_tokens,
        "temperature": request.temperature,
        "stream": request.stream,
    });

    if let Some(sys) = system_text {
        body["system"] = json!(sys);
    }

    // Enable extended thinking if requested
    if request.thinking {
        body["thinking"] = json!({
            "type": "enabled",
            "budget_tokens": request.max_tokens.saturating_sub(100).max(1024)
        });
        // Anthropic does not allow temperature with thinking
        body.as_object_mut().unwrap().remove("temperature");
    }

    body
}

/// Send a non-streaming request to the Anthropic Messages API.
pub async fn send_request(
    client: &reqwest::Client,
    api_key: &str,
    request: &ChatRequest,
) -> Result<ChatResponse, String> {
    let mut body = build_request_body(request);
    body["stream"] = json!(false);

    let response = client
        .post(ANTHROPIC_API_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Anthropic request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response
            .text()
            .await
            .unwrap_or_else(|_| "unknown error".to_string());
        return Err(format!("Anthropic API error ({}): {}", status, text));
    }

    let data: Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Anthropic response: {}", e))?;

    // Anthropic returns content as an array of content blocks.
    let mut content = String::new();
    let mut thinking = None;

    if let Some(blocks) = data["content"].as_array() {
        for block in blocks {
            match block["type"].as_str() {
                Some("text") => {
                    if let Some(text) = block["text"].as_str() {
                        content.push_str(text);
                    }
                }
                Some("thinking") => {
                    if let Some(text) = block["thinking"].as_str() {
                        thinking = Some(text.to_string());
                    }
                }
                _ => {}
            }
        }
    }

    let input_tokens = data["usage"]["input_tokens"].as_u64().unwrap_or(0) as u32;
    let output_tokens = data["usage"]["output_tokens"].as_u64().unwrap_or(0) as u32;

    Ok(ChatResponse {
        content,
        thinking,
        usage: Usage {
            input_tokens,
            output_tokens,
        },
    })
}

/// Send a streaming request to the Anthropic Messages API.
pub async fn send_stream(
    client: &reqwest::Client,
    api_key: &str,
    request: &ChatRequest,
) -> Result<reqwest::Response, String> {
    let mut body = build_request_body(request);
    body["stream"] = json!(true);

    let response = client
        .post(ANTHROPIC_API_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Anthropic stream request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response
            .text()
            .await
            .unwrap_or_else(|_| "unknown error".to_string());
        return Err(format!(
            "Anthropic stream API error ({}): {}",
            status, text
        ));
    }

    Ok(response)
}

/// Parse an SSE chunk from Anthropic's streaming format into unified StreamEvents.
///
/// Anthropic uses `event: <type>` lines followed by `data: <json>` lines.
/// Key event types: content_block_delta, message_delta, message_stop.
pub fn parse_stream_chunk(chunk: &str) -> Vec<StreamEvent> {
    let mut events = Vec::new();
    let mut current_event_type: Option<String> = None;

    for line in chunk.lines() {
        let line = line.trim();

        if line.starts_with("event: ") {
            current_event_type = Some(line[7..].to_string());
            continue;
        }

        if !line.starts_with("data: ") {
            continue;
        }

        let data = &line[6..];
        let event_name = current_event_type.take();

        if let Ok(parsed) = serde_json::from_str::<Value>(data) {
            match event_name.as_deref() {
                Some("content_block_delta") => {
                    if let Some(text) = parsed["delta"]["text"].as_str() {
                        if !text.is_empty() {
                            events.push(StreamEvent {
                                event_type: "content".to_string(),
                                content: Some(text.to_string()),
                                usage: None,
                                message: None,
                            });
                        }
                    }
                }
                Some("message_delta") => {
                    if let Some(usage_obj) = parsed.get("usage") {
                        if !usage_obj.is_null() {
                            let output_tokens =
                                usage_obj["output_tokens"].as_u64().unwrap_or(0) as u32;
                            events.push(StreamEvent {
                                event_type: "usage".to_string(),
                                content: None,
                                usage: Some(Usage {
                                    input_tokens: 0,
                                    output_tokens,
                                }),
                                message: None,
                            });
                        }
                    }
                }
                Some("message_start") => {
                    if let Some(usage_obj) = parsed["message"].get("usage") {
                        if !usage_obj.is_null() {
                            let input_tokens =
                                usage_obj["input_tokens"].as_u64().unwrap_or(0) as u32;
                            events.push(StreamEvent {
                                event_type: "usage".to_string(),
                                content: None,
                                usage: Some(Usage {
                                    input_tokens,
                                    output_tokens: 0,
                                }),
                                message: None,
                            });
                        }
                    }
                }
                Some("message_stop") => {
                    events.push(StreamEvent {
                        event_type: "done".to_string(),
                        content: None,
                        usage: None,
                        message: None,
                    });
                }
                _ => {}
            }
        }
    }

    events
}
