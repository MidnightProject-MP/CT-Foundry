# Capability Registry

The registry records reusable capabilities, not every script or experiment. A capability is promoted only after evidence supports its lifecycle state. `Available` is an intentional exception to repeated-use promotion: it requires low retention cost, bounded risk, and meaningful option value, but does not make the capability preferred.

| ID | Status | Location | Purpose | Evidence |
| --- | --- | --- | --- | --- |
| `repo-state-inspector` | Preferred | [`capabilities/repo-state-inspector`](../capabilities/repo-state-inspector/), [`C:\Celestan\capabilities\repo-state-inspector`](file:///C:/Celestan/capabilities/repo-state-inspector/) | Produce a compact, read-only report of repository structure, state-file signals, nested project markers, package metadata, verification entry points, CI workflows, and Git status. | 5 local tests pass; real repository runs found project state/CI, nested Node/.NET/Terraform surfaces, inaccessible Git metadata, labeled state records, and a repository with no durable state file; directly discoverable entry point installed. |
| `celestan-observer` | Available | [`capabilities/observer`](../capabilities/observer/), [`C:\Celestan\capabilities\observer`](file:///C:/Celestan/capabilities/observer/) | Convert runtime-supplied execution evidence and optional orchestration telemetry into immutable Execution Digests, deterministic distribution measurements, validated semantic observations, consolidation candidates, coverage signals, and append-only weekly Chronicle entries. | 15 Observer tests pass (20 project tests total), covering telemetry validation/formulas, unavailable metadata, semantic outcome schema, immutable sidecar projection, pending/observed joined records, two-stage consolidation/Chronicle/coverage, duplicate replay, and policy routing. The synthetic fixture assessment is `insufficient-evidence`; external audit totals are documented separately and are not test claims. Real scheduler, Actions adapter, semantic provider, and longitudinal evidence remain unverified. |

## Observer Manual Smoke

On `2026-08-29`, the source CLI and discoverable wrapper were each run against `test/fixtures/observer-session.json` plus `test/fixtures/observer-semantic.json` with separate fresh stores under the approved temporary directory. Both returned `processed`, Observer `1.1.0`, the synthetic `52/52` mechanical proxy, and semantic outcome `insufficient-evidence`. This manual invocation evidence is separate from the 15 automated Observer tests and does not validate the external audit totals.

## Status meanings

- **Trial** - usable, but real-work evidence is incomplete.
- **Available** - retained for option value; not a default recommendation.
- **Proven** - representative or real work demonstrates useful behavior.
- **Preferred** - strong evidence supports routine use.
- **Retired** - discarded, superseded, obsolete, or no longer worth maintaining.
