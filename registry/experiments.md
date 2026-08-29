# Experiment Registry

## EXP-001 - repository-state report

- **Question:** Can a deterministic read-only report remove enough repeated repository archaeology to justify a reusable capability?
- **Hypothesis:** A compact report of project conventions, verification entry points, CI, and Git state will shorten cold-start reconstruction without pretending to understand the project.
- **Smallest test:** Run the inspector on a repository with known state, compare its report with the manual first-pass inspection, then use it at the beginning of the next real task.
- **Success signal:** The next task can begin with fewer manual discovery reads, and no important starting-state fact is missed.
- **Failure signal:** The report is noisy, expensive, misleading, or still requires the same archaeology; retire or narrow it rather than adding a framework around it.
- **Current result:** The inspector is kept after five local tests and repeated real repository runs. It found state files, package verification, CI, nested projects, and Git safety/access conditions without modifying inspected projects. Time saved remains unmeasured.

## EXP-002 - bounded state signals

- **Question:** Can deterministic extraction of recognized durable-state sections reduce the manual reading still required after file discovery?
- **Hypothesis:** Compact objective, milestone/status, next-action, open-question, and evidence-gap excerpts will make cold-start state reconstruction faster without pretending to summarize arbitrary project documents.
- **Smallest test:** Use the signal report at the beginning of the next real implementation task and compare the manual reads it replaces with the signals it misses.
- **Success signal:** The next task can identify current direction, stopping point, and next action with fewer full-file reads and no consequential omission.
- **Failure signal:** Signals are noisy, misleading, or too dependent on heading conventions; narrow or retire the extension rather than adding semantic inference.
- **Current result:** Real reports are readable and the signal extension remains bounded. It exposes useful recognized headings and labels, but the mandatory full state read remains useful; keep the trial open.

## EXP-003 - nested project inventory

- **Question:** Can bounded discovery of nested project roots prevent a root-level report from hiding the actual verification surface?
- **Hypothesis:** Direct markers for Node, Python, Rust, Go, Make, .NET, and Terraform projects will expose useful nested work without executing commands or listing every file.
- **Smallest test:** Run the inventory on repositories with nested application, infrastructure, and multi-language projects, then compare its output with manual archaeology.
- **Success signal:** The report identifies the real nested verification surfaces with less manual directory traversal and acceptable noise.
- **Failure signal:** Nested output is too noisy, too slow, or misleading; narrow marker categories or retire the extension rather than adding inference.
- **Current result:** Real runs found `app` and Terraform units in Radius-API-DataService, .NET and Node projects in Radius, and correctly excluded AutomatedReports' `.venv`. A script-only Python root remains an explicit limitation; promotion evidence remains incomplete.

## EXP-004 - labeled state signals

- **Question:** Can a narrow fallback for recognized `Label: value` bullet records expose durable state from projects that do not use section headings?
- **Hypothesis:** Mapping only a small set of known labels to existing signal kinds will improve cold-start observation without semantic parsing or arbitrary summarization.
- **Smallest test:** Run the inspector on a bullet-record fixture and on a real project whose state uses labeled bullets, then compare the signals with manual reading.
- **Success signal:** Objective, status, and next-action evidence becomes visible for that state shape without adding noise from unrelated labels.
- **Failure signal:** Label collisions, duplication, or misleading extraction outweigh the missing visibility; remove the fallback rather than expanding it into semantic inference.
- **Current result:** The fixture and BorderCrossing run expose recognized labels such as `Status` and the latest `Next Story`; repeated historical labels are collapsed to the latest record and arbitrary labels remain excluded. Real-task usefulness remains to be checked on a subsequent cold start.

## EXP-005 - Playwright MCP radar evaluation

- **Question:** Does Playwright MCP materially expand Celestan's reusable browser-verification action space beyond current in-app browser control?
- **Hypothesis:** Persistent structured browser context and MCP interoperability may enable long-running exploratory workflows, but may duplicate current control and add token, process, profile, and security costs.
- **Smallest test:** Compare the official repository and npm package metadata with browser verification needs evidenced in SuperSimpleGames and BorderCrossing; do not install or configure a client.
- **Success signal:** A concrete capability unavailable through current browser control justifies a low-risk isolated installation.
- **Failure signal:** Feature overlap, client/configuration dependency, or security/maintenance cost outweighs option value; retain only as an evaluated future candidate.
- **Current result:** Remains `Evaluated` in `registry/radar.md`. Official documentation confirms persistent accessibility-tree automation and optional PDF/vision/devtools, but recommends CLI-plus-skills for coding-agent token efficiency and warns MCP is not a security boundary. No concrete missing action or installation justification was found.

## EXP-006 - Playwright CLI radar evaluation

- **Question:** Does Playwright CLI provide a safer, more token-efficient reusable browser-verification path for Celestan's recurring coding-agent work?
- **Hypothesis:** A command-line interface with skills and named sessions may fit coding-agent workflows better than MCP, but runtime stability, browser state, supply-chain pinning, and local profile handling must be proven.
- **Smallest test:** Read the official repository and npm metadata, then run pinned `--help` and `--version` probes without global installation, browser launch, skill installation, or agent configuration changes.
- **Success signal:** Pinned invocations exit cleanly and a representative local browser task can be performed with lower orchestration/context overhead than current control.
- **Failure signal:** Repeatable runtime failure, unsafe state handling, or no material action-space improvement; retain only as an evaluated candidate.
- **Current result:** Remains `Evaluated`. Version `0.1.18` printed successfully, but a Windows Node/libuv `UV_HANDLE_CLOSING` assertion reproduced after the single version probe. No installation or promotion is justified.

## EXP-007 - external agent-skill leaderboard survey

- **Question:** Can external skill leaderboards and community/repository signals identify a high-option-value capability before repeated local demand appears?
- **Hypothesis:** A bounded review of distribution signals, source documentation, and compatibility/security evidence will produce a useful shortlist without turning Foundry into indiscriminate browsing.
- **Smallest test:** Review the skills.sh leaderboard, inspect the highest-relevance browser, verification, debugging, and development skills, compare with OpenCode's native skill model, and attempt a Reddit community signal check without installing anything.
- **Success signal:** A candidate reveals a materially missing action space, or a recurring reusable method is strong enough to warrant a separately bounded evaluation.
- **Failure signal:** Rankings are too noisy, inaccessible, duplicative, or unsupported by task evidence; retain the survey as negative discovery evidence and do not install candidates.
- **Current result:** The survey produced a shortlist but no promotion candidate. `agent-browser` overlaps the unresolved Playwright path; `tdd`, `systematic-debugging`, and `verification-before-completion` overlap practices already enforced locally. Reddit results were not usable because search/API access returned no evidence/403. Keep `RAD-003` evaluated and require a concrete task before deeper candidate evaluation.

## EXP-008 - second real cold-start state-signal evaluation

- **Question:** Do bounded state signals remain useful across different durable-state shapes without replacing authoritative state reading?
- **Hypothesis:** Recognized headings and labels will expose enough orientation to reduce archaeology while preserving an explicit boundary around missing or unconventional state.
- **Smallest test:** Run the inspector with JSON signals and nested inventory on BorderCrossing and SuperSimpleGames, then compare the report with their current state files.
- **Success signal:** The report exposes actionable current direction and verification context for at least one real project, while omissions are visible and non-deceptive.
- **Failure signal:** Signals are misleading, too noisy, or imply completeness; narrow or retire the extension.
- **Current result:** SuperSimpleGames exposed objective, milestone, open questions, evidence gaps, and next action from headings. BorderCrossing exposed current status and the latest next story from a label-heavy state, but no objective heading and no complete history. Keep the bounded extension as orientation only; require the full state file for consequential decisions and do not add semantic inference.

## EXP-009 - orchestration-distribution audit

- **Question:** Is parent-retained execution activity frequent enough to justify making under-delegation observable without treating telemetry as proof of semantic policy violation?
- **Hypothesis:** Runtime-attributed task/session and mutation-call counts can identify elevated parent retention as a review proxy, while an evidence-citing semantic pass preserves uncertainty about whether direct work was justified.
- **Smallest test:** Audit the recent available session cohort, implement deterministic distribution measurements and a separate semantic assessment, then verify valid/invalid telemetry, formulas, unavailable states, semantic outcomes, and two-stage consumers.
- **Success signal:** Observer records denominators and elevated retention without emitting compliance claims; semantic judgment remains cited and uncertain; Chronicle, consolidation, and coverage agree on two-stage observed records.
- **Failure signal:** Attribution cannot be supplied consistently, numeric telemetry leaks into generic signals, or the proxy is treated as automatic violation/enforcement; narrow or remove the extension.
- **Current result:** Observer development retained 52/52 mutation-tool rows in the parent with zero children (100%); focal recent BorderCrossing combined parents retained 448/471 (95.1%); the fixed post-cutoff cohort retained 1021/1205 (84.7%). These overlapping external-audit cohorts are bounded proxies, not automated test fixtures or proof that calls were successful, delegable, or policy-violating. Exact provenance and reproduction SQL are in [`docs/observer-orchestration-audit-2026-08-29.md`](../docs/observer-orchestration-audit-2026-08-29.md). No hard enforcement or routing capability was built.
