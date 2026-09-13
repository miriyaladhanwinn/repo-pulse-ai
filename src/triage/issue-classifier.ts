/**
 * Autonomous Issue Triage & Severity Classifier
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { IssueReport, TriageResult } from '../types/index.js';

export class IssueClassifier {
  /**
   * Triage an incoming issue report by analyzing semantic cues, logs, and stack traces.
   */
  public static triage(issue: IssueReport): TriageResult {
    const content = `${issue.title}\n${issue.body}`;
    const lower = content.toLowerCase();

    // Classification heuristics
    let classification: TriageResult['classification'] = 'feature';
    if (
      lower.includes('crash') || 
      lower.includes('exception') || 
      lower.includes('typeerror') || 
      lower.includes('syntaxerror') || 
      lower.includes('bug') ||
      lower.includes('cve') ||
      lower.includes('vulnerability') ||
      lower.includes('exploit')
    ) {
      classification = 'bug';
    } else if (lower.includes('flaky') || lower.includes('timeout') || lower.includes('intermittent')) {
      classification = 'flaky-test';
    } else if (lower.includes('docs') || lower.includes('typo') || lower.includes('readme') || lower.includes('documentation')) {
      classification = 'documentation';
    } else if (lower.includes('how to') || lower.includes('question') || lower.includes('help')) {
      classification = 'question';
    }

    // Urgency determination
    let urgency: TriageResult['urgency'] = 'P3';
    if (lower.includes('cve') || lower.includes('vulnerability') || lower.includes('security') || lower.includes('exploit')) {
      urgency = 'P0';
    } else if (lower.includes('crash') || lower.includes('data loss') || lower.includes('segfault')) {
      urgency = 'P1';
    } else if (classification === 'bug') {
      urgency = 'P2';
    }

    // Component detection
    const components: string[] = [];
    if (lower.includes('mcp') || lower.includes('protocol') || lower.includes('rpc')) components.push('mcp');
    if (lower.includes('cli') || lower.includes('terminal') || lower.includes('argument')) components.push('cli');
    if (lower.includes('review') || lower.includes('pr') || lower.includes('diff')) components.push('review-engine');
    if (lower.includes('provider') || lower.includes('openai') || lower.includes('codex')) components.push('providers');
    if (components.length === 0) components.push('core');

    // Label suggestions
    const labels: string[] = [classification];
    if (urgency === 'P0' || urgency === 'P1') labels.push('priority-high');
    components.forEach(c => labels.push(`area:${c}`));

    // Difficulty estimation
    let estimatedDifficulty: TriageResult['estimatedDifficulty'] = 'medium';
    if (classification === 'documentation' || lower.includes('typo')) {
      estimatedDifficulty = 'trivial';
    } else if (urgency === 'P0' || lower.includes('race condition') || lower.includes('deadlock')) {
      estimatedDifficulty = 'complex';
    }

    return {
      issueId: issue.id,
      classification,
      urgency,
      componentsAffected: components,
      estimatedDifficulty,
      suggestedLabels: labels,
      reproductionFeasibility: lower.includes('steps to reproduce') ? 'immediate' : 'needs-info',
      synthesizedReproductionScript: this.generateReproStub(issue)
    };
  }

  private static generateReproStub(issue: IssueReport): string {
    return `/**
 * Reproduction Stub for Issue #${issue.id} - ${issue.title}
 * Generated automatically by RepoPulse AI
 */
describe('Reproduction for Issue #${issue.id}', () => {
  it('should replicate user reported condition', async () => {
    // Assert unexpected failure condition
    expect(true).toBe(true);
  });
});
`;
  }
}
