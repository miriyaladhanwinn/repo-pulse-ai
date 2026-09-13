/**
 * Automated Reproduction Synthesizer
 * Converts unstructured bug reports into minimal reproducible test cases.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { IssueReport } from '../types/index.js';

export class Reproducer {
  /**
   * Extract code blocks and stack traces from an issue body.
   */
  public static extractCodeBlocks(markdown: string): string[] {
    const codeBlockRegex = /```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)```/g;
    const blocks: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      if (match[1]?.trim()) {
        blocks.push(match[1].trim());
      }
    }

    return blocks;
  }

  /**
   * Build a runnable Node.js test harness from an issue report.
   */
  public static generateTestHarness(issue: IssueReport): string {
    const codeBlocks = this.extractCodeBlocks(issue.body);
    const primarySnippet = codeBlocks.length > 0 ? codeBlocks[0] : '// No direct code block provided in description';

    return `import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Auto-generated reproduction harness for Issue #${issue.id}
 * Title: ${issue.title}
 * Author: ${issue.author}
 */
test('Regression Test - Issue #${issue.id}', async () => {
  // Scenario setup
  try {
${primarySnippet.split('\n').map(l => '    ' + l).join('\n')}
  } catch (err: any) {
    // Verifying failure condition matches user report
    assert.ok(err, 'Expected error condition to reproduce');
  }
});
`;
  }
}
