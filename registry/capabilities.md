# Capability Registry

The registry records reusable capabilities, not every script or experiment. A capability is promoted only after evidence supports its lifecycle state. `Available` is an intentional exception to repeated-use promotion: it requires low retention cost, bounded risk, and meaningful option value, but does not make the capability preferred.

| ID | Status | Location | Purpose | Evidence |
| --- | --- | --- | --- | --- |
| `repo-state-inspector` | Preferred | [`capabilities/repo-state-inspector`](../capabilities/repo-state-inspector/), [`C:\Celestan\capabilities\repo-state-inspector`](file:///C:/Celestan/capabilities/repo-state-inspector/) | Produce a compact, read-only report of repository structure, state-file signals, nested project markers, package metadata, verification entry points, CI workflows, and Git status. | 5 local tests pass; real repository runs found project state/CI, nested Node/.NET/Terraform surfaces, inaccessible Git metadata, labeled state records, and a repository with no durable state file; directly discoverable entry point installed. |
| `celestan-observer` | Available | [`capabilities/observer`](../capabilities/observer/), [`C:\Celestan\capabilities\observer`](file:///C:/Celestan/capabilities/observer/) | Convert runtime-supplied execution evidence into immutable Execution Digests, validated semantic observations, consolidation candidates, coverage signals, and append-only weekly Chronicle entries. | 13 focused tests pass; local CLI digestion, semantic task/validation, duplicate replay, consolidation, Chronicle generation, and promoted entry-point invocation pass. Real scheduler, Actions adapter, semantic provider, and longitudinal evidence remain unverified. |

## Status meanings

- **Trial** - usable, but real-work evidence is incomplete.
- **Available** - retained for option value; not a default recommendation.
- **Proven** - representative or real work demonstrates useful behavior.
- **Preferred** - strong evidence supports routine use.
- **Retired** - discarded, superseded, obsolete, or no longer worth maintaining.
