---
name: jules
description: 使用 Jules 进行开发。委托编码任务给 Jules 代理执行。
argument-hint: <任务描述>
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
---

# 使用 Jules 进行开发

Jules 是 Google 的异步编码 agent（基于 Gemini），在云端 VM 里执行任务、跑测试，完成后自动开 PR。

推荐全局安装：`npm i -g @xbghc/jules-cli`；或按需 `npx -y @xbghc/jules-cli <cmd>`。所有命令 stdout 输出 JSON，失败时 exit code ≠ 0、错误写入 stderr。

## 何时委托给 Jules

| 适合 Jules | 本地执行更好 |
|------------|-------------|
| 多文件修改 | 单文件创建 |
| 功能实现、重构 | 配置/小编辑 (<50 行) |
| 复杂逻辑、可能需要调试 | 简单、可预测 |

**经验法则**：Jules 的单位成本是一次 PR 往返（创建 → 等待 → 合并 → 拉取），通常只在预计改动 ≥3 文件或 ≥50 行时才值得。能一次本地改完就本地改。

## 前置条件

1. `GOOGLE_JULES_API_KEY` 已设置（从 https://jules.google/settings 获取）。
2. **本地改动已 push 到远程**。Jules 只读取远程分支，前置接口/类型/依赖没 push，Jules 就拿不到。
3. CLI 默认用 `git remote get-url origin` 解析仓库，用**当前本地分支**作为 `startingBranch`。要指定其他分支用 `--branch <name>`。

## Prompt 模板

```
## Context
项目背景、技术栈、相关现有文件路径

## Task
具体要实现什么

## Constraints
- Only modify: <可修改的文件/目录>
- Do not modify: <不要碰的文件>

## Criteria
- [ ] 验收标准
- [ ] 测试通过
```

`Constraints` 写明可修改范围是避免 Jules 跨模块越权修改的最有效手段。

**简短示例**：

```
## Context
Vue 3 + TS 项目，类型在 src/types/user.ts

## Task
在 src/modules/user/ 实现 UserList/UserForm/UserDetail + api.ts + Pinia store

## Constraints
- Only modify: src/modules/user/**
- 复用 src/types/user.ts 的类型

## Criteria
- [ ] CRUD 正常，无 any
- [ ] npm run lint 通过
```

## 执行流程

`create → wait（后台）→ 按终止态分支处理 → 合并 PR → 本地验证`。

```bash
# 1. 同步远程
git status && git push

# 2. 创建会话；stdout JSON 中的 sessionId 字段即会话 ID
jules create --prompt "$(cat prompt.md)" --title "实现用户管理模块"

# 3. 后台等待（Bash 调用带 run_in_background: true）
#    重定向到文件便于退出后读取最终 JSON
jules wait <sessionId> --timeout-minutes 120 > /tmp/jules-<sessionId>.json

# 4. 进程退出后：检查 exit code，读取 /tmp/jules-<sessionId>.json，
#    按下表 state 字段分支处理；COMPLETED 时用 prUrl 合并
gh pr ready <pr_url> && gh pr merge <pr_url> --merge && git pull

# 5. 本地跑项目的测试/lint（如 npm test、npm run lint）验证合并后未破坏
```

`jules wait` 每 5 分钟向 stderr 输出一行状态，进程在到达终止态或超时时退出。后台模式下 Claude 会在退出时收到通知，用 `BashOutput` 按 shell_id 读取，或直接 `Read` 上面重定向的文件。后台等待不占用上下文，也不阻塞其他工具调用。

## 终止态处理

| 状态 | 操作 |
|------|------|
| `COMPLETED` | 合并前 `gh pr diff <prUrl>` 复核改动是否在 `Constraints` 范围内，再 `gh pr ready && gh pr merge --merge && git pull` |
| `FAILED` | JSON 不含错误详情，打开 `url` 字段（Jules Web UI）看失败原因。错误局限在单文件/函数就 `jules send <sessionId> "<修正说明>"` 追加反馈重试；prompt 方向错了就 `jules delete` 后重写新建会话 |
| `AWAITING_USER_FEEDBACK` | Jules 在主动提问，必须 `jules send <sessionId> "<回复>"` 否则不会继续；问题内容同样在 `url` 指向的 Web UI |
| `AWAITING_PLAN_APPROVAL` | CLI 创建会话时未开启 `requirePlanApproval`，正常不会出现；若出现说明服务端触发人工审核，`jules approve <sessionId>` 批准 |

## 并行会话

多个独立模块可并发。每个会话**单独**一次 `Bash(run_in_background: true)` 调用 `jules wait <id> > /tmp/jules-<id>.json`，文件名即索引，任一完成都会单独通知。`--title` 取区分度高的描述，便于 stderr 日志定位。

## 常见陷阱

- **本地改动没 push**：Jules 看到旧代码，上下文/类型对不上。创建会话前永远先 `git status`。
- **Prompt 没写 Constraints**：Jules 可能动到无关文件。合并前用 `gh pr diff` 复核。
- **没等 `wait` 退出就 merge**：PR 还是 draft 或仍在跑；以 `jules wait` 进程退出为准。

## CLI 速查

| 命令 | 功能 |
|------|------|
| `jules create --prompt <p> --title <t> [--branch <b>]` | 创建会话，JSON 含 `sessionId` |
| `jules wait <sessionId> [--timeout-minutes <n>]` | 阻塞等待终止态（配 `run_in_background: true`） |
| `jules get <sessionId>` | 查状态和 PR URL |

其他命令（`list` / `delete` / `send` / `approve`）见 README。
