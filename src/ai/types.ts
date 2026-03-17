export type Provider =
  | "openai"
  | "anthropic"
  | "google"
  | "deepseek"
  | "moonshot"
  | "qwen"
  | "minimax";
export type ModelCapability = "chat" | "thinking" | "vision";

export interface AIModel {
  id: string;
  provider: Provider;
  displayName: string;
  capabilities: ModelCapability[];
  contextWindow: number;
  maxOutput: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  images?: string[];
  timestamp: number;
}

export interface StreamEvent {
  type: "thinking" | "content" | "done" | "error";
  content?: string;
  usage?: { input_tokens: number; output_tokens: number };
  message?: string;
}

export interface ChatOptions {
  thinking?: boolean;
  maxTokens?: number;
  temperature?: number;
  images?: string[];
}
