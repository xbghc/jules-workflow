# jules-cli

Agent-friendly CLI for the [Google Jules](https://jules.google) API. Wraps session create/get/list/delete/send/approve plus a **blocking `wait`** that returns when the session reaches a terminal state — built so Claude Code (and other coding agents) can drive Jules in the background without tying up the conversation.

Published as [`@xbghc/jules-cli`](https://www.npmjs.com/package/@xbghc/jules-cli).

The paired Claude Code skill (workflow guidance, prompt templates, parallel-session patterns) lives in the `jules-workflow` plugin at [`ghm-plugins`](https://github.com/xbghc/claude-plugins).

## Install

```bash
npm i -g @xbghc/jules-cli
# or per-invocation
npx -y @xbghc/jules-cli <command>
```

Set `GOOGLE_JULES_API_KEY` (from https://jules.google/settings).

## API reference

This CLI wraps the Jules REST API. For payload shapes, enum values (e.g. `automationMode`, session states), and endpoints not yet wrapped by the CLI, consult the official docs:

**https://jules.google/docs/api/reference/**

## Default behavior: no branch, no PR

By default the CLI does **not** set `automationMode`, so Jules won't auto-open a PR. The recommended agent flow is to pull the unified-diff via `jules patch` and apply it locally — this way failed or rejected sessions leave **zero remote artifacts** (no stray branches, no PRs to close).

Opt into Jules-side PR creation with `--auto-create-pr` on `create` if you want the traditional review flow.

## Commands

| Command | Purpose |
|---------|---------|
| `jules create --prompt <p> --title <t> [--source <s>] [--branch <b>] [--auto-create-pr]` | Create a session. Defaults `source` to `git remote get-url origin` and `branch` to the current local branch. Add `--auto-create-pr` to let Jules open a PR automatically. |
| `jules list [--page-size <n>]` | List recent sessions. |
| `jules get <sessionId>` | Fetch session state and PR URL (`prUrl` is `null` unless `--auto-create-pr` was used). |
| `jules patch <sessionId>` | Aggregate every `gitPatch` from the session's activities. Returns `{ patches: [{ baseCommitId, unidiffPatch, suggestedCommitMessage, ... }] }`. Use `patches[-1]` for the final version. |
| `jules activities <sessionId> [--page-size <n>] [--page-token <t>]` | Full activity timeline (plans, messages, progress, failures, artifacts). Use `sessionFailed.reason` for FAILED diagnostics and `agentMessaged.agentMessage` for `AWAITING_USER_FEEDBACK` questions. |
| `jules sources [<sourceId>] [--page-size <n>] [--page-token <t>] [--filter <f>]` | List Jules-authorized GitHub repos (no arg) or get a single source. The resource `name` (e.g. `sources/github-xxx`) is what you pass to `create --source`. |
| `jules delete <sessionId>` | Delete a session. |
| `jules send <sessionId> <message>` | Send a message to a live session (required when state is `AWAITING_USER_FEEDBACK`). |
| `jules approve <sessionId>` | Approve a session plan (`AWAITING_PLAN_APPROVAL`). |
| `jules wait <sessionId> [--timeout-minutes <n>]` | Block until the session hits a terminal state. |

All commands emit the final result as JSON on stdout. Errors go to stderr with a non-zero exit code. `wait` prints a one-line status to stderr every 5 minutes.

## Why `wait` matters for agents

Jules sessions commonly run 5–30+ minutes. If an agent polls `get` in a loop, every poll consumes a tool call and context. With `wait`, the agent runs it in the background:

```
# Claude Code pseudo-invocation
Bash(run_in_background: true, command:
  "jules wait <sessionId> --timeout-minutes 120 > /tmp/jules-<id>.json")
```

The agent gets notified when the process exits, reads the JSON, and branches on `state`. No polling, no blocked conversation, no context waste. Parallel sessions work the same way — one background `wait` per session, each writing to its own file.

## Recommended flow (patch-driven)

```bash
jules create --prompt "$(cat prompt.md)" --title "..."
# → sessionId

jules wait <sessionId> --timeout-minutes 120 > /tmp/jules-<id>.json    # run_in_background
# … wait for exit …

jules patch <sessionId> > /tmp/jules-<id>.patches.json

# review then apply locally
jq -r '.patches[-1].unidiffPatch' /tmp/jules-<id>.patches.json | git apply -
git checkout -b jules/<short-desc>
git add -A && git commit -m "$(jq -r '.patches[-1].suggestedCommitMessage' /tmp/jules-<id>.patches.json)"
git push -u origin HEAD
gh pr create --fill && gh pr merge --merge
```

Rejected? `jules delete <sessionId>` — nothing to clean up remotely.

## Terminal states

| State | Meaning |
|-------|---------|
| `COMPLETED` | Patch is ready. Fetch via `jules patch <sessionId>`. |
| `FAILED` | `jules activities <sessionId>` → pick `sessionFailed.reason` for the failure cause. |
| `AWAITING_USER_FEEDBACK` | `jules activities <sessionId>` → latest `agentMessaged.agentMessage` has the question. Reply with `jules send`. |
| `AWAITING_PLAN_APPROVAL` | Approval gate was triggered. Use `jules approve`. |

## Build & publish

```bash
make build                # npm install + tsc
make publish              # npm publish
make publish OTP=123456   # with 2FA
```

## License

MIT
