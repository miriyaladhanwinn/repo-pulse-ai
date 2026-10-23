/**
 * AWS Infrastructure-as-Code Analyzer Tests
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AwsIacAnalyzer } from '../core/aws-iac-analyzer.js';
import { DiffAnalyzer } from '../core/diff-analyzer.js';

test('AwsIacAnalyzer Suite', async (t) => {
  await t.test('detects IaC file paths correctly', () => {
    assert.equal(AwsIacAnalyzer.isIacFile('infra/network-stack.ts'), true);
    assert.equal(AwsIacAnalyzer.isIacFile('template.yaml'), true);
    assert.equal(AwsIacAnalyzer.isIacFile('main.tf'), true);
    assert.equal(AwsIacAnalyzer.isIacFile('src/utils/math.ts'), false);
  });

  await t.test('flags wildcard IAM policies and computes severe security penalty', () => {
    const diff = `diff --git a/infra/iam-stack.ts b/infra/iam-stack.ts
--- a/infra/iam-stack.ts
+++ b/infra/iam-stack.ts
@@ -15,3 +15,5 @@
+const adminStatement = new iam.PolicyStatement({
+  actions: ['*'],
+  resources: ['*']
+});
`;
    const parsed = DiffAnalyzer.parseUnifiedDiff(diff);
    const report = AwsIacAnalyzer.auditDiff(parsed);

    assert.equal(report.criticalCount, 1);
    assert.ok(report.securityScore <= 75);
    assert.ok(report.findings.some(f => f.ruleId === 'AWS-IAM-001'));
  });

  await t.test('flags open security groups on port 22 (SSH)', () => {
    const diff = `diff --git a/infra/vpc-stack.ts b/infra/vpc-stack.ts
--- a/infra/vpc-stack.ts
+++ b/infra/vpc-stack.ts
@@ -10,3 +10,4 @@
+sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH from 0.0.0.0/0');
`;
    const parsed = DiffAnalyzer.parseUnifiedDiff(diff);
    const report = AwsIacAnalyzer.auditDiff(parsed);

    assert.equal(report.criticalCount, 1);
    assert.ok(report.findings.some(f => f.ruleId === 'AWS-SG-001'));
  });

  await t.test('reports 100 security score when no violations exist', () => {
    const diff = `diff --git a/infra/s3-stack.ts b/infra/s3-stack.ts
--- a/infra/s3-stack.ts
+++ b/infra/s3-stack.ts
@@ -5,3 +5,6 @@
+const secureBucket = new s3.Bucket(this, 'AuditVault', {
+  encryption: s3.BucketEncryption.S3_MANAGED,
+  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
+  enforceSSL: true,
+});
`;
    const parsed = DiffAnalyzer.parseUnifiedDiff(diff);
    const report = AwsIacAnalyzer.auditDiff(parsed);

    assert.equal(report.totalFindings, 0);
    assert.equal(report.securityScore, 100);
    assert.ok(report.executiveSummary.includes('Flawless AWS Well-Architected Compliance'));
  });
});
