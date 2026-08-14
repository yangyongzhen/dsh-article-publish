// Unit tests for the direct platform publishers: intercept globalThis.fetch
// and assert request URLs, headers and bodies without hitting real APIs.
import assert from 'node:assert/strict';
import { publishToCsdn } from '../lib/csdn.js';
import { publishToJuejin } from '../lib/juejin.js';
import { publishToCnblog } from '../lib/cnblog.js';
import { fetchRandomNews } from '../lib/news.js';
import { proxyGitcodeImages, collectImageUrls, truncateToChars } from '../lib/markdown.js';

const calls = [];
let failWith = null;

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), options });
  if (failWith !== null) throw failWith;
  const u = String(url);
  const respond = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
  if (u.includes('bizapi.csdn.net/blog-console-api')) return respond({ code: 200, data: { url: 'https://blog.csdn.net/qq8864/article/details/1' } });
  if (u.includes('bizapi.csdn.net/resource-api')) return respond({ code: 200, data: { url: 'https://csdnimg.cn/new.png' } });
  if (u.includes('article_draft/create')) return respond({ err_no: 0, data: { id: 'draft-1' } });
  if (u.includes('article/publish')) return respond({ err_no: 0, data: { article_id: '999' } });
  if (u.includes('i.cnblogs.com/api/posts')) return respond({ id: 42 });
  if (u.includes('feed.cnblogs.com')) {
    return new Response('<?xml version="1.0"?><rss><channel><item><title>测试资讯</title><description>内容摘要</description></item></channel></rss>', { status: 200 });
  }
  throw new Error('unexpected URL: ' + u);
};

async function run() {
  // CSDN: signed headers + body shape
  calls.length = 0;
  const csdnUrl = await publishToCsdn('session=cookie', '标题', '![图](https://example.com/a.png)\n正文', undefined, 7);
  assert.equal(csdnUrl, 'https://blog.csdn.net/qq8864/article/details/1');
  const csdnPublish = calls.find((c) => c.url.includes('blog-console-api/v3/mdeditor/saveArticle'));
  assert.ok(csdnPublish, 'CSDN publish called');
  const csdnHeaders = csdnPublish.options.headers;
  for (const h of ['Cookie', 'x-ca-key', 'x-ca-nonce', 'x-ca-signature', 'x-ca-signature-headers', 'content-type', 'accept']) {
    assert.ok(csdnHeaders[h] !== undefined, `CSDN header ${h}`);
  }
  assert.equal(csdnHeaders['x-ca-key'], '203803574');
  const csdnBody = JSON.parse(csdnPublish.options.body);
  assert.equal(csdnBody.id, 7, 'article id forwarded');
  assert.equal(csdnBody.is_new, 0, 'update must not be new');
  assert.equal(csdnBody.title, '标题');
  assert.ok(csdnBody.content.includes('<p>'), 'html content rendered');
  const storageCall = calls.find((c) => c.url.includes('resource-api/v1/image/external/storage'));
  assert.ok(storageCall, 'image transfer called for external image');
  console.log('CSDN ok: signed headers, body, is_new, image transfer');

  // Juejin: two-step draft → publish
  calls.length = 0;
  const juejinUrl = await publishToJuejin('session=cookie', '标题', '正文', '摘要');
  assert.equal(juejinUrl, 'https://juejin.cn/post/999');
  const createCall = calls.find((c) => c.url.includes('article_draft/create'));
  const publishCall = calls.find((c) => c.url.includes('article/publish'));
  assert.ok(createCall && publishCall, 'juejin two-step order');
  assert.equal(calls.indexOf(createCall), 0, 'draft created first');
  assert.equal(JSON.parse(createCall.options.body).brief_content, '摘要');
  assert.equal(JSON.parse(publishCall.options.body).draft_id, 'draft-1');
  console.log('Juejin ok: two-step, brief_content, draft_id');

  // CNBlog: xsrf token header + camelCase body
  calls.length = 0;
  const cnblogUrl = await publishToCnblog('session=cookie', 'xsrf-token', 'qq8864', '标题', '正文');
  assert.equal(cnblogUrl, 'https://www.cnblogs.com/qq8864/articles/42');
  const cnblogCall = calls[0];
  assert.equal(cnblogCall.options.headers['x-xsrf-token'], 'xsrf-token');
  const cnblogBody = JSON.parse(cnblogCall.options.body);
  assert.equal(cnblogBody.isMarkdown, true);
  assert.equal(cnblogBody.postBody, '正文');
  console.log('CNBlog ok: xsrf header, camelCase body, username link');

  // news RSS
  calls.length = 0;
  const news = await fetchRandomNews();
  assert.equal(news.title, '测试资讯');
  console.log('News ok:', news.title);

  // markdown helpers
  assert.equal(proxyGitcodeImages('](https://raw.gitcode.com/a.png)'), '](https://wsrv.nl/?url=https://raw.gitcode.com/a.png)');
  assert.equal(proxyGitcodeImages('](https://wsrv.nl/?url=https://raw.gitcode.com/a.png)'), '](https://wsrv.nl/?url=https://raw.gitcode.com/a.png)', 'idempotent');
  assert.deepEqual(collectImageUrls('![a](https://x/1.png) ![b](https://x/2.png)'), ['https://x/1.png', 'https://x/2.png']);
  assert.equal(truncateToChars('一二三四五', 3), '一二三');

  // missing cookie → friendly error
  await assert.rejects(() => publishToCsdn('', 't', 'c'), /CSDN cookie 为空/);
  await assert.rejects(() => publishToJuejin('', 't', 'c'), /掘金 cookie 为空/);
  await assert.rejects(() => publishToCnblog('', 't', 'u', 't', 'c'), /博客园 cookie 或 token 为空/);
  console.log('Missing-cookie guards ok');

  console.log('ALL TESTS PASSED');
}

run().catch((e) => { console.error('TEST FAILED:', e); process.exit(1); });
