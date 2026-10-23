# 🏆 RepoPulse AI • Amazon Developer Hackathon Pitch Script

**Duration**: 3 Minutes  
**Target Audience**: AWS Solutions Architects, Hackathon Judges & Cloud Engineering Leaders  
**Theme**: Eliminating Cloud Maintenance Debt with Amazon Bedrock, Amazon Nova & AWS FinOps  

---

## 🎬 Section 1: The Hook (0:00 - 0:30)

> **Visual**: Terminal screen showing a developer pushing a Pull Request.  
> **Speaker**:  
> *"Every single day, thousands of engineering teams push code that silently breaks their cloud infrastructure. A single pull request can introduce a wildcard IAM policy, open security group port 22 to `0.0.0.0/0`, or accidentally spin up multi-AZ databases and unmonitored NAT gateways that bloat the AWS bill by thousands of dollars before anyone notices.*
>
> *Existing AI review tools only treat code as raw text. They don't understand AWS architectures, they don't know AWS pricing, and they have no guardrails against leaked credentials.*
>
> *Today, we’re changing that. Meet **RepoPulse AI**."*

---

## ⚡ Section 2: The Solution (0:30 - 1:10)

> **Visual**: Show the RepoPulse Desktop Shell opening with the 3D Spatial Polyhedron Core, Apple Liquid Glass interface, and the Amazon Bedrock provider active.  
> **Speaker**:  
> *"RepoPulse AI is an autonomous AI maintainer harness, desktop intelligence workstation, and serverless bot powered by **Amazon Bedrock** and the **Amazon Nova** foundation family.*
>
> *Unlike generic chatbot wrappers, RepoPulse combines deterministic AST syntax parsing with four purpose-built AWS engines:*
> 1. *The **Amazon Nova Pro Reasoning Core** for semantic PR reviews and breaking change detection.*
> 2. *The **AWS IaC Security Analyzer** enforcing the AWS Well-Architected Framework and CIS benchmarks.*
> 3. *The **AWS FinOps Cost-Delta Estimator** calculating the exact dollar impact of infrastructure changes right in git diffs.*
> 4. *And **Amazon Bedrock Guardrails** preventing leaked AWS credentials and adversarial prompt injections from ever merging."*

---

## 🔍 Section 3: Live Demo (1:10 - 2:20)

> **Visual**: Terminal running `npx repo-pulse aws-audit` and `npx repo-pulse cost-delta`, followed by the GitHub PR comment view and the Web Studio on `localhost:3000`.  
> **Speaker**:  
> *"Let’s see it in action.*
>
> *Here, a developer opens a PR modifying our AWS CDK stack. In under 500 milliseconds, RepoPulse evaluates the diff.*
>
> *First: **AWS IaC Security**. RepoPulse flags an overly permissive IAM statement with wildcard `Action: "*"` and an unencrypted S3 bucket, assigning an AWS Security Score of 50/100 and generating an immediate, non-breaking remediation patch.*
>
> *Second: **AWS FinOps Cost Delta**. RepoPulse detects a new NAT Gateway and an RDS instance. It calculates the exact monthly delta: `+$172.85/month`, and Amazon Nova provides an actionable tip: 'Replace NAT Gateway with free AWS Gateway VPC Endpoints for S3 and DynamoDB to eliminate data transfer fees.'*
>
> *Third: **Amazon Bedrock Guardrails**. A contributor accidentally hardcoded an `AKIA` access key. Bedrock Guardrails instantly intervenes, blocking the review, redacting the credential, and stopping prompt injection attacks in their tracks.*
>
> *And for developers in their IDEs, RepoPulse runs natively as a **Model Context Protocol (MCP) server** for **Amazon Q Developer**, Cursor, and Claude Code."*

---

## ☁️ Section 4: Cloud-Native AWS Architecture (2:20 - 2:45)

> **Visual**: Show the AWS CDK Architecture Diagram (`infra/README.md`) and terminal running `aws cloudformation deploy`.  
> **Speaker**:  
> *"Under the hood, RepoPulse is 100% cloud-native. Our turnkey **AWS CDK v2 stack** deploys an event-driven serverless pipeline into your AWS account in one command:*
> - *Amazon API Gateway receives GitHub webhooks.*
> - *An AWS Lambda worker executes our zero-dependency AST engine.*
> - *Amazon Bedrock Converse API powers multi-model inference across Nova Pro, Lite, and Micro.*
> - *And Amazon DynamoDB with point-in-time recovery maintains our immutable audit log and review telemetry.*
>
> *With zero runtime dependencies outside Node.js and our 95/95 test suite passing in 550 milliseconds, it is ready for production today."*

---

## 🚀 Section 5: The Closing (2:45 - 3:00)

> **Visual**: GitHub repo page, releases, and call to action.  
> **Speaker**:  
> *"RepoPulse AI empowers open-source maintainers and enterprise cloud teams to ship faster, eliminate security blindspots, and take control of their AWS cloud spending.*
>
> *Open source. Cloud native. Powered by Amazon Bedrock.*
>
> *Thank you!"*
