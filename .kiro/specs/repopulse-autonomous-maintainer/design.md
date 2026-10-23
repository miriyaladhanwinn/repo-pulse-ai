# Design Specification: RepoPulse Autonomous Maintainer Crew (Kiro + Strands + Bedrock)

## 1. Multi-Agent Architecture (Kiro Crew & Strands Agents SDK)

```text
┌─────────────────────────────────────────────────────────────┐
│                    Kiro Crew Orchestrator                   │
│   • Task Routing  • State Machine  • Multi-Device Events    │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  Guardrail   │        │   BeeMemory  │        │ASTBlastRadius│
│    Agent     │        │    Agent     │        │    Agent     │
│  (Bedrock)   │        │ (Transcripts)│        │  (Heuristics)│
└──────┬───────┘        └──────┬───────┘        └──────┬───────┘
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Strands Agents SDK Execution Plan             │
│  1. Pre-flight Secret Redaction                             │
│  2. Blast-Radius Calculation (0-100)                        │
│  3. Ring Physical Presence Verification Gate (if Score >= 75)│
│  4. Autonomous Sandbox Patch Synthesis                      │
└─────────────────────────────────────────────────────────────┘
```

## 2. Agent Role Definitions

### 2.1 GuardrailAgent
- **Foundation Model:** `amazon.nova-pro-v1:0` & `us.anthropic.claude-3-7-sonnet`
- **Primary Function:** Continuous entropy and regex scanning across unified git patches. Replaces sensitive credentials (`AKIA...`, `ghp_...`, emails) with deterministic redaction tokens.
- **Fail-Safe:** Rejects transmission if raw secret entropy $H(S) \ge 4.5$.

### 2.2 BeeMemoryAgent
- **Input:** Wearable audio transcription events from Bee Wearables.
- **Output:** Correlation score between spoken phrases and changed AST functions.

### 2.3 ASTBlastRadiusAgent
- **Input:** Unified diff + AST symbol list.
- **Output:** Blast radius score (0-100), dependency impact graph, and SSML `<speak>` summary for Alexa+.

### 2.4 DeploymentGateAgent (Ring Integration)
- **Condition:** Triggered when Blast Radius $\ge 75$.
- **Mechanism:** Webhook listener for Ring intercom unlock or camera-verified presence. Merges stay locked until attested.

### 2.5 FireTvWarRoomAgent
- **Target:** 10-foot living room UI navigation via standard D-Pad keycodes.
