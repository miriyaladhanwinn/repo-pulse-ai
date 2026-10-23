import http from 'node:http';
import crypto from 'node:crypto';
import { analyzePRWithBedrock, sanitizeDiffWithGuardrails } from '../amazon/bedrockGuardrailEngine.js';
import { correlateBeeTranscriptsWithPR } from '../amazon/beeWearableBridge.js';
import { verifyAndSynthesizePatch } from '../amazon/astSandboxVerifier.js';

export const MCP_PROTOCOL_VERSION = '2025-11-25';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, any>;
}

export const REPOPULSE_MCP_TOOLS = [
  {
    name: 'repopulse_alexa_voice_triage',
    description:
      'Alexa+ Multimodal PR Triage: Computes AST blast radius, runs Amazon Bedrock Guardrails, and returns SSML voice output + Fire TV / Echo Show visual telemetry card.',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository name (owner/repo)' },
        prNumber: { type: 'number', description: 'Pull request number' },
        diff: { type: 'string', description: 'Unified git diff content' },
        astSymbolsChanged: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of modified AST function/class symbols',
        },
      },
      required: ['repo', 'prNumber', 'diff', 'astSymbolsChanged'],
    },
  },
  {
    name: 'repopulse_bee_wearable_sync',
    description:
      'Bee Wearable AI Memory Bridge: Correlates live wearable voice transcripts with modified AST symbols in open pull requests.',
    inputSchema: {
      type: 'object',
      properties: {
        transcripts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              utteranceId: { type: 'string' },
              timestamp: { type: 'string' },
              speaker: { type: 'string' },
              transcript: { type: 'string' },
            },
            required: ['utteranceId', 'timestamp', 'speaker', 'transcript'],
          },
        },
        prFiles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              filePath: { type: 'string' },
              changedSymbols: { type: 'array', items: { type: 'string' } },
              rawPatch: { type: 'string' },
            },
            required: ['filePath', 'changedSymbols', 'rawPatch'],
          },
        },
      },
      required: ['transcripts', 'prFiles'],
    },
  },
  {
    name: 'repopulse_verify_and_patch',
    description:
      'Deterministic AST Auto-Fix & Sandbox Verifier: Validates AST syntax balance and runs isolated sandbox tests before emitting a GitHub Suggested Change block.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        originalSnippet: { type: 'string' },
        proposedSnippet: { type: 'string' },
        dryRun: { type: 'boolean' },
      },
      required: ['filePath', 'originalSnippet', 'proposedSnippet'],
    },
  },
  {
    name: 'repopulse_sanitize_diff',
    description:
      'Amazon Bedrock Pre-Flight Guardrail: Scans and redacts AWS credentials, GitHub tokens, high-entropy secrets, and PII from git diffs.',
    inputSchema: {
      type: 'object',
      properties: {
        rawDiff: { type: 'string' },
      },
      required: ['rawDiff'],
    },
  },
];

export async function handleMcpJsonRpc(request: JsonRpcRequest): Promise<Record<string, any>> {
  const { id = null, method, params = {} } = request;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          serverInfo: {
            name: 'repopulse-ai-mcp-server',
            version: '2.4.0-amazon-edition',
          },
          capabilities: {
            tools: { listChanged: false },
            streaming: true,
          },
        },
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: REPOPULSE_MCP_TOOLS,
        },
      };

    case 'tools/call': {
      const toolName = params.name as string;
      const args = (params.arguments ?? {}) as Record<string, any>;

      if (toolName === 'repopulse_alexa_voice_triage') {
        const result = await analyzePRWithBedrock({
          repo: String(args.repo),
          prNumber: Number(args.prNumber),
          diff: String(args.diff),
          astSymbolsChanged: Array.isArray(args.astSymbolsChanged) ? args.astSymbolsChanged : [],
        });
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: false,
          },
        };
      }

      if (toolName === 'repopulse_bee_wearable_sync') {
        const matches = correlateBeeTranscriptsWithPR(args.transcripts ?? [], args.prFiles ?? []);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify({ matches, count: matches.length }, null, 2) }],
            isError: false,
          },
        };
      }

      if (toolName === 'repopulse_verify_and_patch') {
        const patchResult = await verifyAndSynthesizePatch({
          filePath: String(args.filePath),
          originalSnippet: String(args.originalSnippet),
          proposedSnippet: String(args.proposedSnippet),
          dryRun: Boolean(args.dryRun ?? true),
        });
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(patchResult, null, 2) }],
            isError: !patchResult.verified,
          },
        };
      }

      if (toolName === 'repopulse_sanitize_diff') {
        const report = sanitizeDiffWithGuardrails(String(args.rawDiff ?? ''));
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
            isError: false,
          },
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Unknown RepoPulse MCP tool: ${toolName}` },
      };
    }

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
  }
}

/**
 * Starts the MCP Streamable HTTP Server (Spec 2025-11-25+) supporting both JSON and SSE streaming on `/mcp`.
 */
export function createMcpStreamableHttpServer(): http.Server {
  return http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          protocol: 'mcp-streamable-http',
          specVersion: MCP_PROTOCOL_VERSION,
          tracks: ['Alexa+', 'Bee Wearable AI', 'AWS Builder', 'Open Source'],
        })
      );
      return;
    }

    if (req.url?.startsWith('/mcp') && req.method === 'POST') {
      const sessionId = (req.headers['mcp-session-id'] as string) || crypto.randomUUID();
      res.setHeader('Mcp-Session-Id', sessionId);

      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      try {
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as JsonRpcRequest;
        const responseObj = await handleMcpJsonRpc(payload);
        const acceptHeader = req.headers.accept ?? '';

        if (acceptHeader.includes('text/event-stream')) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });
          res.write(`event: message\ndata: ${JSON.stringify(responseObj)}\n\n`);
          res.end();
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(responseObj));
        }
      } catch (err: unknown) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'Parse error' },
          })
        );
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found. Use POST /mcp or GET /health' }));
  });
}
