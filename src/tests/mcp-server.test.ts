/**
 * Tests for MCPServer
 * Amazon Developer Hackathon Edition
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MCPServer } from '../mcp/mcp-server.js';

describe('MCPServer Module', () => {
  const server = new MCPServer();

  test('should return supported tools in tools/list method including AWS and Bedrock tools', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    });

    assert.equal(res.jsonrpc, '2.0');
    assert.equal(res.id, 1);
    assert.ok(res.result);
    assert.ok(Array.isArray(res.result.tools));
    assert.ok(res.result.tools.some((t: any) => t.name === 'review_pull_request_diff'));
    assert.ok(res.result.tools.some((t: any) => t.name === 'aws_audit_iac'));
    assert.ok(res.result.tools.some((t: any) => t.name === 'estimate_aws_cost_delta'));
    assert.ok(res.result.tools.some((t: any) => t.name === 'apply_bedrock_guardrail'));
  });

  test('should handle tools/call review_pull_request_diff', async () => {
    const diff = `diff --git a/test.ts b/test.ts
--- a/test.ts
+++ b/test.ts
@@ -1,1 +1,2 @@
+eval("bad");
`;
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'review_pull_request_diff',
        arguments: { diffText: diff }
      }
    });

    assert.equal(res.id, 2);
    assert.ok(res.result?.content?.[0]?.text);
    const parsedReview = JSON.parse(res.result.content[0].text);
    assert.equal(parsedReview.status, 'CHANGES_REQUESTED');
    assert.ok(parsedReview.criticalIssues >= 1);
  });

  test('should handle tools/call aws_audit_iac for CDK security scanning', async () => {
    const iacDiff = `diff --git a/infra/stack.ts b/infra/stack.ts
--- a/infra/stack.ts
+++ b/infra/stack.ts
@@ -1,2 +1,3 @@
+const p = { "Action": "*", "Resource": "*" };
`;
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 'iac-1',
      method: 'tools/call',
      params: {
        name: 'aws_audit_iac',
        arguments: { diffText: iacDiff }
      }
    });

    assert.equal(res.id, 'iac-1');
    const report = JSON.parse(res.result.content[0].text);
    assert.equal(report.criticalCount, 1);
    assert.ok(report.securityScore <= 75);
  });

  test('should handle tools/call estimate_aws_cost_delta for FinOps calculation', async () => {
    const costDiff = `diff --git a/infra/vpc.ts b/infra/vpc.ts
--- a/infra/vpc.ts
+++ b/infra/vpc.ts
@@ -1,2 +1,3 @@
+const nat = new ec2.CfnNatGateway(this, 'Nat', { subnetId: 's-123' });
`;
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 'cost-1',
      method: 'tools/call',
      params: {
        name: 'estimate_aws_cost_delta',
        arguments: { diffText: costDiff }
      }
    });

    assert.equal(res.id, 'cost-1');
    const report = JSON.parse(res.result.content[0].text);
    assert.equal(report.totalMonthlySpendDelta, 32.85);
  });

  test('should handle standard MCP initialize handshake', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 'init-1',
      method: 'initialize',
      params: { protocolVersion: '2025-11-25' }
    });

    assert.equal(res.id, 'init-1');
    assert.equal(res.result.serverInfo.name, 'repo-pulse-ai');
    assert.equal(res.result.protocolVersion, '2025-11-25');
  });

  test('should handle invalid tool gracefully', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'non_existent_tool' }
    });

    assert.ok(res.error);
    assert.equal(res.error.code, -32601);
  });

  test('should handle notifications/initialized without error', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 'init-ack',
      method: 'notifications/initialized'
    });

    assert.equal(res.id, 'init-ack');
    assert.deepEqual(res.result, {});
  });
});
