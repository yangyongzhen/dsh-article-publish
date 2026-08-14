# dsh-article-publish

DeepSeek Harness 文章发布插件：agent 在会话里写完文章，直接调用工具发布到 **CSDN / 掘金 / 博客园**，还能拉取科技资讯、牛客面经当素材。

底层复用 [mcp-server-article](https://gitcode.com/qq8864/article-publish-mcp)（Rust 写的 MCP 服务）：插件内置一个轻量 MCP stdio client，每次调用 spawn 新进程完成握手并转发工具调用。

## 功能

| dsh 工具 | 对应 MCP 工具 | 说明 |
|---|---|---|
| `publish_article` | `publish_article_2_csdn/juejin/cnblog` | 发布/更新文章，返回文章链接 |
| `fetch_news` | `query_news` | 最新科技资讯（博客园 RSS），当素材 |
| `fetch_experience` | `search_experience_question` | 牛客随机面经，当素材 |

`publish_article` 参数：`platform`（csdn|juejin|cnblog）、`title`、`content`（Markdown）、可选 `description`（csdn/juejin）、可选 `articleId`（csdn，原地更新）。CSDN 发布会自动转存外链图片到 CSDN 图床。

## 前置：构建 mcp-server-article

需要 Rust 1.75+：

```sh
git clone https://gitcode.com/qq8864/article-publish-mcp
cd article-publish-mcp
cargo build --release
# 二进制：./target/release/mcp-server-article
```

## 安装

```sh
dsh plugin --profile <web|tui|headless> add file:/path/to/dsh-article-publish
```

## 配置

```yaml
- id: article-publish
  config:
    enabled: true
    mcpServerPath: /path/to/mcp-server-article   # 必填
    mcpServerArgs: []                            # 可选：server 额外参数（如 ["script.mjs"]）
    # 平台 Cookie 可选；为空时 mcp-server-article 依次回退环境变量、Chrome 实时抓取（CDP）
    csdnCookie: ''
    juejinCookie: ''
    cnblogCookie: ''
    cnblogToken: ''
```

Cookie 优先顺序（mcp-server-article 内部处理）：工具参数 → 插件配置 → 环境变量（`CSDN_COOKIE` / `JUEJIN_COOKIE` / `CNBLOG_COOKIE` / `CNBLOG_TOKEN`）→ Chrome 调试端口实时抓取（`mcp-server-article get-cookies` 可导出）。

## 使用示例

让 agent 写文章并发布：

> 调用 fetch_news 获取一条科技资讯，写一篇 300 字短文，然后调用 publish_article 发布到 CSDN。

## 开发与验证

```sh
pnpm install
pnpm run build        # tsc -> lib/
```

端到端验证（mock MCP server，无需真二进制/登录态）：

```sh
dsh plugin --profile headless add file:./
dsh --profile headless --patch ./test/test-patch.yml \
  "调用 publish_article 工具把《测试文章》发布到 CSDN"
cat test/mock-calls.jsonl    # 查看工具调用与参数透传
```

`test/mock-mcp-server.mjs` 模拟 mcp-server-article 的 stdio JSON-RPC，返回假文章链接。

## 已知限制

- 真实发布需要 `mcp-server-article` 二进制与平台登录 Cookie（CDP 抓取需要本机 Chrome）。
- `@deepseek-ai/dsh-tools` 声明为 peerDependency：运行时从 dsh 闭包解析，避免与安装闭包出现双副本导致的 symbol 不匹配（agent-loop 调度器崩溃）。安装若提示 peer 缺失警告可忽略。
