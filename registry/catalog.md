# Capability Idea Catalog

This is a ranked decision aid, not an installation list. Scores are current as of 2026-08-27 and combine external discovery with Celestan's local evidence.

## Rating model

- **Fit:** relevance to demonstrated Celestan work (1-5).
- **Option:** breadth of future action-space or reliability gain (1-5).
- **Evidence:** strength of current task evidence (1-5).
- **Risk:** safety, maintenance, dependency, and integration risk (1-5; higher is safer).
- **Effort:** ease of a bounded evaluation or adoption (1-5; higher is easier).
- **Priority:** judgment from the scores and the evidence standard. `P1` means evaluate when the trigger exists, not install immediately.

## Ranked ideas

| Rank | Idea | Source/status | Fit | Option | Evidence | Risk | Effort | Priority |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Deterministic repository-state inspection | Built locally; `Preferred` | 5 | 4 | 5 | 5 | 5 | **P0 - use routinely** |
| 2 | Fresh verification gate before completion claims | Existing Celestan practice; external analogue `verification-before-completion` | 5 | 4 | 4 | 5 | 5 | **P0 - use routinely** |
| 3 | Root-cause-first debugging workflow | Existing engineering practice; external `systematic-debugging` | 5 | 4 | 4 | 5 | 5 | **P1 - apply on failures** |
| 4 | Persistent, compact browser automation | `agent-browser`, Playwright MCP/CLI; `Evaluated` | 4 | 5 | 2 | 2 | 2 | **P1 - evaluate on persistent-browser need** |
| 5 | Behavior-first vertical-slice testing | External `tdd`; `Evaluated` | 4 | 4 | 3 | 4 | 4 | **P1 - evaluate on new test seam** |
| 6 | Structured research artifact workflow | External `research`; `Evaluated` | 4 | 3 | 3 | 4 | 4 | **P2 - use selectively** |
| 7 | Reusable code-review workflow | External `code-review`; `Discovered` through leaderboard | 4 | 3 | 2 | 3 | 4 | **P2 - evaluate on recurring review gap** |
| 8 | Frontend design and accessibility guidance | External `frontend-design`; `Discovered` through leaderboard | 3 | 3 | 2 | 3 | 4 | **P3 - evaluate on repeated design work** |

## Practical Uses

### 1. Deterministic repository-state inspection

- **Why it is good:** It removes repeated cold-start archaeology without inferring project intent or executing discovered commands.
- **How to use it:** Run `node C:\Celestan\capabilities\repo-state-inspector\inspect.mjs <repository-path>` at the start of an unfamiliar repository task, then read the relevant state file and verification entry points.
- **Maturity:** `Preferred`; five local tests and repeated real repository runs support routine use.

### 2. Fresh verification gate

- **Why it is good:** It prevents completion claims based on stale output, assumptions, or a lower verification layer than the claim requires.
- **How to use it:** Identify the exact proof command, run it fresh, inspect complete output and exit status, and state only what that evidence establishes. Use rendered, device, or human checks when the claim requires them.
- **Maturity:** `Preferred` as a deterministic operating principle. The external skill is not installed because it largely duplicates existing behavior.

### 3. Root-cause-first debugging

- **Why it is good:** It reduces symptom patches and makes repeated failures evidence about the underlying design rather than an invitation to try random fixes.
- **How to use it:** Gather the failure, trace the relevant data/control path, state a falsifiable hypothesis, run a focused diagnostic, implement the smallest fix, and add a regression check. After repeated failed fixes, re-examine the architecture.
- **Maturity:** `Preferred` as a practice; external prompt skill remains unnecessary unless a task benchmark shows incremental value.

### 4. Persistent, compact browser automation

- **Why it is good:** Named sessions, accessibility snapshots, screenshots, extraction, and persistence could reduce orchestration overhead for long-running browser verification or exploration.
- **How to use it:** Only when a concrete task needs persistent context or a client-independent browser service. Compare `agent-browser` against current in-app control and the Playwright candidates using an isolated local task; do not use persistent profiles with sensitive state by default.
- **Maturity:** `Evaluated`; browser runtime stability, profile isolation, security permissions, and representative task benefit remain unproven.

### 5. Behavior-first vertical-slice testing

- **Why it is good:** Tests public behavior at agreed seams and grows a feature through small red-green-refactor slices instead of brittle implementation coverage.
- **How to use it:** Name the public seam, write one failing behavior test, implement the smallest change, verify, then refactor only after the test passes. Use it especially for new domain behavior or regression-prone interactions.
- **Maturity:** `Evaluated`; test-heavy project work exists, but no comparison has measured benefit from importing the external skill text.

### 6. Structured research artifact workflow

- **Why it is good:** It keeps external research reproducible by using primary sources, a single cited artifact, and explicit source ownership for claims.
- **How to use it:** Define the question, inspect first-party sources, record claims with links and dates in the project's existing notes, and separate discovery from adoption evidence.
- **Maturity:** `Evaluated`; Foundry already follows most of this workflow.

### 7. Reusable code-review workflow

- **Why it is good:** An independent review can catch regressions, security issues, missing tests, and weak evidence that implementation alone misses.
- **How to use it:** Request review when risk or change size warrants it, give the reviewer the intended claim and verification evidence, and prioritize concrete findings over style preference.
- **Maturity:** `Discovered`; no recurring cross-project review gap currently justifies importing a specific external skill.

### 8. Frontend design and accessibility guidance

- **Why it is good:** It may improve visual hierarchy, responsive behavior, interaction clarity, and accessibility when a project has demonstrated design uncertainty.
- **How to use it:** Apply only to a concrete frontend task, compare rendered outcomes, and preserve the project's established visual language rather than adding generic styling rules.
- **Maturity:** `Discovered`; no local evidence currently supports promotion.

## Selection Rules

- Use `P0` ideas now; they are deterministic and already supported by evidence.
- Treat `P1` ideas as triggered investigations, not a queue. Start only when the named task appears.
- Treat `P2` and `P3` ideas as retained options; do not install them for popularity alone.
- Before external installation, review source, license, permissions, dependencies, maintenance, security findings, and rollback path.
- Promotion requires a representative Celestan task and evidence stronger than leaderboard popularity.
