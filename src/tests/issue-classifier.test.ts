/**
 * Tests for IssueClassifier
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { IssueClassifier } from '../triage/issue-classifier.js';

describe('IssueClassifier Module', () => {
  test('should classify security vulnerabilities with P0 priority', () => {
    const res = IssueClassifier.triage({
      id: '101',
      title: 'Critical CVE: Memory corruption vulnerability in CLI argument parser',
      body: 'Potential exploit vector when passing malformed string to argv',
      author: 'security-researcher',
      labels: [],
      createdAt: '2026-03-01'
    });

    assert.equal(res.classification, 'bug');
    assert.equal(res.urgency, 'P0');
    assert.ok(res.suggestedLabels.includes('priority-high'));
    assert.ok(res.suggestedLabels.includes('area:cli'));
  });

  test('should classify documentation questions appropriately', () => {
    const res = IssueClassifier.triage({
      id: '102',
      title: 'Typo in README docs under quickstart section',
      body: 'There is a small misspelling in the curl command example.',
      author: 'contributor',
      labels: [],
      createdAt: '2026-03-01'
    });

    assert.equal(res.classification, 'documentation');
    assert.equal(res.estimatedDifficulty, 'trivial');
  });
});
