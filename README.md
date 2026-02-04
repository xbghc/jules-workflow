# Jules Workflow

使用 Jules 进行开发的 Claude 插件。通过 MCP 提供 Jules API 操作。

## 安装

```bash
# 安装 MCP 依赖
cd mcp && npm install && npm run build

# 添加到 Claude 插件目录
claude --plugin-dir /path/to/jules-workflow
```

## 环境变量

```bash
export GOOGLE_JULES_API_KEY="your-api-key"
```

从 https://jules.google/settings 获取 API 密钥。

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

## MCP 配置

在 Claude 配置中添加:

```json
{
  "mcpServers": {
    "jules": {
      "command": "node",
      "args": ["/path/to/jules-workflow/mcp/dist/index.js"],
      "env": {
        "GOOGLE_JULES_API_KEY": "your-api-key"
      }
    }
  }
}
```

## License

MIT
