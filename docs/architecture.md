# Claude Agent Web UI 核心架构

## 整体架构

```
┌─────────────────┐     HTTP/SSE      ┌─────────────────┐     SDK       ┌─────────────────┐
│  React Web UI   │◄──────────────────│  Bun Server     │◄─────────────│  Claude Agent   │
│  (浏览器)        │  实时事件流        │  (agent-session)│  query()     │  SDK            │
└─────────────────┘                   └─────────────────┘              └─────────────────┘
```

## 目录结构

```
src/
├── server/           # Bun HTTP/SSE 服务端
│   ├── index.ts      # HTTP 路由入口
│   ├── agent-session.ts  # Claude SDK 会话管理 (核心)
│   ├── sse.ts        # SSE 客户端管理
│   └── dir-info.ts   # 目录树构建
├── renderer/         # React Web UI
│   ├── api/          # HTTP/SSE 客户端
│   ├── hooks/        # React Hooks (状态管理)
│   ├── pages/        # 页面组件
│   └── components/   # UI 组件
└── shared/           # 共享类型定义
```

## 与 Claude Code 交互的关键点

### 1. SDK 会话创建 (`src/server/agent-session.ts:140-180`)

```typescript
querySession = query(
  {
    maxThinkingTokens: 32_000,
    permissionMode: 'bypassPermissions', // 跳过权限确认
    executable: 'bun',
    cwd: agentDir,
    includePartialMessages: true,
    systemPrompt: { type: 'preset', preset: 'claude_code' }
  },
  messageGenerator()
);
```

### 2. 消息生成器 (`src/server/agent-session.ts:200-300`)

使用异步生成器模式实现多轮对话:

```typescript
async function* messageGenerator(): AsyncGenerator<SDKUserMessage> {
  while (true) {
    // 从 messageQueue 获取用户消息
    const msg = messageQueue.shift();
    if (msg) {
      yield { role: 'user', content: msg.text };
      msg.resolve();
    }
    await sleep(100); // 轮询间隔
  }
}
```

### 3. 事件流处理 (`src/server/agent-session.ts:400-800`)

处理 SDK 返回的事件类型:

| 事件类型              | 说明                          |
| --------------------- | ----------------------------- |
| `stream_event`        | 流式内容 (文本/思考/工具调用) |
| `content_block_start` | 开始新内容块                  |
| `content_block_delta` | 增量内容更新                  |
| `content_block_stop`  | 内容块结束                    |
| `user`                | 工具执行结果                  |
| `assistant`           | 助手响应                      |
| `result`              | 最终结果                      |

### 4. SSE 广播 (`src/server/sse.ts`)

```typescript
// 广播事件到所有连接的客户端
broadcast('chat:message-chunk', { text: '...' })
broadcast('chat:tool-use-start', { toolId, toolName, ... })
```

## SSE 事件类型

### 会话事件

- `chat:init` - 初始化状态
- `chat:status` - 状态变化
- `chat:system-init` - 系统信息 (工具/模型/skills)

### 消息事件

- `chat:message-replay` - 历史消息回放
- `chat:message-chunk` - 文本流
- `chat:message-complete` - 消息完成
- `chat:message-stopped` - 消息中断
- `chat:message-error` - 错误

### 思考事件

- `chat:thinking-start` - 开始思考
- `chat:thinking-chunk` - 思考内容流

### 工具事件

- `chat:tool-use-start` - 工具调用开始
- `chat:tool-input-delta` - 工具参数流
- `chat:content-block-stop` - 内容块结束
- `chat:tool-result-start` - 工具结果开始
- `chat:tool-result-delta` - 工具结果流
- `chat:tool-result-complete` - 工具结果完成

### 子代理事件

- `chat:subagent-tool-use` - 子代理工具调用
- `chat:subagent-tool-input-delta` - 子代理参数流
- `chat:subagent-tool-result-*` - 子代理结果事件

## 前端状态管理

### useClaudeChat Hook (`src/renderer/hooks/useClaudeChat.ts`)

核心状态:

```typescript
const [messages, setMessages] = useState<Message[]>([]);
const [isLoading, setIsLoading] = useState(false);
const isStreamingRef = useRef(false);
```

消息结构:

```typescript
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
  timestamp: Date
  attachments?: MessageAttachment[]
}

type ContentBlock =
  | { type: 'text', text: string }
  | { type: 'thinking', thinking: string, ... }
  | { type: 'tool_use', tool: ToolUseSimple }
```

### useAgentState Hook (`src/renderer/hooks/useAgentState.ts`)

```typescript
{
  agentDir: string,
  sessionState: 'idle' | 'running' | 'error',
  hasInitialPrompt: boolean
}
```

## Skills 系统

### 目录结构

```
.claude/skills/{skill-name}/
├── SKILL.md           # 元数据 (name, description)
└── scripts/           # 工具脚本
    └── {tool}/
        └── {tool}.ts  # 可执行脚本
```

### 示例: csv-data-summarizer

```
agent/.claude/skills/csv-data-summarizer/
├── SKILL.md           # 描述何时触发
├── analyze.py         # Python 分析脚本
├── requirements.txt   # 依赖
└── resources/         # 测试数据
```

## HTTP 路由

| 方法 | 路径              | 说明       |
| ---- | ----------------- | ---------- |
| GET  | `/chat/stream`    | SSE 事件流 |
| POST | `/chat/send`      | 发送消息   |
| POST | `/chat/stop`      | 中断响应   |
| GET  | `/agent/dir`      | 目录树     |
| GET  | `/agent/download` | 下载文件   |
| GET  | `/agent/file`     | 预览文件   |
| POST | `/agent/upload`   | 上传文件   |

## 关键设计模式

1. **单一长连接会话** - SDK query 会话保持活跃，支持多轮对话
2. **消息队列 + 异步生成器** - 新消息无需重建会话
3. **广播模式** - 所有 SSE 客户端接收相同事件
4. **增量 JSON 解析** - 容错解析不完整的流式 JSON
5. **事件回放缓冲** - 确保新连接客户端获得完整状态
