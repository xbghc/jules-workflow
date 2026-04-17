# Jules Workflow

使用 Jules 进行开发的 Claude 插件。通过 `jules` CLI 提供 Jules API 操作，支持在后台等待任务完成并自动通知 Claude。

## 安装

```bash
/plugin marketplace add xbghc/jules-workflow
/plugin install jules-workflow@jules-workflow
```

安装 CLI（推荐全局安装）：

```bash
npm i -g @xbghc/jules-cli
```

或者按需通过 `npx -y @xbghc/jules-cli <command>` 调用。

需要设置环境变量 `GOOGLE_JULES_API_KEY`，从 https://jules.google/settings 获取。

## 使用

```bash
/jules-workflow:jules <任务描述>
```

**示例:**
```bash
/jules-workflow:jules 实现用户管理模块，包含列表、表单、详情页
```

## 组件

| 组件 | 类型 | 功能 |
|------|------|------|
| `jules` | Skill | Jules 使用指南 + 入口命令 |
| `@xbghc/jules-cli` | CLI | Jules API 操作命令 |

## CLI 命令

| 命令 | 功能 |
|------|------|
| `jules create --prompt <p> --title <t> [--source <s>] [--branch <b>]` | 创建会话 |
| `jules list [--page-size <n>]` | 列出会话 |
| `jules get <sessionId>` | 获取会话状态和 PR URL |
| `jules delete <sessionId>` | 删除会话 |
| `jules send <sessionId> <message>` | 发送消息给会话 |
| `jules approve <sessionId>` | 批准会话计划 |
| `jules wait <sessionId> [--timeout-minutes <n>]` | 阻塞等待会话到达终止态 |

所有命令的最终结果以 JSON 格式输出到 stdout。`wait` 每 5 分钟向 stderr 输出一行状态，便于日志与流式观察。

### 后台等待（关键能力）

让 Claude 用 `Bash(run_in_background: true)` 跑：

```
jules wait <sessionId> --timeout-minutes 120
```

任务到达终止态时，进程退出，Claude 自动收到通知并读取最终 JSON 决定下一步。这种模式不占用上下文窗口，也不会把 Claude 会话阻塞在一次工具调用上。

合并 PR：

```bash
gh pr ready <pr_url> && gh pr merge <pr_url> --merge && git pull
```

## 工作流程

```
1. 分析任务 → 判断是否适合 Jules
2. 准备代码 → git push 到远程
3. 创建会话 → jules create
4. 后台等待 → jules wait（run_in_background）
5. 合并 PR  → gh pr merge <url> --merge && git pull
6. 验证     → 运行测试
```

## 项目结构

```
jules-workflow/
├── .claude-plugin/
│   ├── plugin.json       # 插件配置
│   └── marketplace.json  # 市场配置
├── skills/
│   └── jules/
│       └── SKILL.md      # 使用指南 + 命令
├── cli/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts      # CLI dispatcher
│       ├── handlers.ts   # 命令处理器
│       └── api.ts        # Jules API 客户端
└── README.md
```

## License

MIT
