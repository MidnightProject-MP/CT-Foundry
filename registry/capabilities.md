# Capability Registry

The registry records reusable capabilities, not every script or experiment. A capability is promoted only after use outside its own fixture proves that its maintenance cost earns its value.

| ID | Status | Location | Purpose | Evidence |
| --- | --- | --- | --- | --- |
| `repo-state-inspector` | Kept | [`capabilities/repo-state-inspector`](../capabilities/repo-state-inspector/) | Produce a compact, read-only report of repository structure, state-file signals, package metadata, verification entry points, CI workflows, and Git status. | 3 local tests pass; four real repository runs found project state/CI, exposed inaccessible Git metadata, and identified a repository with no durable state file. |

## Status meanings

- **Trial** - usable, but real-work evidence is incomplete.
- **Kept** - repeated real use shows the capability is worth its maintenance cost.
- **Retired** - discarded, superseded, or no longer worth maintaining.
