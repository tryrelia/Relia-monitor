import { dynamicTool, jsonSchema } from "ai";
import type { ToolSet } from "ai";

const RAILWAY_GQL = "https://backboard.railway.com/graphql/v2";

export interface RailwaySession {
  tools: ToolSet;
  close: () => Promise<void>;
}

async function gql(
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>
) {
  const res = await fetch(RAILWAY_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Railway API ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e: { message: string }) => e.message).join("; "));
  }
  return json.data;
}

export function createRailwayAPISession(apiKey: string): RailwaySession {
  const tools: ToolSet = {
    whoami: dynamicTool({
      description: "Get the current Railway user's profile (name, email, id)",
      inputSchema: jsonSchema({ type: "object", properties: {} }),
      execute: async () => {
        const data = await gql(apiKey, `query { me { id name email } }`);
        return data.me;
      },
    }),

    list_projects: dynamicTool({
      description: "List all Railway projects the current user has access to",
      inputSchema: jsonSchema({ type: "object", properties: {} }),
      execute: async () => {
        const data = await gql(
          apiKey,
          `query {
            projects {
              edges {
                node {
                  id
                  name
                  description
                  createdAt
                  updatedAt
                }
              }
            }
          }`
        );
        return data.projects.edges.map((e: { node: unknown }) => e.node);
      },
    }),

    list_services: dynamicTool({
      description: "List all services in a Railway project, including environment IDs",
      inputSchema: jsonSchema({
        type: "object",
        properties: {
          projectId: { type: "string", description: "Railway project ID" },
        },
        required: ["projectId"],
      }),
      execute: async (input: unknown) => {
        const { projectId } = input as { projectId: string };
        const data = await gql(
          apiKey,
          `query($id: String!) {
            project(id: $id) {
              id
              name
              environments {
                edges {
                  node { id name }
                }
              }
              services {
                edges {
                  node {
                    id
                    name
                    updatedAt
                  }
                }
              }
            }
          }`,
          { id: projectId }
        );
        return data.project;
      },
    }),

    list_deployments: dynamicTool({
      description: "List recent deployments for a service. Provide projectId, serviceId, and environmentId (get environmentId from list_services first).",
      inputSchema: jsonSchema({
        type: "object",
        properties: {
          projectId: { type: "string", description: "Railway project ID" },
          serviceId: { type: "string", description: "Railway service ID" },
          environmentId: { type: "string", description: "Railway environment ID" },
        },
        required: ["projectId", "serviceId", "environmentId"],
      }),
      execute: async (input: unknown) => {
        const { projectId, serviceId, environmentId } = input as {
          projectId: string;
          serviceId: string;
          environmentId: string;
        };
        const data = await gql(
          apiKey,
          `query($projectId: String!, $serviceId: String!, $environmentId: String!) {
            deployments(
              input: { projectId: $projectId, serviceId: $serviceId, environmentId: $environmentId }
              first: 10
            ) {
              edges {
                node {
                  id
                  status
                  createdAt
                  updatedAt
                }
              }
            }
          }`,
          { projectId, serviceId, environmentId }
        );
        return data.deployments.edges.map((e: { node: unknown }) => e.node);
      },
    }),

    get_deployment_logs: dynamicTool({
      description: "Get logs from a specific deployment by deploymentId",
      inputSchema: jsonSchema({
        type: "object",
        properties: {
          deploymentId: { type: "string", description: "Railway deployment ID" },
          limit: { type: "number", description: "Max log lines (default 50)" },
        },
        required: ["deploymentId"],
      }),
      execute: async (input: unknown) => {
        const { deploymentId, limit = 50 } = input as {
          deploymentId: string;
          limit?: number;
        };
        const data = await gql(
          apiKey,
          `query($deploymentId: String!, $limit: Int) {
            deploymentLogs(deploymentId: $deploymentId, limit: $limit) {
              timestamp
              message
              severity
            }
          }`,
          { deploymentId, limit }
        );
        return data.deploymentLogs;
      },
    }),

    get_environment_logs: dynamicTool({
      description: "Get logs for an environment (all services). Optionally filter by keyword.",
      inputSchema: jsonSchema({
        type: "object",
        properties: {
          environmentId: { type: "string", description: "Railway environment ID" },
          filter: { type: "string", description: "Optional log filter keyword" },
        },
        required: ["environmentId"],
      }),
      execute: async (input: unknown) => {
        const { environmentId, filter } = input as {
          environmentId: string;
          filter?: string;
        };
        const data = await gql(
          apiKey,
          `query($environmentId: String!, $filter: String) {
            environmentLogs(environmentId: $environmentId, filter: $filter) {
              timestamp
              message
              severity
              tags {
                serviceId
                deploymentId
              }
            }
          }`,
          { environmentId, filter }
        );
        return data.environmentLogs;
      },
    }),
  };

  return { tools, close: async () => {} };
}
