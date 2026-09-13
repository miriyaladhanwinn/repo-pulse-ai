# Contributing to RepoPulse AI

Thank you for contributing to RepoPulse AI! We value contributions from developers of all skill levels.
Please read these guidelines before opening issues or submitting pull requests.

---

## Code of Conduct

All contributors are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please keep discussions respectful, inclusive, and technically constructive.

---

## Development Workflow

### Prerequisites
- Node.js >= 18.0.0 (LTS recommended, e.g. Node 20 or Node 22)
- npm >= 9.0.0
- Git

### Initial Setup
```bash
# 1. Clone repository
git clone https://github.com/miriyaladhanwinn/repo-pulse-ai.git
cd repo-pulse-ai

# 2. Install development dependencies
npm install

# 3. Build TypeScript modules
npm run build

# 4. Execute the test suite
npm test
```

---

## Coding Standards & Invariants

1. **Strict TypeScript 5.7+**:
   - Every file must compile cleanly under `npm run lint` (`tsc --noEmit`).
   - Explicit types for all exported symbols, interfaces, and function signatures.
   - Avoid `any` where union types, generics, or branded nominal types can be used.

2. **Native Node.js Standards**:
   - Use native Node.js ESM imports with `.js` extensions (e.g., `import { DiffAnalyzer } from './core/diff-analyzer.js';`).
   - Use native `node:test` and `node:assert/strict` for all unit and integration tests.
   - Do not add external runtime dependencies without an approved Architectural Decision Record (ADR).

3. **Performance & Security**:
   - Never introduce dynamic evaluation sinks (`eval`, `new Function`).
   - Ensure all AST traversals and regex matching complete in sub-millisecond timeframes.
   - Ensure tests run deterministically without internet access or live API credentials.

---

## Pull Request Guidelines

1. **Atomic Changes**: Keep PRs focused on a single feature, bug fix, or documentation enhancement.
2. **Test Coverage**: Every new code change must include corresponding unit tests in `src/tests/`.
3. **Commit Messages**: Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:
   - `feat(scope): add new feature`
   - `fix(scope): resolve bug or edge case`
   - `test(scope): add test assertions`
   - `docs(scope): update documentation`
   - `refactor(scope): internal code modernization`
4. **All Tests Passing**: Ensure `npm test` passes 100% locally before submitting.
