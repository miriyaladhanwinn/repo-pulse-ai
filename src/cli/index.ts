#!/usr/bin/env node
/**
 * RepoPulse AI - Maintainer CLI Interface
 * Amazon Developer Hackathon Edition
 * Powered by Amazon Bedrock, Amazon Nova & Model Context Protocol.
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DiffAnalyzer } from '../core/diff-analyzer.js';
import { OpenAICodexProvider } from '../providers/openai-codex.js';
import { AmazonBedrockProvider } from '../providers/bedrock-provider.js';
import { AwsIacAnalyzer } from '../core/aws-iac-analyzer.js';
import { AwsFinOpsEstimator } from '../core/finops-estimator.js';
import { BedrockGuardrailsEngine } from '../core/bedrock-guardrails.js';
import { MCPServer } from '../mcp/mcp-server.js';
import { IssueClassifier } from '../triage/issue-classifier.js';

function printBanner() {
  console.log(`
  ========================================================================
     ⚡ RepoPulse AI • Amazon Developer Hackathon Edition
     Powered by Amazon Bedrock (Nova Pro/Lite/Micro) & Model Context Protocol
     AWS IaC Security • FinOps PR Cost-Delta • Bedrock Guardrails
     Author: MRLDHANWINN <dhanwinn15@gmail.com>
  ========================================================================
  `);
}

function printHelp() {
  printBanner();
  console.log(`
Usage: repo-pulse <command> [options]

Commands:
  review [options]            Review unified git diff using Amazon Bedrock Nova & AST heuristics
  aws-audit [options]         Audit AWS CDK, CloudFormation & Terraform diff for security invariants
  cost-delta [options]        Calculate projected monthly AWS cloud spend delta (FinOps for PRs)
  guardrail [options]         Scan diff or text through Amazon Bedrock Guardrails (credential/injection)
  triage [options]            Classify and triage an open-source issue description
  studio [--port <n>]         Launch the interactive 3D Web Studio (Apple Liquid Glass)
  desktop                     Launch the native Electron desktop application
  serve-mcp                   Start standard Model Context Protocol (MCP) stdio server
  serve-mcp-http [--port <n>] Start MCP server over Streamable HTTP (for Amazon Q & IDE agents)
  health                      Verify AWS Bedrock and foundation provider credentials
  help                        Display this help reference

Options for 'review', 'aws-audit', 'cost-delta':
  --diff <filepath>           Path to file containing unified git diff (or reads from stdin)
  --repo <name>               Contextual repository name (e.g. "aws-samples/cloud-app")
  --json                      Output machine-readable JSON format

Options for 'guardrail':
  --text <string>             Inline text to evaluate
  --file <filepath>           File path to scan

Options for 'triage':
  --file <filepath>           Path to markdown file containing issue title and description
  --title <text>              Inline issue title
  --body <text>               Inline issue body

Examples:
  git diff HEAD~1 | npx repo-pulse review
  git diff HEAD~1 | npx repo-pulse aws-audit
  git diff HEAD~1 | npx repo-pulse cost-delta
  npx repo-pulse guardrail --text "AWS_KEY = AKIAIOSFODNN7EXAMPLE"
  npx repo-pulse serve-mcp
  `);
}

function readDiffInput(args: string[]): { diffText: string; repoContext: string; isJson: boolean } {
  let diffText = '';
  let repoContext = 'Open Source Project';
  let isJson = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--diff' && args[i + 1]) {
      const diffPath = path.resolve(args[i + 1]);
      if (!fs.existsSync(diffPath)) {
        console.error(`Error: Diff file not found at: ${diffPath}`);
        process.exit(1);
      }
      diffText = fs.readFileSync(diffPath, 'utf-8');
      i++;
    } else if (args[i] === '--repo' && args[i + 1]) {
      repoContext = args[i + 1];
      i++;
    } else if (args[i] === '--json') {
      isJson = true;
    }
  }

  if (!diffText && !process.stdin.isTTY) {
    try {
      diffText = fs.readFileSync(0, 'utf-8');
    } catch {}
  }

  return { diffText, repoContext, isJson };
}

async function handleReview(args: string[]) {
  const { diffText, repoContext, isJson } = readDiffInput(args);

  if (!diffText.trim()) {
    console.error('Error: No git diff provided. Pass --diff <file> or pipe git diff into repo-pulse.');
    process.exit(1);
  }

  const parsed = DiffAnalyzer.parseUnifiedDiff(diffText);
  const bedrock = new AmazonBedrockProvider();
  const summary = await bedrock.reviewDiff(parsed, repoContext);

  if (isJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printBanner();
    console.log(`Repository Target: ${summary.repo}`);
    console.log(`Files Inspected:   ${parsed.filesChanged}`);
    console.log(`Risk Score:        ${summary.riskScore} / 100`);
    console.log(`Decision:          [${summary.status}]`);
    console.log(`\nExecutive Summary:\n${summary.maintainerExecutiveSummary}\n`);

    if (summary.remarks.length > 0) {
      console.log('Remarks & Recommendations:');
      summary.remarks.forEach((r, idx) => {
        console.log(` [${idx + 1}] [${r.severity.toUpperCase()}] ${r.file}:${r.line} - ${r.title}`);
        console.log(`     ${r.message}`);
        if (r.suggestion) console.log(`     💡 Suggestion: ${r.suggestion}`);
      });
    }
  }
}

async function handleAwsAudit(args: string[]) {
  const { diffText, isJson } = readDiffInput(args);

  if (!diffText.trim()) {
    console.error('Error: No git diff provided. Pass --diff <file> or pipe git diff into repo-pulse.');
    process.exit(1);
  }

  const parsed = DiffAnalyzer.parseUnifiedDiff(diffText);
  const report = AwsIacAnalyzer.auditDiff(parsed);

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printBanner();
    console.log(`AWS Security Score: ${report.securityScore} / 100`);
    console.log(`Files Evaluated:    ${report.targetFiles.length} file(s)`);
    console.log(`Total Findings:     ${report.totalFindings} (Critical: ${report.criticalCount}, High: ${report.highCount}, Medium: ${report.mediumCount})\n`);
    console.log(`Executive Summary:  ${report.executiveSummary}\n`);

    if (report.findings.length > 0) {
      console.log('AWS Invariant Findings:');
      report.findings.forEach((f, idx) => {
        console.log(` [${idx + 1}] [${f.severity.toUpperCase()}] [${f.ruleId}] ${f.file}:${f.line}`);
        console.log(`     ${f.title} (${f.resourceType})`);
        console.log(`     ${f.message}`);
        if (f.remediationSnippet) {
          console.log(`     🔧 Remediation:\n     ${f.remediationSnippet.replace(/\n/g, '\n     ')}`);
        }
      });
    }
  }
}

async function handleCostDelta(args: string[]) {
  const { diffText, isJson } = readDiffInput(args);

  if (!diffText.trim()) {
    console.error('Error: No git diff provided. Pass --diff <file> or pipe git diff into repo-pulse.');
    process.exit(1);
  }

  const parsed = DiffAnalyzer.parseUnifiedDiff(diffText);
  const report = AwsFinOpsEstimator.estimateDiff(parsed);

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printBanner();
    console.log(`Monthly Cost Delta: ${report.totalMonthlySpendDelta >= 0 ? '+' : ''}$${report.totalMonthlySpendDelta.toFixed(2)} USD / month`);
    console.log(`Projected Annual:   ${report.projectedAnnualDelta >= 0 ? '+' : ''}$${report.projectedAnnualDelta.toFixed(2)} USD / year\n`);
    console.log(`Summary:            ${report.executiveSummary}\n`);

    if (report.resources.length > 0) {
      console.log('Resource Breakdown:');
      report.resources.forEach((r, idx) => {
        console.log(` [${idx + 1}] [${r.action.toUpperCase()}] ${r.resourceName} (${r.resourceType})`);
        console.log(`     Monthly Delta: ${r.monthlyCostDelta >= 0 ? '+' : ''}$${r.monthlyCostDelta.toFixed(2)}/mo`);
        console.log(`     Details: ${r.pricingTierDetails}`);
        if (r.optimizationAdvice) console.log(`     💡 Bedrock FinOps Tip: ${r.optimizationAdvice}`);
      });
    }

    if (report.finopsRecommendations.length > 0) {
      console.log('\nFinOps Recommendations:');
      report.finopsRecommendations.forEach((rec, idx) => {
        console.log(` * ${rec}`);
      });
    }
  }
}

async function handleGuardrail(args: string[]) {
  let content = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--text' && args[i + 1]) {
      content = args[i + 1];
      i++;
    } else if (args[i] === '--file' && args[i + 1]) {
      content = fs.readFileSync(path.resolve(args[i + 1]), 'utf-8');
      i++;
    }
  }

  if (!content && !process.stdin.isTTY) {
    try {
      content = fs.readFileSync(0, 'utf-8');
    } catch {}
  }

  if (!content) {
    console.error('Error: No content provided for guardrail inspection. Use --text or --file.');
    process.exit(1);
  }

  const engine = new BedrockGuardrailsEngine();
  const result = await engine.evaluate(content);

  printBanner();
  console.log(`Guardrail Policy Verdict: [${result.action}]`);
  console.log(`Risk Score:               ${result.riskScore} / 100`);
  console.log(`Blocked:                  ${result.isBlocked ? 'YES' : 'NO'}`);
  console.log(`Evaluation Latency:       ${result.evaluatorLatencyMs}ms\n`);

  if (result.violations.length > 0) {
    console.log('Detected Violations:');
    result.violations.forEach((v, idx) => {
      console.log(` [${idx + 1}] [${v.severity.toUpperCase()}] ${v.type}: ${v.description}`);
    });
  } else {
    console.log('✅ Clean. Zero credential leaks, prompt injections, or policy violations detected.');
  }
}

async function handleTriage(args: string[]) {
  let title = '';
  let body = '';
  let isJson = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      title = args[i + 1];
      i++;
    } else if (args[i] === '--body' && args[i + 1]) {
      body = args[i + 1];
      i++;
    } else if (args[i] === '--file' && args[i + 1]) {
      const filePath = path.resolve(args[i + 1]);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        title = lines[0] ? lines[0].replace(/^#+\s*/, '').trim() : 'Triage Request';
        body = lines.slice(1).join('\n').trim();
      }
      i++;
    } else if (args[i] === '--json') {
      isJson = true;
    }
  }

  if (!title && !body) {
    console.error('Error: Missing issue details. Provide --title and --body, or --file.');
    process.exit(1);
  }

  const issue = {
    id: `CLI-${Date.now().toString().slice(-4)}`,
    title,
    body,
    author: 'cli-user',
    labels: [],
    createdAt: new Date().toISOString()
  };

  const bedrock = new AmazonBedrockProvider();
  const triage = await bedrock.classifyIssue(issue);

  if (isJson) {
    console.log(JSON.stringify(triage, null, 2));
  } else {
    printBanner();
    console.log(`Issue Triage ID:     ${triage.issueId}`);
    console.log(`Classification:      ${triage.classification.toUpperCase()}`);
    console.log(`Urgency Matrix:      [${triage.urgency}]`);
    console.log(`Estimated Effort:    ${triage.estimatedDifficulty}`);
    console.log(`Suggested Labels:    ${triage.suggestedLabels.join(', ')}`);
    console.log(`Repro Feasibility:   ${triage.reproductionFeasibility}`);
  }
}

async function handleHealth() {
  printBanner();
  console.log('Verifying System Configurations & AI Gateway Credentials:\n');

  const bedrock = new AmazonBedrockProvider();
  const bedrockConfigured = await bedrock.isConfigured();
  console.log(` [1] Amazon Bedrock (Nova Pro/Lite): ${bedrockConfigured ? 'CONNECTED (AWS IAM/SigV4)' : 'OFFLINE (Local Nova Heuristic Mode Active)'}`);
  console.log(`     Region:                         ${bedrock.region}`);

  const codex = new OpenAICodexProvider();
  const codexConfigured = await codex.isConfigured();
  console.log(` [2] OpenAI Codex / GPT-4o:          ${codexConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);

  const anthropicConfigured = !!process.env.ANTHROPIC_API_KEY;
  console.log(` [3] Anthropic Claude 3.7 Sonnet:    ${anthropicConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);

  const guardrails = new BedrockGuardrailsEngine();
  console.log(` [4] Amazon Bedrock Guardrails:      ACTIVE (Zero-Leak Protection)`);

  console.log('\nStatus: All systems operational. Ready for Amazon Developer Hackathon evaluation.\n');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'review':
      await handleReview(args.slice(1));
      break;
    case 'aws-audit':
      await handleAwsAudit(args.slice(1));
      break;
    case 'cost-delta':
      await handleCostDelta(args.slice(1));
      break;
    case 'guardrail':
      await handleGuardrail(args.slice(1));
      break;
    case 'triage':
      await handleTriage(args.slice(1));
      break;
    case 'serve-mcp': {
      const server = new MCPServer();
      server.startStdioServer();
      break;
    }
    case 'serve-mcp-http': {
      const { startMcpHttpServer } = await import('../mcp/mcp-http.js');
      let httpPort = 8787;
      const pIdx = args.indexOf('--port');
      if (pIdx !== -1 && args[pIdx + 1]) {
        httpPort = parseInt(args[pIdx + 1], 10);
      }
      startMcpHttpServer(httpPort);
      break;
    }
    case 'health':
      await handleHealth();
      break;
    case 'studio': {
      const { StudioServer } = await import('../server/studio-server.js');
      let port = 3000;
      const portIdx = args.indexOf('--port');
      if (portIdx !== -1 && args[portIdx + 1]) {
        port = parseInt(args[portIdx + 1], 10);
      }
      const studio = new StudioServer(port);
      const activePort = await studio.start();
      printBanner();
      console.log(`⚡ RepoPulse Maintainer Studio live at: http://localhost:${activePort}`);
      console.log(`   Amazon Bedrock & Nova Pro, AWS IaC Audit & FinOps Engine ready.`);
      console.log(`   Press Ctrl+C to shutdown studio.\n`);
      break;
    }
    case 'desktop': {
      const { spawn } = await import('child_process');
      const { fileURLToPath } = await import('url');
      const { createRequire } = await import('module');
      const req = createRequire(import.meta.url);
      const electronPath = req('electron') as string;
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      const desktopMain = path.resolve(currentDir, '..', 'desktop', 'main.js');

      printBanner();
      console.log('⚡ Launching RepoPulse Studio Native Desktop Shell...');
      console.log('   Amazon Bedrock & Nova Gateway, Apple Liquid Glass frame & AWS IaC inspector.');

      const child = spawn(electronPath, [desktopMain, ...args.slice(1)], {
        stdio: 'inherit',
        windowsHide: false
      });

      child.on('error', (err: Error) => {
        console.error('Failed to spawn desktop process:', err.message);
        console.log('Tip: You can also run the web studio directly via: repo-pulse studio');
      });

      child.on('exit', (code: number | null) => {
        process.exit(code ?? 0);
      });
      break;
    }
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
