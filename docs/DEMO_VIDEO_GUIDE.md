# 🎥 3-Minute Demo Video Recording Guide

> **Target Duration**: Exactly 2:45 to 2:55 (Must be strictly under 3:00 for Devpost!)  
> **Recommended Recording Software**: OBS Studio, Loom, or Screen Studio  
> **Display Resolution**: 1080p (1920x1080) at 60fps  

---

## 📋 Pre-Recording Setup Checklist

1. **Terminal Setup**: Open a clean terminal (iTerm / Windows Terminal) with font size ~16px.
   - Navigate to `repo-pulse-ai`.
   - Clear terminal with `clear` or `cls`.
2. **Browser Setup**: Open Chrome/Brave to `http://localhost:3000` (run `npm run studio` in background).
3. **Desktop App**: Have `npm run desktop` open in another workspace ready to show the Apple Liquid Glass frame.
4. **Microphone**: Test audio levels (clear, crisp voiceover without background noise).

---

## 🎬 Shot-by-Shot Timeline & Teleprompter

### Shot 1: The Problem (0:00 - 0:25)
* **What to Show**: Split screen showing GitHub Pull Request with a problematic CDK commit and an unexpected AWS billing chart.
* **Voiceover**:  
  > *"Every day, engineering teams merge pull requests that secretly break their cloud security and blow their AWS budget. A single commit can introduce an open port 22, a wildcard IAM policy, or an unmonitored NAT Gateway that adds hundreds of dollars to the monthly AWS bill before anyone notices. Today, we're solving this with RepoPulse AI."*

### Shot 2: Solution & Architecture Overview (0:25 - 0:50)
* **What to Show**: Transition to RepoPulse Desktop Shell with the 3D Spatial Quantum Core rotating smoothly.
* **Voiceover**:  
  > *"RepoPulse AI is an autonomous cloud maintainer and FinOps workstation built for the Amazon Developer Hackathon. Powered by Amazon Bedrock, Amazon Nova, and Bedrock Guardrails, RepoPulse operates as a native desktop workstation and a self-hosted Model Context Protocol server for Alexa+."*

### Shot 3: Demo 1 — Voice with Alexa+ & AWS IaC Audit (0:50 - 1:25)
* **What to Show**: In terminal or Studio, trigger:
  ```bash
  git diff HEAD~1 | npx repo-pulse aws-audit
  ```
* **Voiceover**:  
  > *"Let's ask Alexa: 'Alexa, ask RepoPulse: does my latest pull request have any AWS security risks?'  
  > Through our Streamable HTTP MCP server, RepoPulse inspects the diff. In under 5 milliseconds, it flags a wildcard IAM permission and an open port 22 security group, scoring the PR 50 out of 100 and providing non-breaking remediation code."*

### Shot 4: Demo 2 — AWS FinOps PR Cost-Delta (1:25 - 1:55)
* **What to Show**: Run in terminal:
  ```bash
  git diff HEAD~1 | npx repo-pulse cost-delta
  ```
* **Voiceover**:  
  > *"Next: cloud costs. Developers rarely know the dollar impact of their infrastructure changes. When we run cost-delta, RepoPulse detects the newly added NAT Gateway and t3.large instance, projecting an exact cost increase of $93.65 a month. Even better, Amazon Nova suggests switching to AWS Graviton to save 20% on compute."*

### Shot 5: Demo 3 — Amazon Bedrock Guardrail Gating (1:55 - 2:20)
* **What to Show**: Run in terminal:
  ```bash
  npx repo-pulse guardrail --text "AWS_KEY = AKIAIOSFODNN7EXAMPLE"
  ```
* **Voiceover**:  
  > *"What about credential leaks? When a contributor accidentally commits an AWS access key, Amazon Bedrock Guardrails intervenes in just one millisecond, blocking the commit, redacting the key, and protecting our repository from prompt injection attacks."*

### Shot 6: Cloud-Native CDK Stack & Verification (2:20 - 2:45)
* **What to Show**: Show `infra/repopulse-cdk-stack.ts` in VS Code, then run `npm test`.
* **Voiceover**:  
  > *"Under the hood, RepoPulse is 100% cloud native. Our turnkey AWS CDK v2 stack deploys API Gateway, Lambda, and DynamoDB in one command. Our test suite enforces 95 out of 95 passing tests in just 560 milliseconds with zero external runtime dependencies."*

### Shot 7: The Closing (2:45 - 2:55)
* **What to Show**: Return to the GitHub repository page with the green release badges.
* **Voiceover**:  
  > *"RepoPulse AI: Autonomous code governance and cloud FinOps, powered by Alexa+ and Amazon Bedrock. Thank you!"*

---

## 💡 Pro Tips for Winning Devpost Judges

1. **Keep it under 3:00**: Devpost strictly filters videos over 3 minutes. Stop at 2:50.
2. **High Energy**: Speak with confidence and enthusiasm.
3. **Show, Don't Just Tell**: Every voiceover claim must have a visible terminal output or UI animation backing it up on screen.
4. **Upload to YouTube as "Unlisted" or "Public"**: Ensure the video link is publicly viewable without requiring judge sign-in.
