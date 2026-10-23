# Requirements: RepoPulse Autonomous Maintainer Crew (Kiro + Bedrock + Alexa+ MCP)

## 1. Overview
RepoPulse orchestrates a multi-agent maintenance crew powered by **Kiro Crew**, **Strands Agents SDK**, and **Amazon Bedrock (`amazon.nova-pro-v1:0`)** exposed over **MCP Streamable HTTP (`2025-11-25`)** for **Alexa+**, **Bee Wearable AI**, **Fire TV**, and **Ring**.

## 2. EARS Requirements
- **REQ-01 (Ubiquitous):** The `GuardrailAgent` SHALL redact all `AKIA*` AWS keys, GitHub tokens, high-entropy secrets, and PII prior to external LLM transmission.
- **REQ-02 (Event-Driven):** WHEN a developer speaks a constraint into a **Bee Wearable** device, the `BeeMemoryAgent` SHALL correlate spoken symbol names against open Pull Request AST diffs within 500ms.
- **REQ-03 (Event-Driven):** WHEN an **Alexa+** user invokes `repopulse_alexa_voice_triage`, the `ASTBlastRadiusAgent` SHALL return valid SSML voice output and an APL/Fire TV visual telemetry card.
- **REQ-04 (State-Driven):** WHILE a Pull Request has a Blast Radius Score >= 75 (`CRITICAL`), the `DeploymentGateAgent` SHALL require a verified physical presence/intercom attestation from **Ring** before unlocking merge permissions.
- **REQ-05 (User-Driven):** WHEN a developer uses a **Fire TV Remote D-Pad**, the `FireTvWarRoomAgent` SHALL navigate AST dependency graph nodes and inspect Bedrock diff guardrail findings.
- **REQ-06 (Automated):** The `SandboxVerifierAgent` SHALL verify AST delimiter balance and execute isolated unit test suites before synthesizing GitHub Suggested Change blocks.
