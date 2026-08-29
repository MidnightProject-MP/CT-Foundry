# CT-Foundry - project state

## Objective

Find recurring work, friction, or capability gaps in Celestan's operation, and identify external advances that expand its action space, then acquire the simplest reliable capability.

## Planning hierarchy

- **Project:** CT-Foundry - improve Celestan's operational environment through the simplest reliable external capabilities.
- **Epic E1:** deterministic repository reconstruction.
- **Story E1.S1:** build and evaluate a read-only repository-state inspector. **Complete and kept.**
- **Story E1.S2:** add compact signals from durable Markdown state files. **Implemented; real-task evidence gathered; retained as bounded trial.**
- **Story E1.S3:** inventory nested project roots and their direct ecosystem/verification markers. **Implemented; real-task evidence gathered; promotion evidence remains incomplete.**
- **Policy E1.S4:** establish a bounded Capability Radar lane and maturity states for external opportunities. **Complete.**
- **Evaluation E1.S5:** bounded evaluation of a reusable browser automation frontier capability. **Playwright MCP evaluated; not promoted.**
- **Evaluation E1.S6:** bounded evaluation of a coding-agent browser CLI. **Playwright CLI evaluated; runtime failure observed; not promoted.**
- **Evaluation E1.S7:** external agent-skill leaderboard survey. **Skills.sh, OpenCode docs, GitHub, and attempted Reddit signals reviewed; no candidate promoted.**
- **Decision aid E1.S8:** ranked capability idea catalog. **Top ideas scored by fit, option value, evidence, risk, and evaluation effort; no speculative installation.**
- **Evaluation E1.S9:** second real cold-start evaluation of bounded state signals. **Useful on a conventional headed state file; partial on a label-heavy file; retained without semantic expansion.**

## Current milestone

**E1.S8 - ranked capability idea catalog.** `registry/catalog.md` now ranks proven local capabilities and external candidates by practical fit, option value, evidence, risk, and effort. P0 deterministic practices are routine; P1-P3 entries remain trigger-based options.

## Observations

- Starting work in an unfamiliar repository required manually locating instructions, project state, package metadata, verification scripts, CI files, top-level structure, and Git status.
- This reconstruction is deterministic and likely to recur across every project.
- The existing `$verify-static-web-release` capability addresses later release verification. It does not provide a general cold-start project-state report.
- A real run against `CT-SuperSimpleGames` found `STATE.md`, `docs/ROADMAP.md`, the package test script, and its CI workflow, while distinguishing inaccessible Git metadata from a missing repository.
- Four real runs covered the Foundry project, the identity repository, SuperSimpleGames, and Pricing Approval Portal. The inspector exposed clean Git state for two repositories, an ownership-blocked Git worktree for one, and no repository state file for the fourth.
- File discovery still left manual reading of durable state necessary. The state-signal extension now extracts bounded content for objective, milestone/status, next action, open questions, and evidence-gap headings without attempting semantic summarization.
- Root-only inspection missed executable surfaces in nested directories: `Radius-API-DataService/app`, its Terraform environments/modules, `Radius/Radius-source`, and `Radius/Scheduling-Microservice`.
- Nested inventory found those surfaces and their direct markers, while excluding `AutomatedReports/.venv`. `AutomatedReports/main.py` remains intentionally unclassified because a lone script is not enough evidence of a project verification contract.
- A capability may be worth retaining before repeated demand when its option value is high and its retention risk and cost are low; this is recorded as `Available`, not `Preferred`.
- The preferred repository-state inspector was promoted to `C:\Celestan\capabilities\repo-state-inspector` as a thin entry point over the Foundry source; the external directory was empty before this promotion.
- Direct promotion testing exposed and localized a Git status parsing defect: trimming command output removed the leading porcelain status column on the first line. Status output now preserves leading whitespace while other Git values remain normalized.
- Real-task evaluation on BorderCrossing found a state-shape gap: its durable state uses labeled bullet records, so heading-only extraction returned no signals. A narrow recognized-label fallback now exposes objective/status/next-action records without parsing arbitrary prose.
- The same run showed repeated historical `Next Story:` records; labeled fallback extraction now keeps only the latest record per signal kind to avoid presenting stale history as concurrent current state.
- Browser verification recurs in SuperSimpleGames and BorderCrossing, making browser automation a valid Radar target. Official Playwright MCP documentation describes useful persistent structured-browser workflows, but also says CLI-plus-skills is more token-efficient for coding agents and warns that MCP is not a security boundary.
- The official Playwright CLI documentation describes named sessions, token-efficient snapshots, screenshots, traces, network inspection, and coding-agent skills. `npx --yes @playwright/cli@0.1.18 --version` and `--help` print successfully but reproduce a Windows `UV_HANDLE_CLOSING` assertion afterward.

## Decisions

- The first missing capability is a dependency-free repository-state inspector.
- The inspector reports evidence and does not make planning, architecture, model-routing, or product decisions.
- The first trial is deliberately local and read-only. It must not modify the inspected repository.
- No general agent framework, shared orchestration engine, or model benchmark is justified before recurring evidence requires one.
- The inspector reports Git safety/access failures instead of silently treating them as a clean non-repository state.
- The repository-state inspector is kept: repeated real use demonstrated useful low-risk evidence collection without project-specific assumptions.
- State signals remain deterministic and bounded; a missing or differently structured `STATE.md` is evidence, not an invitation to manufacture project state.
- Nested project inventory is evidence-only, depth-bounded, skips common generated/vendor/environment directories, and never runs discovered commands.
- Foundry operates two lanes: demand-driven work justified by repeated evidence, and a bounded Capability Radar lane justified by evaluated frontier opportunity.
- Capability maturity is `Discovered -> Evaluated -> Available -> Proven -> Preferred`; discovery and availability never silently change default Celestan behavior.
- Foundry is responsible for obsolescence review and may retire a homegrown capability when a maintained external replacement is materially better.
- Directly discoverable promotion should preserve one tested implementation where practical; wrappers must make their source, limitations, and invocation explicit.
- A directly invoked capability is an important integration test: it can expose deployment and interface defects that source-level tests miss.
- State signal extraction may support only explicitly recognized headings and labels; missing or unconventional state remains evidence, not an invitation to infer intent.
- Radar evaluation requires a concrete action-space comparison against current capabilities; package popularity, feature count, or novelty alone cannot justify installation.
- A successful command output is insufficient for capability promotion when the process exits with a repeatable runtime assertion.
- External popularity signals are discovery evidence only. They must be combined with source review, compatibility/security checks, and a representative Celestan task before installation or promotion.
- Reddit is an optional community signal, not a reliable sole source: this survey's Reddit search/API attempts returned unusable content or 403, so no Reddit claim was treated as evidence.
- Prefer deterministic, executable verification and debugging capabilities over prompt-only skills whenever the task can be covered mechanically; use external skills to supplement, not replace, fresh command output and reproducible checks.
- Maintain a ranked idea catalog as a decision aid, separating routine capabilities from trigger-based evaluations and unproven retained options. Scores prioritize fit and evidence over popularity.

## Open questions

- Does the report remove enough archaeology to justify keeping the capability after real use?
- Which missing signals, if any, recur after the inspector is used on several different repositories?
- Which future high-option-value external capability, if any, warrants the next bounded Radar evaluation?
- What practical frontier-work budget and review cadence preserve curiosity without creating a shiny-object backlog?
- Would a future task require persistent browser context, self-healing exploration, or a client-independent browser service that current in-app control cannot provide?
- Does a later pinned Playwright CLI release or runtime eliminate the Windows assertion and complete a representative local browser task cleanly?
- Which specific external skill, if any, demonstrates measurable incremental value on a Celestan task after isolated review?

## Evidence gaps

- The capability has local fixture coverage and a sample run, but no measured time saved in real work yet.
- It does not establish semantic project quality, deployment health, physical-device behavior, or human experience.
- The neighboring project's Git metadata is inaccessible to the current Windows identity because Git's safe-directory check rejects its ownership; Foundry did not change that configuration.
- Heading extraction can miss projects that store state in prose, non-Markdown files, or unconventional headings; it is not semantic project understanding.
- Nested marker output can still be noisy in large multi-project repositories, especially Terraform modules and .NET project trees; no promotion decision is made from the sample alone.
- Labeled state signals have fixture and one real-project coverage, but their usefulness and noise level need another real cold-start task.
- A second cold-start run confirmed that signals can expose the operative objective, milestone, open questions, evidence gaps, and next action in a conventional state file; a label-heavy state file exposed only its recognized status and latest next-story records, so manual reading remains required.
- Latest-record collapsing is deterministic but assumes later labeled records supersede earlier ones; projects with a different chronology may still need a narrower explicit state format.
- Playwright MCP has no representative Celestan task evidence beyond documentation comparison; its `Evaluated` state must not be treated as an available default.
- Playwright CLI has no representative task evidence and currently fails its clean-process probe; do not install or register it until that boundary changes.
- The external skill survey has distribution and documentation evidence but no Celestan task benchmark; leaderboard ranking must not be mistaken for quality, safety, or fit.
- The inspector's bounded signal vocabulary remains intentionally incomplete: BorderCrossing's current state has no objective heading and its long label history is only partially represented. Do not infer missing intent or expand extraction without another concrete state shape.

## Next action

Use the inspector with state signals and nested inventory at the start of the next repository task. Treat signals as orientation, then read the authoritative state file before consequential decisions. Use `registry/catalog.md` to choose among P0 practices and triggered P1-P3 options. Reconsider browser candidates only when a concrete persistent browser task appears, and external skills only when a named skill has a representative Celestan task and an isolated evaluation plan.

## Release

- Initial commit: `e00eba3` (`Initialize CT-Foundry capability workshop`).
- Remote: `https://github.com/MidnightProject-MP/CT-Foundry`.
- Branch: `main`, pushed and tracking `origin/main`.

## Stopping point

`AUTONOMY_IDLE` - `RAD-001`, `RAD-002`, and `RAD-003` were boundedly evaluated and deliberately not promoted; `RAD-002` has a repeatable Windows runtime assertion, and `RAD-003` produced no candidate with demonstrated incremental value. `E1.S9` confirmed the inspector's signals are useful orientation but not a replacement for authoritative state reading. The ranked catalog is available for triggered selection, but no clean representative browser task or named skill evaluation currently justifies further work.
