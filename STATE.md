# CT-Foundry - project state

## Objective

Find recurring work, friction, or capability gaps in Celestan's operation and eliminate them through the simplest reliable external capability.

## Planning hierarchy

- **Project:** CT-Foundry - improve Celestan's operational environment through the simplest reliable external capabilities.
- **Epic E1:** deterministic repository reconstruction.
- **Story E1.S1:** build and evaluate a read-only repository-state inspector. **Complete and kept.**
- **Story E1.S2:** add compact signals from durable Markdown state files. **Implemented; real-task evaluation pending.**
- **Story E1.S3:** inventory nested project roots and their direct ecosystem/verification markers. **Implemented; sampled on three additional real repositories; promotion evidence pending.**

## Current milestone

**E1.S3 - nested project inventory.** The inspector now reports bounded nested project markers and package scripts without executing commands. It has been sampled on Radius-API-DataService, Radius, and AutomatedReports; real-task usefulness and noise level remain under evaluation.

## Observations

- Starting work in an unfamiliar repository required manually locating instructions, project state, package metadata, verification scripts, CI files, top-level structure, and Git status.
- This reconstruction is deterministic and likely to recur across every project.
- The existing `$verify-static-web-release` capability addresses later release verification. It does not provide a general cold-start project-state report.
- A real run against `CT-SuperSimpleGames` found `STATE.md`, `docs/ROADMAP.md`, the package test script, and its CI workflow, while distinguishing inaccessible Git metadata from a missing repository.
- Four real runs covered the Foundry project, the identity repository, SuperSimpleGames, and Pricing Approval Portal. The inspector exposed clean Git state for two repositories, an ownership-blocked Git worktree for one, and no repository state file for the fourth.
- File discovery still left manual reading of durable state necessary. The state-signal extension now extracts bounded content for objective, milestone/status, next action, open questions, and evidence-gap headings without attempting semantic summarization.
- Root-only inspection missed executable surfaces in nested directories: `Radius-API-DataService/app`, its Terraform environments/modules, `Radius/Radius-source`, and `Radius/Scheduling-Microservice`.
- Nested inventory found those surfaces and their direct markers, while excluding `AutomatedReports/.venv`. `AutomatedReports/main.py` remains intentionally unclassified because a lone script is not enough evidence of a project verification contract.

## Decisions

- The first missing capability is a dependency-free repository-state inspector.
- The inspector reports evidence and does not make planning, architecture, model-routing, or product decisions.
- The first trial is deliberately local and read-only. It must not modify the inspected repository.
- No general agent framework, shared orchestration engine, or model benchmark is justified before recurring evidence requires one.
- The inspector reports Git safety/access failures instead of silently treating them as a clean non-repository state.
- The repository-state inspector is kept: repeated real use demonstrated useful low-risk evidence collection without project-specific assumptions.
- State signals remain deterministic and bounded; a missing or differently structured `STATE.md` is evidence, not an invitation to manufacture project state.
- Nested project inventory is evidence-only, depth-bounded, skips common generated/vendor/environment directories, and never runs discovered commands.

## Open questions

- Does the report remove enough archaeology to justify keeping the capability after real use?
- Which missing signals, if any, recur after the inspector is used on several different repositories?

## Evidence gaps

- The capability has local fixture coverage and a sample run, but no measured time saved in real work yet.
- It does not establish semantic project quality, deployment health, physical-device behavior, or human experience.
- The neighboring project's Git metadata is inaccessible to the current Windows identity because Git's safe-directory check rejects its ownership; Foundry did not change that configuration.
- Heading extraction can miss projects that store state in prose, non-Markdown files, or unconventional headings; it is not semantic project understanding.
- Nested marker output can still be noisy in large multi-project repositories, especially Terraform modules and .NET project trees; no promotion decision is made from the sample alone.

## Next action

Use the inspector with state signals and nested inventory at the start of the next repository task. Record what manual reading it made unnecessary, what it missed, and whether E1.S3 should be kept, revised, or discarded.

## Release

- Initial commit: `e00eba3` (`Initialize CT-Foundry capability workshop`).
- Remote: `https://github.com/MidnightProject-MP/CT-Foundry`.
- Branch: `main`, pushed and tracking `origin/main`.

## Stopping point

`AUTONOMY_IDLE` - E1.S3 is implemented, mechanically verified, and sampled on three real repositories. Promotion still requires evidence from the next real implementation task; no target task is currently available, and adding more machinery would be invented work.
