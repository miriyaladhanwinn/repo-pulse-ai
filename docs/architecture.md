# RepoPulse AI Architectural Blueprint

## System Overview

RepoPulse AI is engineered as a decoupled, zero-runtime-overhead system consisting of four primary subsystems:
1. **Syntactic Decomposer**: AST-aware unified diff analyzer and symbol extractor.
2. **Budget Scheduling Engine**: Deterministic token window planner ensuring bounded prompt contexts.
3. **Multi-Model Provider Gateway**: Universal provider router supporting OpenAI, Anthropic, Gemini, DeepSeek, Groq, Mistral, and local runtimes.
4. **Autonomous Harness & Interfaces**: Native Model Context Protocol (MCP) stdio server, embedded Web Studio, and CLI.

```mermaid
flowchart TB
    subgraph InputSurface["Input Layer"]
        CLI["Maintainer CLI"]
        STUDIO["Apple Liquid Glass Studio<br/>(Aurora Animations, Spotlight ⌘K, 5 Palettes)"]
        MCP_STDIO["Model Context Protocol (stdio & JSON-RPC)"]
        GH_ACTIONS["GitHub Actions PR Bot"]
    end

    subgraph CoreEngine["RepoPulse Core Engine"]
        DIFF["DiffAnalyzer<br/>(Unified Diff Parser)"]
        AST["ASTParser<br/>(Symbol Decomposition)"]
        BUDGET["TokenBudgeter<br/>(Prompt Chunk Planner)"]
        MATRIX["AssistantMatrix<br/>(54 Maintainer Personas)"]
        TRIAGE["IssueClassifier & Reproducer"]
        VAULT["KnowledgeVault<br/>(BM25 Context Pinning)"]
    end

    subgraph ModelGateway["Universal Multi-Model Router"]
        CATALOG["Universal Model Catalog (540+ Models)"]
        ROUTER["MultiModelRouter"]
        OPENAI["OpenAI GPT-5.4 Codex / 4o / o3"]
        CLAUDE["Anthropic Claude 3.7 Sonnet"]
        GEMINI["Google Gemini 2.5 Pro"]
        DEEPSEEK["DeepSeek R1 Reasoning"]
        GROQ["Groq Llama 3.3 70B"]
        MISTRAL["Mistral Codestral 2501"]
        OLLAMA["Local Ollama Qwen 2.5"]
        FALLBACK["Deterministic Safe Fallback Engine"]
    end

    InputSurface --> CoreEngine
    CoreEngine --> ModelGateway
    ROUTER --> OPENAI & CLAUDE & GEMINI & DEEPSEEK & GROQ & MISTRAL & OLLAMA & FALLBACK
```

---

## Architectural Invariants

1. **Deterministic Execution**:
   - The engine must never throw unhandled exceptions on malformed diffs or adversarial issue bodies.
   - Fallback synthesis guarantees responses even when offline or unauthenticated.

2. **Strict Null Safety**:
   - Compiles with TypeScript `strict: true` and `noImplicitAny: true`.
   - All optional properties are explicitly checked using optional chaining or type guards.

3. **Memory Concurrency Safety**:
   - Zero unbounded object retainment or memory leakage in long-running Studio server daemon processes.
   - Pure functional diff transformations where state is immutable per request cycle.
