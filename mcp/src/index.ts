#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  handleCreateSession,
  handleListSessions,
  handleGetSession,
  handleSendMessage,
  handleApprovePlan,
} from "./handlers.js";

const server = new McpServer({ name: "jules-mcp", version: "1.0.0" });

server.registerTool(
  "jules_create_session",
  {
    description: "Create a new Jules session to execute a coding task. Returns session ID.",
    inputSchema: {
      prompt: z.string().describe("Detailed task description including Context, Task, Constraints, and Criteria"),
      title: z.string().describe("Short title for the session"),
      source: z.string().optional().describe("Source identifier (e.g., sources/github/owner/repo). Auto-detected if not provided."),
      branch: z.string().optional().describe("Starting branch. Auto-detected if not provided."),
    },
  },
  async (args) => {
    const result = await handleCreateSession(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.registerTool(
  "jules_list_sessions",
  {
    description: "List Jules sessions with their status",
    inputSchema: {
      pageSize: z.number().optional().describe("Number of sessions to return (default: 10)"),
    },
  },
  async (args) => {
    const result = await handleListSessions(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.registerTool(
  "jules_get_session",
  {
    description: "Get details of a specific Jules session including status and PR URL",
    inputSchema: {
      sessionId: z.string().describe("The session ID to retrieve"),
    },
  },
  async (args) => {
    const result = await handleGetSession(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.registerTool(
  "jules_send_message",
  {
    description: "Send a message to an active Jules session to provide feedback or additional instructions",
    inputSchema: {
      sessionId: z.string().describe("The session ID"),
      message: z.string().describe("The message to send"),
    },
  },
  async (args) => {
    const result = await handleSendMessage(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.registerTool(
  "jules_approve_plan",
  {
    description: "Approve a pending plan for a Jules session (when requirePlanApproval was set to true)",
    inputSchema: {
      sessionId: z.string().describe("The session ID"),
    },
  },
  async (args) => {
    const result = await handleApprovePlan(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Jules MCP server started");
}

main().catch(console.error);
