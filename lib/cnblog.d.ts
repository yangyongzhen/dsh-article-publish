/**
 * Publish an article on CNBlog. Returns the article URL.
 * @throws when cookie/token are missing or the API rejects the request.
 */
export declare function publishToCnblog(cookie: string, token: string, username: string, title: string, content: string): Promise<string>;
