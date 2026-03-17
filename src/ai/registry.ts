import type { AIModel } from "./types";

export const MODELS: AIModel[] = [
  // OpenAI
  { id: "gpt-4.1", provider: "openai", displayName: "GPT-4.1", capabilities: ["chat", "vision"], contextWindow: 1000000, maxOutput: 32000 },
  { id: "gpt-4.1-mini", provider: "openai", displayName: "GPT-4.1 Mini", capabilities: ["chat", "vision"], contextWindow: 1000000, maxOutput: 32000 },
  { id: "gpt-4.1-nano", provider: "openai", displayName: "GPT-4.1 Nano", capabilities: ["chat"], contextWindow: 1000000, maxOutput: 32000 },
  { id: "o3", provider: "openai", displayName: "o3", capabilities: ["chat", "thinking", "vision"], contextWindow: 200000, maxOutput: 100000 },
  { id: "o4-mini", provider: "openai", displayName: "o4 Mini", capabilities: ["chat", "thinking", "vision"], contextWindow: 200000, maxOutput: 100000 },

  // Anthropic
  { id: "claude-opus-4-6", provider: "anthropic", displayName: "Claude Opus 4.6", capabilities: ["chat", "thinking", "vision"], contextWindow: 200000, maxOutput: 128000 },
  { id: "claude-sonnet-4-6", provider: "anthropic", displayName: "Claude Sonnet 4.6", capabilities: ["chat", "thinking", "vision"], contextWindow: 200000, maxOutput: 64000 },
  { id: "claude-sonnet-4-5", provider: "anthropic", displayName: "Claude Sonnet 4.5", capabilities: ["chat", "thinking", "vision"], contextWindow: 200000, maxOutput: 64000 },
  { id: "claude-haiku-4-5", provider: "anthropic", displayName: "Claude Haiku 4.5", capabilities: ["chat", "vision"], contextWindow: 200000, maxOutput: 32000 },

  // Google
  { id: "gemini-2.5-pro", provider: "google", displayName: "Gemini 2.5 Pro", capabilities: ["chat", "thinking", "vision"], contextWindow: 1000000, maxOutput: 65536 },
  { id: "gemini-2.5-flash", provider: "google", displayName: "Gemini 2.5 Flash", capabilities: ["chat", "thinking", "vision"], contextWindow: 1000000, maxOutput: 65536 },
  { id: "gemini-2.5-flash-lite", provider: "google", displayName: "Gemini 2.5 Flash Lite", capabilities: ["chat", "vision"], contextWindow: 1000000, maxOutput: 65536 },

  // DeepSeek
  { id: "deepseek-chat", provider: "deepseek", displayName: "DeepSeek V3.2", capabilities: ["chat"], contextWindow: 128000, maxOutput: 8192 },
  { id: "deepseek-reasoner", provider: "deepseek", displayName: "DeepSeek Reasoner", capabilities: ["chat", "thinking"], contextWindow: 128000, maxOutput: 64000 },

  // Moonshot/Kimi
  { id: "kimi-k2-0711-preview", provider: "moonshot", displayName: "Kimi K2", capabilities: ["chat", "thinking"], contextWindow: 131000, maxOutput: 8192 },

  // Qwen
  { id: "qwen-max", provider: "qwen", displayName: "Qwen Max", capabilities: ["chat", "thinking"], contextWindow: 1000000, maxOutput: 16384 },
  { id: "qwen-plus", provider: "qwen", displayName: "Qwen Plus", capabilities: ["chat", "vision"], contextWindow: 128000, maxOutput: 16384 },
  { id: "qwen-turbo", provider: "qwen", displayName: "Qwen Turbo", capabilities: ["chat"], contextWindow: 1000000, maxOutput: 8192 },

  // MiniMax
  { id: "MiniMax-M2.5", provider: "minimax", displayName: "MiniMax M2.5", capabilities: ["chat", "thinking"], contextWindow: 1000000, maxOutput: 32768 },
  { id: "MiniMax-M2.5-highspeed", provider: "minimax", displayName: "MiniMax M2.5 Highspeed", capabilities: ["chat", "thinking"], contextWindow: 204800, maxOutput: 32768 },
  { id: "MiniMax-M2.1", provider: "minimax", displayName: "MiniMax M2.1", capabilities: ["chat", "thinking"], contextWindow: 204800, maxOutput: 32768 },
  { id: "MiniMax-M2.1-highspeed", provider: "minimax", displayName: "MiniMax M2.1 Highspeed", capabilities: ["chat", "thinking"], contextWindow: 204800, maxOutput: 32768 },
  { id: "MiniMax-M2", provider: "minimax", displayName: "MiniMax M2", capabilities: ["chat", "thinking"], contextWindow: 204800, maxOutput: 32768 },
];

export function getModelsForProvider(provider: string): AIModel[] {
  return MODELS.filter((m) => m.provider === provider);
}

export function getModelById(id: string): AIModel | undefined {
  return MODELS.find((m) => m.id === id);
}
