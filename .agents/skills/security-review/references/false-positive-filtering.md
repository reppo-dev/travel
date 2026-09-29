# False Positive Filtering & Signal Quality Guide
*(Extracted from Anthropic's Claude Code Security Review framework)*

## Hard Exclusions (Automatically ignore these patterns)

1. **Denial of Service (DOS)**:
   - DOS vulnerabilities, resource exhaustion attacks, CPU or memory overload, infinite loops, unbounded recursion.
2. **Secrets on disk**:
   - Credentials stored in local files if otherwise properly restricted (handled by external secrets managers/scanners).
3. **Rate limiting**:
   - Lack of rate limiting or service overload scenarios. Services are not required to implement application-layer rate limiting.
4. **Non-critical input validation**:
   - Lack of generic input validation on non-security-critical fields where no direct exploit path is demonstrated.
5. **Lack of generic hardening**:
   - Code is not expected to implement every theoretical hardening measure or defensive layer; only report concrete, exploitable flaws.
6. **Theoretical race conditions / timing attacks**:
   - Theoretical TOCTOU or microsecond timing variations. Only report if demonstrably problematic in practice.
7. **Outdated 3rd-party dependencies**:
   - Handled separately by SCA tools (Dependabot, Snyk, etc.).
8. **Memory safety in memory-safe languages**:
   - Buffer overflows or use-after-free are impossible in Rust, Go, Python, TypeScript, etc.
9. **Test suites**:
   - Test files (`*test*`, `spec`, `mock`, fixtures) are excluded.
10. **Log spoofing**:
    - Writing un-sanitized user input to internal application logs is not a vulnerability.
11. **Path-only SSRF**:
    - SSRF is only a vulnerability if the attacker can control the destination protocol (`http://`, `file://`) or the remote host/IP.
12. **Prompt injection as code vuln**:
    - Including user-controlled strings into an LLM prompt is expected functionality; only flag if it leads to unauthenticated server-side tool execution or secret exfiltration.
13. **Regex issues**:
    - Regex injection or ReDOS without proven exploitable impact.
14. **Documentation & Markdown**:
    - Findings in `.md`, `.txt`, docstrings, or comments.
15. **Lack of audit logging**:
    - Missing audit trails or telemetry.

## Precedents

- **Secrets vs URLs**: Logging high-value secrets (private keys, passwords, API tokens) in plaintext is a HIGH vulnerability. Logging URLs, queries, and headers is considered normal.
- **UUIDs**: Cryptographic UUIDs (v4) are unguessable and do not require sequential validation.
- **Environment variables & CLI flags**: In server/container environments, environment variables and startup flags are trusted. Attacks requiring an attacker to set env vars are invalid.
- **Frontend vs Backend Trust**:
  - Lack of authorization checks in client-side React/Vue/Angular/HTML code is **not** a vulnerability; authorization must be enforced on the backend.
  - React/Angular components auto-escape by default. Only report XSS if using `dangerouslySetInnerHTML`, `bypassSecurityTrustHtml`, raw innerHTML, or `eval`.
- **Shell scripts**: Command injection in administrative shell scripts is only valid if untrusted external input is piped directly into commands.

## Confidence Scoring

- **0.9 - 1.0 (Certain)**: Direct exploit path identified and verified.
- **0.8 - 0.9 (High)**: Clear vulnerability pattern with known exploitation method.
- **0.7 - 0.8 (Medium)**: Suspicious pattern requiring unusual prerequisites.
- **Below 0.7**: Discard (too speculative).
