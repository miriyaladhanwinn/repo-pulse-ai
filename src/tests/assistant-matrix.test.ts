/**
 * RepoPulse Assistant Matrix Unit Tests
 * Verifies persona definitions, system prompt contracts, and category filtering.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AssistantMatrix, ASSISTANT_REGISTRY } from '../core/assistant-matrix.js';

describe('AssistantMatrix Persona Registry', () => {
  test('returns all registered frontier maintainer personas', () => {
    const assistants = AssistantMatrix.getAll();
    assert.ok(assistants.length >= 6);
    assert.deepEqual(assistants, ASSISTANT_REGISTRY);
  });

  test('retrieves maintainer persona by unique ID', () => {
    const persona = AssistantMatrix.getById('maintainer-lead');
    assert.ok(persona);
    assert.equal(persona.name, 'Maintainer Lead');
    assert.equal(persona.category, 'code-review');
    assert.ok(persona.systemPrompt.includes('Principal Open Source Maintainer'));
    assert.ok(persona.capabilities.includes('breaking-change-audit'));
    assert.ok(persona.suggestedPrompts.length > 0);
  });

  test('retrieves security auditor persona with strict zero-trust invariants', () => {
    const persona = AssistantMatrix.getById('cve-auditor');
    assert.ok(persona);
    assert.equal(persona.name, 'Vulnerability Auditor');
    assert.equal(persona.category, 'security');
    assert.ok(persona.systemPrompt.includes('Dynamic code evaluation'));
    assert.ok(persona.capabilities.includes('cve-scanning'));
  });

  test('filters personas accurately by category', () => {
    const securityPersonas = AssistantMatrix.getByCategory('security');
    assert.ok(securityPersonas.length >= 1);
    assert.ok(securityPersonas.every(p => p.category === 'security'));

    const architecturePersonas = AssistantMatrix.getByCategory('architecture');
    assert.ok(architecturePersonas.length >= 1);
    assert.ok(architecturePersonas.every(p => p.category === 'architecture'));
  });

  test('returns undefined for non-existent persona ID', () => {
    const missing = AssistantMatrix.getById('non-existent-assistant-xyz');
    assert.equal(missing, undefined);
  });

  test('verifies all personas have non-empty required fields', () => {
    for (const assistant of AssistantMatrix.getAll()) {
      assert.ok(assistant.id.length > 0);
      assert.ok(assistant.name.length > 0);
      assert.ok(assistant.title.length > 0);
      assert.ok(assistant.avatar.length > 0);
      assert.ok(assistant.systemPrompt.length > 100);
      assert.ok(assistant.capabilities.length > 0);
      assert.ok(assistant.suggestedPrompts.length > 0);
      assert.ok(assistant.temperature >= 0 && assistant.temperature <= 1);
    }
  });
});
