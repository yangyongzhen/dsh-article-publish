/** Extract the concatenated text from an MCP tool result. */
export declare function resultText(result: unknown): string;
/**
 * Invoke one MCP tool over a fresh stdio server process.
 * @param binaryPath - path to the MCP server executable.
 * @param serverArgs - extra argv for the server (e.g. `node script.mjs`).
 * @param toolName - the tool to call.
 * @param args - tool arguments object.
 * @param timeoutMs - overall timeout; the process is killed on timeout.
 * @returns the tool's text result (server error messages included as text).
 */
export declare function callMcpTool(binaryPath: string, serverArgs: string[], toolName: string, args: Record<string, unknown>, timeoutMs?: number): Promise<string>;
