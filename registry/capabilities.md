# Capability Registry

The registry records reusable capabilities, not every script or experiment. A capability is promoted only after evidence supports its lifecycle state. `Available` is an intentional exception to repeated-use promotion: it requires low retention cost, bounded risk, and meaningful option value, but does not make the capability preferred.

| ID | Status | Location | Purpose | Evidence |
| --- | --- | --- | --- | --- |
| `repo-state-inspector` | Preferred | [`capabilities/repo-state-inspector`](../capabilities/repo-state-inspector/), [`C:\Celestan\capabilities\repo-state-inspector`](file:///C:/Celestan/capabilities/repo-state-inspector/) | Produce a compact, read-only report of repository structure, state-file signals, nested project markers, package metadata, verification entry points, CI workflows, and Git status. | 5 local tests pass; real repository runs found project state/CI, nested Node/.NET/Terraform surfaces, inaccessible Git metadata, labeled state records, and a repository with no durable state file; directly discoverable entry point installed. |

## Status meanings

- **Trial** - usable, but real-work evidence is incomplete.
- **Available** - retained for option value; not a default recommendation.
- **Proven** - representative or real work demonstrates useful behavior.
- **Preferred** - strong evidence supports routine use.
- **Retired** - discarded, superseded, obsolete, or no longer worth maintaining.
