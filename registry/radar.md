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
| `RAD-001` | Playwright MCP | Evaluated | [Microsoft repository](https://github.com/microsoft/playwright-mcp) (checked 2026-08-27); npm `@playwright/mcp` 0.0.79 | Persistent browser context, structured accessibility automation, optional PDF/vision/devtools, and MCP interoperability could support long-running exploratory browser workflows. | Reconsider only if OpenCode needs persistent browser state, self-healing exploration, or a client-independent browser service that current control cannot provide. | Not installed |

### RAD-001 decision

- **Question:** Does Playwright MCP materially expand Celestan's reusable browser-verification action space beyond current in-app browser control?
- **Cost:** The package is Apache-2.0 and small at the inspected npm distribution size (85,581 bytes), but `npx @playwright/mcp@latest` adds package/browser installation, runtime process, and model-context overhead. No paid commitment was made.
- **Constraints:** Requires an MCP client and Node.js 18+. The upstream documentation says CLI plus skills is generally more token-efficient for coding agents; MCP is better suited to persistent, introspective, long-running loops.
- **Security:** It is explicitly not a security boundary. Persistent profiles can retain logged-in state; unrestricted file access, origins, permissions, CDP endpoints, shared contexts, and remote transports require deliberate configuration. `--isolated`, host/origin restrictions, and client-level permissions are necessary guardrails.
- **Bounded test:** Compared its documented core, persistence, configuration, and security model with Celestan's available in-app browser control and repeated browser verification in SuperSimpleGames and BorderCrossing.
- **Decision:** Remain `Evaluated`, not `Available`. The documented strengths overlap the current browser capability, and the installation/configuration/security surface is not justified without a concrete persistent-browser task. Preserve as a future replacement/extension candidate rather than installing it speculatively.

## Evaluation record

For each opportunity, record:

- **Question:** What new or improved action does this make possible?
- **Source and date:** Where it was found and when.
- **Cost:** Acquisition, runtime, model/API, infrastructure, and maintenance costs.
- **Constraints:** Platform, licensing, data, reliability, latency, and integration limits.
- **Security:** Permissions, trust boundary, data handling, supply-chain, and rollback considerations.
- **Bounded test:** Smallest representative comparison against the current approach.
- **Decision:** State, rationale, evidence, and next review date.
