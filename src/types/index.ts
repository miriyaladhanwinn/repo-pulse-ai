/**
 * Type definitions for RepoPulse AI - Autonomous Maintainer Harness
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

export type SeverityLevel = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type ReviewCategory = 
  | 'logic'
  | 'security'
  | 'performance'
  | 'breaking-change'
  | 'test-gap'
  | 'documentation'
  | 'maintainability';

export interface DiffHunk {
  file: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: string[];
  addedLines: number;
  deletedLines: number;
  categoryHint?: ReviewCategory;
}

export interface ParsedDiff {
  filesChanged: number;
  insertions: number;
  deletions: number;
  hunks: DiffHunk[];
  affectedFilePaths: string[];
}

export interface CodeRemark {
  file: string;
  line: number;
  severity: SeverityLevel;
  category: ReviewCategory;
  title: string;
  message: string;
  suggestion?: string;
  ruleId?: string;
}

export interface ReviewSummary {
  repo: string;
  prNumber: number;
  status: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENT';
  totalRemarks: number;
  criticalIssues: number;
  remarks: CodeRemark[];
  riskScore: number; // 0-100
  maintainerExecutiveSummary: string;
  suggestedAutomatedFixes: Array<{
    file: string;
    description: string;
    patch: string;
  }>;
}

export interface IssueReport {
  id: string;
  title: string;
  body: string;
  author: string;
  labels: string[];
  createdAt: string;
}

export interface TriageResult {
  issueId: string;
  classification: 'bug' | 'feature' | 'question' | 'documentation' | 'flaky-test';
  urgency: 'P0' | 'P1' | 'P2' | 'P3';
  componentsAffected: string[];
  estimatedDifficulty: 'trivial' | 'medium' | 'complex' | 'epic';
  suggestedLabels: string[];
  potentialDuplicateOf?: string;
  reproductionFeasibility: 'immediate' | 'needs-info' | 'not-reproducible';
  synthesizedReproductionScript?: string;
}


export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}
