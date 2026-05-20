"use client";

import { cn } from "@/lib/utils";
import { RenderLogsDisplay } from "@/components/render-logs-display";
import { RailwayLogsDisplay } from "@/components/railway-logs-display";
import {
  ExternalLinkIcon,
  GitBranchIcon,
  GlobeIcon,
  ServerIcon,
} from "lucide-react";

// ── Services ──────────────────────────────────────────────────────────────────

interface RenderService {
  id: string;
  name: string;
  type: string;
  suspended: string;
  slug: string;
  dashboardUrl?: string;
  serviceDetails?: {
    url?: string;
    region?: string;
    plan?: string;
    env?: string;
    runtime?: string;
    numInstances?: number;
  };
  branch?: string;
  autoDeploy?: string;
  repo?: string;
}

const TYPE_LABELS: Record<string, string> = {
  web_service: "Web Service",
  static_site: "Static Site",
  cron_job: "Cron Job",
  background_worker: "Worker",
  private_service: "Private Service",
};

function ServiceCard({ svc }: { svc: RenderService }) {
  const isLive = svc.suspended === "not_suspended";
  const details = svc.serviceDetails ?? {};
  const label = TYPE_LABELS[svc.type] ?? svc.type;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ServerIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-semibold truncate text-sm">{svc.name}</span>
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
            {label}
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            isLive
              ? "bg-green-500/15 text-green-600"
              : "bg-yellow-500/15 text-yellow-600"
          )}
        >
          {isLive ? "Live" : "Suspended"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {details.region && (
          <span>
            <span className="font-medium text-foreground">Region</span>{" "}
            {details.region}
          </span>
        )}
        {details.plan && (
          <span>
            <span className="font-medium text-foreground">Plan</span>{" "}
            {details.plan}
          </span>
        )}
        {(details.env || details.runtime) && (
          <span>
            <span className="font-medium text-foreground">Runtime</span>{" "}
            {details.env ?? details.runtime}
          </span>
        )}
        {details.numInstances !== undefined && (
          <span>
            <span className="font-medium text-foreground">Instances</span>{" "}
            {details.numInstances}
          </span>
        )}
        {svc.branch && (
          <span className="flex items-center gap-1">
            <GitBranchIcon className="size-3" />
            {svc.branch}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {details.url && (
          <a
            href={details.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <GlobeIcon className="size-3" />
            {details.url.replace("https://", "")}
          </a>
        )}
        {svc.dashboardUrl && (
          <a
            href={svc.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ExternalLinkIcon className="size-3" />
            Dashboard
          </a>
        )}
      </div>
    </div>
  );
}

function RenderServicesDisplay({ data }: { data: RenderService[] }) {
  if (!data?.length) {
    return <p className="text-sm text-muted-foreground">No services found.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {data.length} service{data.length !== 1 ? "s" : ""}
      </p>
      {data.map((svc) => (
        <ServiceCard key={svc.id} svc={svc} />
      ))}
    </div>
  );
}

// ── Railway Projects ──────────────────────────────────────────────────────────

interface RailwayProject {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

function RailwayProjectCard({ project }: { project: RailwayProject }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <ServerIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-semibold text-sm truncate">{project.name}</span>
      </div>
      {project.description && (
        <p className="text-xs text-muted-foreground">{project.description}</p>
      )}
      <p className="text-[10px] text-muted-foreground">
        Updated {new Date(project.updatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}

function RailwayProjectsDisplay({ data }: { data: RailwayProject[] }) {
  if (!data?.length) {
    return <p className="text-sm text-muted-foreground">No projects found.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {data.length} project{data.length !== 1 ? "s" : ""}
      </p>
      {data.map((p) => (
        <RailwayProjectCard key={p.id} project={p} />
      ))}
    </div>
  );
}

// ── Railway Deployments ───────────────────────────────────────────────────────

interface RailwayDeployment {
  id: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

const DEPLOY_STATUS_STYLES: Record<string, string> = {
  SUCCESS: "bg-green-500/15 text-green-600",
  FAILED: "bg-red-500/15 text-red-600",
  CRASHED: "bg-red-500/15 text-red-600",
  BUILDING: "bg-blue-500/15 text-blue-600",
  DEPLOYING: "bg-blue-500/15 text-blue-600",
  QUEUED: "bg-yellow-500/15 text-yellow-600",
  SLEEPING: "bg-muted text-muted-foreground",
  REMOVED: "bg-muted text-muted-foreground",
};

function RailwayDeploymentsDisplay({ data }: { data: RailwayDeployment[] }) {
  if (!data?.length) {
    return <p className="text-sm text-muted-foreground">No deployments found.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {data.length} deployment{data.length !== 1 ? "s" : ""}
      </p>
      {data.map((d) => (
        <div key={d.id} className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              DEPLOY_STATUS_STYLES[d.status] ?? "bg-muted text-muted-foreground"
            )}
          >
            {d.status}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {new Date(d.createdAt).toLocaleString()}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground font-mono truncate">
            {d.id.slice(0, 8)}…
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Generic fallback ──────────────────────────────────────────────────────────

function GenericOutput({ output }: { output: unknown }) {
  const text =
    typeof output === "string"
      ? output
      : JSON.stringify(output, null, 2);
  return (
    <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs text-foreground whitespace-pre-wrap wrap-break-word">
      {text}
    </pre>
  );
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

interface Props {
  toolName: string;
  output: unknown;
}

export function RenderToolOutput({ toolName, output }: Props) {
  // Render tools
  if (toolName === "list_logs") {
    return <RenderLogsDisplay data={output as any} />;
  }
  if (toolName === "list_services") {
    return <RenderServicesDisplay data={output as any} />;
  }

  // Railway tools
  if (toolName === "list_projects") {
    return <RailwayProjectsDisplay data={output as any} />;
  }
  if (toolName === "list_deployments") {
    return <RailwayDeploymentsDisplay data={output as any} />;
  }
  if (toolName === "get_deployment_logs" || toolName === "get_environment_logs") {
    return <RailwayLogsDisplay data={output as any} />;
  }

  return <GenericOutput output={output} />;
}
