import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeDiffWithGuardrails, analyzePRWithBedrock } from '../amazon/bedrockGuardrailEngine.js';
import { correlateBeeTranscriptsWithPR } from '../amazon/beeWearableBridge.js';
import { verifyAndSynthesizePatch } from '../amazon/astSandboxVerifier.js';
import { handleMcpJsonRpc, MCP_PROTOCOL_VERSION } from '../mcp/streamableHttpServer.js';
import { evaluateRingDeploymentGate, reduceFireTvRemoteInput, createInitialFireTvState } from '../amazon/multiDeviceOrchestrator.js';
import { isAmazonJudgeMode, createJudgeSession, DEFAULT_AMAZON_JUDGE_SCENARIO } from '../amazon/judgeSimulationMode.js';
import { executeStrandsMaintenancePlan } from '../amazon/strandsAgentOrchestrator.js';

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
  assert.equal(listRes.result.tools.length, 6);

  const ringGateRes = await handleMcpJsonRpc({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'repopulse_ring_deployment_gate',
      arguments: {
        prNumber: 104,
        blastRadiusScore: 85,
      },
    },
  });
  assert.equal(ringGateRes.result.isError, false);
  const gateData = JSON.parse(ringGateRes.result.content[0].text);
  assert.equal(gateData.mergeLocked, true);
  assert.equal(gateData.ringAttestationRequired, true);
});

test('Ring Deployment Gate locks merges on CRITICAL blast radius and unlocks with physical attestation', () => {
  // 1. Critical blast radius without attestation -> LOCKED
  const lockedGate = evaluateRingDeploymentGate(104, 88);
  assert.equal(lockedGate.mergeLocked, true);
  assert.equal(lockedGate.ringVerified, false);
  assert.ok(lockedGate.statusMessage.includes('LOCKED'));

  // 2. Valid physical presence attestation -> UNLOCKED
  const unlockedGate = evaluateRingDeploymentGate(104, 88, {
    deviceId: 'ring-cam-office-door',
    eventType: 'intercom_unlock',
    operatorName: 'Lead Architect',
    timestamp: '2026-10-24T09:00:00Z',
    verifiedSignature: 'sig_ring_biometric_valid',
  });
  assert.equal(unlockedGate.mergeLocked, false);
  assert.equal(unlockedGate.ringVerified, true);
  assert.ok(unlockedGate.statusMessage.includes('UNLOCKED'));

  // 3. Low blast radius -> UNLOCKED by default
  const lowRiskGate = evaluateRingDeploymentGate(105, 30);
  assert.equal(lowRiskGate.mergeLocked, false);
  assert.equal(lowRiskGate.ringAttestationRequired, false);
});

test('Fire TV Remote D-Pad Navigation updates focus, inspects diffs, and controls rotation', () => {
  const astSymbols = ['verifyOtpToken', 'dispatchSessionDeepLink', 'chargeCustomerCard'];
  let state = createInitialFireTvState(astSymbols.length);

  assert.equal(state.focusedAstNodeIndex, 0);

  // D-Pad Right -> moves to next node
  state = reduceFireTvRemoteInput(state, 'DPAD_RIGHT', astSymbols);
  assert.equal(state.focusedAstNodeIndex, 1);
  assert.ok(state.lastActionAnnouncement.includes('dispatchSessionDeepLink'));

  // Select -> toggles diff inspection
  state = reduceFireTvRemoteInput(state, 'SELECT', astSymbols);
  assert.equal(state.inspectingDiffModal, true);

  // Play/Pause -> toggles 3D core rotation
  state = reduceFireTvRemoteInput(state, 'PLAY_PAUSE', astSymbols);
  assert.equal(state.autoRotate3DCore, false);
});

test('Judge Simulation Mode bypasses auth and provides pre-hydrated scenario', () => {
  assert.equal(isAmazonJudgeMode('http://localhost:3000/?judge=amazon'), true);
  assert.equal(isAmazonJudgeMode('http://localhost:3000/'), false);

  const session = createJudgeSession();
  assert.equal(session.token, 'judge-amazon-session-token');
  assert.equal(session.user.role.includes('Principal Evaluator'), true);
  assert.equal(DEFAULT_AMAZON_JUDGE_SCENARIO.tracksActivated.length, 5);
});

test('Strands Agents SDK coordinates Guardrail, Bee, Alexa+, Ring, and Sandbox agents', async () => {
  const plan = await executeStrandsMaintenancePlan({
    repo: DEFAULT_AMAZON_JUDGE_SCENARIO.targetPR.repo,
    prNumber: DEFAULT_AMAZON_JUDGE_SCENARIO.targetPR.prNumber,
    rawDiff: DEFAULT_AMAZON_JUDGE_SCENARIO.targetPR.rawDiff,
    astSymbols: DEFAULT_AMAZON_JUDGE_SCENARIO.targetPR.astSymbolsChanged,
    beeTranscripts: [
      {
        utteranceId: 'bee-01',
        speaker: 'Architect',
        timestamp: '10m ago',
        transcript: 'Do not merge verifyOtpToken without validation.',
      },
    ],
  });

  assert.ok(plan.planId.startsWith('strands-plan-'));
  assert.ok(plan.guardrailRedactions >= 2);
  assert.ok(plan.blastRadiusScore > 0);
  assert.equal(plan.gateStatus.ringAttestationRequired, true);
  assert.equal(plan.suggestedPatchVerified, true);
  assert.ok(plan.ssmlOutput.startsWith('<speak>'));
});
