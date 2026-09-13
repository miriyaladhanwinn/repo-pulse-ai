# Changelog

All notable changes to **RepoPulse AI** will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-09-13 - Apple Liquid Glass & 540+ Models Horizon

### Added
- **Apple iOS 18 / macOS Liquid Glass Visual Engine**:
  - Continuous ambient Aurora hue rotation (`@keyframes auroraHue`) on interactive canvas.
  - Siri / Apple Intelligence iridescent dynamic glowing borders (`linear-gradient(90deg, #ff2d55, ...)`).
  - 5 Dynamic Color Palettes switchable via real-time header picker:
    1. **Apple Aurora** (Default - Space Black & Siri Glow)
    2. **Space Titanium** (Deep Obsidian & Platinum Slate)
    3. **Pacific Blue** (Midnight Navy & Marine Teal)
    4. **Cyber Neon** (Void Black & Neon Magenta)
    5. **Cupertino Mint** (Dark Forest & Apple Emerald)
  - Specular glass rim reflections (`inset 0 1px 0 rgba(255, 255, 255, 0.18)`), spring physics micro-interactions, and message pop animations.
- **Universal Model Catalog Expansion (540+ Models)**:
  - 540 verified production AI models across 35 global providers with complete metadata.
  - Apple Spotlight Model Switcher (`Cmd+K` / `Ctrl+K`) with instant search, category filters, and keyboard navigation.
- **Assistant Matrix Expansion (54 Maintainer Personas)**:
  - 54 specialized personas across 8 maintainer disciplines with category tabs and search.
- **Multi-Session Chat & Markdown Export**:
  - Isolated thread sessions with one-click export to GitHub-flavored Markdown.

### Changed
- Expanded automated test suite to 52 native unit and integration tests passing in under 300ms.
- Updated StudioServer health check reporting 540 models and 54 assistants.

---

## [2.0.0] - 2026-09-13 - Titan Edition

### Added
- **Multi-Model Universal Router (`MultiModelRouter`)**:
  - Unified gateway supporting OpenAI (GPT-5.4 Codex, GPT-4o), Anthropic (Claude 3.7 Sonnet), Google (Gemini 2.5 Pro), DeepSeek (R1 Reasoning), Groq (Llama 3.3 70B), Mistral (Codestral 2501), OpenRouter, Local Ollama, and Custom OpenAI-compatible endpoints.
  - Zero-downtime deterministic fallback engine that synthesizes AST analytics and security reviews offline without external credentials.
- **Assistant Matrix (`AssistantMatrix`)**:
  - 12 production-grade developer personas (Maintainer Lead, CVE Auditor, AST Refactorer, Runtime SRE, DB Optimizer, Distributed Architect, CI/CD Specialist, Crypto Guard, RFC Author, UI Artisan).
- **Hybrid BM25 Knowledge Vault (`KnowledgeVault`)**:
  - Lexical BM25 term saturation scoring with tag filtering, file system auto-indexing, and JSON export/import backup.
- **AST Code Sandbox & Dynamic Linter**:
  - Real-time syntax tree metric calculator (AST nodes, cyclomatic complexity, ESM detection, dynamic `eval` hazard detector).
- **Apple Developer-Grade 3D Liquid Glass Studio**:
  - Dark obsidian UI (`#07090e`), 3D kinetic background canvas, live multi-model chat workspace, PR review lab, MCP tool hub, and provider settings.

### Changed
- Refactored `StudioServer` to support multi-provider completions, BM25 knowledge search, and dynamic document deletion.
- Expanded native test suite to 46 comprehensive unit and integration tests passing in under 300ms.

---

## [1.0.0] - 2026-09-13 - Initial Stable Release

### Added
- Core AST-bounded diff parser (`DiffAnalyzer`) and symbol extractor (`ASTParser`).
- Token budget scheduling algorithm (`TokenBudgeter`) for bounded prompt window partitioning.
- Native Model Context Protocol (MCP) JSON-RPC 2.0 stdio server (`MCPServer`).
- Autonomous issue priority classification (`IssueClassifier`) and `node:test` bug reproducer generator (`Reproducer`).
- Comprehensive maintainer CLI (`repo-pulse`) with `studio`, `review`, `triage`, and `health` commands.
- Automated GitHub Actions PR review workflow (`.github/workflows/codex-review.yml`).
