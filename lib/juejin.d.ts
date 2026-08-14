/**
 * Publish an article on Juejin (create draft → publish). Returns the URL.
 * @throws when the cookie is missing or either step is rejected.
 */
export declare function publishToJuejin(cookie: string, title: string, content: string, description?: string): Promise<string>;
