/**
 * Studio Server End-to-End Test Suite
 * Amazon Developer Hackathon Edition
 * Verifies that the Apple-grade Web Studio and REST endpoints respond correctly.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { StudioServer } from '../server/studio-server.js';

describe('StudioServer E2E Verification', () => {
  const studio = new StudioServer(0); // Dynamic ephemeral port for isolated tests
  let port: number;

  before(async () => {
    port = await studio.start();
  });

  after(async () => {
    await studio.stop();
  });

  test('GET / serves the Apple Developer grade Web Studio HTML', async () => {
    const res = await fetch(`http://localhost:${port}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('RepoPulse Studio'));
    assert.ok(html.includes('Titan Edition v2.0'));
    assert.ok(html.includes('bg-canvas'));
    assert.ok(html.includes('PR Intelligence Lab'));
  });

  test('POST /api/review processes diffs and returns AST analytics', async () => {
    const res = await fetch(`http://localhost:${port}/api/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        diffText: `diff --git a/test.ts b/test.ts
--- a/test.ts
+++ b/test.ts
@@ -1,1 +1,2 @@
+eval("malicious");
`
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.ok(data.parsed);
    assert.equal(data.parsed.filesChanged, 1);
    assert.equal(data.review.status, 'CHANGES_REQUESTED');
  });

  test('POST /api/aws/audit scans IaC diff for security compliance', async () => {
    const res = await fetch(`http://localhost:${port}/api/aws/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        diffText: `diff --git a/infra/stack.ts b/infra/stack.ts
--- a/infra/stack.ts
+++ b/infra/stack.ts
@@ -1,2 +1,3 @@
+const s = { "Action": "*", "Resource": "*" };
`
      })
    });

    assert.equal(res.status, 200);
    const report = await res.json() as any;
    assert.equal(report.criticalCount, 1);
    assert.ok(report.securityScore <= 75);
  });

  test('POST /api/aws/cost-delta calculates cloud spend delta', async () => {
    const res = await fetch(`http://localhost:${port}/api/aws/cost-delta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        diffText: `diff --git a/infra/vpc.ts b/infra/vpc.ts
--- a/infra/vpc.ts
+++ b/infra/vpc.ts
@@ -1,2 +1,3 @@
+const nat = new ec2.CfnNatGateway(this, 'Nat', { subnetId: 's-1' });
`
      })
    });

    assert.equal(res.status, 200);
    const report = await res.json() as any;
    assert.equal(report.totalMonthlySpendDelta, 32.85);
  });

  test('POST /api/aws/guardrail detects leaked AWS access keys', async () => {
    const res = await fetch(`http://localhost:${port}/api/aws/guardrail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"'
      })
    });

    assert.equal(res.status, 200);
    const result = await res.json() as any;
    assert.equal(result.isBlocked, true);
    assert.equal(result.action, 'BLOCKED');
  });

  test('GET /api/models returns supported frontier and local models including Amazon Bedrock', async () => {
    const res = await fetch(`http://localhost:${port}/api/models`);
    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.ok(Array.isArray(data.models));
    assert.ok(data.models.length >= 500);
    assert.ok(data.models.some((m: any) => m.id === 'amazon.nova-pro-v1:0'));
  });

  test('GET /api/assistants returns assistant matrix personas including AWS personas', async () => {
    const res = await fetch(`http://localhost:${port}/api/assistants`);
    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.ok(Array.isArray(data.assistants));
    assert.ok(data.assistants.length >= 50);
    assert.ok(data.assistants.some((a: any) => a.id === 'aws-well-architected'));
  });

  test('POST /api/chat completes universal chat request', async () => {
    const res = await fetch(`http://localhost:${port}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Audit this pull request for breaking changes.' }],
        modelId: 'amazon.nova-pro-v1:0',
        assistantId: 'aws-well-architected'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.equal(data.modelId, 'amazon.nova-pro-v1:0');
    assert.ok(data.content.length > 0);
  });

  test('GET, SEARCH, and DELETE /api/knowledge manages indexed documents', async () => {
    const postRes = await fetch(`http://localhost:${port}/api/knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Security Invariants',
        path: 'security.md',
        content: 'No arbitrary code execution allowed.',
        category: 'doc',
        tags: ['security', 'compliance']
      })
    });
    assert.equal(postRes.status, 200);
    const postData = await postRes.json() as any;
    assert.ok(postData.doc.id);

    const searchRes = await fetch(`http://localhost:${port}/api/knowledge/search?q=Invariants`);
    assert.equal(searchRes.status, 200);
    const searchData = await searchRes.json() as any;
    assert.ok(Array.isArray(searchData.results));
    assert.ok(searchData.results.length >= 1);

    const delRes = await fetch(`http://localhost:${port}/api/knowledge/${postData.doc.id}`, {
      method: 'DELETE'
    });
    assert.equal(delRes.status, 200);
    const delData = await delRes.json() as any;
    assert.equal(delData.deleted, true);
  });

  test('GET /api/health reports system status and Titan metrics', async () => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.equal(data.status, 'operational');
    assert.ok(data.toolsCount >= 3);
    assert.ok(data.modelsAvailable >= 500);
    assert.ok(data.assistantsAvailable >= 50);
    assert.ok(typeof data.knowledgeDocsCount === 'number');
    assert.equal(data.edition, 'Amazon Developer Hackathon Edition');
  });
});
