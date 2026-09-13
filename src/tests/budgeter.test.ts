/**
 * Tests for TokenBudgeter
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TokenBudgeter } from '../core/budgeter.js';
import { DiffHunk } from '../types/index.js';

describe('TokenBudgeter Module', () => {
  const budgeter = new TokenBudgeter({
    maxPromptTokens: 100, // Small budget for testing partitioning
    charsPerTokenRatio: 4
  });

  const mockHunk: DiffHunk = {
    file: 'file1.ts',
    oldStart: 1,
    oldLines: 10,
    newStart: 1,
    newLines: 15,
    header: 'function test()',
    lines: [
      '+ const x = 10;',
      '+ const y = 20;',
      '+ const z = x + y;',
      '+ return z;'
    ],
    addedLines: 4,
    deletedLines: 0
  };

  test('should estimate tokens proportionally to characters', () => {
    const text = 'abcdefghijklmnop'; // 16 chars
    const tokens = budgeter.estimateTokens(text);
    assert.equal(tokens, 4);
  });

  test('should partition hunks into bounded plans', () => {
    const hunks = [mockHunk, mockHunk, mockHunk];
    const plan = budgeter.planChunks(hunks);

    assert.ok(plan.chunks.length >= 1);
    assert.ok(plan.totalEstimatedTokens > 0);
    assert.equal(plan.chunks.reduce((sum, c) => sum + c.hunks.length, 0), 3);
  });
});
