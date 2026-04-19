#!/usr/bin/env node

import { parseArgs } from "node:util";
import {
  handleCreateSession,
  handleListSessions,
  handleGetSession,
  handleDeleteSession,
  handleSendMessage,
  handleApprovePlan,
  handleWaitSession,
  handleGetPatch,
  handleListActivities,
  handleListSources,
  handleGetSource,
} from "./handlers.js";

const USAGE = `jules <command> [options]

Commands:
  create      --prompt <p> --title <t> [--source <s>] [--branch <b>] [--auto-create-pr]
  list        [--page-size <n>]
  get         <sessionId>
  delete      <sessionId>
  send        <sessionId> <message>
  approve     <sessionId>
  wait        <sessionId> [--timeout-minutes <n>]
  patch       <sessionId>
  activities  <sessionId> [--page-size <n>] [--page-token <t>]
  sources     [<sourceId>] [--page-size <n>] [--page-token <t>] [--filter <f>]

Global:
  -h, --help     Show help
  -v, --version  Show version

Env:
  GOOGLE_JULES_API_KEY  Required. From https://jules.google/settings
`;

const VERSION = "0.0.1";

function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

function fail(msg: string, code = 1): never {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(code);
}

async function dispatch(sub: string, rest: string[]): Promise<void> {
  switch (sub) {
    case "create": {
      const { values } = parseArgs({
        args: rest,
        options: {
          prompt: { type: "string" },
          title: { type: "string" },
          source: { type: "string" },
          branch: { type: "string" },
          "auto-create-pr": { type: "boolean" },
        },
        strict: true,
      });
      if (!values.prompt) fail("--prompt is required", 2);
      if (!values.title) fail("--title is required", 2);
      printJson(
        await handleCreateSession({
          prompt: values.prompt as string,
          title: values.title as string,
          source: values.source as string | undefined,
          branch: values.branch as string | undefined,
          autoCreatePr: values["auto-create-pr"] === true,
        }),
      );
      return;
    }

    case "patch": {
      const { positionals } = parseArgs({
        args: rest,
        options: {},
        allowPositionals: true,
        strict: true,
      });
      const sessionId = positionals[0];
      if (!sessionId) fail("patch requires <sessionId>", 2);
      printJson(await handleGetPatch({ sessionId }));
      return;
    }

    case "activities": {
      const { values, positionals } = parseArgs({
        args: rest,
        options: {
          "page-size": { type: "string" },
          "page-token": { type: "string" },
        },
        allowPositionals: true,
        strict: true,
      });
      const sessionId = positionals[0];
      if (!sessionId) fail("activities requires <sessionId>", 2);
      const rawPageSize = values["page-size"];
      const pageSize =
        rawPageSize === undefined ? undefined : Number(rawPageSize);
      if (pageSize !== undefined && Number.isNaN(pageSize)) {
        fail("--page-size must be a number", 2);
      }
      printJson(
        await handleListActivities({
          sessionId,
          pageSize,
          pageToken: values["page-token"] as string | undefined,
        }),
      );
      return;
    }

    case "sources": {
      const { values, positionals } = parseArgs({
        args: rest,
        options: {
          "page-size": { type: "string" },
          "page-token": { type: "string" },
          filter: { type: "string" },
        },
        allowPositionals: true,
        strict: true,
      });
      const sourceId = positionals[0];
      if (sourceId) {
        printJson(await handleGetSource({ sourceId }));
        return;
      }
      const rawPageSize = values["page-size"];
      const pageSize =
        rawPageSize === undefined ? undefined : Number(rawPageSize);
      if (pageSize !== undefined && Number.isNaN(pageSize)) {
        fail("--page-size must be a number", 2);
      }
      printJson(
        await handleListSources({
          pageSize,
          pageToken: values["page-token"] as string | undefined,
          filter: values.filter as string | undefined,
        }),
      );
      return;
    }

    case "list": {
      const { values } = parseArgs({
        args: rest,
        options: { "page-size": { type: "string" } },
        strict: true,
      });
      const raw = values["page-size"];
      const pageSize = raw === undefined ? undefined : Number(raw);
      if (pageSize !== undefined && Number.isNaN(pageSize)) {
        fail("--page-size must be a number", 2);
      }
      printJson(await handleListSessions({ pageSize }));
      return;
    }

    case "get":
    case "delete":
    case "approve": {
      const { positionals } = parseArgs({
        args: rest,
        options: {},
        allowPositionals: true,
        strict: true,
      });
      const sessionId = positionals[0];
      if (!sessionId) fail(`${sub} requires <sessionId>`, 2);
      const handler =
        sub === "get"
          ? handleGetSession
          : sub === "delete"
            ? handleDeleteSession
            : handleApprovePlan;
      printJson(await handler({ sessionId }));
      return;
    }

    case "send": {
      const { positionals } = parseArgs({
        args: rest,
        options: {},
        allowPositionals: true,
        strict: true,
      });
      const [sessionId, ...messageParts] = positionals;
      const message = messageParts.join(" ");
      if (!sessionId) fail("send requires <sessionId>", 2);
      if (!message) fail("send requires <message>", 2);
      printJson(await handleSendMessage({ sessionId, message }));
      return;
    }

    case "wait": {
      const { values, positionals } = parseArgs({
        args: rest,
        options: { "timeout-minutes": { type: "string" } },
        allowPositionals: true,
        strict: true,
      });
      const sessionId = positionals[0];
      if (!sessionId) fail("wait requires <sessionId>", 2);
      const raw = values["timeout-minutes"];
      const timeoutMinutes = raw === undefined ? undefined : Number(raw);
      if (timeoutMinutes !== undefined && Number.isNaN(timeoutMinutes)) {
        fail("--timeout-minutes must be a number", 2);
      }
      const result = await handleWaitSession({
        sessionId,
        timeoutMinutes,
        onPoll: (snapshot) => {
          process.stderr.write(
            `[${new Date().toISOString()}] state=${snapshot.state} url=${snapshot.url}\n`,
          );
        },
      });
      printJson(result);
      return;
    }

    default:
      process.stderr.write(`Unknown command: ${sub}\n\n${USAGE}`);
      process.exit(2);
  }
}

async function main(): Promise<void> {
  const [sub, ...rest] = process.argv.slice(2);

  if (!sub) {
    process.stdout.write(USAGE);
    process.exit(2);
  }
  if (sub === "-h" || sub === "--help") {
    process.stdout.write(USAGE);
    process.exit(0);
  }
  if (sub === "-v" || sub === "--version") {
    process.stdout.write(`${VERSION}\n`);
    process.exit(0);
  }

  await dispatch(sub, rest);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  fail(msg, 1);
});
