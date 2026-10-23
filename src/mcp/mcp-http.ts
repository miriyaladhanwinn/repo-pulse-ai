/**
 * RepoPulse AI - MCP Streamable HTTP Transport
 * Exposes the MCPServer JSON-RPC pipeline over HTTP (MCP spec 2025-11-25, Streamable HTTP).
 *   POST /mcp    -> JSON-RPC request (single or batch) -> JSON-RPC response
 *   GET  /health -> { ok: true }
 * Stateless: no session tracking, every request is dispatched independently
 * through MCPServer.handleMessage — the same pipeline as the stdio server.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { MCPServer, JSONRPCRequest, JSONRPCResponse } from './mcp-server.js';

const MAX_BODY_BYTES = 25 * 1024 * 1024; // diffs can be large

const server = new MCPServer();

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    let data = '';
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      data += chunk.toString('utf8');
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function handleHttpRpc(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let raw: string;
  try {
    raw = await readBody(req);
  } catch {
    json(res, 413, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: body too large' } } as JSONRPCResponse);
    return;
  }

  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    json(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } } as JSONRPCResponse);
    return;
  }

  try {
    if (Array.isArray(msg)) {
      const responses = await Promise.all(
        msg.map((m) => server.handleMessage(m as JSONRPCRequest))
      );
      json(res, 200, responses);
    } else {
      const resp = await server.handleMessage(msg as JSONRPCRequest);
      json(res, 200, resp);
    }
  } catch (e: any) {
    json(res, 500, {
      jsonrpc: '2.0',
      id: (msg as any)?.id ?? null,
      error: { code: -32603, message: 'Internal error', data: e?.message },
    } as JSONRPCResponse);
  }
}

export function startMcpHttpServer(port = 8787): void {
  const httpServer = createServer((req, res) => {
    // CORS for browser-based MCP clients (e.g. MCP Inspector)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/health') {
      json(res, 200, { ok: true, service: 'repo-pulse-ai', transport: 'mcp-streamable-http' });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/mcp') {
      void handleHttpRpc(req, res);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/mcp') {
      // Stateless server: no SSE stream; clients POST each message.
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Use POST /mcp for JSON-RPC messages' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  httpServer.listen(port, () => {
    console.log(`RepoPulse MCP (Streamable HTTP) listening on http://localhost:${port}/mcp`);
    console.log(`Health check: http://localhost:${port}/health`);
  });
}

// Allow direct run: node dist/mcp/mcp-http.js [--port <n>]
function resolveDirectPort(): number {
  const i = process.argv.indexOf('--port');
  if (i !== -1 && process.argv[i + 1]) return parseInt(process.argv[i + 1], 10);
  if (process.env.PORT) return parseInt(process.env.PORT, 10);
  return 8787;
}

if (typeof process !== 'undefined' && (process.argv[1] || '').endsWith('mcp-http.js')) {
  startMcpHttpServer(resolveDirectPort());
}
