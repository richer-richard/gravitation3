import type { AIModel, ChatMessage, ChatOptions, StreamEvent } from "./types";
import { invoke } from "@tauri-apps/api/core";
import { IS_TAURI } from "../utils/tauri-bridge";
import { getProviderAliases } from "./providerCatalog";

const LLM_BASE = "http://localhost:5001";

async function getApiKey(provider: string): Promise<string> {
  const candidates = [provider, ...getProviderAliases(provider)];
  if (IS_TAURI) {
    try {
      for (const candidate of candidates) {
        const key = await invoke("get_api_key", { provider: candidate }) as string;
        if (key) return key;
      }
    } catch { /* fall through to localStorage */ }
  }
  for (const candidate of candidates) {
    const key = localStorage.getItem(`api_key_${candidate}`) || "";
    if (key) return key;
  }
  return "";
}

export class AIService {
  async chat(
    model: AIModel,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatMessage> {
    const apiKey = await getApiKey(model.provider);
    const response = await fetch(`${LLM_BASE}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Provider-Key": apiKey,
      },
      body: JSON.stringify({
        provider: model.provider,
        model: model.id,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        thinking: options?.thinking ?? false,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
        stream: false,
        images: options?.images,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      role: "assistant",
      content: data.content,
      thinking: data.thinking,
      timestamp: Date.now(),
    };
  }

  async *chatStream(
    model: AIModel,
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncGenerator<StreamEvent> {
    const apiKey = await getApiKey(model.provider);
    const response = await fetch(`${LLM_BASE}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Provider-Key": apiKey,
      },
      body: JSON.stringify({
        provider: model.provider,
        model: model.id,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        thinking: options?.thinking ?? false,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
        stream: true,
        images: options?.images,
      }),
    });

    if (!response.ok) {
      yield {
        type: "error",
        message: `Stream request failed: ${response.statusText}`,
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event: StreamEvent = JSON.parse(line.slice(6));
            yield event;
          } catch {
            // Skip malformed events
          }
        }
      }
    }
  }
}

export const aiService = new AIService();
