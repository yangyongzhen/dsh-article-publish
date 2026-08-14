/** Render markdown to HTML (GFM). */
export declare function markdownToHtml(markdown: string): string;
/** Strip markdown down to plain text (code blocks excluded, inline code kept). */
export declare function markdownToText(markdown: string): string;
/** Collect unique http(s) image URLs referenced in the markdown, in order. */
export declare function collectImageUrls(markdown: string): string[];
/**
 * Wrap `raw.gitcode.com` image URLs in the wsrv.nl image proxy. CSDN blocks
 * hotlinked gitcode images; routing them through wsrv.nl fixes display.
 * Idempotent: already-proxied URLs are left untouched.
 */
export declare function proxyGitcodeImages(markdown: string): string;
/** Truncate to `max` Unicode characters. */
export declare function truncateToChars(text: string, max: number): string;
