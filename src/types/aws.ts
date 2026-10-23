/**
 * AWS & Bedrock Type Definitions for RepoPulse AI
 * Amazon Developer Hackathon Edition
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { SeverityLevel } from './index.js';

export type AwsWellArchitectedPillar =
  | 'security'
  | 'reliability'
  | 'performanceEfficiency'
  | 'costOptimization'
  | 'operationalExcellence'
  | 'sustainability';

export interface AwsIacFinding {
  id: string;
  file: string;
  line: number;
  resourceType: string;
  resourceId?: string;
  severity: SeverityLevel;
  pillar: AwsWellArchitectedPillar;
  ruleId: string;
  title: string;
  message: string;
  remediationSnippet?: string;
  complianceStandard?: 'AWS-Foundational-Security-Best-Practices' | 'CIS-AWS-Benchmark' | 'Well-Architected';
}

export interface AwsIacAuditReport {
  targetFiles: string[];
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  securityScore: number; // 0-100 (100 = flawless)
  findings: AwsIacFinding[];
  pillarBreakdown: Record<AwsWellArchitectedPillar, number>;
  executiveSummary: string;
  recommendedCdkPatch?: string;
}

export interface AwsFinOpsResourceDelta {
  resourceType: string;
  resourceName: string;
  action: 'added' | 'modified' | 'deleted';
  unitCostMonthly: number;
  quantity: number;
  monthlyCostDelta: number; // Positive = cost increase, negative = savings
  pricingTierDetails: string;
  optimizationAdvice?: string;
}

export interface AwsFinOpsReport {
  totalMonthlySpendDelta: number;
  projectedAnnualDelta: number;
  currency: 'USD';
  resources: AwsFinOpsResourceDelta[];
  serviceBreakdown: Record<string, number>;
  executiveSummary: string;
  finopsRecommendations: string[];
}

export interface BedrockGuardrailViolation {
  type: 'leaked_credential' | 'prompt_injection' | 'toxic_review' | 'pii_exposure' | 'denied_topic';
  severity: 'high' | 'critical';
  description: string;
  redactedSnippet?: string;
  line?: number;
}

export interface BedrockGuardrailResult {
  isBlocked: boolean;
  action: 'PASSED' | 'BLOCKED' | 'FLAGGED';
  riskScore: number; // 0-100
  violations: BedrockGuardrailViolation[];
  sanitizedContent: string;
  evaluatorLatencyMs: number;
}

export interface BedrockConverseMessage {
  role: 'user' | 'assistant';
  content: Array<{
    text?: string;
    guardContent?: any;
  }>;
}

export interface BedrockConverseResponse {
  output: {
    message: {
      role: 'assistant';
      content: Array<{ text: string }>;
    };
  };
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  metrics?: {
    latencyMs: number;
  };
}
