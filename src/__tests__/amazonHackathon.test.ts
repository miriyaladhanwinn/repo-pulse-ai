import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeDiffWithGuardrails, analyzePRWithBedrock } from '../amazon/bedrockGuardrailEngine.js';
import { correlateBeeTranscriptsWithPR } from '../amazon/beeWearableBridge.js';
import { verifyAndSynthesizePatch } from '../amazon/astSandboxVerifier.js';
import { handleMcpJsonRpc, MCP_PROTOCOL_VERSION } from '../mcp/streamableHttpServer.js';

test('Bedrock Guardrail Engine redacts leaked AWS keys and emails deterministically', () => {
  const dirtyDiff = `
+ const awsKey = "AKIAIOSFODNN7EXAMPLE";
+ const authorEmail = "dev@internal.corp.example";
  `;
  const result = sanitizeDiffWithGuardrails(dirtyDiff);

  assert.equal(result.safeToTransmit, false);
  assert.equal(result.redactedCount, 2);
  assert.ok(!result.sanitizedDiff.includes('AKIAIOSFODNN7EXAMPLE'));
  assert.ok(result.sanitizedDiff.includes('[REDACTED_AWS_ACCESS_KEY_'));
});

test('Alexa+ Voice Triage generates SSML and deterministic Blast Radius score', async () => {
  const review = await analyzePRWithBedrock({
    repo: 'miriyaladhanwinn/repo-pulse-ai',
    prNumber: 104,
    diff: '+ export async function verifyOtpToken(code: string) { return true; }',
    astSymbolsChanged: ['verifyOtpToken', 'dispatchSessionDeepLink'],
  });

  assert.ok(review.blastRadiusScore > 0);
  assert.ok(review.voiceSummarySSML.startsWith('<speak>'));
  assert.equal(review.astImpacts.length, 2);
});

test('Bee Wearable Bridge correlates developer voice transcript with PR AST symbols', () => {
  const matches = correlateBeeTranscriptsWithPR(
    [
      {
        utteranceId: 'bee-01',
        timestamp: '2026-10-24T08:30:00Z',
        speaker: 'Dhanwinn',
        transcript: 'Make sure we do not merge verifyOtpToken until rate limiting is added.',
      },
    ],
    [
      {
        filePath: 'src/auth/otp.ts',
        changedSymbols: ['verifyOtpToken'],
        rawPatch: '@@ -10,4 +10,5 @@ export function verifyOtpToken() {}',
      },
    ]
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0].matchedSymbol, 'verifyOtpToken');
  assert.ok(matches[0].confidence >= 0.9);
});

test('AST Sandbox Verifier blocks unbalanced syntax and passes valid patches', async () => {
  const badPatch = await verifyAndSynthesizePatch({
    filePath: 'src/index.ts',
    originalSnippet: 'function a() { return 1; }',
    proposedSnippet: 'function a() { return (1; }',
    dryRun: true,
  });
  assert.equal(badPatch.verified, false);

  const goodPatch = await verifyAndSynthesizePatch({
    filePath: 'src/index.ts',
    originalSnippet: 'function a() { return 1; }',
    proposedSnippet: 'function a(): number { return 1; }',
    dryRun: true,
  });
  assert.equal(goodPatch.verified, true);
  assert.ok(goodPatch.githubSuggestedChangeMarkdown.includes('```suggestion'));
});

test('MCP Streamable HTTP handler negotiates spec 2025-11-25 and executes tools', async () => {
  const initRes = await handleMcpJsonRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
  });
  assert.equal(initRes.result.protocolVersion, MCP_PROTOCOL_VERSION);

  const listRes = await handleMcpJsonRpc({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
  });
  assert.equal(listRes.result.tools.length, 4);
});
