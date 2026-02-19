/**
 * Anthropic provider adapter.
 * Supports Claude Opus, Sonnet, and Haiku model families.
 *
 * Endpoint: https://api.anthropic.com/v1/messages
 * Auth:     x-api-key header + anthropic-version: 2023-06-01
 * System:   Top-level "system" field, NOT in messages array
 * Thinking: thinking.type: "enabled", thinking.budget_tokens
 * Stream:   event: content_block_delta
 *           data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
 */

import type { ChatMessage, ChatOptions, StreamEvent } from "../types";
import { BaseProvider } from "./base";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export class AnthropicProvider extends BaseProvider {
  async chat(
    model: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatMessage> {
    const body = this.buildRequestBody(model, messages, options, false);

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Anthropic request failed (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();

    let content = "";
    let thinking = "";

    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === "text") {
          content += block.text;
        } else if (block.type === "thinking") {
          thinking += block.thinking;
        }
      }
    }

    return {
      role: "assistant",
      content,
      thinking: thinking || undefined,
      timestamp: Date.now(),
    };
  }

  async *chatStream(
    model: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncGenerator<StreamEvent> {
    const body = this.buildRequestBody(model, messages, options, true);

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      yield {
        type: "error",
        message: `Anthropic stream failed (${response.status}): ${errorText}`,
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", message: "No response body from Anthropic" };
      return;
    }

    let inputTokens = 0;
    let outputTokens = 0;

    // Anthropic uses a custom SSE format with "event:" lines followed by "data:" lines.
    // We parse both event type and data payload.
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("event: ")) {
          currentEvent = trimmed.slice(7);
          continue;
        }

        if (trimmed.startsWith("data: ")) {
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(trimmed.slice(6));
          } catch {
            continue;
          }

          const streamEvent = this.handleSSEEvent(
            currentEvent,
            data
          );

          if (streamEvent) {
            yield streamEvent;
          }

          // Collect usage from message_delta event
          if (currentEvent === "message_delta" && data.usage) {
            const usage = data.usage as Record<string, number>;
            outputTokens = usage.output_tokens ?? outputTokens;
          }

          // Collect usage from message_start event
          if (currentEvent === "message_start" && data.message) {
            const msg = data.message as Record<string, unknown>;
            if (msg.usage) {
              const usage = msg.usage as Record<string, number>;
              inputTokens = usage.input_tokens ?? 0;
            }
          }

          currentEvent = "";
        }
      }
    }

    yield {
      type: "done",
      usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    };
  }

  private handleSSEEvent(
    eventType: string,
    data: Record<string, unknown>
  ): StreamEvent | null {
    if (eventType === "content_block_delta") {
      const delta = data.delta as Record<string, string> | undefined;
      if (!delta) return null;

      if (delta.type === "thinking_delta" && delta.thinking) {
        return { type: "thinking", content: delta.thinking };
      }

      if (delta.type === "text_delta" && delta.text) {
        return { type: "content", content: delta.text };
      }
    }

    if (eventType === "error") {
      const error = data.error as Record<string, string> | undefined;
      return {
        type: "error",
        message: error?.message ?? "Unknown Anthropic stream error",
      };
    }

    return null;
  }

  private buildHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      "anthropic-version": API_VERSION,
    };
  }

  private buildRequestBody(
    model: string,
    messages: ChatMessage[],
    options: ChatOptions | undefined,
    stream: boolean
  ): Record<string, unknown> {
    // Extract system prompt from messages — Anthropic expects it as a top-level field
    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    const body: Record<string, unknown> = {
      model,
      messages: this.formatMessages(nonSystemMessages),
      max_tokens: options?.maxTokens ?? 4096,
      stream,
    };

    // Set system prompt as top-level field
    if (systemMessages.length > 0) {
      body.system = systemMessages.map((m) => m.content).join("\n\n");
    }

    // Temperature (only for non-thinking requests)
    if (!options?.thinking && options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    // Extended thinking configuration
    if (options?.thinking) {
      body.thinking = {
        type: "enabled",
        budget_tokens: Math.min(
          options.maxTokens ? Math.floor(options.maxTokens * 0.8) : 10000,
          100000
        ),
      };
    }

    return body;
  }

  private formatMessages(
    messages: ChatMessage[]
  ): Array<Record<string, unknown>> {
    return messages.map((m) => {
      // If the message has images, use multipart content format
      if (m.images && m.images.length > 0 && m.role === "user") {
        const content: Array<Record<string, unknown>> = [];

        for (const img of m.images) {
          // Determine media type from data URI or default to jpeg
          let mediaType = "image/jpeg";
          let base64Data = img;

          const dataUriMatch = img.match(
            /^data:(image\/[a-z+]+);base64,(.+)$/
          );
          if (dataUriMatch) {
            mediaType = dataUriMatch[1];
            base64Data = dataUriMatch[2];
          }

          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Data,
            },
          });
        }

        content.push({ type: "text", text: m.content });
        return { role: m.role, content };
      }

      return { role: m.role, content: m.content };
    });
  }
}
