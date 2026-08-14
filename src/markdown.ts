/**
 * Markdown helpers for article publishing: HTML conversion, plain-text
 * extraction, image-URL collection and the gitcode→wsrv.nl proxy rewrite.
 *
 * @module dsh-article-publish/markdown
 */
import { marked } from 'marked';

/** Render markdown to HTML (GFM). */
export function markdownToHtml(markdown: string): string {
	if (markdown === '') return '';
	return marked.parse(markdown, { gfm: true, async: false }) as string;
}

/** Strip markdown down to plain text (code blocks excluded, inline code kept). */
export function markdownToText(markdown: string): string {
	if (markdown === '') return '';
	const html = markdownToHtml(markdown);
	return html
		.replace(/<pre[\s\S]*?<\/pre>/g, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();
}

/** Collect unique http(s) image URLs referenced in the markdown, in order. */
export function collectImageUrls(markdown: string): string[] {
	const urls: string[] = [];
	const pattern = /!\[[^\]]*\]\(([^)\s]+)\)/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(markdown)) !== null) {
		const url = match[1] ?? '';
		if (url.startsWith('http') && !urls.includes(url)) urls.push(url);
	}
	return urls;
}

/**
 * Wrap `raw.gitcode.com` image URLs in the wsrv.nl image proxy. CSDN blocks
 * hotlinked gitcode images; routing them through wsrv.nl fixes display.
 * Idempotent: already-proxied URLs are left untouched.
 */
export function proxyGitcodeImages(markdown: string): string {
	const needle = '](https://raw.gitcode.com';
	const proxy = '](https://wsrv.nl/?url=https://raw.gitcode.com';
	if (!markdown.includes(needle)) return markdown;
	return markdown.replaceAll(needle, proxy);
}

/** Truncate to `max` Unicode characters. */
export function truncateToChars(text: string, max: number): string {
	return Array.from(text).length <= max ? text : Array.from(text).slice(0, max).join('');
}
