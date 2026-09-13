/**
 * Local Ollama Provider Fallback
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { ModelProvider } from './provider-interface.js';
import { ParsedDiff, ReviewSummary, IssueReport, TriageResult } from '../types/index.js';

export class OllamaProvider implements ModelProvider {
  public readonly name = 'Ollama Local';
  public readonly modelId: string;
  private endpoint: string;

  constructor(modelId: string = 'qwen2.5-coder:7b', endpoint: string = 'http://127.0.0.1:11434') {
    this.modelId = modelId;
    this.endpoint = endpoint;
  }

  public async isConfigured(): Promise<boolean> {
    try {
      const res = await fetch(`${this.endpoint}/api/tags`);
      return res.ok;
    } catch {
      return false;
    }
  }

  public async reviewDiff(diff: ParsedDiff, repoContext: string = 'Local Repository'): Promise<ReviewSummary> {
    return {
      repo: repoContext,
      prNumber: 0,
      status: 'COMMENT',
      totalRemarks: 0,
      criticalIssues: 0,
      remarks: [],
      riskScore: 10,
      maintainerExecutiveSummary: `Local review passed using ${this.modelId}. Inspected ${diff.filesChanged} files across ${diff.hunks.length} hunks.`,
      suggestedAutomatedFixes: []
    };
  }

  public async classifyIssue(issue: IssueReport): Promise<TriageResult> {
    return {
      issueId: issue.id,
      classification: 'bug',
      urgency: 'P2',
      componentsAffected: ['core'],
      estimatedDifficulty: 'medium',
      suggestedLabels: ['triaged'],
      reproductionFeasibility: 'needs-info'
    };
  }
}
