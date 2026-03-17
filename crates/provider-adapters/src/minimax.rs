use serde_json::{json, Value};

use super::types::{ChatRequest, ChatResponse, StreamEvent, Usage};

const MINIMAX_API_URL: &str = "https://api.minimaxi.com/anthropic/v1/messages";
const MINIMAX_VERSION: &str = "2023-06-01";

fn build_request_body(request: &ChatRequest) -> Value {
    let mut system_text: Option<String> = None;
    let mut messages: Vec<Value> = Vec::new();

    for msg in &request.messages {
        if msg.role == "system" {
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
        "temperature": request.temperature.clamp(0.01, 1.0),
        "stream": request.stream,
    });

    if let Some(system) = system_text {
        body["system"] = json!(system);
    }

    if request.thinking {
        body["thinking"] = json!({
            "type": "enabled",
            "budget_tokens": request.max_tokens.saturating_sub(100).max(1024),
        });
    }

    body
}

pub async fn send_request(
    client: &reqwest::Client,
    api_key: &str,
    request: &ChatRequest,
) -> Result<ChatResponse, String> {
    let mut body = build_request_body(request);
    body["stream"] = json!(false);

    let response = client
        .post(MINIMAX_API_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", MINIMAX_VERSION)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("MiniMax request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response
            .text()
            .await
            .unwrap_or_else(|_| "unknown error".to_string());
        return Err(format!("MiniMax API error ({}): {}", status, text));
    }

    let data: Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse MiniMax response: {}", e))?;

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

pub async fn send_stream(
    client: &reqwest::Client,
    api_key: &str,
    request: &ChatRequest,
) -> Result<reqwest::Response, String> {
    let mut body = build_request_body(request);
    body["stream"] = json!(true);

    let response = client
        .post(MINIMAX_API_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", MINIMAX_VERSION)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("MiniMax stream request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response
            .text()
            .await
            .unwrap_or_else(|_| "unknown error".to_string());
        return Err(format!("MiniMax stream API error ({}): {}", status, text));
    }

    Ok(response)
}

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
                Some("content_block_delta") => match parsed["delta"]["type"].as_str() {
                    Some("thinking_delta") => {
                        if let Some(text) = parsed["delta"]["thinking"].as_str() {
                            if !text.is_empty() {
                                events.push(StreamEvent {
                                    event_type: "thinking".to_string(),
                                    content: Some(text.to_string()),
                                    usage: None,
                                    message: None,
                                });
                            }
                        }
                    }
                    _ => {
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
                },
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
