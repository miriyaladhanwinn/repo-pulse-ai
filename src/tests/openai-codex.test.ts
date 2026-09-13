/**
 * Tests for OpenAICodexProvider
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OpenAICodexProvider } from '../providers/openai-codex.js';
import { DiffAnalyzer } from '../core/diff-analyzer.js';

describe('OpenAICodexProvider Heuristic Review & Triage Engine', () => {
  const provider = new OpenAICodexProvider();

  test('reports configuration state based on environment credentials', async () => {
    const isConfigured = await provider.isConfigured();
    assert.equal(typeof isConfigured, 'boolean');
    assert.equal(provider.modelId, 'gpt-5.4-codex');
  });

  test('flags arbitrary code execution hazards and hardcoded secrets in source code', async () => {
    const codeDiff = `diff --git a/src/vulnerable.ts b/src/vulnerable.ts
--- a/src/vulnerable.ts
+++ b/src/vulnerable.ts
@@ -1,5 +1,9 @@
+export function executeDynamicCode(userPayload: string) {
+  const apiKey = "sk-live-secretkey123456789";
+  eval(userPayload);
+  try {
+    doSomething();
+  } catch (err) {}
+}
`;
    const parsed = DiffAnalyzer.parseUnifiedDiff(codeDiff);
    const review = await provider.reviewDiff(parsed, 'test-project');

    assert.equal(review.status, 'CHANGES_REQUESTED');
    assert.ok(review.criticalIssues >= 2);
    assert.ok(review.remarks.some(r => r.title === 'Arbitrary Code Execution Hazard'));
    assert.ok(review.remarks.some(r => r.title === 'Hardcoded Secret Detected'));
    assert.ok(review.remarks.some(r => r.title === 'Swallowed Exception Block'));
  });

  test('does NOT flag false positives on documentation markdown files mentioning security concepts', async () => {
    const docDiff = `diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1,5 +1,7 @@
 # Project Security Guidelines
+- We strictly prohibit eval() in our codebase
+- Example format: token="abc123456789xyz"
+- Handle errors properly without catch (err) {}
`;
    const parsed = DiffAnalyzer.parseUnifiedDiff(docDiff);
    const review = await provider.reviewDiff(parsed, 'test-project');

    assert.equal(review.status, 'APPROVED');
    assert.equal(review.criticalIssues, 0);
    assert.equal(review.remarks.length, 0);
  });

  test('classifies CVE and security vulnerability issues with P0 urgency', async () => {
    const triage = await provider.classifyIssue({
      id: 'issue-42',
      title: 'CVE-2026-9012: Critical authentication bypass vulnerability',
      body: 'Attackers can exploit token validation to bypass login and gain admin access.',
      author: 'security-researcher',
      labels: [],
      createdAt: '2026-03-01'
    });

    assert.equal(triage.urgency, 'P0');
    assert.equal(triage.classification, 'bug');
    assert.equal(triage.estimatedDifficulty, 'complex');
    assert.ok(triage.suggestedLabels.includes('security'));
    assert.ok(triage.componentsAffected.includes('auth'));
  });

  test('classifies standard bug report and generates reproduction script', async () => {
    const triage = await provider.classifyIssue({
      id: 'issue-100',
      title: 'Crash in CLI when parsing empty response',
      body: 'Steps to reproduce: run repo-pulse cli with empty input.',
      author: 'contributor',
      labels: [],
      createdAt: '2026-03-01'
    });

    assert.equal(triage.classification, 'bug');
    assert.equal(triage.urgency, 'P1');
    assert.ok(triage.componentsAffected.includes('cli'));
    assert.ok(triage.synthesizedReproductionScript !== undefined);
  });
});
