/**
 * dsh-article-publish — publish articles from a DeepSeek Harness session
 * directly to CSDN / Juejin / CNBlog (no external MCP server required).
 *
 * Registers two model-visible tools:
 *   - publish_article : publish or update on one platform, returns the URL
 *   - fetch_news      : one random tech-news item as article material
 *
 * Credentials resolve per platform as: plugin config → environment variable
 * (CSDN_COOKIE / JUEJIN_COOKIE / CNBLOG_COOKIE / CNBLOG_TOKEN /
 * CNBLOG_USERNAME) → friendly error. Get cookies from your browser after
 * logging in (DevTools → Application → Cookies), or run
 * `mcp-server-article get-cookies` to export them.
 *
 * @module dsh-article-publish
 */
import z from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { publishToCsdn } from './csdn.js';
import { publishToJuejin } from './juejin.js';
import { publishToCnblog } from './cnblog.js';
import { fetchRandomNews } from './news.js';
/** Stable Cordis plugin name. */
const name = 'article-publish';
/** Core services required before the tools can be registered. */
const inject = ['tools'];
const Config = z.object({
    enabled: z.boolean().default(true),
    csdnCookie: z.string(),
    juejinCookie: z.string(),
    cnblogCookie: z.string(),
    cnblogToken: z.string(),
    cnblogUsername: z.string()
});
/** Config wins over environment variables; missing values stay empty. */
export function resolveCredentials(config) {
    return {
        csdnCookie: config.csdnCookie ?? process.env.CSDN_COOKIE ?? '',
        juejinCookie: config.juejinCookie ?? process.env.JUEJIN_COOKIE ?? '',
        cnblogCookie: config.cnblogCookie ?? process.env.CNBLOG_COOKIE ?? '',
        cnblogToken: config.cnblogToken ?? process.env.CNBLOG_TOKEN ?? '',
        cnblogUsername: config.cnblogUsername ?? process.env.CNBLOG_USERNAME ?? ''
    };
}
async function dispatchPublish(credentials, args) {
    switch (args.platform) {
        case 'csdn':
            return publishToCsdn(credentials.csdnCookie, args.title, args.content, args.description, args.articleId);
        case 'juejin':
            return publishToJuejin(credentials.juejinCookie, args.title, args.content, args.description);
        case 'cnblog':
            return publishToCnblog(credentials.cnblogCookie, credentials.cnblogToken, credentials.cnblogUsername, args.title, args.content);
    }
}
function publishTool(config) {
    const credentials = resolveCredentials(config);
    return defineTool({
        name: 'publish_article',
        description: '发布或更新文章到 CSDN / 掘金 / 博客园。platform 必填（csdn|juejin|cnblog），title 与 content（Markdown）必填；' +
            'description 可选（为空自动截取前 100 字，仅 csdn/juejin）；articleId 可选（仅 csdn，传入则原地更新）。' +
            'CSDN 发布会自动把外链图片转存到 CSDN 图床。返回文章链接。',
        parameters: {
            platform: { type: 'string', required: true, description: '目标平台：csdn | juejin | cnblog' },
            title: { type: 'string', required: true, description: '文章标题' },
            content: { type: 'string', required: true, description: '文章正文（Markdown 格式）' },
            description: { type: 'string', description: '文章摘要；为空时自动截取正文前 100 字' },
            articleId: { type: 'number', description: '已发布文章 ID（仅 csdn）；传入则原地更新' }
        },
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }]
        },
        execute: async (args) => {
            const platform = args.platform;
            if (platform !== 'csdn' && platform !== 'juejin' && platform !== 'cnblog') {
                return `未知平台：${args.platform}`;
            }
            try {
                return await dispatchPublish(credentials, { ...args, platform });
            }
            catch (error) {
                return `发布失败：${error instanceof Error ? error.message : String(error)}`;
            }
        }
    });
}
function newsTool() {
    return defineTool({
        name: 'fetch_news',
        description: '获取一条最新科技资讯（博客园 RSS 随机一篇），返回标题与内容摘要，作为文章素材。',
        parameters: {},
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }]
        },
        execute: async () => {
            try {
                const news = await fetchRandomNews();
                return `【科技资讯】${news.title}\n\n${news.content}`;
            }
            catch (error) {
                return `获取资讯失败：${error instanceof Error ? error.message : String(error)}`;
            }
        }
    });
}
/**
 * Mount the plugin: register the publish and news tools.
 */
function apply(ctx, config) {
    if (!config.enabled)
        return;
    ctx.tools.register(publishTool(config));
    ctx.tools.register(newsTool());
}
export { Config, apply, inject, name };
export { publishToCsdn } from './csdn.js';
export { publishToJuejin } from './juejin.js';
export { publishToCnblog } from './cnblog.js';
export { fetchRandomNews } from './news.js';
