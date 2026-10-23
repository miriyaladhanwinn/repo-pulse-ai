/**
 * Amazon Bedrock & Nova Provider Unit Tests
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AmazonBedrockProvider } from '../providers/bedrock-provider.js';
import { DiffAnalyzer } from '../core/diff-analyzer.js';
import { AwsSigV4Signer } from '../providers/aws-sigv4.js';

test('AmazonBedrockProvider & SigV4 Suite', async (t) => {
  await t.test('initializes with default Amazon Nova Pro model and region', () => {
    const provider = new AmazonBedrockProvider();
    assert.equal(provider.modelId, 'amazon.nova-pro-v1:0');
    assert.equal(provider.region, 'us-east-1');
  });

  await t.test('AwsSigV4Signer generates valid authorization headers', () => {
    const signed = AwsSigV4Signer.sign({
      method: 'POST',
      url: 'https://bedrock-runtime.us-east-1.amazonaws.com/model/amazon.nova-pro-v1:0/converse',
      service: 'bedrock',
      region: 'us-east-1',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
      credentials: {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
      },
      timestamp: new Date('2026-10-24T00:00:00Z')
    });

    assert.ok(signed.headers['authorization']);
    assert.ok(signed.headers['authorization'].startsWith('AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20261024/us-east-1/bedrock/aws4_request'));
    assert.equal(signed.headers['x-amz-date'], '20261024T000000Z');
    assert.ok(signed.headers['x-amz-content-sha256']);
  });

  await t.test('executes deterministic Nova code review detecting critical AWS security hazards', async () => {
    const provider = new AmazonBedrockProvider();
    const maliciousDiff = `diff --git a/infra/stack.ts b/infra/stack.ts
--- a/infra/stack.ts
+++ b/infra/stack.ts
@@ -10,3 +10,6 @@
+const AWS_KEY = "AKIA1234567890ABCDEF";
+const iamStatement = { "Action": "*", "Resource": "*" };
+const publicBucket = new s3.Bucket(this, 'Data', { publicReadAccess: true });
`;
    const parsed = DiffAnalyzer.parseUnifiedDiff(maliciousDiff);
    const review = await provider.reviewDiff(parsed, 'aws-samples/cloud-app');

    assert.equal(review.status, 'CHANGES_REQUESTED');
    assert.ok(review.riskScore >= 80, 'Risk score should be high due to critical AWS violations');
    assert.ok(review.criticalIssues >= 2, 'Should flag leaked key and wildcard IAM');
    assert.ok(review.remarks.some(r => r.title.includes('Leaked AWS Access Key')));
    assert.ok(review.remarks.some(r => r.title.includes('Wildcard IAM Permissions')));
  });

  await t.test('classifies security-sensitive issues with P0 urgency and creates reproduction stub', async () => {
    const provider = new AmazonBedrockProvider();
    const triage = await provider.classifyIssue({
      id: 'SEC-101',
      title: 'Critical CVE: Remote code execution in Bedrock agent webhook',
      body: 'Untrusted input reaches exec() call leading to remote execution vulnerability.',
      author: 'researcher',
      labels: [],
      createdAt: new Date().toISOString()
    });

    assert.equal(triage.urgency, 'P0');
    assert.ok(triage.suggestedLabels.includes('bedrock-guardrail-alert'));
    assert.ok(triage.synthesizedReproductionScript?.includes('Amazon Nova Autonomous Reproduction Stub'));
  });
});
