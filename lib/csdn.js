/**
 * CSDN article publishing: Aliyun API Gateway signed POSTs to the bizapi
 * gateway, with external-image re-hosting to csdnimg.cn and the wsrv.nl
 * fallback for gitcode images. Ported from mcp-server-article/src/csdn.rs.
 *
 * @module dsh-article-publish/csdn
 */
import { createHmac, randomUUID } from 'node:crypto';
import { collectImageUrls, markdownToHtml, markdownToText, proxyGitcodeImages, truncateToChars } from './markdown.js';
const BIZAPI_BASE = 'https://bizapi.csdn.net';
const PUBLISH_PATH = '/blog-console-api/v3/mdeditor/saveArticle';
const IMAGE_STORAGE_PATH = '/resource-api/v1/image/external/storage';
// CSDN bizapi gateway credentials, public in the CSDN frontend JS.
const CA_APP_KEY = '203803574';
const CA_APP_SECRET = '9znpamsyl2c7cdrr9sas0le9vbc3r6ba';
/** Aliyun API Gateway HMAC signature headers for one bizapi POST. */
function signedHeaders(path, nonce) {
    const stringToSign = `POST\n*/*\n\napplication/json\n\nx-ca-key:${CA_APP_KEY}\nx-ca-nonce:${nonce}\n${path}`;
    const signature = createHmac('sha256', CA_APP_SECRET).update(stringToSign).digest('base64');
    return {
        'x-ca-key': CA_APP_KEY,
        'x-ca-nonce': nonce,
        'x-ca-signature': signature,
        'x-ca-signature-headers': 'x-ca-key,x-ca-nonce',
        'content-type': 'application/json',
        accept: '*/*'
    };
}
/** Mirror the web editor's uniqueId shape: `{articleId}_img-{rand8}-{ms}`. */
function imageUniqueId(articleId) {
    const nowMs = Date.now();
    const rand = randomUUID().replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    const prefix = articleId !== undefined ? String(articleId) : String(nowMs % 1_000_000_000);
    return `${prefix}_img-${rand}-${nowMs}`;
}
/** Ask CSDN to fetch an external image and store it on csdnimg.cn. */
async function storeExternalImage(cookie, imgUrl, articleId) {
    const body = {
        uniqueId: imageUniqueId(articleId),
        imgUrl,
        isCrawler: 0,
        nocache: 2,
        rtype: 'article',
        type: 'blog'
    };
    const response = await fetch(`${BIZAPI_BASE}${IMAGE_STORAGE_PATH}`, {
        method: 'POST',
        headers: { Cookie: cookie, ...signedHeaders(IMAGE_STORAGE_PATH, randomUUID()) },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000)
    });
    const status = response.status;
    const parsed = (await response.json().catch(() => ({})));
    if (!response.ok || parsed.code !== 200) {
        const message = parsed.msg ?? parsed.message ?? `code=${String(parsed.code)} status=${status}`;
        throw new Error(`图片转存接口返回错误: ${message}`);
    }
    const url = typeof parsed.data === 'string' ? parsed.data : parsed.data?.url ?? parsed.data?.imgUrl;
    if (url === undefined)
        throw new Error('图片转存响应中无图片链接');
    return url;
}
/** Re-host every external image on csdnimg.cn; keep URLs that fail. */
async function transferExternalImages(cookie, content, articleId) {
    let result = content;
    for (const url of collectImageUrls(content)) {
        if (url.includes('csdnimg.cn'))
            continue;
        try {
            const csdnUrl = await storeExternalImage(cookie, url, articleId);
            result = result.replaceAll(url, csdnUrl);
        }
        catch {
            // keep the original URL; gitcode ones get the wsrv.nl fallback below
        }
    }
    return result;
}
/**
 * Publish (or update) an article on CSDN. Returns the article URL.
 * @throws when the cookie is missing or the API rejects the request.
 */
export async function publishToCsdn(cookie, title, content, description, articleId) {
    if (cookie.trim() === '') {
        throw new Error('CSDN cookie 为空：请在配置或 CSDN_COOKIE 环境变量中提供登录 Cookie');
    }
    const transferred = await transferExternalImages(cookie, content, articleId);
    const finalContent = proxyGitcodeImages(transferred);
    const desc = buildDescription(description, finalContent);
    const html = markdownToHtml(finalContent);
    const body = {
        id: articleId ?? null,
        title,
        markdowncontent: finalContent,
        content: html,
        read_type: 'public',
        level: 0,
        tags: '后端',
        status: 0,
        categories: '',
        article_type: 'original',
        original_link: '',
        authorized_status: false,
        description: desc,
        not_auto_saved: '1',
        source: 'pc_mdeditor',
        cover_images: [],
        cover_type: 1,
        is_new: articleId !== undefined ? 0 : 1,
        vote_id: 0,
        resource_id: '',
        sync_git_code: 0
    };
    const response = await fetch(`${BIZAPI_BASE}${PUBLISH_PATH}`, {
        method: 'POST',
        headers: { Cookie: cookie, ...signedHeaders(PUBLISH_PATH, randomUUID()) },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000)
    });
    const status = response.status;
    const parsed = (await response.json().catch(() => ({})));
    if (!response.ok) {
        const message = parsed.msg ?? parsed.message ?? String(status);
        throw new Error(`CSDN 请求失败，状态码: ${status}，错误: ${message}`);
    }
    if (parsed.code !== 200) {
        throw new Error(`CSDN 发布失败: ${parsed.message ?? parsed.msg ?? `code=${String(parsed.code)}`}`);
    }
    const url = parsed.data?.url;
    if (url === undefined)
        throw new Error('CSDN 响应中无文章链接');
    return url;
}
function buildDescription(description, content) {
    const desc = description !== undefined && description !== '' ? description : markdownToText(content);
    return truncateToChars(desc, 100);
}
