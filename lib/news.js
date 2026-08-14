/**
 * Tech-news material tool: pick one random entry from the CNBlog news RSS.
 *
 * @module dsh-article-publish/news
 */
const RSS_URL = 'https://feed.cnblogs.com/news/rss';
/** Fetch a random news item (title + content) from the CNBlog news feed. */
export async function fetchRandomNews() {
    const response = await fetch(RSS_URL, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok)
        throw new Error(`RSS 请求失败，状态码: ${response.status}`);
    const xml = await response.text();
    const items = parseRssItems(xml);
    if (items.length === 0)
        throw new Error('RSS feed 为空');
    return items[Math.floor(Math.random() * items.length)];
}
/** Lightweight RSS item extraction: <item> blocks with title + description. */
function parseRssItems(xml) {
    const items = [];
    const itemPattern = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemPattern.exec(xml)) !== null) {
        const block = match[1] ?? '';
        const title = extractTag(block, 'title');
        const content = extractTag(block, 'description') ?? extractTag(block, 'content:encoded');
        if (title !== '' || content !== '')
            items.push({ title, content });
    }
    return items;
}
function extractTag(block, tag) {
    const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
    const match = pattern.exec(block);
    if (match === null)
        return '';
    return decodeEntities(match[1] ?? '').trim();
}
function decodeEntities(text) {
    return text
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
