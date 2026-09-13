/**
 * Abstract Model Provider Interface
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { ParsedDiff, ReviewSummary, IssueReport, TriageResult } from '../types/index.js';

export interface ModelProvider {
  readonly name: string;
  readonly modelId: string;
  
  isConfigured(): Promise<boolean>;
  reviewDiff(diff: ParsedDiff, repoContext?: string): Promise<ReviewSummary>;
  classifyIssue(issue: IssueReport): Promise<TriageResult>;
}
