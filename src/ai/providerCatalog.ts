import type { Provider } from "./types";

export interface ProviderCatalogEntry {
  id: Provider;
  name: string;
  shortName: string;
  placeholder: string;
  color: string;
  endpoint: string;
  endpointLabel: string;
  aliases?: string[];
}

export const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    id: "openai",
    name: "OpenAI",
    shortName: "OpenAI",
    placeholder: "sk-...",
    color: "#10b981",
    endpoint: "https://api.openai.com/v1/chat/completions",
    endpointLabel: "Global endpoint",
  },
  {
    id: "google",
    name: "Google",
    shortName: "Google",
    placeholder: "AIza...",
    color: "#3b82f6",
    endpoint: "https://generativelanguage.googleapis.com",
    endpointLabel: "Gemini endpoint",
    aliases: ["gemini"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    shortName: "Anthropic",
    placeholder: "sk-ant-...",
    color: "#8b5cf6",
    endpoint: "https://api.anthropic.com/v1/messages",
    endpointLabel: "Messages API",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    shortName: "DeepSeek",
    placeholder: "sk-...",
    color: "#0ea5e9",
    endpoint: "https://api.deepseek.com/chat/completions",
    endpointLabel: "Global endpoint",
  },
  {
    id: "moonshot",
    name: "Moonshot / Kimi",
    shortName: "Moonshot",
    placeholder: "sk-...",
    color: "#f59e0b",
    endpoint: "https://api.moonshot.cn/v1/chat/completions",
    endpointLabel: "China endpoint",
    aliases: ["kimi"],
  },
  {
    id: "qwen",
    name: "Qwen",
    shortName: "Qwen",
    placeholder: "sk-...",
    color: "#22c55e",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    endpointLabel: "Alibaba Cloud Beijing compatible-mode endpoint",
  },
  {
    id: "minimax",
    name: "MiniMax",
    shortName: "MiniMax",
    placeholder: "sk-...",
    color: "#f97316",
    endpoint: "https://api.minimaxi.com/anthropic/v1/messages",
    endpointLabel: "Anthropic-compatible China endpoint",
  },
];

export function getProviderAliases(provider: string): string[] {
  return PROVIDER_CATALOG.find((entry) => entry.id === provider)?.aliases ?? [];
}
