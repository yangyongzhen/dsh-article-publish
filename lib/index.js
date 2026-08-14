/**
 * dsh-article-publish — publish articles to CSDN / Juejin / CNBlog from inside
 * a DeepSeek Harness session, backed by the `mcp-server-article` binary
 * (https://gitcode.com/qq8864/article-publish-mcp).
 *
 * Registers three model-visible tools:
 *   - publish_article   : publish or update on one platform
 *   - fetch_news        : latest tech news (CNBlog RSS)
 *   - fetch_experience  : random interview experience (Nowcoder)
 *
 * Each call spawns a fresh stdio MCP process, runs the initialize handshake,
 * invokes one tool and returns the text result. Platform cookies resolve
 * inside the MCP binary: explicit param → plugin config → env vars → Chrome
 * CDP capture.
 *
 * @module dsh-article-publish
 */
import z from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { callMcpTool } from './mcp.js';
/** Stable Cordis plugin name. */
const name = 'article-publish';
/** Core services required before the tools can be registered. */
const inject = ['tools'];
const Config = z.object({
    enabled: z.boolean().default(true),
    mcpServerPath: z.string().required(),
    mcpServerArgs: z.array(z.string()).default([]),
    csdnCookie: z.string(),
    juejinCookie: z.string(),
    cnblogCookie: z.string(),
    cnblogToken: z.string()
});
const PLATFORM_TOOL = {
    csdn: 'publish_article_2_csdn',
    juejin: 'publish_article_2_juejin',
    cnblog: 'publish_article_2_cnblog'
};
/** Build the arguments forwarded to the matching MCP publish tool. */
function publishArgsFor(config, args) {
    const common = { title: args.title, content: args.content };
    switch (args.platform) {
        case 'csdn': {
            if (args.description !== undefined)
                common.description = args.description;
            if (args.articleId !== undefined)
                common.article_id = args.articleId;
            if (config.csdnCookie !== undefined)
                common.cookie = config.csdnCookie;
            return common;
        }
        case 'juejin': {
            if (args.description !== undefined)
                common.description = args.description;
            if (config.juejinCookie !== undefined)
                common.cookie = config.juejinCookie;
            return common;
        }
        case 'cnblog': {
            if (config.cnblogCookie !== undefined)
                common.cookie = config.cnblogCookie;
            if (config.cnblogToken !== undefined)
                common.token = config.cnblogToken;
            return common;
        }
    }
}
function publishTool(config) {
    return defineTool({
        name: 'publish_article',
        description: '发布或更新文章到 CSDN / 掘金 / 博客园。platform 必填（csdn|juejin|cnblog），' +
            'title 与 content（Markdown）必填；description 可选（为空自动截取前 100 字，仅 csdn/juejin）；' +
            'articleId 可选（仅 csdn，传入则原地更新）。返回文章链接。',
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
            return callMcpTool(config.mcpServerPath, config.mcpServerArgs, PLATFORM_TOOL[platform], publishArgsFor(config, { ...args, platform }));
        }
    });
}
function newsTool(config) {
    return defineTool({
        name: 'fetch_news',
        description: '获取最新科技资讯（博客园 RSS），返回标题与正文摘要，作为文章素材。',
        parameters: {},
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }]
        },
        execute: () => callMcpTool(config.mcpServerPath, config.mcpServerArgs, 'query_news', {})
    });
}
function experienceTool(config) {
    return defineTool({
        name: 'fetch_experience',
        description: '从牛客随机获取一篇面试经验（Markdown），作为文章素材。',
        parameters: {},
        output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }]
        },
        execute: () => callMcpTool(config.mcpServerPath, config.mcpServerArgs, 'search_experience_question', {})
    });
}
/**
 * Mount the plugin: register the three article tools.
 */
function apply(ctx, config) {
    if (!config.enabled)
        return;
    ctx.tools.register(publishTool(config));
    ctx.tools.register(newsTool(config));
    ctx.tools.register(experienceTool(config));
}
export { Config, apply, inject, name };
export { callMcpTool, resultText } from './mcp.js';
