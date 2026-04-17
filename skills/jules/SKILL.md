---
name: jules
description: 使用 Jules 进行开发。委托编码任务给 Jules 代理执行。
argument-hint: <任务描述>
allowed-tools:
  - Task
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# 使用 Jules 进行开发

Jules 是 Google 的 AI 编程代理，可以在独立的远程会话中执行编码任务，完成后自动创建 PR。

通过 `@xbghc/jules-cli` 这个 CLI 操作 Jules。推荐全局安装：`npm i -g @xbghc/jules-cli`，或按需使用 `npx -y @xbghc/jules-cli <cmd>`。

## 何时使用 Jules

| 适合 Jules | 本地执行更好 |
|------------|-------------|
| 多文件修改 | 单文件创建 |
| 功能实现 | 配置/设置 |
| 重构任务 | 小编辑 (<50 行) |
| 复杂逻辑 | 简单、可预测 |
| 可能需要调试 | 一次完成 |

**经验法则**: 如果能一次完成且有把握，本地执行。否则委托给 Jules。

## Prompt 编写指南

好的 prompt 包含四个部分：

```
## Context
项目背景、技术栈、相关现有文件

## Task
具体实现要求

## Constraints
- Only modify: [要修改的文件]
- Do not modify: [不要修改的文件]

## Criteria
- [ ] 验收标准1
- [ ] 验收标准2
- [ ] 测试通过
```

### 示例 Prompt

```
## Context
Vue 3 + TypeScript 项目，使用 Pinia 状态管理。
现有用户类型定义在 src/types/user.ts

## Task
在 src/modules/user/ 实现用户管理模块：
- UserList.vue: 用户列表，支持分页和搜索
- UserForm.vue: 用户表单，支持创建和编辑
- UserDetail.vue: 用户详情页
- api.ts: 用户相关 API 调用
- store.ts: Pinia store

## Constraints
- Only modify: src/modules/user/**
- Use existing types from src/types/user.ts
- Follow existing code style in src/modules/

## Criteria
- [ ] 所有 CRUD 操作正常
- [ ] 表单验证正确
- [ ] 类型完整，无 any
- [ ] npm run lint 通过
```

## 工作流程

### 并行任务

多个独立模块可以同时开发：

```
1. 本地创建共享类型/接口
2. git push 到远程（Jules 只能访问远程代码）
3. 并行创建多个 Jules 会话
4. 分别在后台等待每个会话完成
5. 合并所有 PR
6. 运行测试验证
```

### 顺序任务

有依赖关系的任务需要顺序执行：

```
1. 执行第一个任务
2. 如果是 Jules 任务，等待完成并合并 PR
3. 继续下一个任务
4. 重复直到完成
```

## 重要约束

### Jules 只能访问远程主分支

Jules 远程会话**只能获取远程分支的代码**。委托任务前必须：

1. **本地修改已推送** - 接口、类型等前置工作必须先 push
2. **代码已同步** - 确保远程分支是最新的

```bash
# 检查并同步
git status
git add . && git commit -m "..." && git push
```

### 自包含的 Prompt

每个 Jules 会话是独立的，prompt 必须包含所有必要信息：
- 不要假设 Jules 知道之前的对话
- 明确指出相关文件和依赖
- 给出具体的文件路径

## CLI 命令

使用 `jules` CLI 操作 Jules。所有命令的最终结果以 JSON 输出到 stdout；`wait` 期间每 5 分钟在 stderr 打印一行状态。

| 命令 | 功能 |
|------|------|
| `jules create --prompt <p> --title <t> [--source <s>] [--branch <b>]` | 创建会话 |
| `jules list [--page-size <n>]` | 列出会话 |
| `jules get <sessionId>` | 获取会话状态和 PR URL |
| `jules wait <sessionId> [--timeout-minutes <n>]` | 阻塞等待会话到达终止态 |
| `jules send <sessionId> <message>` | 发送消息给会话 |
| `jules approve <sessionId>` | 批准会话计划 |
| `jules delete <sessionId>` | 删除会话 |

创建会话示例：

```bash
jules create --prompt "$(cat prompt.md)" --title "实现用户管理模块"
```

## 等待策略

创建会话后，用 `Bash` 以 `run_in_background: true` 运行 `jules wait`：

```
Bash(command="jules wait <sessionId> --timeout-minutes 120", run_in_background: true)
```

CLI 每 5 分钟向 stderr 输出一行当前状态，进程在到达终止态（或超时）时退出。Claude 会在进程退出时自动收到通知，然后从 stdout 读取最终 JSON。

**相对原 MCP `jules_wait_session` 的优势**：后台等待不占用 Claude 的上下文窗口，也不阻塞工具调用；同时支持同时跑多个会话的并行等待。

进程退出后，根据 JSON 里的 `state` 字段决定下一步：

| 状态 | 操作 |
|------|------|
| `COMPLETED` | 获取 PR URL，使用 `gh pr merge` 合并 |
| `FAILED` | 报告错误，终止流程 |
| `AWAITING_PLAN_APPROVAL` | 运行 `jules approve <sessionId>` |
| `AWAITING_USER_FEEDBACK` | 运行 `jules send <sessionId> "..."` |

### 并行等待

多个会话各起一个后台 `jules wait`（每个单独的 `Bash` 调用，`run_in_background: true`），任何一个完成都会单独通知。

## 合并 PR

会话完成后合并 PR（无论是否为 Draft PR，统一先 ready 再 merge）：

```bash
gh pr ready <pr_url> && gh pr merge <pr_url> --merge && git pull
```
