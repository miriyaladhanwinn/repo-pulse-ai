# Security Policy

## Supported Versions

RepoPulse AI maintains active security updates for the following release branches:

| Version | Supported | Notes |
| :--- | :--- | :--- |
| **2.0.x** | ✅ Active | Latest Titan Edition release branch |
| **1.0.x** | ⚠️ Security Only | Critical CVE patches backported |
| **< 1.0.0** | ❌ End of Life | Unsupported |

---

## Reporting a Vulnerability

We prioritize responsible, coordinated disclosure. If you discover a security vulnerability in RepoPulse AI:

1. **Do NOT file a public issue.**
2. Send an encrypted email or report to: **dhanwinn15@gmail.com**.
3. Include:
   - Reproduction steps or minimal proof-of-concept (POC) script.
   - Affected version(s) and environment (Node.js runtime, OS).
   - Expected vs. actual behavior.
   - Potential impact (e.g., token leakage, ReDoS, prototype pollution).

---

## Response Timeline

- **Initial Acknowledgment**: Within 24 hours.
- **Triage & Severity Rating**: Within 48 hours.
- **Mitigation & Patch Release**: Within 7 business days for Critical (P0) vulnerabilities.
- **Public Disclosure**: Coordinated after the fix has been tagged and released.

---

## Security Architectural Invariants

RepoPulse AI enforces strict defensive programming invariants across all modules:
1. **Zero Dynamic Evaluation**: No use of `eval()`, `new Function()`, or unsanitized `vm.runInContext()`.
2. **ReDoS Immunity**: All regular expressions operating on untrusted inputs are bounded to linear execution time.
3. **Secret Protection**: API tokens, private keys, and session cookies are never written to logs, stdout, or serialized into disk caches.
4. **Timing Attack Protection**: Cryptographic token comparisons utilize constant-time algorithms (`crypto.timingSafeEqual`).
