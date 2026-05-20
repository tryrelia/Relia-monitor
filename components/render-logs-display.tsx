"use client";

import { cn } from "@/lib/utils";

interface RenderLog {
  id: string;
  message: string;
  timestamp: string;
  labels: Array<{ name: string; value: string }>;
}

interface LogsData {
  logs: RenderLog[];
  hasMore?: boolean;
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "").trim();
}

const HTTP_RE =
  /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(\S+)\s+(\d{3})\s+([\d.]+)\s+ms(?:\s+-\s+(\d+))?/;

function parseHttpLog(msg: string) {
  const m = msg.match(HTTP_RE);
  if (!m) return null;
  return {
    method: m[1],
    path: m[2],
    status: parseInt(m[3], 10),
    ms: parseFloat(m[4]),
  };
}

function StatusBadge({ status }: { status: number }) {
  const cls =
    status < 300
      ? "bg-green-500/15 text-green-600"
      : status < 400
        ? "bg-sky-500/15 text-sky-600"
        : status < 500
          ? "bg-yellow-500/15 text-yellow-600"
          : "bg-red-500/15 text-red-600";
  return (
    <span className={cn("shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold", cls)}>
      {status}
    </span>
  );
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-500/10 text-blue-600",
  POST: "bg-green-500/10 text-green-600",
  PUT: "bg-amber-500/10 text-amber-600",
  PATCH: "bg-orange-500/10 text-orange-600",
  DELETE: "bg-red-500/10 text-red-600",
  HEAD: "bg-purple-500/10 text-purple-600",
  OPTIONS: "bg-gray-500/10 text-gray-500",
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={cn(
        "w-14 shrink-0 rounded px-1 py-0.5 text-center font-mono text-[11px] font-semibold",
        METHOD_COLORS[method] ?? "bg-muted text-muted-foreground"
      )}
    >
      {method}
    </span>
  );
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts.slice(11, 19);
  }
}

function LevelBadge({ level }: { level: string }) {
  const cls =
    level === "error"
      ? "text-red-500"
      : level === "warn"
        ? "text-yellow-500"
        : "text-muted-foreground";
  return (
    <span className={cn("w-9 shrink-0 font-mono text-[10px] uppercase", cls)}>
      {level}
    </span>
  );
}

export function RenderLogsDisplay({ data }: { data: LogsData }) {
  if (!data?.logs?.length) {
    return <p className="text-xs text-muted-foreground">No logs found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md bg-muted/40 p-2">
      <div className="min-w-0 divide-y divide-border/30">
        {data.logs.map((log) => {
          const clean = stripAnsi(log.message);
          const http = parseHttpLog(clean);
          const time = formatTime(log.timestamp);
          const level = log.labels.find((l) => l.name === "level")?.value ?? "info";

          if (http) {
            return (
              <div key={log.id} className="flex items-center gap-2 py-1.5 text-xs font-mono">
                <span className="w-[72px] shrink-0 text-muted-foreground">{time}</span>
                <MethodBadge method={http.method} />
                <span className="min-w-0 flex-1 truncate text-foreground" title={http.path}>
                  {http.path}
                </span>
                <StatusBadge status={http.status} />
                <span className="w-16 shrink-0 text-right text-muted-foreground">
                  {http.ms}ms
                </span>
              </div>
            );
          }

          return (
            <div key={log.id} className="flex items-start gap-2 py-1.5 text-xs font-mono">
              <span className="w-[72px] shrink-0 text-muted-foreground">{time}</span>
              <LevelBadge level={level} />
              <span className="flex-1 break-words text-foreground">{clean}</span>
            </div>
          );
        })}
      </div>
      {data.hasMore && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Showing {data.logs.length} logs · more available
        </p>
      )}
    </div>
  );
}
