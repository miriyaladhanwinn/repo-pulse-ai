/**
 * AWS FinOps PR Cost-Delta Estimator Tests
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AwsFinOpsEstimator } from '../core/finops-estimator.js';
import { DiffAnalyzer } from '../core/diff-analyzer.js';

test('AwsFinOpsEstimator Suite', async (t) => {
  await t.test('calculates accurate monthly cost delta when adding NAT Gateway', () => {
    const diff = `diff --git a/infra/vpc.ts b/infra/vpc.ts
--- a/infra/vpc.ts
+++ b/infra/vpc.ts
@@ -10,2 +10,4 @@
+const nat = new ec2.CfnNatGateway(this, 'NatGateway', {
+  subnetId: publicSubnet.subnetId
+});
`;
    const parsed = DiffAnalyzer.parseUnifiedDiff(diff);
    const report = AwsFinOpsEstimator.estimateDiff(parsed);

    assert.equal(report.resources.length, 1);
    assert.equal(report.resources[0].resourceType, 'AWS::EC2::NatGateway');
    assert.equal(report.totalMonthlySpendDelta, 32.85);
    assert.ok(report.finopsRecommendations.some(r => r.includes('VPC Endpoints')));
  });

  await t.test('calculates compute cost for added EC2 instances and recommends Graviton', () => {
    const diff = `diff --git a/infra/compute.ts b/infra/compute.ts
--- a/infra/compute.ts
+++ b/infra/compute.ts
@@ -5,2 +5,4 @@
+const appServer = new ec2.Instance(this, 'Server', {
+  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.LARGE)
+});
`;
    const parsed = DiffAnalyzer.parseUnifiedDiff(diff);
    const report = AwsFinOpsEstimator.estimateDiff(parsed);

    assert.ok(report.totalMonthlySpendDelta > 50, 't3.large should add ~$60.80/mo');
    assert.ok(report.finopsRecommendations.some(r => r.includes('Graviton')));
  });

  await t.test('handles deletion of resources by computing monthly savings', () => {
    const diff = `diff --git a/infra/vpc.ts b/infra/vpc.ts
--- a/infra/vpc.ts
+++ b/infra/vpc.ts
@@ -10,4 +10,2 @@
-const nat = new ec2.CfnNatGateway(this, 'OldNat', {
-  subnetId: publicSubnet.subnetId
-});
`;
    const parsed = DiffAnalyzer.parseUnifiedDiff(diff);
    const report = AwsFinOpsEstimator.estimateDiff(parsed);

    assert.equal(report.totalMonthlySpendDelta, -32.85);
    assert.ok(report.executiveSummary.includes('Cloud Cost Savings'));
  });
});
