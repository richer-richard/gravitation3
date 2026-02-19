/**
 * OpenAI provider adapter.
 * Supports GPT-4.1 family and o-series reasoning models.
 *
 * Endpoint: https://api.openai.com/v1/chat/completions
 * Auth:     Authorization: Bearer <key>
 * Thinking: reasoning_effort param ("low" | "medium" | "high") for o-series models
 * Stream:   data: {"choices":[{"delta":{"content":"..."}}]}
 */

import type { ChatMessage, ChatOptions, StreamEvent } from "../types";
import { BaseProvider } from "./base";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

export class OpenAIProvider extends BaseProvider {
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
      throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      role: "assistant",
      content: choice?.message?.content ?? "",
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
        message: `OpenAI stream failed (${response.status}): ${errorText}`,
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", message: "No response body from OpenAI" };
      return;
    }

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of this.parseSSE(reader)) {
      const data = chunk as Record<string, unknown>;

      // Track usage if present (sent on final chunk)
      if (data.usage) {
        const usage = data.usage as Record<string, number>;
        inputTokens = usage.prompt_tokens ?? 0;
        outputTokens = usage.completion_tokens ?? 0;
      }

      const choices = data.choices as Array<Record<string, unknown>> | undefined;
      if (!choices || choices.length === 0) continue;

      const delta = choices[0].delta as Record<string, string> | undefined;
      if (!delta) continue;

      // o-series models may emit reasoning content (thinking)
      if (delta.reasoning_content) {
        yield { type: "thinking", content: delta.reasoning_content };
      }

      if (delta.content) {
        yield { type: "content", content: delta.content };
      }
    }

    yield {
      type: "done",
      usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    };
  }

  private buildHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private buildRequestBody(
    model: string,
    messages: ChatMessage[],
    options: ChatOptions | undefined,
    stream: boolean
  ): Record<string, unknown> {
    const isReasoningModel = model.startsWith("o");

    const body: Record<string, unknown> = {
      model,
      messages: this.formatMessages(messages),
      stream,
    };

    if (stream) {
      // Request usage stats on the final streamed chunk
      body.stream_options = { include_usage: true };
    }

    if (isReasoningModel) {
      // Reasoning models use reasoning_effort instead of temperature
      if (options?.thinking) {
        body.reasoning_effort = "high";
      }
      if (options?.maxTokens) {
        body.max_completion_tokens = options.maxTokens;
      }
    } else {
      // Standard chat models
      if (options?.temperature !== undefined) {
        body.temperature = options.temperature;
      }
      if (options?.maxTokens) {
        body.max_tokens = options.maxTokens;
      }
    }

    return body;
  }

  private formatMessages(
    messages: ChatMessage[]
  ): Array<Record<string, unknown>> {
    return messages.map((m) => {
      // If the message has images, use multipart content format
      if (m.images && m.images.length > 0 && m.role === "user") {
        const parts: Array<Record<string, unknown>> = [
          { type: "text", text: m.content },
        ];
        for (const img of m.images) {
          parts.push({
            type: "image_url",
            image_url: { url: img },
          });
        }
        return { role: m.role, content: parts };
      }

      return { role: m.role, content: m.content };
    });
  }
}
