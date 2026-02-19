/**
 * DeepSeek provider adapter.
 * Supports DeepSeek V3.2 (chat) and DeepSeek Reasoner (thinking).
 *
 * Endpoint: https://api.deepseek.com/chat/completions
 * Auth:     Authorization: Bearer <key>
 * Format:   OpenAI-compatible, but reasoning models emit a
 *           reasoning_content field in the delta for thinking tokens.
 * History:  Strip reasoning_content from history messages to avoid
 *           confusing the model on subsequent turns.
 */

import type { ChatMessage, ChatOptions, StreamEvent } from "../types";
import { BaseProvider } from "./base";

const ENDPOINT = "https://api.deepseek.com/chat/completions";

export class DeepSeekProvider extends BaseProvider {
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
        `DeepSeek request failed (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message;

    return {
      role: "assistant",
      content: message?.content ?? "",
      thinking: message?.reasoning_content || undefined,
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
        message: `DeepSeek stream failed (${response.status}): ${errorText}`,
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", message: "No response body from DeepSeek" };
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

      // DeepSeek Reasoner emits reasoning_content for thinking tokens
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
    const body: Record<string, unknown> = {
      model,
      messages: this.formatMessages(messages),
      stream,
    };

    if (stream) {
      body.stream_options = { include_usage: true };
    }

    if (options?.maxTokens) {
      body.max_tokens = options.maxTokens;
    }

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    return body;
  }

  /**
   * Format messages for the DeepSeek API.
   * Strips reasoning_content / thinking from assistant messages in history
   * to prevent the model from being confused by prior reasoning traces.
   */
  private formatMessages(
    messages: ChatMessage[]
  ): Array<Record<string, unknown>> {
    return messages.map((m) => {
      const formatted: Record<string, unknown> = {
        role: m.role,
        content: m.content,
      };

      // Do NOT forward thinking/reasoning_content in history — DeepSeek docs
      // specify that reasoning_content must be stripped from assistant turns
      // in multi-turn conversations.

      return formatted;
    });
  }
}
