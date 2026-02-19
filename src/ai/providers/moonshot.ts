/**
 * Moonshot / Kimi provider adapter.
 * Supports Kimi K2 and other Moonshot models.
 *
 * Endpoint: https://api.moonshot.cn/v1/chat/completions
 * Auth:     Authorization: Bearer <key>
 * Format:   Fully OpenAI-compatible
 */

import type { ChatMessage, ChatOptions, StreamEvent } from "../types";
import { BaseProvider } from "./base";

const ENDPOINT = "https://api.moonshot.cn/v1/chat/completions";

export class MoonshotProvider extends BaseProvider {
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
        `Moonshot request failed (${response.status}): ${errorText}`
      );
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
        message: `Moonshot stream failed (${response.status}): ${errorText}`,
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", message: "No response body from Moonshot" };
      return;
    }

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of this.parseSSE(reader)) {
      const data = chunk as Record<string, unknown>;

      // Track usage if present
      if (data.usage) {
        const usage = data.usage as Record<string, number>;
        inputTokens = usage.prompt_tokens ?? 0;
        outputTokens = usage.completion_tokens ?? 0;
      }

      const choices = data.choices as Array<Record<string, unknown>> | undefined;
      if (!choices || choices.length === 0) continue;

      const delta = choices[0].delta as Record<string, string> | undefined;
      if (!delta) continue;

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
    const body: Record<string, unknown> = {
      model,
      messages: this.formatMessages(messages),
      stream,
    };

    if (options?.maxTokens) {
      body.max_tokens = options.maxTokens;
    }

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    return body;
  }

  private formatMessages(
    messages: ChatMessage[]
  ): Array<Record<string, unknown>> {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }
}
