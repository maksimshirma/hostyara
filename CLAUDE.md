# Hostyara

## Project Overview

“Hostyara” is a host/shell application for a family super-app built on a hybrid microfrontend architecture. The host orchestrates independent applications using Module Federation and iframes.

## Workflow

### 1. Planning

- For any non-trivial task, start with a concrete step-by-step plan.
- Before implementation, inspect existing contracts, SDK, registry, lifecycle, and relevant tests.
- If the task affects architecture, first verify the boundaries between the host and microfrontend.
- If implementation goes off track, stop and reconsider the approach instead of adding workarounds.
- Prefer understanding and extending the existing design over introducing a parallel solution.

### 2. Architectural Boundaries

- The host owns auth, session, global state, permissions, feature flags, and top-level routing.
- Microfrontends must not depend on each other directly and must use only public Host SDK/contracts.
- Never import internal host APIs from a microfrontend.
- Module Federation is the default; use iframes only for isolation, legacy, or untrusted scenarios.
- Every remote must be isolated: a remote failure must not crash the host.
- Keep presentation, business logic, and data/infrastructure concerns separated when the complexity warrants it.
- Do not mix UI rendering, business rules, persistence, networking, and notifications in the same function or module.

### 3. Implementation

- Reuse existing abstractions first; do not create duplicate SDK, event bus, state, or routing mechanisms.
- Make minimal changes that fit the existing architecture.
- Public contracts must be typed and backward-compatible.
- Never expose refresh tokens to microfrontends or log secrets.
- Always account for cleanup, fallback, and recovery when working with lifecycle, loading, or runtime errors.
- Prefer the simplest implementation that is clear and correct.
- Apply YAGNI: do not implement functionality, extension points, configuration, or flexibility that the current task does not require.
- Apply DRY where duplication represents the same concept or behavior; do not extract code merely because two pieces happen to look similar.
- Keep functions focused on one responsibility. If a function validates, transforms, persists, and notifies, split those responsibilities into separate functions.
- Prefer pure functions for business logic and data transformations. Keep I/O, network calls, persistence, global state mutation, and other side effects at the system boundaries.
- Do not mutate input arguments unless mutation is an explicit and documented part of the API.
- Prefer deterministic code: the same inputs should produce the same outputs whenever practical.
- Name functions after what they actually do. Prefer specific names such as `validateData`, `transformData`, or `saveData` over vague names such as `processData`.
- Keep source files focused on one logical responsibility. Aim for roughly 200–300 lines of code per file, excluding blank lines and comments.
- When a file grows beyond a reasonable size, identify cohesive groups of functionality and move them into focused modules instead of continuing to expand the same file.

### 4. Verification

- Do not consider a task complete without verifying the result.
- After changes, run the formatter, linter, typecheck, and relevant tests.
- For Module Federation changes, verify that the remote actually loads in a production-like environment.
- For SDK/contract changes, verify all affected consumers.
- Test not only the happy path, but also loading failures, permission errors, and recovery.
- Verify that extracted modules preserve existing behavior and do not introduce unnecessary coupling.
- When refactoring pure business logic, prefer focused unit tests for the extracted functions.

### 5. Self-Review

Before finishing, review the implementation against these questions:

- Is there a simpler solution that preserves the architectural boundaries?
- Did I introduce an abstraction that is not required by the current task?
- Could this interface, factory, class hierarchy, adapter, or helper simply be a function or existing module?
- Does every abstraction solve a concrete problem today rather than a hypothetical future problem?
- Did I fix the root cause instead of masking it with a workaround?
- Are responsibilities clearly separated?
- Is business logic independent from UI and infrastructure where practical?
- Could any logic be made pure and deterministic?
- Are functions short enough to understand without mentally simulating unrelated behavior?
- Is the file focused, or should a cohesive part be extracted?
- Did I remove duplication without creating premature shared abstractions?
- Did I keep the scope of the task minimal?
- Did I verify the result rather than assuming it works?

## Code Quality

### Simplicity and Abstractions

- Prefer KISS and YAGNI over speculative flexibility.
- Do not create interfaces, factories, base classes, dependency injection layers, adapters, or generic utilities “for the future”.
- An abstraction is justified only when it solves a concrete problem in the current codebase, reduces meaningful duplication, or substantially improves readability.
- Prefer a simple function or module over a class hierarchy when there is no meaningful object state or polymorphism.
- Prefer existing project abstractions when they already solve the problem.
- Do not introduce an abstraction solely to make code “more architectural” or to satisfy a design pattern.
- Before adding an abstraction, ask whether the same result can be achieved with a small, direct implementation without reducing clarity.
- Avoid premature generalization. Generalize only when there are actual consumers or repeated behavior that represents the same concept.

### Separation of Responsibilities

- Keep presentation/UI responsible for rendering and input handling.
- Keep business logic responsible for application rules, validation, calculations, and transformations.
- Keep data-access/infrastructure code responsible for APIs, persistence, filesystem, browser APIs, and other external effects.
- Do not put business rules directly into UI components when they can be expressed as independent logic.
- Do not perform database/API operations directly from presentation code when an existing data-access boundary is available.
- Keep side effects at the edges of the system and keep the core logic as pure as practical.

### Functions and Purity

- Prefer pure functions whenever possible.
- A pure function:
  - returns the same result for the same inputs;
  - does not mutate global state;
  - does not mutate its input arguments;
  - does not perform I/O or other observable side effects.
- Extract calculations, validation, parsing, mapping, and transformations into pure functions when doing so improves clarity or testability.
- Functions that perform side effects should have a clear and narrow responsibility.
- Avoid functions that simultaneously transform data, persist it, send notifications, and update UI state.
- Keep functions reasonably small and cohesive. Functions over roughly 50–60 lines should be treated as a signal to look for separable responsibilities, not as an automatic requirement to split arbitrary code.
- Prefer explicit data flow over hidden state and implicit side effects.

### Files and Modules

- Keep files focused on a single logical responsibility.
- Aim to keep files within roughly 200–300 lines of code, excluding blank lines and comments.
- The limit is a design signal, not a reason to split cohesive code artificially.
- When a file becomes too large, identify natural boundaries and extract cohesive modules.
- Do not split code into many tiny files merely to satisfy the line limit.
- Modules should have high cohesion and low coupling.
- Avoid circular dependencies and unnecessary cross-layer dependencies.
- Keep public modules and contracts small and intentional.

### Maintainability

- Optimize for readability and correctness before cleverness or brevity.
- Prefer explicit, descriptive names over generic names such as `process`, `handle`, `manager`, or `utils` when a more specific name is possible.
- Keep related logic together and unrelated concerns apart.
- Comments should explain intent, constraints, or non-obvious decisions, not restate what the code already says.
- Do not add comments as a substitute for simplifying unclear code.
- Preserve existing behavior during refactoring unless behavior changes are explicitly part of the task.
- Avoid unrelated cleanup while implementing a focused feature or fix.

## Core Principles

- **Simplicity First**: Use the simplest solution that solves the problem.
- **Architecture First**: Respect host and microfrontend boundaries.
- **YAGNI**: Do not build functionality or abstractions before they are needed.
- **KISS**: Prefer straightforward solutions over unnecessary patterns and indirection.
- **SOLID Where Useful**: Apply SOLID principles pragmatically without introducing abstractions solely to satisfy a pattern.
- **DRY**: Remove meaningful duplication while avoiding premature generalization.
- **Pure Core, Side Effects at the Edges**: Keep business logic deterministic and isolate I/O and other side effects.
- **High Cohesion, Low Coupling**: Keep related responsibilities together and minimize unnecessary dependencies.
- **No Workarounds**: Fix root causes.
- **Minimal Impact**: Change only what is necessary.
- **Verify Before Done**: Verify the result instead of assuming it works.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <description>`

- **type**: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`
- **scope** (optional): affected area, e.g. `host`, `sdk`, `auth`, `ci`, `button`
- **description**: imperative mood, lowercase, no trailing period

Breaking changes: add `!` after type/scope (`feat(sdk)!: ...`) and/or a `BREAKING CHANGE:` footer explaining the change.

Body (optional, blank line after subject): explain _why_, not _what_ — the diff already shows what changed.

Examples:

```text
feat(sdk): add permission check helper for microfrontends
fix(ci): enable corepack before setup-node to resolve yarn version
refactor(host): simplify remote registry lookup
docs: add commit message guidelines
```

Keep commits focused — one logical change per commit. Do not mix unrelated fixes/features in one commit.
