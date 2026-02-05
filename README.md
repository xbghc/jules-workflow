# Jules Workflow

使用 Jules 进行开发的 Claude 插件。通过 MCP 提供 Jules API 操作。

## 安装

```bash
claude plugin install xbghc/jules-workflow
```

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
| `jules-mcp` | MCP | Jules API 操作工具 |

## MCP Tools

| 工具 | 功能 |
|------|------|
| `jules_create_session` | 创建 Jules 会话 |
| `jules_list_sessions` | 列出会话 |
| `jules_get_session` | 获取会话状态和 PR URL |
| `jules_send_message` | 发送消息给会话 |
| `jules_approve_plan` | 批准会话计划 |
| `jules_delete_session` | 删除会话 |

合并 PR 使用 `gh pr merge <url> --merge && git pull`

## 工作流程

```
1. 分析任务 → 判断是否适合 Jules
2. 准备代码 → git push 到远程
3. 创建会话 → jules_create_session
4. 等待完成 → jules_get_session 轮询
5. 合并 PR  → gh pr merge <url> --merge && git pull
6. 验证     → 运行测试
```

## 项目结构

```
jules-workflow/
├── .claude-plugin/
│   └── plugin.json       # 插件配置
├── skills/
│   └── jules/
│       └── SKILL.md      # 使用指南 + 命令
├── mcp/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts      # MCP server
└── README.md
```

## License

MIT
