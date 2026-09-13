/**
 * RepoPulse Studio Server - Embedded HTTP Server
 * Serves the Apple Developer-grade Web Studio and provides interactive REST APIs.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DiffAnalyzer } from '../core/diff-analyzer.js';
import { OpenAICodexProvider } from '../providers/openai-codex.js';
import { IssueClassifier } from '../triage/issue-classifier.js';
import { Reproducer } from '../triage/reproducer.js';
import { MCPServer } from '../mcp/mcp-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StudioServer {
  private port: number;
  private provider: OpenAICodexProvider;
  private mcpServer: MCPServer;
  private server: http.Server | null = null;

  constructor(port: number = 3000) {
    this.port = port;
    this.provider = new OpenAICodexProvider();
    this.mcpServer = new MCPServer();
  }

  public start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const url = new URL(req.url || '/', `http://localhost:${this.port}`);

        try {
          if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
            let htmlPath = path.join(__dirname, 'assets', 'studio.html');
            if (!fs.existsSync(htmlPath)) {
              htmlPath = path.join(process.cwd(), 'src', 'server', 'assets', 'studio.html');
            }
            if (!fs.existsSync(htmlPath)) {
              htmlPath = path.join(__dirname, '..', '..', 'src', 'server', 'assets', 'studio.html');
            }
            if (fs.existsSync(htmlPath)) {
              const html = fs.readFileSync(htmlPath, 'utf-8');
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(html);
            } else {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Studio UI asset not found');
            }
            return;
          }

          if (req.method === 'POST' && url.pathname === '/api/review') {
            const body = await this.readBody(req);
            const { diffText, repoContext } = JSON.parse(body || '{}');
            const parsed = DiffAnalyzer.parseUnifiedDiff(diffText || '');
            const review = await this.provider.reviewDiff(parsed, repoContext || 'Local Workspace');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ parsed, review }));
            return;
          }

          if (req.method === 'POST' && url.pathname === '/api/triage') {
            const body = await this.readBody(req);
            const { id, title, body: issueBody } = JSON.parse(body || '{}');
            const issue = {
              id: id || '1',
              title: title || 'Bug report',
              body: issueBody || '',
              author: 'maintainer',
              labels: [],
              createdAt: new Date().toISOString()
            };
            const triage = IssueClassifier.triage(issue);
            const reproScript = Reproducer.generateTestHarness(issue);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ triage, reproScript }));
            return;
          }

          if (req.method === 'POST' && url.pathname === '/api/mcp') {
            const body = await this.readBody(req);
            const rpcReq = JSON.parse(body || '{}');
            const rpcRes = await this.mcpServer.handleMessage(rpcReq);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(rpcRes));
            return;
          }

          if (req.method === 'GET' && url.pathname === '/api/health') {
            const isConfigured = await this.provider.isConfigured();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: 'operational',
              model: this.provider.modelId,
              hasApiKey: isConfigured,
              nodeVersion: process.version,
              toolsCount: this.mcpServer.getSupportedTools().length,
              timestamp: new Date().toISOString()
            }));
            return;
          }

          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Endpoint not found' }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
        }
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          // Fallback to port + 1
          this.port++;
          this.server?.listen(this.port);
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, () => {
        resolve(this.port);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
  }
}
