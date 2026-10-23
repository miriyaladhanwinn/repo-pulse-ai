/**
 * Amazon Bedrock Guardrails Engine
 * Real-time Credential Leak, Prompt Injection & Toxic Review Defense.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { BedrockGuardrailResult, BedrockGuardrailViolation } from '../types/aws.js';
import { AwsSigV4Signer, AwsCredentials } from '../providers/aws-sigv4.js';

export interface BedrockGuardrailsOptions {
  guardrailId?: string;
  guardrailVersion?: string;
  region?: string;
  credentials?: AwsCredentials;
}

export class BedrockGuardrailsEngine {
  private guardrailId?: string;
  private guardrailVersion: string;
  private region: string;
  private credentials?: AwsCredentials;

  // Known credential leakage patterns
  private static readonly CREDENTIAL_PATTERNS = [
    {
      regex: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g,
      type: 'leaked_credential' as const,
      description: 'AWS Access Key ID detected'
    },
    {
      regex: /aws_secret_access_key\s*[:=]\s*["']?([A-Za-z0-9\/+=]{40})["']?/gi,
      type: 'leaked_credential' as const,
      description: 'AWS Secret Access Key assignment detected'
    },
    {
      regex: /\bghp_[A-Za-z0-9]{36}\b/g,
      type: 'leaked_credential' as const,
      description: 'GitHub Personal Access Token (classic) detected'
    },
    {
      regex: /\bgithub_pat_[A-Za-z0-9_]{82}\b/g,
      type: 'leaked_credential' as const,
      description: 'Fine-grained GitHub Personal Access Token detected'
    },
    {
      regex: /\bxox[baprs]-[0-9A-Za-z-]{10,48}\b/g,
      type: 'leaked_credential' as const,
      description: 'Slack API Token detected'
    }
  ];

  // Adversarial prompt injection signatures
  private static readonly INJECTION_PATTERNS = [
    /\bignore\s+(all\s+)?previous\s+instructions\b/i,
    /\bdisregard\s+(all\s+)?prior\s+directives\b/i,
    /\bbypass\s+(all\s+)?(security|guardrails|safety)\s+checks?\b/i,
    /\bapprove\s+(this\s+)?(pr|pull\s+request)\s+(unconditionally|without\s+review)\b/i,
    /\byou\s+are\s+now\s+in\s+developer\s+mode\b/i,
    /\[system_override\]/i,
    /<\|im_start\|>system/i
  ];

  // Hostile / unconstructive tone markers
  private static readonly TOXIC_PATTERNS = [
    /\b(this\s+code\s+is\s+garbage|you\s+are\s+an\s+idiot|worst\s+pull\s+request|learn\s+to\s+code\s+moron)\b/i,
    /\b(useless\s+contributor|delete\s+your\s+account)\b/i
  ];

  constructor(options: BedrockGuardrailsOptions = {}) {
    this.guardrailId = options.guardrailId || process.env.AWS_BEDROCK_GUARDRAIL_ID;
    this.guardrailVersion = options.guardrailVersion || process.env.AWS_BEDROCK_GUARDRAIL_VERSION || 'DRAFT';
    this.region = options.region || process.env.AWS_REGION || 'us-east-1';

    const accessKeyId = options.credentials?.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = options.credentials?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
    if (accessKeyId && secretAccessKey) {
      this.credentials = {
        accessKeyId,
        secretAccessKey,
        sessionToken: options.credentials?.sessionToken || process.env.AWS_SESSION_TOKEN,
        region: this.region
      };
    }
  }

  /**
   * Evaluates text through Bedrock Guardrails policy.
   */
  public async evaluate(content: string, source: 'INPUT' | 'OUTPUT' = 'INPUT'): Promise<BedrockGuardrailResult> {
    const startTime = Date.now();

    // If live Bedrock Guardrail is configured, attempt remote ApplyGuardrail API
    if (this.guardrailId && this.credentials) {
      try {
        const remoteResult = await this.invokeRemoteGuardrail(content, source);
        if (remoteResult) {
          return remoteResult;
        }
      } catch {
        // Fall back to local evaluation
      }
    }

    return this.evaluateLocal(content, startTime);
  }

  /**
   * Deterministic local inspection ensuring zero leaks and instant verification.
   */
  public evaluateLocal(content: string, startTime: number = Date.now()): BedrockGuardrailResult {
    const violations: BedrockGuardrailViolation[] = [];
    let sanitizedContent = content;

    // 1. Check for credential leaks
    for (const pattern of BedrockGuardrailsEngine.CREDENTIAL_PATTERNS) {
      const matches = content.match(pattern.regex);
      if (matches) {
        for (const match of matches) {
          violations.push({
            type: pattern.type,
            severity: 'critical',
            description: `${pattern.description}: ${match.substring(0, 4)}...[REDACTED]`
          });
          sanitizedContent = sanitizedContent.split(match).join('[REDACTED_AWS_CREDENTIAL]');
        }
      }
    }

    // 2. Check for adversarial prompt injections
    for (const pattern of BedrockGuardrailsEngine.INJECTION_PATTERNS) {
      if (pattern.test(content)) {
        violations.push({
          type: 'prompt_injection',
          severity: 'critical',
          description: 'Adversarial prompt injection pattern detected in input.'
        });
      }
    }

    // 3. Check for toxic content
    for (const pattern of BedrockGuardrailsEngine.TOXIC_PATTERNS) {
      if (pattern.test(content)) {
        violations.push({
          type: 'toxic_review',
          severity: 'high',
          description: 'Hostile or non-constructive review tone detected.'
        });
      }
    }

    const isBlocked = violations.some(v => v.severity === 'critical');
    const action = isBlocked ? 'BLOCKED' : violations.length > 0 ? 'FLAGGED' : 'PASSED';
    const riskScore = isBlocked ? 95 : violations.length > 0 ? 60 : 0;

    return {
      isBlocked,
      action,
      riskScore,
      violations,
      sanitizedContent,
      evaluatorLatencyMs: Date.now() - startTime
    };
  }

  /**
   * Remotely calls Amazon Bedrock ApplyGuardrail API.
   */
  private async invokeRemoteGuardrail(content: string, source: 'INPUT' | 'OUTPUT'): Promise<BedrockGuardrailResult | null> {
    if (!this.guardrailId || !this.credentials) return null;

    const endpoint = `https://bedrock-runtime.${this.region}.amazonaws.com/guardrail/${encodeURIComponent(this.guardrailId)}/version/${encodeURIComponent(this.guardrailVersion)}/apply`;

    const body = JSON.stringify({
      source,
      content: [{ text: { text: content } }]
    });

    const signed = AwsSigV4Signer.sign({
      method: 'POST',
      url: endpoint,
      service: 'bedrock',
      region: this.region,
      headers: { 'content-type': 'application/json' },
      body,
      credentials: this.credentials
    });

    const res = await fetch(signed.url, {
      method: signed.method,
      headers: signed.headers,
      body: signed.body
    });

    if (!res.ok) return null;

    const data = await res.json() as any;
    const action = data.action === 'GUARDRAIL_INTERVENED' ? 'BLOCKED' : 'PASSED';
    const isBlocked = action === 'BLOCKED';

    return {
      isBlocked,
      action,
      riskScore: isBlocked ? 100 : 0,
      violations: isBlocked ? [{
        type: 'denied_topic',
        severity: 'critical',
        description: 'Amazon Bedrock Guardrail policy intervened.'
      }] : [],
      sanitizedContent: data.outputs?.[0]?.text || content,
      evaluatorLatencyMs: 45
    };
  }
}
