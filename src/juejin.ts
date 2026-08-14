/**
 * Juejin article publishing: create a draft, then publish it. Ported from
 * mcp-server-article/src/juejin.rs.
 *
 * @module dsh-article-publish/juejin
 */
import { markdownToText, truncateToChars } from './markdown.js';

const CREATE_URL = 'https://api.juejin.cn/content_api/v1/article_draft/create';
const PUBLISH_URL = 'https://api.juejin.cn/content_api/v1/article/publish?aid=2608&uuid=7355741656475977213';
const LINK_PREFIX = 'https://juejin.cn/post/';

/** 后端 category/tag ids as the web editor uses. */
const CATEGORY_ID = '6809637769959178254';
const TAG_ID = '6809640408797167623';

interface CreateResponse {
	err_no: number;
	err_msg?: string | null;
	data?: { id?: string } | null;
}

interface PublishResponse {
	err_no: number;
	err_msg?: string | null;
	data?: { article_id?: string } | null;
}

/**
 * Publish an article on Juejin (create draft → publish). Returns the URL.
 * @throws when the cookie is missing or either step is rejected.
 */
export async function publishToJuejin(cookie: string, title: string, content: string, description?: string): Promise<string> {
	if (cookie.trim() === '') {
		throw new Error('掘金 cookie 为空：请在配置或 JUEJIN_COOKIE 环境变量中提供登录 Cookie');
	}

	const desc = buildDescription(description, content);
	const headers = { Cookie: cookie, accept: '*/*', 'content-type': 'application/json' };

	const createResponse = await fetch(CREATE_URL, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			category_id: CATEGORY_ID,
			tag_ids: [TAG_ID],
			title,
			brief_content: desc,
			edit_type: 10,
			html_content: 'deprecated',
			mark_content: content
		}),
		signal: AbortSignal.timeout(10_000)
	});
	const create = (await createResponse.json().catch(() => ({ err_no: -1 }))) as CreateResponse;
	if (create.err_no !== 0) {
		throw new Error(`掘金创建草稿失败: ${create.err_msg ?? 'unknown'}`);
	}
	const draftId = create.data?.id;
	if (draftId === undefined) throw new Error('掘金草稿 ID 为空');

	const publishResponse = await fetch(PUBLISH_URL, {
		method: 'POST',
		headers,
		body: JSON.stringify({ draft_id: draftId, sync_to_org: false, column_ids: [], theme_ids: [] }),
		signal: AbortSignal.timeout(10_000)
	});
	const publish = (await publishResponse.json().catch(() => ({ err_no: -1 }))) as PublishResponse;
	if (publish.err_no !== 0) {
		throw new Error(`掘金发布失败: ${publish.err_msg ?? 'unknown'}`);
	}
	const articleId = publish.data?.article_id;
	if (articleId === undefined) throw new Error('掘金文章 ID 为空');
	return `${LINK_PREFIX}${articleId}`;
}

function buildDescription(description: string | undefined, content: string): string {
	const desc = description !== undefined && description !== '' ? description : markdownToText(content);
	return truncateToChars(desc, 100);
}
