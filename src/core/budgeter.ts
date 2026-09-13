/**
 * Token Budgeter & Context Window Slicer
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { DiffHunk } from '../types/index.js';

export interface BudgetConfig {
  maxPromptTokens: number;
  reserveCompletionTokens: number;
  charsPerTokenRatio?: number;
}

export interface ChunkPlan {
  totalEstimatedTokens: number;
  chunks: Array<{
    chunkIndex: number;
    hunks: DiffHunk[];
    estimatedTokens: number;
  }>;
}

export class TokenBudgeter {
  private config: Required<BudgetConfig>;

  constructor(config: Partial<BudgetConfig> = {}) {
    this.config = {
      maxPromptTokens: config.maxPromptTokens ?? 16000,
      reserveCompletionTokens: config.reserveCompletionTokens ?? 4000,
      charsPerTokenRatio: config.charsPerTokenRatio ?? 3.8
    };
  }

  /**
   * Estimate token count for a text string.
   */
  public estimateTokens(text: string): number {
    return Math.ceil(text.length / this.config.charsPerTokenRatio);
  }

  /**
   * Estimate token count for an array of DiffHunks.
   */
  public estimateHunksTokens(hunks: DiffHunk[]): number {
    const totalChars = hunks.reduce((acc, hunk) => {
      const hunkChars = hunk.lines.join('\n').length + hunk.header.length + hunk.file.length;
      return acc + hunkChars;
    }, 0);
    return this.estimateTokens(totalChars.toString());
  }

  /**
   * Partition an array of diff hunks into chunks that strictly fit inside maxPromptTokens.
   */
  public planChunks(hunks: DiffHunk[]): ChunkPlan {
    const chunks: ChunkPlan['chunks'] = [];
    let currentChunkHunks: DiffHunk[] = [];
    let currentChunkChars = 0;
    const maxChars = Math.floor(this.config.maxPromptTokens * this.config.charsPerTokenRatio);

    let totalChars = 0;

    for (const hunk of hunks) {
      const hunkChars = hunk.lines.join('\n').length + hunk.header.length + hunk.file.length + 50;
      totalChars += hunkChars;

      if (currentChunkChars + hunkChars > maxChars && currentChunkHunks.length > 0) {
        chunks.push({
          chunkIndex: chunks.length,
          hunks: currentChunkHunks,
          estimatedTokens: this.estimateTokens(currentChunkChars.toString())
        });
        currentChunkHunks = [];
        currentChunkChars = 0;
      }

      currentChunkHunks.push(hunk);
      currentChunkChars += hunkChars;
    }

    if (currentChunkHunks.length > 0) {
      chunks.push({
        chunkIndex: chunks.length,
        hunks: currentChunkHunks,
        estimatedTokens: this.estimateTokens(currentChunkChars.toString())
      });
    }

    return {
      totalEstimatedTokens: this.estimateTokens(totalChars.toString()),
      chunks
    };
  }
}
