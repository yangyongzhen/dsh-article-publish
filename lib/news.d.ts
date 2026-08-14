/** Fetch a random news item (title + content) from the CNBlog news feed. */
export declare function fetchRandomNews(): Promise<{
    title: string;
    content: string;
}>;
