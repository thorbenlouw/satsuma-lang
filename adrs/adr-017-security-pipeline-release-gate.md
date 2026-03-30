# ADR-017 — Security Pipeline Gates Releases

**Status:** Accepted
**Date:** 2026-03 (retrospective, PR #57)

## Context

As the Satsuma tooling grew (CLI, LSP server, VS Code extension, viz components, site), the dependency surface expanded across 5+ npm packages and multiple GitHub Actions. The project needed a systematic approach to security scanning that would catch vulnerabilities before they reach users.

The question was whether security scanning should be advisory (informational, non-blocking) or mandatory (blocking releases and PRs).

## Decision

Implement a mandatory security pipeline that gates releases:

1. **Semgrep SAST** — static analysis on every PR and push to `main`, using the free-tier `--config auto` ruleset. Generated parser code, archived files, and CLI bindings are excluded via `.semgrepignore`.
2. **npm audit** — consolidated audit across all package directories with a high/critical severity threshold. Runs in a dedicated `security.yml` workflow.
3. **Dependabot** — automated dependency update PRs for all 5 npm packages and GitHub Actions, on a weekly cadence. Configured in `.github/dependabot.yml`.
4. **Release gate** — the release workflow (`release.yml`) depends on the security workflow via `workflow_call`. A release cannot proceed if security checks fail.
5. **Allowlist** — `.security-allowlist.yml` provides a mechanism to explicitly acknowledge known findings (by advisory ID or Semgrep rule ID) when a fix is not yet available or the finding is a false positive.

## Consequences

**Positive:**
- No release can ship with known critical/high vulnerabilities unless explicitly acknowledged in the allowlist
- Semgrep catches code-level issues (XSS, injection) that dependency scanning alone would miss
- Dependabot keeps dependencies current with minimal manual effort
- The allowlist creates an audit trail of acknowledged risks

**Negative:**
- False positives in Semgrep or npm audit can block releases until triaged and allowlisted
- Dependabot generates a steady stream of PRs that require review bandwidth
- The security workflow adds ~2 minutes to every PR check run
