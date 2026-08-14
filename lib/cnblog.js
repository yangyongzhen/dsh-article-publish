/**
 * CNBlog article publishing: POST to the cnblogs API with cookie + XSRF
 * token. Ported from mcp-server-article/src/cnblog.rs.
 *
 * @module dsh-article-publish/cnblog
 */
const PUBLISH_URL = 'https://i.cnblogs.com/api/posts';
/**
 * Publish an article on CNBlog. Returns the article URL.
 * @throws when cookie/token are missing or the API rejects the request.
 */
export async function publishToCnblog(cookie, token, username, title, content) {
    if (cookie.trim() === '' || token.trim() === '') {
        throw new Error('博客园 cookie 或 token 为空：请在配置或 CNBLOG_COOKIE / CNBLOG_TOKEN 环境变量中提供');
    }
    const body = {
        title,
        postBody: content,
        postType: 2,
        accessPermission: 0,
        inSiteCandidate: false,
        inSiteHome: false,
        isPublished: true,
        displayOnHomePage: true,
        isAllowComments: true,
        includeInMainSyndication: true,
        isPinned: true,
        showBodyWhenPinned: false,
        isOnlyForRegisterUser: false,
        isUpdateDateAdded: true,
        isMarkdown: true,
        isDraft: true,
        changePostType: false,
        removeScript: false,
        changeCreatedTime: false,
        canChangeCreatedTime: false,
        isContributeToImpressiveBugActivity: false,
        usingEditorId: 5,
        tags: ['后端']
    };
    const response = await fetch(PUBLISH_URL, {
        method: 'POST',
        headers: {
            Cookie: cookie,
            'x-xsrf-token': token,
            accept: 'application/json, text/plain, */*',
            'content-type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000)
    });
    const status = response.status;
    const parsed = (await response.json().catch(() => ({})));
    if (!response.ok) {
        throw new Error(`博客园请求失败，状态码: ${status}`);
    }
    if (parsed.errors != null && parsed.errors.length > 0) {
        throw new Error(`博客园发布失败: ${parsed.errors.join(', ')}`);
    }
    const id = parsed.id;
    if (id === undefined || id === null)
        throw new Error('博客园响应 ID 为空');
    return `https://www.cnblogs.com/${username}/articles/${String(id)}`;
}
