/**
 * Publish (or update) an article on CSDN. Returns the article URL.
 * @throws when the cookie is missing or the API rejects the request.
 */
export declare function publishToCsdn(cookie: string, title: string, content: string, description?: string, articleId?: number): Promise<string>;
