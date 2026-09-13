/**
 * RepoPulse Universal Model Catalog Unit Tests
 * Verifies 500+ model definitions, provider groupings, and query filtering.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ModelCatalog, MODEL_REGISTRY } from '../providers/models-catalog.js';

describe('Universal ModelCatalog (500+ Models Registry)', () => {
  test('contains over 500 verified production AI models', () => {
    const total = ModelCatalog.count();
    assert.ok(total >= 500, `Expected >= 500 models, found ${total}`);
    assert.equal(ModelCatalog.getAll().length, total);
  });

  test('covers all major global foundation providers', () => {
    const providers = ModelCatalog.getProviders();
    assert.ok(providers.length >= 15);
    assert.ok(providers.includes('openai'));
    assert.ok(providers.includes('anthropic'));
    assert.ok(providers.includes('google'));
    assert.ok(providers.includes('deepseek'));
    assert.ok(providers.includes('groq'));
    assert.ok(providers.includes('mistral'));
    assert.ok(providers.includes('openrouter'));
    assert.ok(providers.includes('qwen'));
    assert.ok(providers.includes('meta'));
    assert.ok(providers.includes('together'));
    assert.ok(providers.includes('perplexity'));
    assert.ok(providers.includes('cohere'));
  });

  test('retrieves frontier models with reasoning and extended context', () => {
    const gemini = ModelCatalog.getById('gemini-2.5-pro');
    assert.ok(gemini);
    assert.equal(gemini.contextWindow, 1000000);
    assert.equal(gemini.reasoningSupport, true);

    const claude = ModelCatalog.getById('claude-3-7-sonnet');
    assert.ok(claude);
    assert.equal(claude.contextWindow, 200000);
    assert.equal(claude.reasoningSupport, true);

    const codex = ModelCatalog.getById('gpt-5.4-codex');
    assert.ok(codex);
    assert.equal(codex.provider, 'openai');
    assert.equal(codex.reasoningSupport, true);

    const deepseek = ModelCatalog.getById('deepseek-r1');
    assert.ok(deepseek);
    assert.equal(deepseek.provider, 'deepseek');
    assert.equal(deepseek.reasoningSupport, true);
  });

  test('filters models accurately by search query', () => {
    const results = ModelCatalog.search({ query: 'codestral' });
    assert.ok(results.length >= 1);
    assert.ok(results.every(m => m.name.toLowerCase().includes('codestral') || m.id.includes('codestral')));
  });

  test('filters models by provider and reasoning capability', () => {
    const openaiReasoning = ModelCatalog.search({
      provider: 'openai',
      reasoningOnly: true
    });
    assert.ok(openaiReasoning.length >= 5);
    assert.ok(openaiReasoning.every(m => m.provider === 'openai' && m.reasoningSupport));
  });

  test('validates that every model has complete metadata', () => {
    for (const m of ModelCatalog.getAll()) {
      assert.ok(m.id.length > 0, 'Model ID must not be empty');
      assert.ok(m.name.length > 0, 'Model name must not be empty');
      assert.ok(m.contextWindow > 0, 'Context window must be positive');
      assert.ok(m.description.length > 0, 'Description must not be empty');
      assert.ok(['frontier', 'fast', 'specialized', 'local'].includes(m.tier));
    }
  });
});
