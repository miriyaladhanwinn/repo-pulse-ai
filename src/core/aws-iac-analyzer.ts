/**
 * AWS Infrastructure-as-Code (IaC) Security & Compliance Analyzer
 * Inspects AWS CDK (TS/Python), CloudFormation, SAM, and Terraform diffs.
 * Aligns with AWS Well-Architected Framework and CIS Benchmarks.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { AwsIacFinding, AwsIacAuditReport, AwsWellArchitectedPillar } from '../types/aws.js';
import { ParsedDiff, DiffHunk } from '../types/index.js';

export class AwsIacAnalyzer {
  /**
   * Scans a parsed diff for AWS infrastructure security anti-patterns.
   */
  public static auditDiff(diff: ParsedDiff): AwsIacAuditReport {
    const findings: AwsIacFinding[] = [];
    const targetFiles: string[] = [];

    for (const hunk of diff.hunks) {
      if (!this.isIacFile(hunk.file)) continue;

      if (!targetFiles.includes(hunk.file)) {
        targetFiles.push(hunk.file);
      }

      this.analyzeHunk(hunk, findings);
    }

    return this.buildReport(targetFiles, findings);
  }

  /**
   * Directly audits raw file content.
   */
  public static auditFileContent(filePath: string, content: string): AwsIacAuditReport {
    const findings: AwsIacFinding[] = [];
    const lines = content.split('\n');

    const pseudoHunk: DiffHunk = {
      file: filePath,
      oldStart: 1,
      oldLines: 0,
      newStart: 1,
      newLines: lines.length,
      header: '@@ -0,0 +1,' + lines.length + ' @@',
      lines: lines.map(l => '+' + l),
      addedLines: lines.length,
      deletedLines: 0
    };

    this.analyzeHunk(pseudoHunk, findings);
    return this.buildReport([filePath], findings);
  }

  public static isIacFile(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    return (
      lower.endsWith('.tf') ||
      lower.endsWith('template.yaml') ||
      lower.endsWith('template.yml') ||
      lower.endsWith('template.json') ||
      lower.endsWith('serverless.yml') ||
      lower.includes('cdk') ||
      lower.includes('stack.') ||
      lower.includes('infra/') ||
      lower.includes('infrastructure/') ||
      lower.endsWith('.cdk.ts') ||
      lower.endsWith('.cdk.py')
    );
  }

  private static analyzeHunk(hunk: DiffHunk, findings: AwsIacFinding[]): void {
    const addedLines = hunk.lines
      .filter(l => l.startsWith('+'))
      .map(l => l.substring(1));
    const fullAddedText = addedLines.join('\n');

    // 1. Wildcard IAM Permissions (Action: "*" and Resource: "*")
    const hasWildcardAction = /"Action"\s*:\s*"\*"/i.test(fullAddedText) ||
      /'Action'\s*:\s*'\*'/i.test(fullAddedText) ||
      /actions:\s*\[\s*['"]\*['"]\s*\]/i.test(fullAddedText);
    const hasWildcardResource = /"Resource"\s*:\s*"\*"/i.test(fullAddedText) ||
      /'Resource'\s*:\s*'\*'/i.test(fullAddedText) ||
      /resources:\s*\[\s*['"]\*['"]\s*\]/i.test(fullAddedText);

    if (hasWildcardAction && hasWildcardResource) {
      findings.push({
        id: `find-${findings.length + 1}`,
        file: hunk.file,
        line: hunk.newStart,
        resourceType: 'AWS::IAM::Policy',
        severity: 'critical',
        pillar: 'security',
        ruleId: 'AWS-IAM-001',
        title: 'Critical IAM Wildcard Permission',
        message: 'IAM statement grants wildcard "*" on both Action and Resource, creating administrative privilege escalation hazards.',
        remediationSnippet: `resources: [table.tableArn],\nactions: ['dynamodb:GetItem', 'dynamodb:PutItem']`,
        complianceStandard: 'AWS-Foundational-Security-Best-Practices'
      });
    }

    // 2. Open Security Groups (0.0.0.0/0 on sensitive ports)
    for (let i = 0; i < hunk.lines.length; i++) {
      const line = hunk.lines[i];
      if (!line.startsWith('+')) continue;
      const code = line.substring(1);
      const lineNum = hunk.newStart + i;

      if (
        /0\.0\.0\.0\/0/.test(code) || /ec2\.Peer\.anyIpv4\(\)/i.test(code)
      ) {
        if (/(22|3389|5432|3306|27017|6379)\b/.test(code) || /port\.tcp\(\s*(22|3389)\s*\)/i.test(code)) {
          findings.push({
            id: `find-${findings.length + 1}`,
            file: hunk.file,
            line: lineNum,
            resourceType: 'AWS::EC2::SecurityGroup',
            severity: 'critical',
            pillar: 'security',
            ruleId: 'AWS-SG-001',
            title: 'Unrestricted Ingress to Sensitive Port (0.0.0.0/0)',
            message: 'Security group rule allows inbound traffic from 0.0.0.0/0 on administrative or database ports.',
            remediationSnippet: `securityGroup.addIngressRule(ec2.Peer.ipv4('10.0.0.0/16'), ec2.Port.tcp(22), 'Bastion VPC access only');`,
            complianceStandard: 'CIS-AWS-Benchmark'
          });
        }
      }

      // 3. S3 Public Access Allowed
      if (
        /publicReadAccess\s*:\s*true/i.test(code) ||
        /blockPublicAccess\s*:\s*false/i.test(code) ||
        /acl\s*=\s*["']public-read["']/i.test(code)
      ) {
        findings.push({
          id: `find-${findings.length + 1}`,
          file: hunk.file,
          line: lineNum,
          resourceType: 'AWS::S3::Bucket',
          severity: 'high',
          pillar: 'security',
          ruleId: 'AWS-S3-001',
          title: 'S3 Bucket Public Access Enabled',
          message: 'S3 bucket is configured with public read access or Block Public Access is disabled.',
          remediationSnippet: `blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,\nenforceSSL: true,`,
          complianceStandard: 'AWS-Foundational-Security-Best-Practices'
        });
      }

      // 4. Publicly Accessible RDS Database
      if (/publiclyAccessible\s*:\s*true/i.test(code) || /publicly_accessible\s*=\s*true/i.test(code)) {
        findings.push({
          id: `find-${findings.length + 1}`,
          file: hunk.file,
          line: lineNum,
          resourceType: 'AWS::RDS::DBInstance',
          severity: 'high',
          pillar: 'security',
          ruleId: 'AWS-RDS-001',
          title: 'RDS Database Publicly Accessible',
          message: 'RDS database instance is assigned a public IP address, exposing the database engine to the internet.',
          remediationSnippet: `publiclyAccessible: false,\nvpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }`,
          complianceStandard: 'CIS-AWS-Benchmark'
        });
      }

      // 5. Unencrypted Storage (EBS / RDS)
      if (/storageEncrypted\s*:\s*false/i.test(code) || /encrypted\s*=\s*false/i.test(code)) {
        findings.push({
          id: `find-${findings.length + 1}`,
          file: hunk.file,
          line: lineNum,
          resourceType: 'AWS::RDS::DBInstance',
          severity: 'medium',
          pillar: 'security',
          ruleId: 'AWS-RDS-002',
          title: 'Storage Encryption Disabled',
          message: 'Database or block storage volume has encryption at rest turned off.',
          remediationSnippet: `storageEncrypted: true,`,
          complianceStandard: 'Well-Architected'
        });
      }
    }

    // 6. S3 Bucket without explicit encryption in entire hunk
    if (/new\s+s3\.Bucket/i.test(fullAddedText) && !/encryption/i.test(fullAddedText) && !/BucketEncryption/i.test(fullAddedText)) {
      findings.push({
        id: `find-${findings.length + 1}`,
        file: hunk.file,
        line: hunk.newStart,
        resourceType: 'AWS::S3::Bucket',
        severity: 'medium',
        pillar: 'security',
        ruleId: 'AWS-S3-002',
        title: 'S3 Bucket Server-Side Encryption Not Explicitly Configured',
        message: 'Explicit server-side encryption with KMS or S3-managed keys was not defined.',
        remediationSnippet: `encryption: s3.BucketEncryption.S3_MANAGED,`,
        complianceStandard: 'Well-Architected'
      });
    }

    // 7. DynamoDB Missing Point-in-Time Recovery in entire hunk
    if (/new\s+dynamodb\.Table/i.test(fullAddedText) && !/pointInTimeRecovery/i.test(fullAddedText)) {
      findings.push({
        id: `find-${findings.length + 1}`,
        file: hunk.file,
        line: hunk.newStart,
        resourceType: 'AWS::DynamoDB::Table',
        severity: 'low',
        pillar: 'reliability',
        ruleId: 'AWS-DDB-001',
        title: 'DynamoDB Point-in-Time Recovery Disabled',
        message: 'Continuous backups (PITR) protect against accidental deletion and disaster scenarios.',
        remediationSnippet: `pointInTimeRecovery: true,`,
        complianceStandard: 'Well-Architected'
      });
    }
  }

  private static buildReport(targetFiles: string[], findings: AwsIacFinding[]): AwsIacAuditReport {
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;
    const mediumCount = findings.filter(f => f.severity === 'medium').length;
    const lowCount = findings.filter(f => f.severity === 'low').length;

    // Deduct score based on severity weights
    let score = 100;
    score -= criticalCount * 25;
    score -= highCount * 12;
    score -= mediumCount * 5;
    score -= lowCount * 2;
    score = Math.max(0, Math.min(100, score));

    const pillarBreakdown: Record<AwsWellArchitectedPillar, number> = {
      security: findings.filter(f => f.pillar === 'security').length,
      reliability: findings.filter(f => f.pillar === 'reliability').length,
      performanceEfficiency: findings.filter(f => f.pillar === 'performanceEfficiency').length,
      costOptimization: findings.filter(f => f.pillar === 'costOptimization').length,
      operationalExcellence: findings.filter(f => f.pillar === 'operationalExcellence').length,
      sustainability: findings.filter(f => f.pillar === 'sustainability').length
    };

    let summary = `AWS IaC audit evaluated ${targetFiles.length} infrastructure file(s). Found ${findings.length} invariant issue(s).`;
    if (criticalCount > 0) {
      summary = `🚨 Critical AWS Security Gate Block: ${criticalCount} critical violation(s) detected. Fix wildcard IAM or public security group ingress before merging.`;
    } else if (findings.length === 0) {
      summary = `✅ Flawless AWS Well-Architected Compliance. All inspected CDK and CloudFormation constructs adhere to security invariants.`;
    }

    return {
      targetFiles,
      totalFindings: findings.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      securityScore: score,
      findings,
      pillarBreakdown,
      executiveSummary: summary
    };
  }
}
