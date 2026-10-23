/**
 * Native Model Context Protocol (MCP) Server
 * Exposes repository intelligence, diff reviews, AWS IaC audits, FinOps cost delta,
 * and Bedrock Guardrails to Amazon Q Developer, Claude Code, Cursor, and ChatGPT.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { MCPToolDefinition, ParsedDiff, ReviewSummary } from '../types/index.js';
import { DiffAnalyzer } from '../core/diff-analyzer.js';
import { OpenAICodexProvider } from '../providers/openai-codex.js';
import { AwsIacAnalyzer } from '../core/aws-iac-analyzer.js';
import { AwsFinOpsEstimator } from '../core/finops-estimator.js';
import { BedrockGuardrailsEngine } from '../core/bedrock-guardrails.js';

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class MCPServer {
  private provider: OpenAICodexProvider;
  private guardrails: BedrockGuardrailsEngine;

  constructor() {
    this.provider = new OpenAICodexProvider();
    this.guardrails = new BedrockGuardrailsEngine();
  }

  /**
   * List available tools exposed by RepoPulse MCP server.
   */
  public getSupportedTools(): MCPToolDefinition[] {
    return [
      {
        name: 'review_pull_request_diff',
        description: 'Analyzes a raw unified git diff and returns structured maintainer remarks, security warnings, and risk score.',
        inputSchema: {
          type: 'object',
          properties: {
            diffText: { type: 'string', description: 'Raw git diff output' },
            repoContext: { type: 'string', description: 'Brief description of repository purpose' }
          },
          required: ['diffText']
        }
      },
      {
        name: 'aws_audit_iac',
        description: 'Scans AWS CDK (TypeScript/Python), CloudFormation, SAM, or Terraform diffs for security violations, wildcard IAM policies, and open security groups.',
        inputSchema: {
          type: 'object',
          properties: {
            diffText: { type: 'string', description: 'Raw git diff output of infrastructure files' },
            filePath: { type: 'string', description: 'Optional path of file being audited' },
            fileContent: { type: 'string', description: 'Optional raw content of IaC template or CDK stack' }
          }
        }
      },
      {
        name: 'estimate_aws_cost_delta',
        description: 'Analyzes infrastructure git diffs and calculates projected monthly and annual AWS spend impact (FinOps) with Bedrock optimization advice.',
        inputSchema: {
          type: 'object',
          properties: {
            diffText: { type: 'string', description: 'Raw git diff output containing infrastructure changes' }
          },
          required: ['diffText']
        }
      },
      {
        name: 'apply_bedrock_guardrail',
        description: 'Evaluates code diffs or issue text through Amazon Bedrock Guardrails, blocking leaked AWS credentials, PII, and prompt injections.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Code diff, prompt, or comment text to evaluate' }
          },
          required: ['text']
        }
      },
      {
        name: 'triage_github_issue',
        description: 'Classifies an open-source GitHub issue, evaluates severity, suggests labels, and synthesizes a reproduction script.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Issue ID or number' },
            title: { type: 'string', description: 'Issue title' },
            body: { type: 'string', description: 'Issue body description' }
          },
          required: ['title', 'body']
        }
      },
      {
        name: 'slice_diff_hunks',
        description: 'Decomposes unified diff into categorized AST hunks and identifies security-sensitive surfaces.',
        inputSchema: {
          type: 'object',
          properties: {
            diffText: { type: 'string', description: 'Raw git diff output' }
          },
          required: ['diffText']
        }
      }
    ];
  }

  /**
   * Handle an incoming MCP JSON-RPC protocol message.
   */
  public async handleMessage(req: JSONRPCRequest): Promise<JSONRPCResponse> {
    const { id, method, params } = req;

    try {
      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2025-11-25',
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: 'repo-pulse-ai',
                version: '2.3.1'
              }
            }
          };

        case 'notifications/initialized':
          return {
            jsonrpc: '2.0',
            id,
            result: {}
          };

        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: this.getSupportedTools()
            }
          };

        case 'tools/call': {
          const toolName = params?.name;
          const args = params?.arguments || {};

          if (toolName === 'review_pull_request_diff') {
            const parsed = DiffAnalyzer.parseUnifiedDiff(args.diffText || '');
            const review = await this.provider.reviewDiff(parsed, args.repoContext);
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(review, null, 2) }]
              }
            };
          }

          if (toolName === 'aws_audit_iac') {
            let report;
            if (args.fileContent) {
              report = AwsIacAnalyzer.auditFileContent(args.filePath || 'stack.ts', args.fileContent);
            } else {
              const parsed = DiffAnalyzer.parseUnifiedDiff(args.diffText || '');
              report = AwsIacAnalyzer.auditDiff(parsed);
            }
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(report, null, 2) }]
              }
            };
          }

          if (toolName === 'estimate_aws_cost_delta') {
            const parsed = DiffAnalyzer.parseUnifiedDiff(args.diffText || '');
            const report = AwsFinOpsEstimator.estimateDiff(parsed);
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(report, null, 2) }]
              }
            };
          }

          if (toolName === 'apply_bedrock_guardrail') {
            const guardResult = await this.guardrails.evaluate(args.text || '');
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(guardResult, null, 2) }]
              }
            };
          }

          if (toolName === 'triage_github_issue') {
            const triage = await this.provider.classifyIssue({
              id: args.id || 'issue-1',
              title: args.title || '',
              body: args.body || '',
              author: 'anonymous',
              labels: [],
              createdAt: new Date().toISOString()
            });
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(triage, null, 2) }]
              }
            };
          }

          if (toolName === 'slice_diff_hunks') {
            const parsed = DiffAnalyzer.parseUnifiedDiff(args.diffText || '');
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }]
              }
            };
          }

          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method or tool '${toolName}' not found` }
          };
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Unsupported MCP method: ${method}` }
          };
      }
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message: err.message || 'Internal MCP Server error' }
      };
    }
  }

  /**
   * Start listening over stdin/stdout for standard MCP host clients.
   */
  public startStdioServer(): void {
    process.stdin.setEncoding('utf-8');
    let buffer = '';

    process.stdin.on('data', async (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const req = JSON.parse(line.trim()) as JSONRPCRequest;
          const resp = await this.handleMessage(req);
          process.stdout.write(JSON.stringify(resp) + '\n');
        } catch (e: any) {
          process.stdout.write(JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'Parse error', data: e.message }
          }) + '\n');
        }
      }
    });
  }
}
