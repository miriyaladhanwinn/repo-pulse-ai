/**
 * Core Diff Analyzer & Semantic Hunk Parser
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { DiffHunk, ParsedDiff, ReviewCategory } from '../types/index.js';

export class DiffAnalyzer {
  /**
   * Parse a raw unified git diff string into structured DiffHunks and metadata.
   */
  public static parseUnifiedDiff(rawDiff: string): ParsedDiff {
    const lines = rawDiff.split(/\r?\n/);
    const hunks: DiffHunk[] = [];
    const affectedFiles = new Set<string>();

    let currentFile = '';
    let currentHunk: DiffHunk | null = null;
    let totalInsertions = 0;
    let totalDeletions = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // File header: diff --git a/path b/path
      if (line.startsWith('diff --git ')) {
        if (currentHunk) {
          hunks.push(currentHunk);
          currentHunk = null;
        }
        const match = line.match(/diff --git a\/(.+?) b\/(.+)/);
        if (match) {
          currentFile = match[2];
          affectedFiles.add(currentFile);
        }
        continue;
      }

      // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
      if (line.startsWith('@@ ')) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }

        const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/);
        if (match) {
          const oldStart = parseInt(match[1], 10);
          const oldLines = match[2] ? parseInt(match[2], 10) : 1;
          const newStart = parseInt(match[3], 10);
          const newLines = match[4] ? parseInt(match[4], 10) : 1;
          const header = match[5]?.trim() || '';

          currentHunk = {
            file: currentFile,
            oldStart,
            oldLines,
            newStart,
            newLines,
            header,
            lines: [],
            addedLines: 0,
            deletedLines: 0,
            categoryHint: this.inferHunkCategory(currentFile, header)
          };
        }
        continue;
      }

      // Inside a hunk
      if (currentHunk) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          currentHunk.addedLines++;
          totalInsertions++;
          currentHunk.lines.push(line);
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          currentHunk.deletedLines++;
          totalDeletions++;
          currentHunk.lines.push(line);
        } else if (line.startsWith(' ')) {
          currentHunk.lines.push(line);
        }
      }
    }

    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return {
      filesChanged: affectedFiles.size,
      insertions: totalInsertions,
      deletions: totalDeletions,
      hunks,
      affectedFilePaths: Array.from(affectedFiles)
    };
  }

  /**
   * Automatically infer review category hint based on file extension and path.
   */
  public static inferHunkCategory(filepath: string, header: string): ReviewCategory {
    const lower = filepath.toLowerCase();
    
    if (lower.includes('security') || lower.includes('auth') || lower.includes('token') || lower.includes('secret')) {
      return 'security';
    }
    if (lower.includes('test') || lower.includes('spec') || lower.includes('__tests__')) {
      return 'test-gap';
    }
    if (lower.endsWith('.md') || lower.includes('docs/') || lower.endsWith('.txt')) {
      return 'documentation';
    }
    if (lower.includes('api/') || lower.includes('schema') || lower.includes('types') || lower.endsWith('.proto')) {
      return 'breaking-change';
    }
    if (header.includes('perf') || header.includes('cache') || lower.includes('benchmark')) {
      return 'performance';
    }
    return 'logic';
  }

  /**
   * Filter and prioritize high-risk hunks (e.g. security and breaking changes).
   */
  public static filterHighRiskHunks(parsed: ParsedDiff): DiffHunk[] {
    return parsed.hunks.filter(h => 
      h.categoryHint === 'security' || 
      h.categoryHint === 'breaking-change' ||
      h.addedLines > 40
    );
  }
}
