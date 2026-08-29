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
- **Capability E1.S10:** Celestan Observer suite. **Observer 1.1.0 is available with versioned Execution Digests, optional orchestration and model/runtime telemetry, deterministic covered aggregates, evidence-citing semantic orchestration/model-routing assessments, immutable ledger storage, authoritative joined observed records, consolidation, coverage, policy decisions, and append-only Chronicle generation. Runtime scheduling/capture and any future enforcement remain CT-Runtime responsibilities.**

## Current milestone

**E1.S10 - Celestan Observer 1.1.0.** The additive implementation makes execution distribution and bounded model/runtime facts observable while preserving the boundary between mechanical activity and semantic orchestration/routing judgment. The capability remains `Available`, not preferred or enforcing.

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
- A bounded orchestration audit found parent-retained mutation-call proxies of 52/52 (100%, zero children) for Observer development, 448/471 (95.1%) for focal recent BorderCrossing combined parents, and 1021/1205 (84.7%) across all reviewed post-2026-08-23 sessions. The overlapping cohorts and tool-call counts do not establish that work was delegable or policy was violated.
- Observer 1.1.0 makes optional runtime-supplied task availability, parent/worker session or task counts, and parent/delegated mutation calls measurable. Missing metadata and zero denominators remain explicitly unavailable.
- A single authoritative joined-record view contains both pending digests and validated semantic projections. Consolidation and Chronicle filter observed records; coverage distinguishes processed-pending records from missing records.
- OpenCode assistant messages expose provider/model IDs, variant, agent/mode, timestamps, token/cache dimensions, and cost; task metadata exposes child lineage/model; tool parts expose status/time/error. It does not expose authoritative retry/fallback intent, context limit, or session finish, and currently observed local costs are uniformly zero rather than established measured zero.
- Observer now normalizes optional sessions, invocations, failures, and transition events with strict safe fields and explicit measurement availability. Invocation facts are the atomic additive basis; session measurements are used only when no invocations exist.
- Deterministic aggregates retain identity/outcome dimensions, independent token dimensions, valid context pressure, tool/retry/failure/transition facts, distinct wall/additive duration, and per-currency cost with dimension-level coverage. They make no quality, efficiency, routing, fault, or universal-score claim.

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
- Observer belongs in Foundry as reusable executable infrastructure because no CT-Runtime repository or shared execution store currently exists; a future runtime should call its stable API/CLI rather than require a daemon or parallel database.
- Observer separates deterministic evidence plumbing from semantic judgment: runtime adapters collect and reference raw evidence, while a provider-neutral semantic task requires validated model output before an execution is considered observed. Weak signals remain candidates; Identity is review-only and canonical state remains authoritative.
- Observer's execution lifecycle is `manifested -> evidence-collected -> semantic-analysis-pending -> observed -> consolidated`; evidence capture alone is not semantic coverage. The ledger unit is an Execution Digest because one execution may contain multiple model/subagent sessions.
- Policy decisions are append-only and provenance-preserving; `accept`, `defer`, and `reject` are supported for episode/project memory, lessons, and Foundry, while identity remains review-only.
- Numeric execution-distribution measurements are first-class metrics, not generic semantic signals. The elevated-parent-retention threshold is a proxy for review, never an automatic compliance or violation result.
- Semantic orchestration assessment is first-class but optional for V1 compatibility; it requires a bounded outcome, cited execution evidence, and explicit uncertainty.
- Observer does not enforce delegation or route work. CT-Runtime owns truthful telemetry capture and is the future enforcement owner only if longitudinal evidence warrants controls.
- Semantic sidecars are untrusted inputs at join time: only allowlisted semantic fields are projected, while digest-owned execution identity, provenance, timestamps, and measurements remain immutable.
- Explicit semantic model-routing assessments are task-conditioned, evidence/telemetry-citing, uncertain, and separate runtime attribution from semantic cause attribution. Matching routing-policy signals may consolidate to review but cannot auto-apply routing changes.

## Open questions

- Does the report remove enough archaeology to justify keeping the capability after real use?
- Which missing signals, if any, recur after the inspector is used on several different repositories?
- Which future high-option-value external capability, if any, warrants the next bounded Radar evaluation?
- What practical frontier-work budget and review cadence preserve curiosity without creating a shiny-object backlog?
- Would a future task require persistent browser context, self-healing exploration, or a client-independent browser service that current in-app control cannot provide?
- Does a later pinned Playwright CLI release or runtime eliminate the Windows assertion and complete a representative local browser task cleanly?
- Which specific external skill, if any, demonstrates measurable incremental value on a Celestan task after isolated review?
- Which CT-Runtime repository, credentials, and scheduler contract will own GitHub Actions retrieval and periodic Observer invocation when that repository is created?

## Evidence gaps

- The capability has local fixture coverage and a sample run, but no measured time saved in real work yet.
- It does not establish semantic project quality, deployment health, physical-device behavior, or human experience.
- The neighboring project's Git metadata is inaccessible to the current Windows identity because Git's safe-directory check rejects its ownership; Foundry did not change that configuration.
- Heading extraction can miss projects that store state in prose, non-Markdown files, or unconventional headings; it is not semantic project understanding.
- Nested marker output can still be noisy in large multi-project repositories, especially Terraform modules and .NET project trees; no promotion decision is made from the sample alone.
- Labeled state signals have fixture and two real-project coverage; they remain useful orientation but do not replace authoritative state reading.
- A second cold-start run confirmed that signals can expose the operative objective, milestone, open questions, evidence gaps, and next action in a conventional state file; a label-heavy state file exposed only its recognized status and latest next-story records, so manual reading remains required.
- Latest-record collapsing is deterministic but assumes later labeled records supersede earlier ones; projects with a different chronology may still need a narrower explicit state format.
- Playwright MCP has no representative Celestan task evidence beyond documentation comparison; its `Evaluated` state must not be treated as an available default.
- Playwright CLI has no representative task evidence and currently fails its clean-process probe; do not install or register it until that boundary changes.
- The external skill survey has distribution and documentation evidence but no Celestan task benchmark; leaderboard ranking must not be mistaken for quality, safety, or fit.
- The inspector's bounded signal vocabulary remains intentionally incomplete: BorderCrossing's current state has no objective heading and its long label history is only partially represented. Do not infer missing intent or expand extraction without another concrete state shape.
- Observer has fixture and local dogfood coverage but no scheduled multi-project runtime, real GitHub Actions adapter, model-semantic provider, or longitudinal week of records yet.
- Runtime inventory is resolved: no CT-Runtime repository, scheduler workflow, service, or execution store is present under `C:\Celestan`; only the declarative external wake-up capability is documented in Identity.
- The orchestration audit attributes tool mutation calls, not semantic task units, work difficulty, quality, or delegation opportunity. Its cohorts overlap and cannot be combined into a larger sample.
- Runtime-supplied parent/worker attribution has fixture validation but no production CT-Runtime producer; absent metadata remains unavailable rather than inferred.
- Model/runtime telemetry has comprehensive fixture coverage but no production CT-Runtime producer. OpenCode's missing retry/fallback intent, context-limit, and finish facts remain unavailable; local zero costs remain unavailable unless a runtime can assert genuine measurement.
- The bounded audit is reproducible from the external OpenCode database using fixed UTC bounds and named session roots documented in `docs/observer-orchestration-audit-2026-08-29.md`; raw logs are not copied into Git and aggregate totals are not automated-test claims.

## Next action

Integrate Observer's stable CLI/API and optional orchestration/model-runtime contract into CT-Runtime when that repository and scheduler exist. CT-Runtime should supply truthful available facts, keep absent facts unavailable and raw evidence outside Git, and require semantic coverage before consolidation. Do not add enforcement or simplistic model optimization unless longitudinal task-conditioned semantic evidence establishes a durable need.

## Release

- Initial commit: `e00eba3` (`Initialize CT-Foundry capability workshop`).
- Remote: `https://github.com/MidnightProject-MP/CT-Foundry`.
- Branch: `main`, pushed and tracking `origin/main`.

## Stopping point

`AUTONOMY_CONTINUE` - E1.S10 Observer 1.1.0 is implemented and locally verified but remains available rather than preferred. Mechanical distribution and model/runtime evidence are visible without becoming quality, routing, fault, or policy proof; CT-Runtime integration, real capture/model execution, and longitudinal records remain unverified. The next justified work is runtime integration when its repository and scheduler contract exist, not enforcement or scoring inside Observer.
