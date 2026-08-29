# Capability Registry

The registry records reusable capabilities, not every script or experiment. A capability is promoted only after evidence supports its lifecycle state. `Available` is an intentional exception to repeated-use promotion: it requires low retention cost, bounded risk, and meaningful option value, but does not make the capability preferred.

| ID | Status | Location | Purpose | Evidence |
| --- | --- | --- | --- | --- |
| `repo-state-inspector` | Preferred | [`capabilities/repo-state-inspector`](../capabilities/repo-state-inspector/), [`C:\Celestan\capabilities\repo-state-inspector`](file:///C:/Celestan/capabilities/repo-state-inspector/) | Produce a compact, read-only report of repository structure, state-file signals, nested project markers, package metadata, verification entry points, CI workflows, and Git status. | 5 local tests pass; real repository runs found project state/CI, nested Node/.NET/Terraform surfaces, inaccessible Git metadata, labeled state records, and a repository with no durable state file; directly discoverable entry point installed. |
| `celestan-observer` | Available | [`capabilities/observer`](../capabilities/observer/), [`C:\Celestan\capabilities\observer`](file:///C:/Celestan/capabilities/observer/) | Convert runtime-supplied execution evidence, orchestration telemetry, and optional model/runtime facts into immutable Execution Digests, deterministic covered aggregates, validated semantic observations, review candidates, coverage signals, and append-only weekly Chronicle entries. | 23 Observer tests pass (28 project tests total), covering absent/zero/partial telemetry, normalization and safe rejection, uniqueness/references, invocation-first aggregation, independent token/context/cost dimensions, failures/transitions, semantic routing assessment, immutable telemetry projection, pending coverage, consolidation/Chronicle, and review-only task-conditioned routing signals. Runtime capture, scheduler, Actions adapter, semantic provider, and longitudinal evidence remain unverified. |

## Observer Manual Smoke

On `2026-08-29`, the source CLI and discoverable wrapper were each run against `test/fixtures/observer-session.json` plus `test/fixtures/observer-semantic.json` with separate fresh stores under the approved temporary directory. Both returned `processed`, Observer `1.1.0`, the synthetic `52/52` mechanical proxy, invocation-basis telemetry with explicit unavailable local cost, and `insufficient-evidence` orchestration/routing outcomes; each also emitted the corresponding semantic task. This manual invocation evidence is separate from the 23 automated Observer tests and does not validate the external audit totals.

## Status meanings

- **Trial** - usable, but real-work evidence is incomplete.
- **Available** - retained for option value; not a default recommendation.
- **Proven** - representative or real work demonstrates useful behavior.
- **Preferred** - strong evidence supports routine use.
- **Retired** - discarded, superseded, obsolete, or no longer worth maintaining.
