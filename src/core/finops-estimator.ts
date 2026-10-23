/**
 * AWS FinOps PR Cost-Delta Estimator
 * Calculates projected cloud spend increases or decreases on every Pull Request.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import { AwsFinOpsReport, AwsFinOpsResourceDelta } from '../types/aws.js';
import { ParsedDiff, DiffHunk } from '../types/index.js';

interface KnownInstancePrice {
  hourly: number;
  monthly: number;
  description: string;
}

const EC2_PRICING: Record<string, KnownInstancePrice> = {
  't3.nano': { hourly: 0.0052, monthly: 3.80, description: '2 vCPU, 0.5 GiB' },
  't3.micro': { hourly: 0.0104, monthly: 7.60, description: '2 vCPU, 1.0 GiB' },
  't3.small': { hourly: 0.0208, monthly: 15.20, description: '2 vCPU, 2.0 GiB' },
  't3.medium': { hourly: 0.0416, monthly: 30.40, description: '2 vCPU, 4.0 GiB' },
  't3.large': { hourly: 0.0832, monthly: 60.80, description: '2 vCPU, 8.0 GiB' },
  't3.xlarge': { hourly: 0.1664, monthly: 121.60, description: '4 vCPU, 16.0 GiB' },
  't4g.micro': { hourly: 0.0084, monthly: 6.13, description: 'Graviton2, 2 vCPU, 1.0 GiB' },
  't4g.small': { hourly: 0.0168, monthly: 12.26, description: 'Graviton2, 2 vCPU, 2.0 GiB' },
  't4g.medium': { hourly: 0.0336, monthly: 24.53, description: 'Graviton2, 2 vCPU, 4.0 GiB' },
  't4g.large': { hourly: 0.0672, monthly: 49.06, description: 'Graviton2, 2 vCPU, 8.0 GiB' },
  'm6i.large': { hourly: 0.096, monthly: 70.08, description: '2 vCPU, 8.0 GiB General Purpose' },
  'm6i.xlarge': { hourly: 0.192, monthly: 140.16, description: '4 vCPU, 16.0 GiB General Purpose' },
  'c6g.large': { hourly: 0.068, monthly: 49.64, description: 'Graviton2 Compute Optimized' }
};

export class AwsFinOpsEstimator {
  /**
   * Evaluates a git diff for AWS infrastructure changes and computes the monthly cost impact.
   */
  public static estimateDiff(diff: ParsedDiff): AwsFinOpsReport {
    const resources: AwsFinOpsResourceDelta[] = [];
    const recommendations: string[] = [];

    for (const hunk of diff.hunks) {
      this.evaluateHunk(hunk, resources, recommendations);
    }

    let totalMonthlySpendDelta = 0;
    const serviceBreakdown: Record<string, number> = {};

    for (const r of resources) {
      totalMonthlySpendDelta += r.monthlyCostDelta;
      const s = r.resourceType.split('::')[1] || 'Other';
      serviceBreakdown[s] = (serviceBreakdown[s] || 0) + r.monthlyCostDelta;
    }

    // Round to 2 decimals
    totalMonthlySpendDelta = Math.round(totalMonthlySpendDelta * 100) / 100;
    const projectedAnnualDelta = Math.round(totalMonthlySpendDelta * 12 * 100) / 100;

    let summary = 'No cloud billing impact detected across this diff.';
    if (totalMonthlySpendDelta > 0) {
      summary = `⚠️ PR Cost Warning: This changeset increases projected AWS billing by +$${totalMonthlySpendDelta.toFixed(2)}/month (+$${projectedAnnualDelta.toFixed(2)}/year).`;
    } else if (totalMonthlySpendDelta < 0) {
      summary = `🎉 Cloud Cost Savings: This changeset reduces projected AWS billing by -$${Math.abs(totalMonthlySpendDelta).toFixed(2)}/month (-$${Math.abs(projectedAnnualDelta).toFixed(2)}/year).`;
    }

    return {
      totalMonthlySpendDelta,
      projectedAnnualDelta,
      currency: 'USD',
      resources,
      serviceBreakdown,
      executiveSummary: summary,
      finopsRecommendations: recommendations
    };
  }

  private static evaluateHunk(hunk: DiffHunk, resources: AwsFinOpsResourceDelta[], recommendations: string[]): void {
    for (const line of hunk.lines) {
      const isAdded = line.startsWith('+');
      const isDeleted = line.startsWith('-');
      if (!isAdded && !isDeleted) continue;

      const action = isAdded ? 'added' : 'deleted';
      const factor = isAdded ? 1 : -1;
      const code = line.substring(1);

      // 1. NAT Gateway detection
      if (/new\s+ec2\.CfnNatGateway/i.test(code) || /new\s+ec2\.NatGateway/i.test(code) || /resource\s+["']aws_nat_gateway["']/i.test(code)) {
        const cost = 32.85;
        resources.push({
          resourceType: 'AWS::EC2::NatGateway',
          resourceName: 'NAT Gateway',
          action,
          unitCostMonthly: cost,
          quantity: 1,
          monthlyCostDelta: cost * factor,
          pricingTierDetails: '$0.045/hr x 730 hours ($32.85/mo baseline + data transfer)',
          optimizationAdvice: 'Consider AWS VPC Endpoints (Gateway endpoints for S3/DynamoDB are free) to eliminate NAT transfer data charges.'
        });
        recommendations.push('Verify if a dedicated NAT Gateway is mandatory. VPC Endpoints for S3 and DynamoDB eliminate NAT data processing charges entirely.');
      }

      // 2. EC2 Instance additions/removals
      for (const [instType, price] of Object.entries(EC2_PRICING)) {
        const [cls, sz] = instType.split('.');
        const isMatch = (
          new RegExp(`['"]${instType.replace('.', '\\.')}['"]`, 'i').test(code) ||
          new RegExp(`InstanceType\\.${instType.replace('.', '_').toUpperCase()}`, 'i').test(code) ||
          (new RegExp(`InstanceClass\\.${cls}`, 'i').test(code) && new RegExp(`InstanceSize\\.${sz}`, 'i').test(code))
        );

        if (isMatch) {
          resources.push({
            resourceType: 'AWS::EC2::Instance',
            resourceName: `EC2 (${instType})`,
            action,
            unitCostMonthly: price.monthly,
            quantity: 1,
            monthlyCostDelta: price.monthly * factor,
            pricingTierDetails: `${price.description} • $${price.hourly}/hr x 730 hrs = $${price.monthly}/mo`,
            optimizationAdvice: instType.startsWith('t3.')
              ? `Switching to AWS Graviton (${instType.replace('t3', 't4g')}) offers ~20% lower cost and higher single-core performance.`
              : undefined
          });

          if (instType.startsWith('t3.')) {
            recommendations.push(`Consider migrating instance ${instType} to AWS Graviton (${instType.replace('t3', 't4g')}) to reduce spend by 20% while gaining better performance.`);
          }
          break;
        }
      }

      // 3. RDS Multi-AZ Database
      if (/new\s+rds\.DatabaseInstance/i.test(code) || /resource\s+["']aws_db_instance["']/i.test(code)) {
        const isMultiAz = /multiAz\s*:\s*true/i.test(code) || /multi_az\s*=\s*true/i.test(code);
        const baseCost = isMultiAz ? 140.00 : 70.00;
        resources.push({
          resourceType: 'AWS::RDS::DBInstance',
          resourceName: `RDS Database (${isMultiAz ? 'Multi-AZ' : 'Single-AZ'})`,
          action,
          unitCostMonthly: baseCost,
          quantity: 1,
          monthlyCostDelta: baseCost * factor,
          pricingTierDetails: `Estimated baseline compute & storage for RDS instance.`,
          optimizationAdvice: 'For non-production staging environments, disable Multi-AZ or use Amazon Aurora Serverless v2 with auto-pause.'
        });
      }

      // 4. Amazon Bedrock PR Review Agent
      if (/new\s+bedrock\./i.test(code) || /bedrock-runtime/i.test(code)) {
        resources.push({
          resourceType: 'AWS::Bedrock::Inference',
          resourceName: 'Amazon Bedrock Nova Pro Inference',
          action: 'added',
          unitCostMonthly: 12.50,
          quantity: 1,
          monthlyCostDelta: 12.50,
          pricingTierDetails: 'Estimated inference for ~1,000 monthly PR reviews with Amazon Nova Pro & Guardrails.',
          optimizationAdvice: 'Use Amazon Nova Micro for initial diff triage and route only complex architectural hunks to Amazon Nova Pro.'
        });
      }
    }
  }
}
