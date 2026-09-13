# Contributing to RepoPulse AI

Thank you for your interest in contributing to **RepoPulse AI**! We believe in transparent, collaborative, and automated software maintenance.

## Development Workflow

1. **Fork the Repository**: Fork on GitHub and clone locally:
   ```bash
   git clone https://github.com/MRLDHANWINN/repo-pulse-ai.git
   cd repo-pulse-ai
   ```

2. **Branching Strategy**:
   - `main`: Production release branch.
   - `feat/<name>`: New features or providers.
   - `fix/<issue>`: Bug fixes and performance patches.

3. **Install & Build**:
   ```bash
   npm install
   npm run build
   ```

4. **Testing**:
   Every pull request must pass the automated test suite before merging:
   ```bash
   npm test
   npm run lint
   ```

5. **Submitting a Pull Request**:
   - Provide a concise description of changes in the PR template.
   - Ensure all new features include corresponding unit tests in `src/tests/`.

## Code Style & Principles
- Strict TypeScript (`strict: true` in `tsconfig.json`).
- Zero unhandled promise rejections.
- Modular domain separation (`core`, `providers`, `mcp`, `triage`, `cli`).

Thank you for helping empower open-source maintainers worldwide!
