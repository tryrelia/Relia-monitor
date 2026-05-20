"use client";

import { createContext, useContext } from "react";
import type { UIMessage } from "ai";
import type { StoredConversation } from "@/lib/db";

export interface ChatSettings {
  aiProvider: "openai" | "anthropic" | "google" | "openrouter";
  aiApiKey: string;
  aiModel: string;
  renderApiKey?: string;
  renderWorkspaceId?: string;
  railwayApiKey?: string;
  activePlatform?: "render" | "railway";
}

interface ChatContextType {
  conversations: StoredConversation[];
  handleSave: (id: string, title: string, messages: UIMessage[]) => void;
  handleDelete: (id: string) => Promise<void>;
  settings: ChatSettings;
  updateSettings: (settings: ChatSettings) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

export const ChatContext = createContext<ChatContextType | null>(null);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
