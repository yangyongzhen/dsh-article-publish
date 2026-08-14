// Mock MCP stdio server for dsh-article-publish end-to-end tests.
// Responds to initialize/tools-call and records every tool call to
// mock-calls.jsonl so parameter passthrough can be verified.
import { readFileSync, appendFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const LOG = new URL('./mock-calls.jsonl', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const rl = createInterface({ input: process.stdin });

rl.on('line', (line) => {
  if (line.trim() === '') return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }

  if (msg.method === 'initialize') {
    send({ jsonrpc: '2.0', id: msg.id, result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'mock-mcp-server-article', version: '0.0.0' },
    }});
    return;
  }
  if (msg.method === 'notifications/initialized') return;

  if (msg.method === 'tools/call') {
    const { name, arguments: args } = msg.params;
    appendFileSync(LOG, JSON.stringify({ name, args }) + '\n');
    let text;
    switch (name) {
      case 'publish_article_2_csdn':
        text = `https://blog.csdn.net/qq8864/article/details/12345678 (mock)`;
        break;
      case 'publish_article_2_juejin':
        text = `https://juejin.cn/post/987654321 (mock)`;
        break;
      case 'publish_article_2_cnblog':
        text = `https://www.cnblogs.com/qq8864/p/12345678.html (mock)`;
        break;
      case 'query_news':
        text = '【科技资讯 mock】DeepSeek Harness 插件生态持续增长。';
        break;
      case 'search_experience_question':
        text = '【面经 mock】请介绍一次你解决线上问题的经历…';
        break;
      default:
        text = `unknown tool: ${name}`;
    }
    send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text }] } });
    return;
  }
});

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}
