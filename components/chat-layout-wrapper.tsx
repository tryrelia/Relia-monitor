"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { UIMessage } from "ai";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { ChatContext, type ChatSettings } from "@/lib/chat-context";
import {
  getAllConversations,
  removeConversation,
  upsertConversation,
  type StoredConversation,
} from "@/lib/db";

interface ChatLayoutWrapperProps {
  children: React.ReactNode;
}

export function ChatLayoutWrapper({ children }: ChatLayoutWrapperProps) {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>({
    aiProvider: "openai",
    aiApiKey: "",
    aiModel: "",
    renderApiKey: "",
    renderWorkspaceId: "",
    railwayApiKey: "",
    activePlatform: "render" as const,
  });

  const router = useRouter();
  const params = useParams();
  const activeId = params?.id as string | undefined;

  useEffect(() => {
    // 1. Load conversations
    getAllConversations().then((convs) => {
      setConversations(convs);
      setLoaded(true);
    });

    // 2. Load settings
    const stored = localStorage.getItem("relia-analytics-settings");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({
          aiProvider: parsed.aiProvider || "openai",
          aiApiKey: parsed.aiApiKey || "",
          aiModel: parsed.aiModel || "",
          renderApiKey: parsed.renderApiKey || "",
          renderWorkspaceId: parsed.renderWorkspaceId || "",
          railwayApiKey: parsed.railwayApiKey || "",
          activePlatform: parsed.activePlatform || "render",
        });
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  const updateSettings = useCallback(
    (newSettings: ChatSettings) => {
      setSettings(newSettings);
      localStorage.setItem("relia-analytics-settings", JSON.stringify(newSettings));
    },
    []
  );

  const handleSave = useCallback(
    (id: string, title: string, messages: UIMessage[]) => {
      const now = Date.now();
      setConversations((prev) => {
        const existing = prev.find((c) => c.id === id);
        const updated: StoredConversation = {
          id,
          title,
          messages,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        upsertConversation(updated);
        if (existing) {
          return prev
            .map((c) => (c.id === id ? updated : c))
            .sort((a, b) => b.updatedAt - a.updatedAt);
        }
        return [updated, ...prev];
      });
    },
    []
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await removeConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        router.push("/");
      }
    },
    [activeId, router]
  );

  // We pass handleSave to children via React.cloneElement or just use it in the pages.
  // Actually, since we want to avoid complex context if possible, let's just use it in the page components.
  // But wait, the Sidebar is shared.

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <ChatContext.Provider value={{ conversations, handleSave, handleDelete, settings, updateSettings, isSettingsOpen, setIsSettingsOpen }}>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar conversations={conversations} onDelete={handleDelete} />
        </div>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full shadow-xl animate-in slide-in-from-left-full duration-200">
              <Sidebar
                conversations={conversations}
                onDelete={handleDelete}
                onClose={() => setMobileSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Mobile top bar */}
          <div className="flex items-center gap-2 border-b px-3 py-2 md:hidden shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(true)}
              title="Open sidebar"
            >
              <MenuIcon className="size-5" />
            </Button>
            <span className="font-semibold text-sm tracking-tight">Relia Chat</span>
          </div>

          {loaded ? (
            children
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-muted-foreground">Loading…</p>
            </div>
          )}
        </main>
      </div>
    </ChatContext.Provider>
  );
}
