/**
 * Studio Server End-to-End Test Suite
 * Verifies that the Apple-grade Web Studio and REST endpoints respond correctly.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { StudioServer } from '../server/studio-server.js';

describe('StudioServer E2E Verification', () => {
  const studio = new StudioServer(3948); // Unique test port
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
    assert.ok(html.includes('RepoPulse AI • Maintainer Studio'));
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

  test('GET /api/health reports system status', async () => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json() as any;
    assert.equal(data.status, 'operational');
    assert.ok(data.toolsCount >= 3);
  });
});
