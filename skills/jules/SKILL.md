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
  - mcp__jules__jules_create_session
  - mcp__jules__jules_list_sessions
  - mcp__jules__jules_get_session
  - mcp__jules__jules_send_message
  - mcp__jules__jules_approve_plan
---

# 使用 Jules 进行开发

Jules 是 Google 的 AI 编程代理，可以在独立的远程会话中执行编码任务，完成后自动创建 PR。

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
4. 等待所有会话完成
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

## MCP Tools

使用 MCP 提供的工具操作 Jules：

| 工具 | 功能 |
|------|------|
| `jules_create_session` | 创建会话 |
| `jules_list_sessions` | 列出会话 |
| `jules_get_session` | 获取会话状态和 PR URL |
| `jules_send_message` | 发送消息给会话 |
| `jules_approve_plan` | 批准会话计划 |

## 合并 PR

会话完成后使用 `gh` 命令合并 PR：

```bash
gh pr merge <pr_url> --merge   # 或 --squash, --rebase
git pull
```
