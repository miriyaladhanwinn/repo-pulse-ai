# Open Source Mini-Challenge: @repopulse/alexa-mcp-bedrock-guardrail

## 🎯 Mini-Challenge Track Alignment: Open Source ($5,000 + $5,000 AWS Credits)

As required by the official hackathon rules:
> *"Open Source Mini Challenge: Ship a new, additional open-source project (include an open-source license) or a contribution (a branch, a fork, or a pull request) to a public repository during the hackathon window, alongside your primary-track submission."*

We extracted the core Amazon Bedrock pre-flight secret sanitizer and Streamable HTTP Model Context Protocol (Spec `2025-11-25`) server into an independent, zero-dependency, Apache-2.0 micro-package:
**`packages/alexa-mcp-bedrock-guardrail`**

---

## 💡 What It Solves for the Ecosystem
Developers building agents for **Alexa+** and **Amazon Bedrock** frequently struggle with:
1. **MCP Spec `2025-11-25` Streamable HTTP**: Most existing TypeScript MCP implementations only support local `stdio`. Cloud-hosted Alexa+ agents require streamable HTTP over `/mcp` with SSE support.
2. **Pre-Flight Zero-Trust Guardrails**: Sending code diffs to LLMs without local entropy redaction risks leaking AWS credentials (`AKIA...`), corporate emails, and API keys.

`@repopulse/alexa-mcp-bedrock-guardrail` solves both in **zero external runtime dependencies** using purely native `node:http` and `node:crypto`.

---

## 📦 Package Highlights
- **Location in Repo:** `packages/alexa-mcp-bedrock-guardrail/`
- **License:** Apache-2.0
- **Supported MCP Spec:** `2025-11-25` Streamable HTTP + SSE
- **Pre-Flight Scanners:** Shannon entropy scanner, AWS Access Key regex (`AKIA[0-9A-Z]{16}`), GitHub PAT scanner (`ghp_`, `github_pat_`), corporate email / PII filter.
- **Multimodal SSML:** Emits valid `<speak>` SSML tags for Alexa+ and Echo Show screen templates.

---

## 🛠️ Installation & Integration

```bash
# Standalone consumption
npm install @repopulse/alexa-mcp-bedrock-guardrail
```

```typescript
import { createMcpStreamableHttpServer, sanitizeDiffWithGuardrails } from '@repopulse/alexa-mcp-bedrock-guardrail';

// Run pre-flight secret check
const report = sanitizeDiffWithGuardrails(gitDiff);
if (!report.safeToTransmit) {
  console.warn(`Blocked ${report.redactedCount} leaked credentials!`);
}

// Start Streamable HTTP server for Alexa+
const server = createMcpStreamableHttpServer();
server.listen(8787);
```
