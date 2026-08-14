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
import type { Context } from '@deepseek-ai/cordis';
/** Stable Cordis plugin name. */
declare const name = "article-publish";
/** Core services required before the tools can be registered. */
declare const inject: string[];
/** Resolved platform credentials after config→env fallback. */
export interface PlatformCredentials {
    csdnCookie: string;
    juejinCookie: string;
    cnblogCookie: string;
    cnblogToken: string;
    cnblogUsername: string;
}
/** Plugin configuration after schema validation. */
export interface ArticlePublishConfig {
    enabled: boolean;
    csdnCookie?: string;
    juejinCookie?: string;
    cnblogCookie?: string;
    cnblogToken?: string;
    cnblogUsername?: string;
}
declare const Config: z<Schemastery.ObjectS<{
    enabled: z<boolean, boolean>;
    csdnCookie: z<string, string>;
    juejinCookie: z<string, string>;
    cnblogCookie: z<string, string>;
    cnblogToken: z<string, string>;
    cnblogUsername: z<string, string>;
}>, Schemastery.ObjectT<{
    enabled: z<boolean, boolean>;
    csdnCookie: z<string, string>;
    juejinCookie: z<string, string>;
    cnblogCookie: z<string, string>;
    cnblogToken: z<string, string>;
    cnblogUsername: z<string, string>;
}>>;
/** Config wins over environment variables; missing values stay empty. */
export declare function resolveCredentials(config: ArticlePublishConfig): PlatformCredentials;
/**
 * Mount the plugin: register the publish and news tools.
 */
declare function apply(ctx: Context, config: ArticlePublishConfig): void;
export { Config, apply, inject, name };
export { publishToCsdn } from './csdn.js';
export { publishToJuejin } from './juejin.js';
export { publishToCnblog } from './cnblog.js';
export { fetchRandomNews } from './news.js';
