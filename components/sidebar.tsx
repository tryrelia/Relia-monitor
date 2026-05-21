"use client";

import { useCallback, useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { useTheme } from "next-themes";
import { useRouter, useParams } from "next/navigation";
import {
  PlusIcon,
  Trash2Icon,
  LaptopIcon,
  MoonIcon,
  SunIcon,
  SettingsIcon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAllConversations,
  removeConversation,
  type StoredConversation,
} from "@/lib/db";
import { useChatContext } from "@/lib/chat-context";

// ── Icons ───────────────────────────────────────────────────────────────────

function OpenAIIcon({ className }: { className?: string }) {
  return (
    <img src="/svg/openai-white-logomark.jpg" className={className} alt="OpenAI" />
  );
}

function AnthropicIcon({ className }: { className?: string }) {
  return (
    <img src="/svg/anthropic-logo.svg" className={className} alt="Claude" />
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <img src="/svg/google-gemini-logo.svg" className={className} alt="Gemini" />
  );
}

function OpenRouterIcon({ className }: { className?: string }) {
  return (
    <img src="/svg/openrouter-logo.png" className={className} alt="OpenRouter" />
  );
}

// ── ThemeToggle ────────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="size-9" />;

  const cycle = () =>
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");

  return (
    <Button variant="ghost" size="icon" onClick={cycle} title={`Theme: ${theme}`}>
      {theme === "dark" ? (
        <MoonIcon className="size-4" />
      ) : theme === "light" ? (
        <SunIcon className="size-4" />
      ) : (
        <LaptopIcon className="size-4" />
      )}
    </Button>
  );
}

// ── SettingsDialog ───────────────────────────────────────────────────────────

function SettingsDialog() {
  const { settings, updateSettings, isSettingsOpen, setIsSettingsOpen } = useChatContext();
  const [aiProvider, setAiProvider] = useState<"openai" | "anthropic" | "google" | "openrouter">(settings.aiProvider);
  const [aiApiKey, setAiApiKey] = useState(settings.aiApiKey);
  const [aiModel, setAiModel] = useState(settings.aiModel);
  const [renderApiKey, setRenderApiKey] = useState(settings.renderApiKey || "");
  const [renderWorkspaceId, setRenderWorkspaceId] = useState(settings.renderWorkspaceId || "");
  const [railwayApiKey, setRailwayApiKey] = useState(settings.railwayApiKey || "");
  const [activePlatform, setActivePlatform] = useState<"render" | "railway">(settings.activePlatform || "render");
  const [isManualModel, setIsManualModel] = useState(false);
  const [showAiApiKey, setShowAiApiKey] = useState(false);
  const [showRenderApiKey, setShowRenderApiKey] = useState(false);
  const [showRailwayApiKey, setShowRailwayApiKey] = useState(false);

  const PREDEFINED_MODELS = {
    openai: ["gpt-5.5-instant", "gpt-5.5-pro", "gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "o1", "o3-mini"],
    anthropic: ["claude-4.7-opus-latest", "claude-4.6-sonnet-latest", "claude-4.5-haiku-latest", "claude-3-7-sonnet-latest"],
    google: ["gemini-3.1-pro", "gemini-3-flash", "gemini-3.1-flash-lite", "gemini-2.5-pro"],
    openrouter: ["poolside/laguna-m.1:free", "openai/gpt-oss-120b:free", "anthropic/claude-4.7-opus", "openai/gpt-5.5-instant", "anthropic/claude-4.6-sonnet"],
  };

  useEffect(() => {
    setAiProvider(settings.aiProvider || "openai");
    setAiApiKey(settings.aiApiKey);
    setRenderApiKey(settings.renderApiKey || "");
    setRenderWorkspaceId(settings.renderWorkspaceId || "");
    setRailwayApiKey(settings.railwayApiKey || "");
    setActivePlatform(settings.activePlatform || "render");

    const providerKey = (settings.aiProvider || "openai") as keyof typeof PREDEFINED_MODELS;

    if (!settings.aiModel) {
      setAiModel(PREDEFINED_MODELS[providerKey][0]);
      setIsManualModel(false);
    } else if (!PREDEFINED_MODELS[providerKey].includes(settings.aiModel)) {
      setAiModel(settings.aiModel);
      setIsManualModel(true);
    } else {
      setAiModel(settings.aiModel);
      setIsManualModel(false);
    }

    if (!isSettingsOpen) {
      setShowAiApiKey(false);
      setShowRenderApiKey(false);
      setShowRailwayApiKey(false);
    }
  }, [settings, isSettingsOpen]);

  const handleSave = () => {
    updateSettings({ aiProvider, aiApiKey, aiModel, renderApiKey, renderWorkspaceId, railwayApiKey, activePlatform });
    setIsSettingsOpen(false);
  };

  const providers = [
    { id: "openai", name: "OpenAI", icon: <OpenAIIcon className="size-4" /> },
    { id: "anthropic", name: "Claude", icon: <AnthropicIcon className="size-4" /> },
    { id: "google", name: "Gemini", icon: <GoogleIcon className="size-4" /> },
    { id: "openrouter", name: "OpenRouter", icon: <OpenRouterIcon className="size-4" /> },
  ] as const;

  return (
    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" title="Settings" onClick={() => setIsSettingsOpen(true)} />}>
        <SettingsIcon className="size-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[90svh]">
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
          {/* AI Settings Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium border-b pb-2">AI Provider</h3>
            <div className="space-y-2">
              <Label htmlFor="aiProvider">Provider</Label>
              <Select
                value={aiProvider}
                onValueChange={(v: any) => {
                  setAiProvider(v);
                  setIsManualModel(false);
                  const providerKey = v as keyof typeof PREDEFINED_MODELS;
                  setAiModel(PREDEFINED_MODELS[providerKey][0]);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.icon}
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {aiProvider && (
              <div className="space-y-2">
                <Label htmlFor="aiModel">Model</Label>
                <Select
                  value={isManualModel ? "manual" : aiModel}
                  onValueChange={(v) => {
                    if (v === "manual") {
                      setIsManualModel(true);
                      setAiModel("");
                    } else {
                      setIsManualModel(false);
                      setAiModel(v || "");
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {PREDEFINED_MODELS[aiProvider as keyof typeof PREDEFINED_MODELS].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                      <SelectItem value="manual">Enter Manually...</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {isManualModel && (
                  <Input
                    id="aiModelManual"
                    placeholder={`e.g. ${PREDEFINED_MODELS[aiProvider as keyof typeof PREDEFINED_MODELS][0]}`}
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="aiApiKey">API Key</Label>
              <InputGroup>
                <InputGroupInput
                  id="aiApiKey"
                  type={showAiApiKey ? "text" : "password"}
                  placeholder={`${aiProvider.toUpperCase()}_API_KEY`}
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    onClick={() => setShowAiApiKey((p) => !p)}
                    aria-label={showAiApiKey ? "Hide API Key" : "Show API Key"}
                  >
                    {showAiApiKey ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                <span>Need a key? Get it here:</span>
                {aiProvider === "openai" && (
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
                    OpenAI API Keys
                  </a>
                )}
                {aiProvider === "anthropic" && (
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
                    Anthropic Keys
                  </a>
                )}
                {aiProvider === "google" && (
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
                    Google AI Studio Keys
                  </a>
                )}
                {aiProvider === "openrouter" && (
                  <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
                    OpenRouter Keys
                  </a>
                )}
              </p>
            </div>
          </div>

          {/* Platform Integration Section */}
          <div className="space-y-3 pt-3 border-t">
            <h3 className="text-sm font-medium">Platform Integration</h3>
            <Tabs value={activePlatform} onValueChange={(v) => setActivePlatform(v as "render" | "railway")}>
              <TabsList className="w-full">
                <TabsTrigger value="render" className="flex-1">Render</TabsTrigger>
                <TabsTrigger value="railway" className="flex-1">Railway</TabsTrigger>
              </TabsList>

              <TabsContent value="render" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="renderApiKey">Render API Key</Label>
                  <InputGroup>
                    <InputGroupInput
                      id="renderApiKey"
                      type={showRenderApiKey ? "text" : "password"}
                      placeholder="rnd_..."
                      value={renderApiKey}
                      onChange={(e) => setRenderApiKey(e.target.value)}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        onClick={() => setShowRenderApiKey((p) => !p)}
                        aria-label={showRenderApiKey ? "Hide API Key" : "Show API Key"}
                      >
                        {showRenderApiKey ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                    <span>Need a Render key? Get it here:</span>
                    <a href="https://dashboard.render.com/u/settings" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
                      Render Account Settings
                    </a>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="renderWorkspaceId">Workspace ID</Label>
                  <Input
                    id="renderWorkspaceId"
                    placeholder="tea-... or own-..."
                    value={renderWorkspaceId}
                    onChange={(e) => setRenderWorkspaceId(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Find your Workspace ID in the Render dashboard URL or team settings.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="railway" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="railwayApiKey">Railway API Token</Label>
                  <InputGroup>
                    <InputGroupInput
                      id="railwayApiKey"
                      type={showRailwayApiKey ? "text" : "password"}
                      placeholder="railway_..."
                      value={railwayApiKey}
                      onChange={(e) => setRailwayApiKey(e.target.value)}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        onClick={() => setShowRailwayApiKey((p) => !p)}
                        aria-label={showRailwayApiKey ? "Hide API Token" : "Show API Token"}
                      >
                        {showRailwayApiKey ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                    <span>Get your Railway token here:</span>
                    <a href="https://railway.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
                      Railway Account Tokens
                    </a>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} className="w-full sm:w-auto">Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SidebarProps {
  conversations: StoredConversation[];
  onDelete: (id: string) => void;
  onClose?: () => void;
}

export function Sidebar({ conversations, onDelete, onClose }: SidebarProps) {
  const router = useRouter();
  const params = useParams();
  const activeId = params?.id as string | undefined;

  const createNewChat = useCallback(() => {
    const newId = nanoid();
    router.push(`/${newId}`);
    onClose?.();
  }, [router, onClose]);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-muted h-full">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold tracking-tight cursor-pointer" onClick={() => { router.push("/"); onClose?.(); }}>
          Relia Monitor
        </span>
        <div className="flex items-center gap-0.5">
          <SettingsDialog />
          <ThemeToggle />
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} title="Close sidebar">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </Button>
          )}
        </div>
      </div>

      <div className="p-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={createNewChat}
        >
          <PlusIcon className="size-4" />
          New Chat
        </Button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            No conversations yet
          </p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              role="button"
              tabIndex={0}
              onClick={() => { router.push(`/${conv.id}`); onClose?.(); }}
              onKeyDown={(e) => e.key === "Enter" && (router.push(`/${conv.id}`), onClose?.())}
              className={`group flex cursor-pointer items-center rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${activeId === conv.id
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground"
                }`}
            >
              <span className="flex-1 truncate">{conv.title}</span>
              <button
                type="button"
                aria-label="Delete conversation"
                className="ml-1 hidden shrink-0 rounded p-0.5 hover:text-destructive group-hover:block"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}
