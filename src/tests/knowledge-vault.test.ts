/**
 * RepoPulse Knowledge Vault Unit Tests
 * Verifies document indexing, BM25 ranking, JSON backup, and lifecycle management.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { KnowledgeVault } from '../core/knowledge-vault.js';

describe('KnowledgeVault Semantic Snippet Engine', () => {
  let vault: KnowledgeVault;

  beforeEach(() => {
    vault = new KnowledgeVault();
  });

  test('indexes a document with automatic token estimation and metadata', () => {
    const doc = vault.indexDocument({
      title: 'MCP Protocol Contract',
      path: 'docs/mcp-spec.md',
      category: 'doc',
      content: 'The Model Context Protocol establishes JSON-RPC 2.0 communication over stdio or SSE transports.'
    });

    assert.ok(doc.id.startsWith('doc-'));
    assert.equal(doc.title, 'MCP Protocol Contract');
    assert.ok(doc.tokensEstimated > 0);
    assert.ok(doc.indexedAt.length > 0);
    assert.equal(vault.getAll().length, 1);
  });

  test('ranks search results by title and body keyword relevance with BM25', () => {
    vault.indexDocument({
      title: 'AST Transformation Guidelines',
      path: 'src/core/ast.ts',
      category: 'code',
      content: 'Use babel or typescript compiler API to traverse nodes without side effects.'
    });

    vault.indexDocument({
      title: 'Security Audit Invariants',
      path: 'src/security/audit.ts',
      category: 'code',
      content: 'AST traversal for eval detection and dangerous shell execution sinks.'
    });

    vault.indexDocument({
      title: 'Unrelated Readme',
      path: 'README.md',
      category: 'doc',
      content: 'Welcome to RepoPulse documentation.'
    });

    // Query for "AST" should rank AST Transformation Guidelines highest because title matches
    const results = vault.search('AST');
    assert.equal(results.length, 2);
    assert.equal(results[0].doc.title, 'AST Transformation Guidelines');
    assert.ok(results[0].score >= 10);
    assert.ok(results[0].matchedSnippet.includes('AST'));
  });

  test('matches documents by custom tags', () => {
    vault.indexDocument({
      title: 'Database Pool Config',
      path: 'db.ts',
      category: 'config',
      tags: ['postgres', 'connection-pooling'],
      content: 'Max client connections set to 20 with 5000ms idle timeout.'
    });

    const results = vault.search('postgres');
    assert.equal(results.length, 1);
    assert.equal(results[0].doc.title, 'Database Pool Config');
  });

  test('exports and imports vault documents via JSON', () => {
    vault.indexDocument({
      title: 'ADR-001',
      path: 'docs/adr-1.md',
      category: 'doc',
      content: 'Decision to use native node:test instead of external jest harness.'
    });

    const json = vault.exportJson();
    assert.ok(json.includes('ADR-001'));

    const newVault = new KnowledgeVault();
    const importedCount = newVault.importJson(json);
    assert.equal(importedCount, 1);
    assert.equal(newVault.getAll()[0].title, 'ADR-001');
  });

  test('returns empty array when query is whitespace or single characters', () => {
    vault.indexDocument({
      title: 'Sample Doc',
      path: 'sample.ts',
      category: 'code',
      content: 'Sample content here'
    });

    assert.deepEqual(vault.search(''), []);
    assert.deepEqual(vault.search('   '), []);
    assert.deepEqual(vault.search('a'), []);
  });

  test('deletes document by ID and confirms removal', () => {
    const doc1 = vault.indexDocument({
      title: 'Doc 1',
      path: 'doc1.ts',
      category: 'code',
      content: 'First document'
    });
    const doc2 = vault.indexDocument({
      title: 'Doc 2',
      path: 'doc2.ts',
      category: 'code',
      content: 'Second document'
    });

    assert.equal(vault.getAll().length, 2);
    const deleted = vault.delete(doc1.id);
    assert.equal(deleted, true);
    assert.equal(vault.getAll().length, 1);
    assert.equal(vault.getAll()[0].id, doc2.id);

    const deletedAgain = vault.delete(doc1.id);
    assert.equal(deletedAgain, false);
  });

  test('clears all documents from vault', () => {
    vault.indexDocument({ title: 'A', path: 'a.ts', category: 'code', content: 'A' });
    vault.indexDocument({ title: 'B', path: 'b.ts', category: 'code', content: 'B' });
    assert.equal(vault.getAll().length, 2);

    vault.clear();
    assert.equal(vault.getAll().length, 0);
  });
});
