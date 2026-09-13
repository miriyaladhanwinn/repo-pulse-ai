/**
 * RepoPulse Multi-Model Router Unit Tests
 * Verifies model catalog discovery, parameter routing, and deterministic fallback synthesis.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MultiModelRouter, SUPPORTED_MODELS } from '../providers/multi-model-router.js';

describe('MultiModelRouter Frontier Gateway', () => {
  test('enumerates all supported frontier, fast, and local models', () => {
    const models = MultiModelRouter.getModels();
    assert.ok(models.length >= 10);
    assert.deepEqual(models, SUPPORTED_MODELS);

    const providers = new Set(models.map(m => m.provider));
    assert.ok(providers.has('openai'));
    assert.ok(providers.has('anthropic'));
    assert.ok(providers.has('google'));
    assert.ok(providers.has('deepseek'));
    assert.ok(providers.has('groq'));
    assert.ok(providers.has('mistral'));
    assert.ok(providers.has('openrouter'));
    assert.ok(providers.has('ollama'));
    assert.ok(providers.has('custom'));
  });

  test('retrieves model descriptor by ID', () => {
    const codex = MultiModelRouter.getModelById('gpt-5.4-codex');
    assert.ok(codex);
    assert.equal(codex.provider, 'openai');
    assert.equal(codex.reasoningSupport, true);
    assert.equal(codex.tier, 'frontier');

    const groq = MultiModelRouter.getModelById('llama-3.3-70b-versatile');
    assert.ok(groq);
    assert.equal(groq.provider, 'groq');
    assert.equal(groq.tier, 'fast');

    const mistral = MultiModelRouter.getModelById('codestral-2501');
    assert.ok(mistral);
    assert.equal(mistral.provider, 'mistral');
    assert.equal(mistral.contextWindow, 256000);

    const custom = MultiModelRouter.getModelById('custom-endpoint');
    assert.ok(custom);
    assert.equal(custom.provider, 'custom');
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
