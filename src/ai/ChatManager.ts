/**
 * ChatManager — manages chat history, context, and state for AI conversations.
 */

import type { AIModel, ChatMessage, ChatOptions, StreamEvent } from "./types";
import { aiService } from "./AIService";
import { getSystemPrompt } from "./SystemPrompts";
import type { SimulationType } from "../simulations/types";

export interface ChatState {
  messages: ChatMessage[];
  model: AIModel;
  simulation: SimulationType | null;
  isStreaming: boolean;
}

const MAX_PERSISTED_MESSAGES = 50;
const STORAGE_PREFIX = "chat_history_";

export class ChatManager {
  private messages: ChatMessage[] = [];
  private model: AIModel;
  private simulation: SimulationType | null = null;
  private isStreaming = false;
  private onUpdate: ((state: ChatState) => void) | null = null;

  constructor(model: AIModel) {
    this.model = model;
  }

  setModel(model: AIModel): void {
    this.model = model;
    this.notify();
  }

  setSimulation(sim: SimulationType | null): void {
    this.simulation = sim;
    this.loadFromStorage();
  }

  saveToStorage(): void {
    if (!this.simulation) return;
    try {
      const key = `${STORAGE_PREFIX}${this.simulation}`;
      const toSave = this.messages
        .filter((m) => m.role !== "system")
        .slice(-MAX_PERSISTED_MESSAGES);
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch { /* quota exceeded or similar */ }
  }

  loadFromStorage(): void {
    if (!this.simulation) return;
    try {
      const key = `${STORAGE_PREFIX}${this.simulation}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        this.messages = JSON.parse(raw) as ChatMessage[];
        this.notify();
      }
    } catch { /* ignore corrupt data */ }
  }

  setOnUpdate(cb: (state: ChatState) => void): void {
    this.onUpdate = cb;
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getState(): ChatState {
    return {
      messages: [...this.messages],
      model: this.model,
      simulation: this.simulation,
      isStreaming: this.isStreaming,
    };
  }

  clearHistory(): void {
    this.messages = [];
    this.notify();
  }

  async sendMessage(
    content: string,
    options?: {
      thinking?: boolean;
      images?: string[];
      simulationState?: unknown;
    }
  ): Promise<void> {
    // Add user message
    const userMsg: ChatMessage = {
      role: "user",
      content,
      images: options?.images,
      timestamp: Date.now(),
    };
    this.messages.push(userMsg);
    this.notify();

    // Build messages array with system prompt
    const systemMessages = this.buildSystemMessages(options?.simulationState);
    const allMessages = [...systemMessages, ...this.messages];

    const chatOptions: ChatOptions = {
      thinking: options?.thinking && this.model.capabilities.includes("thinking"),
      images: options?.images,
    };

    try {
      const response = await aiService.chat(this.model, allMessages, chatOptions);
      this.messages.push(response);
      this.saveToStorage();
      this.notify();
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
      };
      this.messages.push(errorMsg);
      this.saveToStorage();
      this.notify();
    }
  }

  async *sendMessageStream(
    content: string,
    options?: {
      thinking?: boolean;
      images?: string[];
      simulationState?: unknown;
    }
  ): AsyncGenerator<StreamEvent> {
    const userMsg: ChatMessage = {
      role: "user",
      content,
      images: options?.images,
      timestamp: Date.now(),
    };
    this.messages.push(userMsg);
    this.isStreaming = true;
    this.notify();

    const systemMessages = this.buildSystemMessages(options?.simulationState);
    const allMessages = [...systemMessages, ...this.messages];

    const chatOptions: ChatOptions = {
      thinking: options?.thinking && this.model.capabilities.includes("thinking"),
      images: options?.images,
    };

    let fullContent = "";
    let fullThinking = "";

    try {
      for await (const event of aiService.chatStream(
        this.model,
        allMessages,
        chatOptions
      )) {
        if (event.type === "content" && event.content) {
          fullContent += event.content;
        } else if (event.type === "thinking" && event.content) {
          fullThinking += event.content;
        }
        yield event;
      }

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: fullContent,
        thinking: fullThinking || undefined,
        timestamp: Date.now(),
      };
      this.messages.push(assistantMsg);
      this.saveToStorage();
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
      };
      this.messages.push(errorMsg);
      this.saveToStorage();
    } finally {
      this.isStreaming = false;
      this.notify();
    }
  }

  private buildSystemMessages(simulationState?: unknown): ChatMessage[] {
    const systemPrompt = this.simulation
      ? getSystemPrompt(this.simulation, simulationState)
      : getSystemPrompt(null, null);

    return [
      {
        role: "system" as const,
        content: systemPrompt,
        timestamp: 0,
      },
    ];
  }

  private notify(): void {
    this.onUpdate?.(this.getState());
  }
}
