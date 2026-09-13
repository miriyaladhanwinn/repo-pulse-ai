/**
 * Tests for MCPServer
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MCPServer } from '../mcp/mcp-server.js';

describe('MCPServer Module', () => {
  const server = new MCPServer();

  test('should return supported tools in tools/list method', async () => {
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
    assert.ok(res.result.tools.some((t: any) => t.name === 'triage_github_issue'));
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
});
