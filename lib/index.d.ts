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
import type { Context } from '@deepseek-ai/cordis';
/** Stable Cordis plugin name. */
declare const name = "article-publish";
/** Core services required before the tools can be registered. */
declare const inject: string[];
/** Plugin configuration after schema validation. */
export interface ArticlePublishConfig {
    enabled: boolean;
    /** Path to the mcp-server-article executable. */
    mcpServerPath: string;
    /** Extra argv for the server (e.g. `node script.mjs`). */
    mcpServerArgs: string[];
    /** Optional platform cookies; empty values fall back to env / Chrome CDP inside the MCP server. */
    csdnCookie?: string;
    juejinCookie?: string;
    cnblogCookie?: string;
    cnblogToken?: string;
}
declare const Config: z<Schemastery.ObjectS<{
    enabled: z<boolean, boolean>;
    mcpServerPath: z<string, string>;
    mcpServerArgs: z<string[], string[]>;
    csdnCookie: z<string, string>;
    juejinCookie: z<string, string>;
    cnblogCookie: z<string, string>;
    cnblogToken: z<string, string>;
}>, Schemastery.ObjectT<{
    enabled: z<boolean, boolean>;
    mcpServerPath: z<string, string>;
    mcpServerArgs: z<string[], string[]>;
    csdnCookie: z<string, string>;
    juejinCookie: z<string, string>;
    cnblogCookie: z<string, string>;
    cnblogToken: z<string, string>;
}>>;
/**
 * Mount the plugin: register the three article tools.
 */
declare function apply(ctx: Context, config: ArticlePublishConfig): void;
export { Config, apply, inject, name };
export { callMcpTool, resultText } from './mcp.js';
