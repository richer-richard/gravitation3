/**
 * Google Gemini provider adapter.
 * Supports Gemini 2.5 Flash and Flash Lite models.
 *
 * Endpoint: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 *           https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent
 * Auth:     ?key= query parameter
 * Messages: contents[].parts[], role "model" instead of "assistant"
 * System:   systemInstruction top-level field
 * Thinking: thinkingConfig.thinkingBudget for thinking-capable models
 */

import type { ChatMessage, ChatOptions, StreamEvent } from "../types";
import { BaseProvider } from "./base";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  thought?: boolean;
}

interface GeminiContent {
  role: string;
  parts: GeminiPart[];
}

interface GeminiCandidate {
  content: {
    parts: GeminiPart[];
    role: string;
  };
}

export class GeminiProvider extends BaseProvider {
  async chat(
    model: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatMessage> {
    const url = `${BASE_URL}/${model}:generateContent?key=${this.apiKey}`;
    const body = this.buildRequestBody(messages, options);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemini request failed (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();
    const candidates = data.candidates as GeminiCandidate[] | undefined;

    let content = "";
    let thinking = "";

    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts ?? [];
      for (const part of parts) {
        if (part.thought && part.text) {
          thinking += part.text;
        } else if (part.text) {
          content += part.text;
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
    const url = `${BASE_URL}/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
    const body = this.buildRequestBody(messages, options);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      yield {
        type: "error",
        message: `Gemini stream failed (${response.status}): ${errorText}`,
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", message: "No response body from Gemini" };
      return;
    }

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of this.parseSSE(reader)) {
      const data = chunk as Record<string, unknown>;

      // Extract usage metadata
      if (data.usageMetadata) {
        const usage = data.usageMetadata as Record<string, number>;
        inputTokens = usage.promptTokenCount ?? inputTokens;
        outputTokens = usage.candidatesTokenCount ?? outputTokens;
      }

      const candidates = data.candidates as GeminiCandidate[] | undefined;
      if (!candidates || candidates.length === 0) continue;

      const parts = candidates[0].content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.thought && part.text) {
          yield { type: "thinking", content: part.text };
        } else if (part.text) {
          yield { type: "content", content: part.text };
        }
      }
    }

    yield {
      type: "done",
      usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    };
  }

  private buildRequestBody(
    messages: ChatMessage[],
    options: ChatOptions | undefined
  ): Record<string, unknown> {
    // Extract system messages for systemInstruction
    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    const body: Record<string, unknown> = {
      contents: this.formatContents(nonSystemMessages),
    };

    // System prompt as systemInstruction
    if (systemMessages.length > 0) {
      body.systemInstruction = {
        parts: [{ text: systemMessages.map((m) => m.content).join("\n\n") }],
      };
    }

    // Generation config
    const generationConfig: Record<string, unknown> = {};

    if (options?.maxTokens) {
      generationConfig.maxOutputTokens = options.maxTokens;
    }

    if (options?.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }

    // Thinking configuration for thinking-capable models
    if (options?.thinking) {
      generationConfig.thinkingConfig = {
        thinkingBudget: options.maxTokens
          ? Math.floor(options.maxTokens * 0.8)
          : 10000,
      };
    }

    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    return body;
  }

  private formatContents(messages: ChatMessage[]): GeminiContent[] {
    return messages.map((m) => {
      // Gemini uses "model" instead of "assistant"
      const role = m.role === "assistant" ? "model" : "user";

      const parts: GeminiPart[] = [];

      // Add images first if present
      if (m.images && m.images.length > 0) {
        for (const img of m.images) {
          let mimeType = "image/jpeg";
          let data = img;

          const dataUriMatch = img.match(
            /^data:(image\/[a-z+]+);base64,(.+)$/
          );
          if (dataUriMatch) {
            mimeType = dataUriMatch[1];
            data = dataUriMatch[2];
          }

          parts.push({
            inlineData: { mimeType, data },
          });
        }
      }

      parts.push({ text: m.content });

      return { role, parts };
    });
  }
}
