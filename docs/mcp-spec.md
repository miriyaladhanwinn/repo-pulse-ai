# Model Context Protocol (MCP) Specification & Tool Schema

RepoPulse AI exposes its core maintainer intelligence capabilities via the official **Model Context Protocol (MCP)** specification over standard input/output (`stdio`) and JSON-RPC 2.0 HTTP transport.

---

## 1. Supported Tools

### Tool 1: `review_pull_request_diff`
Evaluates a raw unified git diff against maintainer safety invariants, parses AST symbols, and outputs structured maintainer remarks.

```json
{
  "name": "review_pull_request_diff",
  "description": "Reviews a git pull request diff using AST decomposition and OpenAI Codex intelligence.",
  "parameters": {
    "type": "object",
    "properties": {
      "diffText": {
        "type": "string",
        "description": "The raw unified diff string (git diff output)."
      },
      "repoContext": {
        "type": "string",
        "description": "Optional repository name or context (e.g., 'facebook/react')."
      }
    },
    "required": ["diffText"]
  }
}
```

### Tool 2: `triage_github_issue`
Classifies community issue reports by urgency (P0-P3) and autonomously generates a minimal runnable `node:test` reproduction script.

```json
{
  "name": "triage_github_issue",
  "description": "Classifies a GitHub issue report and synthesizes an automated regression test reproducer.",
  "parameters": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "The issue title."
      },
      "body": {
        "type": "string",
        "description": "The issue description or reproduction steps."
      },
      "id": {
        "type": "string",
        "description": "Optional issue identifier."
      }
    },
    "required": ["title", "body"]
  }
}
```

### Tool 3: `slice_diff_hunks`
Decomposes a unified diff into discrete, bounded syntactic chunks for inspection and token budgeting.

```json
{
  "name": "slice_diff_hunks",
  "description": "Slices a unified diff into bounded AST-categorized hunks.",
  "parameters": {
    "type": "object",
    "properties": {
      "diffText": {
        "type": "string",
        "description": "The raw unified git diff."
      }
    },
    "required": ["diffText"]
  }
}
```

---

## 2. JSON-RPC 2.0 Frame Example

### Client Request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "review_pull_request_diff",
    "arguments": {
      "diffText": "diff --git a/app.ts b/app.ts\n--- a/app.ts\n+++ b/app.ts\n@@ -1,1 +1,2 @@\n+eval(untrustedInput);\n"
    }
  }
}
```

### Server Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "### Maintainer Review\nStatus: CHANGES_REQUESTED\nRisk Score: 95/100 (CRITICAL)\nFindings:\n- [Line 2] Dynamic evaluation sink detected via `eval`."
      }
    ]
  }
}
```
