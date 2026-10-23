# @repopulse/alexa-mcp-bedrock-guardrail

> **Autonomous Secret Redaction & Streamable HTTP Model Context Protocol (`2025-11-25`) for Alexa+ & Amazon Bedrock**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![MCP Spec](https://img.shields.io/badge/MCP_Spec-2025--11--25-FF9900.svg)](https://modelcontextprotocol.io/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0_Runtime-success.svg)]()

Built as part of the **Amazon Developer Hackathon (Open Source Mini-Challenge)**.

## 🚀 Features

- **Streamable HTTP MCP Transport (`Spec 2025-11-25`)**: Fully compliant `/mcp` endpoint supporting both Server-Sent Events (`text/event-stream`) and standard JSON-RPC 2.0.
- **Amazon Bedrock Pre-Flight Guardrails**: Scans code diffs and prompts using Shannon entropy and regex to redact:
  - AWS Access Key IDs (`AKIA...`)
  - GitHub Personal Access Tokens (`ghp_...`, `github_pat_...`)
  - Corporate emails and PII
  - High-entropy cryptographic tokens
- **Alexa+ Multimodal Synthesis**: Emits `<speak>` SSML voice responses alongside structured JSON for Echo Show and Fire TV screens.
- **Zero Runtime Dependencies**: Uses 100% native Node.js standard library (`node:http`, `node:crypto`).

## 📦 Quick Start

```typescript
import { createMcpStreamableHttpServer, sanitizeDiffWithGuardrails } from '@repopulse/alexa-mcp-bedrock-guardrail';

// 1. Sanitize diffs before transmitting to any LLM
const dirtyDiff = `+ const awsKey = "AKIAIOSFODNN7EXAMPLE";`;
const report = sanitizeDiffWithGuardrails(dirtyDiff);
console.log(report.safeToTransmit); // false
console.log(report.sanitizedDiff);  // + const awsKey = "[REDACTED_AWS_ACCESS_KEY_...]";

// 2. Start Alexa+ Streamable HTTP MCP server
const server = createMcpStreamableHttpServer();
server.listen(8787, () => {
  console.log('Alexa+ Streamable HTTP MCP server running on http://localhost:8787/mcp');
});
```

## 📜 License
Apache-2.0.
