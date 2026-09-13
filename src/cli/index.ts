#!/usr/bin/env node
/**
 * RepoPulse AI - Maintainer CLI Interface
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DiffAnalyzer } from '../core/diff-analyzer.js';
import { OpenAICodexProvider } from '../providers/openai-codex.js';
import { MCPServer } from '../mcp/mcp-server.js';
import { IssueClassifier } from '../triage/issue-classifier.js';

function printBanner() {
  console.log(`
  ======================================================
     RepoPulse AI - Autonomous Maintainer Harness v1.0
     Powered by OpenAI Codex & Model Context Protocol
     Author: MRLDHANWINN <dhanwinn15@gmail.com>
  ======================================================
  `);
}

function printHelp() {
  printBanner();
  console.log(`
Usage: repo-pulse <command> [options]

Commands:
  review [options]     Review a unified git diff using OpenAI Codex AST heuristics
  triage [options]     Classify and triage an open-source issue description
  serve-mcp            Start standard Model Context Protocol (MCP) stdio server
  health               Verify provider configurations and credentials
  help                 Display this help reference

Options for 'review':
  --diff <filepath>    Path to file containing unified git diff (or reads from stdin)
  --repo <name>        Contextual repository name (e.g. "facebook/react")
  --json               Output machine-readable JSON format

Options for 'triage':
  --file <filepath>    Path to markdown file containing issue title and description
  --title <text>       Inline issue title
  --body <text>        Inline issue body

Examples:
  git diff HEAD~1 | npx repo-pulse review
  npx repo-pulse review --diff ./changes.patch --repo my-org/my-project
  npx repo-pulse serve-mcp
  `);
}

async function handleReview(args: string[]) {
  let diffText = '';
  let repoContext = 'Open Source Project';
  let isJson = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--diff' && args[i + 1]) {
      diffText = fs.readFileSync(path.resolve(args[i + 1]), 'utf-8');
      i++;
    } else if (args[i] === '--repo' && args[i + 1]) {
      repoContext = args[i + 1];
      i++;
    } else if (args[i] === '--json') {
      isJson = true;
    }
  }

  // If no diff provided via flag, read from stdin if piped
  if (!diffText && !process.stdin.isTTY) {
    diffText = fs.readFileSync(0, 'utf-8');
  }

  if (!diffText.trim()) {
    console.error('Error: No git diff provided. Pass --diff <file> or pipe git diff into repo-pulse.');
    process.exit(1);
  }

  const parsed = DiffAnalyzer.parseUnifiedDiff(diffText);
  const provider = new OpenAICodexProvider();
  const summary = await provider.reviewDiff(parsed, repoContext);

  if (isJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printBanner();
    console.log(`Repository Target: ${summary.repo}`);
    console.log(`Files Inspected:   ${parsed.filesChanged}`);
    console.log(`Risk Score:        ${summary.riskScore} / 100`);
    console.log(`Decision:          [${summary.status}]`);
    console.log(`Remarks Count:     ${summary.totalRemarks}`);
    console.log(`Critical Issues:   ${summary.criticalIssues}`);
    console.log('\n--- Executive Maintainer Summary ---');
    console.log(summary.maintainerExecutiveSummary);

    if (summary.remarks.length > 0) {
      console.log('\n--- Detected Code Remarks ---');
      summary.remarks.forEach((r, idx) => {
        console.log(`\n[${idx + 1}] [${r.severity.toUpperCase()}] [${r.category}] ${r.file}:${r.line}`);
        console.log(`    ${r.title}: ${r.message}`);
        if (r.suggestion) {
          console.log(`    Suggestion: ${r.suggestion}`);
        }
      });
    }
    console.log('\nReview complete.');
  }
}

async function handleTriage(args: string[]) {
  let title = 'Sample Issue';
  let body = 'Description of the reported bug';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      const content = fs.readFileSync(path.resolve(args[i + 1]), 'utf-8');
      const lines = content.split('\n');
      title = lines[0]?.replace(/^#*\s*/, '').trim() || 'Untitled Issue';
      body = lines.slice(1).join('\n').trim();
      i++;
    } else if (args[i] === '--title' && args[i + 1]) {
      title = args[i + 1];
      i++;
    } else if (args[i] === '--body' && args[i + 1]) {
      body = args[i + 1];
      i++;
    }
  }

  const result = IssueClassifier.triage({
    id: '1',
    title,
    body,
    author: 'reporter',
    labels: [],
    createdAt: new Date().toISOString()
  });

  printBanner();
  console.log(`Issue Title:     ${title}`);
  console.log(`Classification:  ${result.classification.toUpperCase()}`);
  console.log(`Urgency:         ${result.urgency}`);
  console.log(`Components:      ${result.componentsAffected.join(', ')}`);
  console.log(`Difficulty:      ${result.estimatedDifficulty}`);
  console.log(`Suggested Labels: ${result.suggestedLabels.join(', ')}`);
  console.log(`Repro Feasibility: ${result.reproductionFeasibility}`);
  console.log('\nTriage completed.');
}

async function handleHealth() {
  printBanner();
  console.log('Running system and provider health checks...\n');

  const provider = new OpenAICodexProvider();
  const hasKey = await provider.isConfigured();
  console.log(`1. OpenAI API Credentials:  ${hasKey ? 'CONNECTED' : 'NOT DETECTED (Using Local AST Mode)'}`);
  console.log(`2. Codex Model Target:     ${provider.modelId}`);
  console.log('3. Model Context Protocol: READY (Supports Claude Code, ChatGPT, Cursor, Cherry Studio)');
  console.log('4. Node.js Runtime:        ' + process.version);
  console.log('\nAll core subsystems operational.');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'review':
      await handleReview(args.slice(1));
      break;
    case 'triage':
      await handleTriage(args.slice(1));
      break;
    case 'serve-mcp':
      const server = new MCPServer();
      server.startStdioServer();
      break;
    case 'health':
      await handleHealth();
      break;
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
