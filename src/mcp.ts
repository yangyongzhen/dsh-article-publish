/**
 * Minimal MCP (Model Context Protocol) stdio client: spawns a stdio MCP
 * server binary once per call, performs the initialize handshake, invokes one
 * tool, and returns the text result. Kept deliberately small — enough to
 * drive `mcp-server-article` and other simple stdio servers.
 *
 * @module dsh-article-publish/mcp
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';

interface JsonRpcResponse {
	jsonrpc?: string;
	id?: number;
	result?: unknown;
	error?: { code?: number; message?: string };
}

interface TextContent {
	type: 'text';
	text: string;
}

/** Extract the concatenated text from an MCP tool result. */
export function resultText(result: unknown): string {
	if (typeof result !== 'object' || result === null) return String(result);
	if (!('content' in result) || !Array.isArray(result.content)) return JSON.stringify(result);
	return result.content
		.filter(isTextContent)
		.map((item) => item.text)
		.join('\n');
}

function isTextContent(item: unknown): item is TextContent {
	return typeof item === 'object' && item !== null && 'type' in item && item.type === 'text' && 'text' in item && typeof item.text === 'string';
}

/**
 * Invoke one MCP tool over a fresh stdio server process.
 * @param binaryPath - path to the MCP server executable.
 * @param serverArgs - extra argv for the server (e.g. `node script.mjs`).
 * @param toolName - the tool to call.
 * @param args - tool arguments object.
 * @param timeoutMs - overall timeout; the process is killed on timeout.
 * @returns the tool's text result (server error messages included as text).
 */
export async function callMcpTool(binaryPath: string, serverArgs: string[], toolName: string, args: Record<string, unknown>, timeoutMs = 60_000): Promise<string> {
	const child: ChildProcessWithoutNullStreams = spawn(binaryPath, serverArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
	const stdout = createInterface({ input: child.stdout });
	const stderr: string[] = [];
	child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk.toString()));

	let nextId = 0;
	const pending = new Map<number, (response: JsonRpcResponse) => void>();

	stdout.on('line', (line) => {
		if (line.trim() === '') return;
		let parsed: JsonRpcResponse;
		try {
			parsed = JSON.parse(line) as JsonRpcResponse;
		} catch {
			return;
		}
		if (parsed.id !== undefined) {
			const resolve = pending.get(parsed.id);
			if (resolve !== undefined) {
				pending.delete(parsed.id);
				resolve(parsed);
			}
		}
	});

	const request = (method: string, params: unknown): Promise<JsonRpcResponse> => {
		const { promise, resolve, reject } = Promise.withResolvers<JsonRpcResponse>();
		const id = ++nextId;
		pending.set(id, resolve);
		child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
		setTimeout(() => {
			if (pending.delete(id)) reject(new Error(`MCP request timed out: ${method}`));
		}, timeoutMs);
		return promise;
	};

	try {
		const init = await request('initialize', {
			protocolVersion: '2024-11-05',
			capabilities: {},
			clientInfo: { name: 'dsh-article-publish', version: '0.1.0' }
		});
		if (init.error !== undefined) return `MCP initialize failed: ${init.error.message ?? String(init.error)}`;
		child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n');

		const call = await request('tools/call', { name: toolName, arguments: args });
		if (call.error !== undefined) return `MCP tool error: ${call.error.message ?? String(call.error)}`;
		return resultText(call.result);
	} catch (error) {
		const detail = stderr.join('').trim();
		return `MCP call failed: ${error instanceof Error ? error.message : String(error)}${detail !== '' ? `\nstderr: ${detail.slice(0, 500)}` : ''}`;
	} finally {
		child.kill();
	}
}
