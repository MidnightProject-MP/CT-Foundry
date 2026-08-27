# Capability Radar

The Radar records external opportunities before they become normal Celestan capabilities. It is deliberately a ledger, not a list of interesting links.

## Operating rules

- Reserve only a bounded minority of Foundry effort for Radar work; demonstrated demand remains the default source of capability work.
- Prefer opportunities with high option value: new action space, modality, environment, autonomy, observation, verification, or material cost reduction.
- Evaluation must record what the capability does, acquisition and operating cost, constraints, maintenance burden, security and privacy implications, and a bounded test.
- Discovery never changes Celestan's default behavior. Installation or registration under `C:\Celestan\capabilities` requires an explicit `Available`, `Proven`, or `Preferred` record and an identified owner/location.
- Review existing capabilities for replacement when a credible alternative is materially more reliable, capable, inexpensive, or maintainable.

## Lifecycle

`Discovered -> Evaluated -> Available -> Proven -> Preferred`

States may move to `Retired` at any point when risk, cost, obsolescence, or failed evaluation outweighs value. `Available` is suitable for low-cost/high-option-value capabilities with limited usage evidence. It must not be interpreted as a default recommendation.

## Entries

| ID | Capability | State | Source | Option value | Next evidence | Direct location |
| --- | --- | --- | --- | --- | --- | --- |
| _none_ | No external opportunities evaluated yet. | - | - | - | Start with one bounded, high-option-value comparison. | - |

## Evaluation record

For each opportunity, record:

- **Question:** What new or improved action does this make possible?
- **Source and date:** Where it was found and when.
- **Cost:** Acquisition, runtime, model/API, infrastructure, and maintenance costs.
- **Constraints:** Platform, licensing, data, reliability, latency, and integration limits.
- **Security:** Permissions, trust boundary, data handling, supply-chain, and rollback considerations.
- **Bounded test:** Smallest representative comparison against the current approach.
- **Decision:** State, rationale, evidence, and next review date.
