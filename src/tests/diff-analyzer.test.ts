/**
 * Tests for DiffAnalyzer
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DiffAnalyzer } from '../core/diff-analyzer.js';

describe('DiffAnalyzer Module', () => {
  const sampleDiff = `diff --git a/src/auth.ts b/src/auth.ts
index abc1234..def5678 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,6 +10,8 @@ export class AuthService {
   public validateToken(token: string): boolean {
+    const apiKey = "sk-live-secretkey123456789";
+    eval(token);
     return token.length > 0;
   }
 }
diff --git a/docs/README.md b/docs/README.md
index 111..222 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -1,3 +1,4 @@
 # Documentation
+Updated setup guide
`;

  test('should accurately parse unified git diff headers and counts', () => {
    const parsed = DiffAnalyzer.parseUnifiedDiff(sampleDiff);

    assert.equal(parsed.filesChanged, 2);
    assert.equal(parsed.affectedFilePaths.length, 2);
    assert.ok(parsed.affectedFilePaths.includes('src/auth.ts'));
    assert.ok(parsed.affectedFilePaths.includes('docs/README.md'));
    assert.equal(parsed.insertions, 3);
    assert.equal(parsed.deletions, 0);
    assert.equal(parsed.hunks.length, 2);
  });

  test('should infer category hints correctly', () => {
    assert.equal(DiffAnalyzer.inferHunkCategory('src/auth/service.ts', 'class Auth'), 'security');
    assert.equal(DiffAnalyzer.inferHunkCategory('tests/unit/test.ts', 'test suite'), 'test-gap');
    assert.equal(DiffAnalyzer.inferHunkCategory('README.md', 'intro'), 'documentation');
    assert.equal(DiffAnalyzer.inferHunkCategory('src/api/schema.ts', 'interface Api'), 'breaking-change');
  });

  test('should filter high-risk hunks', () => {
    const parsed = DiffAnalyzer.parseUnifiedDiff(sampleDiff);
    const highRisk = DiffAnalyzer.filterHighRiskHunks(parsed);

    assert.equal(highRisk.length, 1);
    assert.equal(highRisk[0].file, 'src/auth.ts');
  });
});
