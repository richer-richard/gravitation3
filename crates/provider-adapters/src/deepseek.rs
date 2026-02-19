use serde_json::{json, Value};

use super::types::{ChatRequest, ChatResponse, StreamEvent, Usage};

const DEEPSEEK_API_URL: &str = "https://api.deepseek.com/chat/completions";

/// Build the DeepSeek request body. DeepSeek uses an OpenAI-compatible format.
fn build_request_body(request: &ChatRequest) -> Value {
    let messages: Vec<Value> = request
        .messages
        .iter()
        .map(|msg| {
            json!({
                "role": msg.role,
                "content": msg.content,
            })
        })
        .collect();

    json!({
        "model": request.model,
        "messages": messages,
        "max_tokens": request.max_tokens,
        "temperature": request.temperature,
        "stream": request.stream,
    })
}

/// Send a non-streaming request to the DeepSeek API.
pub async fn send_request(
    client: &reqwest::Client,
    api_key: &str,
    request: &ChatRequest,
) -> Result<ChatResponse, String> {
    let mut body = build_request_body(request);
    body["stream"] = json!(false);

    let response = client
        .post(DEEPSEEK_API_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("DeepSeek request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response
            .text()
            .await
            .unwrap_or_else(|_| "unknown error".to_string());
        return Err(format!("DeepSeek API error ({}): {}", status, text));
    }

    let data: Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse DeepSeek response: {}", e))?;

    let content = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    // DeepSeek may include reasoning_content for its thinking models
    let thinking = data["choices"][0]["message"]["reasoning_content"]
        .as_str()
        .map(|s| s.to_string());

    let input_tokens = data["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32;
    let output_tokens = data["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32;

    Ok(ChatResponse {
        content,
        thinking,
        usage: Usage {
            input_tokens,
            output_tokens,
        },
    })
}

/// Send a streaming request to the DeepSeek API.
pub async fn send_stream(
    client: &reqwest::Client,
    api_key: &str,
    request: &ChatRequest,
) -> Result<reqwest::Response, String> {
    let mut body = build_request_body(request);
    body["stream"] = json!(true);

    let response = client
        .post(DEEPSEEK_API_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("DeepSeek stream request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response
            .text()
            .await
            .unwrap_or_else(|_| "unknown error".to_string());
        return Err(format!("DeepSeek stream API error ({}): {}", status, text));
    }

    Ok(response)
}

/// Parse an SSE chunk from DeepSeek's streaming format into unified StreamEvents.
/// DeepSeek uses the same OpenAI-compatible SSE format.
pub fn parse_stream_chunk(chunk: &str) -> Vec<StreamEvent> {
    let mut events = Vec::new();

    for line in chunk.lines() {
        let line = line.trim();
        if !line.starts_with("data: ") {
            continue;
        }
        let data = &line[6..];
        if data == "[DONE]" {
            events.push(StreamEvent {
                event_type: "done".to_string(),
                content: None,
                usage: None,
                message: None,
            });
            continue;
        }

        if let Ok(parsed) = serde_json::from_str::<Value>(data) {
            // Content delta
            if let Some(content) = parsed["choices"][0]["delta"]["content"].as_str() {
                if !content.is_empty() {
                    events.push(StreamEvent {
                        event_type: "content".to_string(),
                        content: Some(content.to_string()),
                        usage: None,
                        message: None,
                    });
                }
            }

            // Reasoning content (DeepSeek thinking)
            if let Some(reasoning) = parsed["choices"][0]["delta"]["reasoning_content"].as_str() {
                if !reasoning.is_empty() {
                    events.push(StreamEvent {
                        event_type: "thinking".to_string(),
                        content: Some(reasoning.to_string()),
                        usage: None,
                        message: None,
                    });
                }
            }

            // Usage
            if let Some(usage_obj) = parsed.get("usage") {
                if !usage_obj.is_null() {
                    let input_tokens = usage_obj["prompt_tokens"].as_u64().unwrap_or(0) as u32;
                    let output_tokens =
                        usage_obj["completion_tokens"].as_u64().unwrap_or(0) as u32;
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
    }

    events
}
