/**
 * BaseProvider — abstract base class for all AI provider adapters.
 * Provides shared SSE parsing logic and defines the interface that
 * each provider must implement for direct-mode API access.
 */

import type { ChatMessage, ChatOptions, StreamEvent } from "../types";

export abstract class BaseProvider {
  protected apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Send a non-streaming chat request and return the assistant's reply.
   */
  abstract chat(
    model: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatMessage>;

  /**
   * Send a streaming chat request, yielding incremental StreamEvents.
   */
  abstract chatStream(
    model: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncGenerator<StreamEvent>;

  /**
   * Shared SSE (Server-Sent Events) parser.
   * Reads a byte stream and yields raw JSON objects from `data:` lines.
   * Subclasses call this and then interpret the parsed objects
   * according to their provider-specific format.
   */
  protected async *parseSSE(
    reader: ReadableStreamDefaultReader<Uint8Array>
  ): AsyncGenerator<unknown> {
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === "data: [DONE]") {
          return;
        }

        if (trimmed.startsWith("data: ")) {
          try {
            const payload = JSON.parse(trimmed.slice(6));
            yield payload;
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    }

    // Process any remaining data in the buffer
    if (buffer.trim().startsWith("data: ") && buffer.trim() !== "data: [DONE]") {
      try {
        const payload = JSON.parse(buffer.trim().slice(6));
        yield payload;
      } catch {
        // Skip malformed JSON
      }
    }
  }

  /**
   * Helper to strip fields from messages that should not be sent to the API
   * (e.g., timestamp, thinking, images on non-vision calls).
   */
  protected sanitizeMessages(
    messages: ChatMessage[]
  ): { role: string; content: string }[] {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }
}
