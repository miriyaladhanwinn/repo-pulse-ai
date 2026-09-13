/**
 * RepoPulse Multi-Model Router Unit Tests
 * Verifies model catalog discovery, parameter routing, and deterministic fallback synthesis.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MultiModelRouter, SUPPORTED_MODELS } from '../providers/multi-model-router.js';

describe('MultiModelRouter Frontier Gateway', () => {
  test('enumerates all supported frontier and local models', () => {
    const models = MultiModelRouter.getModels();
    assert.ok(models.length >= 6);
    assert.deepEqual(models, SUPPORTED_MODELS);

    const providers = new Set(models.map(m => m.provider));
    assert.ok(providers.has('openai'));
    assert.ok(providers.has('anthropic'));
    assert.ok(providers.has('google'));
    assert.ok(providers.has('deepseek'));
    assert.ok(providers.has('ollama'));
  });

  test('retrieves model descriptor by ID', () => {
    const codex = MultiModelRouter.getModelById('gpt-5.4-codex');
    assert.ok(codex);
    assert.equal(codex.provider, 'openai');
    assert.equal(codex.reasoningSupport, true);
    assert.equal(codex.tier, 'frontier');

    const claude = MultiModelRouter.getModelById('claude-3-7-sonnet');
    assert.ok(claude);
    assert.equal(claude.provider, 'anthropic');
    assert.equal(claude.contextWindow, 200000);
  });

  test('returns undefined for non-existent model ID', () => {
    const missing = MultiModelRouter.getModelById('unknown-frontier-model');
    assert.equal(missing, undefined);
  });

  test('executes deterministic fallback review for diff/pr prompts', async () => {
    const result = await MultiModelRouter.complete([
      { role: 'system', content: 'You are a code review assistant.' },
      { role: 'user', content: 'Please review this diff for breaking changes and security hazards.' }
    ], {
      modelId: 'gpt-5.4-codex'
    });

    assert.equal(result.modelId, 'gpt-5.4-codex');
    assert.ok(result.content.includes('RepoPulse AST Intelligence Analysis'));
    assert.ok(result.content.includes('Public API Contracts'));
    assert.ok(result.usage.totalTokens > 0);
    assert.ok(typeof result.latencyMs === 'number');
  });

  test('executes deterministic fallback for security/CVE prompts', async () => {
    const result = await MultiModelRouter.complete([
      { role: 'user', content: 'Run a security audit for CVE vulnerabilities on this snippet.' }
    ], {
      modelId: 'claude-3-7-sonnet'
    });

    assert.equal(result.modelId, 'claude-3-7-sonnet');
    assert.ok(result.content.includes('Vulnerability Audit Report'));
    assert.ok(result.content.includes('Risk Assessment'));
    assert.ok(result.usage.promptTokens > 0);
  });

  test('executes deterministic fallback for general architectural prompts', async () => {
    const result = await MultiModelRouter.complete([
      { role: 'user', content: 'How should I structure the Model Context Protocol stdio transport?' }
    ], {
      modelId: 'gemini-2.5-pro'
    });

    assert.equal(result.modelId, 'gemini-2.5-pro');
    assert.ok(result.content.includes('RepoPulse Studio Response'));
    assert.ok(result.content.includes('architectural assessment'));
  });
});
