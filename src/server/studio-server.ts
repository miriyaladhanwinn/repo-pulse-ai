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
import { MultiModelRouter } from '../providers/multi-model-router.js';
import { AssistantMatrix } from '../core/assistant-matrix.js';
import { KnowledgeVault } from '../core/knowledge-vault.js';
import { AuthService } from './auth-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StudioServer {
  private port: number;
  private provider: OpenAICodexProvider;
  private mcpServer: MCPServer;
  private knowledgeVault: KnowledgeVault;
  private authService: AuthService;
  private server: http.Server | null = null;

  constructor(port: number = 3000) {
    this.port = port;
    this.provider = new OpenAICodexProvider();
    this.mcpServer = new MCPServer();
    this.knowledgeVault = new KnowledgeVault();
    this.authService = new AuthService();

    // Pre-populate with essential maintainer guides
    this.knowledgeVault.indexDocument({
      title: 'RepoPulse Governance & Architectural Invariants',
      path: 'docs/architecture.md',
      category: 'doc',
      content: 'RepoPulse enforces strict backward compatibility, zero dynamic evaluation sinks, bounded token scheduling, and native MCP stdio interoperability.'
    });
  }

  public start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

          // Serve Identity & Authentication Portal
          if (req.method === 'GET' && (url.pathname === '/login' || url.pathname === '/signup' || url.pathname === '/verify' || url.pathname === '/auth')) {
            let authHtmlPath = path.join(__dirname, 'assets', 'auth.html');
            if (!fs.existsSync(authHtmlPath)) {
              authHtmlPath = path.join(process.cwd(), 'src', 'server', 'assets', 'auth.html');
            }
            if (!fs.existsSync(authHtmlPath)) {
              authHtmlPath = path.join(__dirname, '..', '..', 'src', 'server', 'assets', 'auth.html');
            }
            if (fs.existsSync(authHtmlPath)) {
              const html = fs.readFileSync(authHtmlPath, 'utf-8');
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(html);
            } else {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Auth portal asset not found');
            }
            return;
          }

          // Auth: Register (Step 1: Credentials -> 6-digit OTP)
          if (req.method === 'POST' && url.pathname === '/api/auth/register') {
            try {
              const body = await this.readBody(req);
              const { username, email, password } = JSON.parse(body || '{}');
              const result = this.authService.register(username, email, password);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message || 'Registration failed' }));
            }
            return;
          }

          // Auth: Verify Code (Step 2: 6-digit OTP -> Activated User Session)
          if (req.method === 'POST' && url.pathname === '/api/auth/verify') {
            try {
              const body = await this.readBody(req);
              const { email, code } = JSON.parse(body || '{}');
              const result = this.authService.verifyCode(email, code);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message || 'Verification failed' }));
            }
            return;
          }

          // Auth: Login (Email/Username + Password)
          if (req.method === 'POST' && url.pathname === '/api/auth/login') {
            try {
              const body = await this.readBody(req);
              const { identifier, password } = JSON.parse(body || '{}');
              const result = this.authService.login(identifier, password);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message || 'Invalid credentials' }));
            }
            return;
          }

          // Auth: Resend OTP Code
          if (req.method === 'POST' && url.pathname === '/api/auth/resend-code') {
            try {
              const body = await this.readBody(req);
              const { email } = JSON.parse(body || '{}');
              const result = this.authService.resendCode(email);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message || 'Failed to resend code' }));
            }
            return;
          }

          // Auth: Get Active Session
          if (req.method === 'GET' && url.pathname === '/api/auth/session') {
            const authHeader = req.headers['authorization'] || '';
            const token = authHeader.replace(/^Bearer\s+/i, '') || url.searchParams.get('token') || '';
            const session = this.authService.validateToken(token);
            if (!session) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unauthorized or expired session' }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ session }));
            return;
          }

          // 1. Models Catalog Endpoint
          if (req.method === 'GET' && url.pathname === '/api/models') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ models: MultiModelRouter.getModels() }));
            return;
          }

          // 2. Assistants Catalog Endpoint
          if (req.method === 'GET' && url.pathname === '/api/assistants') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ assistants: AssistantMatrix.getAll() }));
            return;
          }

          // 3. Multi-Model Universal Chat Endpoint
          if (req.method === 'POST' && url.pathname === '/api/chat') {
            const body = await this.readBody(req);
            const { messages, modelId, assistantId, apiKeys, customEndpoint, temperature } = JSON.parse(body || '{}');

            const fullMessages = [...(messages || [])];
            if (assistantId) {
              const assistant = AssistantMatrix.getById(assistantId);
              if (assistant && !fullMessages.some(m => m.role === 'system')) {
                fullMessages.unshift({ role: 'system', content: assistant.systemPrompt });
              }
            }

            const result = await MultiModelRouter.complete(fullMessages, {
              modelId,
              apiKeys,
              customEndpoint,
              temperature
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
          }

          // 4. PR Diff Review Endpoint
          if (req.method === 'POST' && url.pathname === '/api/review') {
            const body = await this.readBody(req);
            const { diffText, repoContext } = JSON.parse(body || '{}');
            const parsed = DiffAnalyzer.parseUnifiedDiff(diffText || '');
            const review = await this.provider.reviewDiff(parsed, repoContext || 'Local Workspace');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ parsed, review }));
            return;
          }

          // 5. Issue Triage Endpoint
          if (req.method === 'POST' && url.pathname === '/api/triage') {
            const body = await this.readBody(req);
            const { id, title, body: issueBody } = JSON.parse(body || '{}');
            const issue = {
              id: id || `iss-${Date.now()}`,
              title: title || 'Untitled Issue',
              body: issueBody || '',
              labels: [],
              author: 'community-reporter',
              createdAt: new Date().toISOString()
            };
            const triage = IssueClassifier.triage(issue);
            const reproScript = Reproducer.generateTestHarness(issue);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ triage, reproScript }));
            return;
          }

          // 6. Knowledge Vault Endpoints
          if (req.method === 'GET' && url.pathname === '/api/knowledge') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ documents: this.knowledgeVault.getAll() }));
            return;
          }

          if (req.method === 'GET' && url.pathname === '/api/knowledge/search') {
            const query = url.searchParams.get('q') || '';
            const results = this.knowledgeVault.search(query);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ results }));
            return;
          }

          if (req.method === 'DELETE' && url.pathname.startsWith('/api/knowledge/')) {
            const docId = decodeURIComponent(url.pathname.replace('/api/knowledge/', ''));
            const deleted = this.knowledgeVault.delete(docId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ deleted }));
            return;
          }

          if (req.method === 'POST' && url.pathname === '/api/knowledge') {
            const body = await this.readBody(req);
            const { title, path: docPath, content, category, tags } = JSON.parse(body || '{}');
            const doc = this.knowledgeVault.indexDocument({
              title: title || 'Untitled Note',
              path: docPath || 'snippet.ts',
              content: content || '',
              category: category || 'code',
              tags: tags || []
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ doc }));
            return;
          }

          // 7. MCP JSON-RPC Endpoint
          if (req.method === 'POST' && url.pathname === '/api/mcp') {
            const body = await this.readBody(req);
            const rpcReq = JSON.parse(body || '{}');
            const rpcRes = await this.mcpServer.handleMessage(rpcReq);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(rpcRes));
            return;
          }

          // 8. System Health Endpoint
          if (req.method === 'GET' && url.pathname === '/api/health') {
            const isConfigured = await this.provider.isConfigured();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: 'operational',
              model: this.provider.modelId,
              hasApiKey: isConfigured,
              nodeVersion: process.version,
              toolsCount: this.mcpServer.getSupportedTools().length,
              modelsAvailable: MultiModelRouter.getModels().length,
              assistantsAvailable: AssistantMatrix.getAll().length,
              knowledgeDocsCount: this.knowledgeVault.getAll().length,
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
          this.port++;
          this.server?.listen(this.port, () => {
            const addr = this.server?.address();
            if (typeof addr === 'object' && addr !== null) {
              this.port = addr.port;
            }
            resolve(this.port);
          });
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, () => {
        const addr = this.server?.address();
        if (typeof addr === 'object' && addr !== null) {
          this.port = addr.port;
        }
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

  public getAuthService(): AuthService {
    return this.authService;
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
