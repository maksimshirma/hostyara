# Hostyara

## Project Overview

“Hostyara” is a host/shell application for a family super-app built on a hybrid microfrontend architecture. The host orchestrates independent applications using Module Federation and iframes.

## Workflow

### 1. Planning

- For any non-trivial task, start with a concrete step-by-step plan.
- Before implementation, inspect existing contracts, SDK, registry, lifecycle, and relevant tests.
- If the task affects architecture, first verify the boundaries between the host and microfrontend.
- If implementation goes off track, stop and reconsider the approach instead of adding workarounds.

### 2. Architectural Boundaries

- The host owns auth, session, global state, permissions, feature flags, and top-level routing.
- Microfrontends must not depend on each other directly and must use only public Host SDK/contracts.
- Never import internal host APIs from a microfrontend.
- Module Federation is the default; use iframes only for isolation, legacy, or untrusted scenarios.
- Every remote must be isolated: a remote failure must not crash the host.

### 3. Implementation

- Reuse existing abstractions first; do not create duplicate SDK, event bus, state, or routing mechanisms.
- Make minimal changes that fit the existing architecture.
- Public contracts must be typed and backward-compatible.
- Never expose refresh tokens to microfrontends or log secrets.
- Always account for cleanup, fallback, and recovery when working with lifecycle, loading, or runtime errors.

### 4. Verification

- Do not consider a task complete without verifying the result.
- After changes, run the formatter, linter, typecheck, and relevant tests.
- For Module Federation changes, verify that the remote actually loads in a production-like environment.
- For SDK/contract changes, verify all affected consumers.
- Test not only the happy path, but also loading failures, permission errors, and recovery.

### 5. Self-Review

- Before finishing, ask: “Is there a simpler solution that preserves the architectural boundaries?”
- Do not introduce abstractions without a real need.
- Fix root causes instead of masking problems with workarounds.
- Do not expand the scope of the task unnecessarily.

## Core Principles

- **Simplicity First**: Use the simplest solution that solves the problem.
- **Architecture First**: Respect host and microfrontend boundaries.
- **No Workarounds**: Fix root causes.
- **Minimal Impact**: Change only what is necessary.
- **Verify Before Done**: Verify the result instead of assuming it works.
