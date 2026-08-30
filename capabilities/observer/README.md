# Celestan Observer

Observer 1.2.0 is a dependency-free, storage-neutral capability for turning one execution's safe evidence into an immutable Execution Digest, then running a first-class semantic observation pass, consolidating observations into promotion candidates, and generating an append-only weekly Chronicle. Its additive model and host runtime telemetry fields preserve the V1 digest and semantic schema names.

## Boundary

Observer owns deterministic collection plumbing, normalization, idempotency, immutable ledger storage, semantic-task contract/validation, consolidation, coverage checks, and Chronicle generation. A provider-neutral runtime boundary supplies both telemetry and model judgment; Observer never pretends that a mechanical parser understood an execution.

The implementation is generic across repositories. It does not import project-specific rules, modify Identity, or auto-promote weak observations.

## Commands

```powershell
npm run observe -- digest --input evidence.json --store .celestan/observer
npm run observe -- consolidate --store .celestan/observer
npm run observe -- chronicle --start 2026-08-24 --end 2026-08-30 --store .celestan/observer
```

`evidence.json` contains `{ "execution": {...}, "evidence": {...} }`. `execution.orchestration`, `execution.modelRuntimeTelemetry`, and `execution.hostRuntimeTelemetry` are optional. Model telemetry accepts only authoritative model sessions, invocations, failures, and transitions; process stdout byte/chunk counters are not model telemetry. Omit absent model telemetry instead of passing an availability object. Observer projects both telemetry families to separate digest-owned top-level fields; semantic sidecars cannot replace either.

Model/runtime telemetry may contain `sessions`, `invocations`, `failures`, and `transitions`. Session and invocation records accept bounded IDs/lineage; provider, model, exact provider/model versions, agent, role, and a bounded task type plus label/ID; timestamps/duration and turns; independent input/output/reasoning/cache-read/cache-write/total token dimensions; used/limit/compaction context facts; tool/mutation/failure counts and bounded by-name counts; attempt/retry/backoff/wait facts; genuinely measured cost and currency; and bounded status/outcome. Every optional measurement normalizes to explicit `available` or `unavailable`; zero remains available zero. A zero local cost is unavailable unless the runtime sets `cost.measured: true`.

Invocation records are the atomic additive aggregate basis whenever any exist. Session measurements are aggregated only when no invocations exist. Aggregates state basis and coverage, retain every token dimension independently, derive context pressure only from used tokens and a positive limit, keep currency totals separate, count each transition event once while allowing overlapping retry/fallback/provider-switch/model-switch facets, and distinguish execution wall duration from additive invocation/session duration. Partial dimensions remain partial. Provider token totals are never manufactured from components.

Failure records use one of `model-output-quality`, `instruction-following`, `context-pressure`, `provider-limit`, `provider-capacity`, `network-transport-timeout`, `authentication-account-billing`, `tool-runtime-sandbox`, `policy-refusal`, `protocol-schema-tool-call`, `cancellation`, or `unknown`. They may retain safe class/code/status, timing, retry/fallback, token/context, runtime-attribution, and evidence-reference facts. Raw messages, headers, bodies, stack traces, tool arguments/output, and arbitrary fields are rejected. Runtime attribution remains explicitly runtime-reported and does not become Observer semantic attribution.

`execution.orchestration`, when supplied, must include `taskAvailable`, nonnegative `parentMutationCalls` and `delegatedMutationCalls`, and either a complete `parentSessionCount`/`workerSessionCount` pair, a complete `parentTaskCount`/`delegatedTaskCount` pair, or both. Observer validates nonnegative integers, required fields, and pair completeness. It does not infer causal consistency between availability, topology counts, and mutation counts because those measurements may describe different runtime scopes.

Observer deterministically emits `executionDistribution`: session/task/mutation denominators, parent-retained modification share, whether delegation was observed, and `elevatedParentRetentionProxy.observed`. The proxy is true only when total mutation calls are at least 10 and parent share is at least 0.8. Missing runtime metadata yields `availability: "unavailable"`; zero mutation calls make the share unavailable. Neither state means compliant.

`semantic-task` includes both telemetry families and their valid record IDs in its evidence package. `semantic --input` accepts only a validated `celestan-semantic-observation-v1` result. In addition to `orchestrationAssessment`, optional `modelRoutingAssessment` uses `effective`, `mixed`, `ineffective-candidate`, `insufficient-evidence`, or `not-applicable`; it requires a task condition, summary, uncertainty, allowed evidence/telemetry references, and optional bounded failure/cause attributions with target and confidence. Runtime-reported cause and semantic attribution remain distinct. Numeric measurements stay out of generic `signals`. Evidence-only records remain `semantic-analysis-pending` until the semantic pass succeeds.

## Storage

Runtime state belongs in a gitignored `.celestan/observer` directory (or equivalent object storage). The semantic record itself is durable and may be mirrored into a repository-owned ledger when policy permits:

- `records/<execution-id>.json`: immutable `celestan-execution-digest-v1` records;
- `semantic/<execution-id>.json`: immutable semantic observation results;
- `ledger.ndjson`: append-only index of recorded IDs and paths;
- `cursor.json`: last successful append checkpoint; records remain authoritative if a crash occurs before checkpoint update;
- `consolidation-YYYY-MM-DD.json`: generated findings and evidence references;
- `chronicle/YYYY-MM-DD.json` and `.md`: one append-only structured and human-readable entry per period.

CT-Runtime keeps raw Actions/local logs in its native retention store and passes safe URI/SHA references, not secrets or copied raw logs. It writes a manifest immediately after each execution and periodically invokes digest, semantic observation, consolidation, and Chronicle paths. A manifest entry without a record is a coverage failure, never a successful no-op.

Stores may implement `getSemantic`, `appendPolicyDecision`, `appendCoverageSnapshot`, and `appendChronicleArtifact`. `joinedRecords()` always validates sidecars through `getSemantic`; consolidation therefore works identically with filesystem, PostgreSQL, or object-backed stores. The filesystem implementation remains the CLI fallback. Database/object artifacts are operational authority, while Chronicle Markdown remains a portable export that can be promoted to Git only by deliberate policy.

Host telemetry is validated independently. It supports bounded startup, execution, and termination records; host identity; timestamps and durations; explicit network/provider counts; safe failure arrays; CPU, memory, and ephemeral-storage limits/measurements; termination state; and genuinely measured per-currency cost. Unknown or unavailable host facts remain explicit. Nested records, unbounded counts, reversed timestamps, raw failure messages, and unknown fields are rejected.

Current OpenCode records expose assistant-message `providerID`, `modelID`, `variant`, `agent`, `mode`, timestamps, tokens/cache, and cost; task metadata exposes child lineage/model; tool parts expose status/time/error. They do not expose authoritative retry/fallback intent, context limit, or session finish. Observed local costs are all zero and must remain unavailable unless a runtime explicitly asserts they are genuinely measured. Future CT-Runtime owns truthful capture, authoritative enrichment, scheduling, and any later enforcement. Observer cannot reconstruct omitted facts.

## Lifecycle and routing

`manifested -> evidence-collected -> semantic-analysis-pending -> observed -> consolidated` is the execution lifecycle. Separately, `episode history -> observation -> candidate -> reinforced candidate -> durable memory/lesson` is a policy lifecycle, not an automatic truth promotion. Existing signal destinations remain unchanged. Explicit `routing-policy` signals consolidate only under the same task condition and route to `routing-review`; routing changes cannot be auto-accepted.

Identity candidates always remain review-only in V1. Corrections must be new records/signals that supersede earlier interpretations; old records are never rewritten. Canonical Memory, LESSONS, Identity, and Foundry registries remain authoritative and must retain links back to digest IDs and evidence references when they accept a candidate.

`joinedRecords(store)` (also `store.joined()`) is the authoritative view of every immutable digest, including pending digests, joined with a valid semantic sidecar when present. Sidecars are reduced to an allowlisted semantic projection and cannot replace digest schema/version, execution identity/project/status/timestamps, provenance, observation timestamp, or execution-distribution measurements. Consolidation and Chronicle filter this view to observed records; coverage uses the full view so pending records are `semanticMissing`, not `missing`.

## Security and limits

Do not put secrets, credentials, private user data, or sensitive log content in records or Chronicle text. Use protected evidence references. This version does not delete raw evidence; retention/compression requires a runtime policy proving that provenance remains recoverable. Observer runs must be marked `observerMeta: true` by the runtime and excluded from ordinary digestion to prevent uncontrolled self-recursion; a separate health/coverage record can observe Observer failures.

Mutation calls and model/runtime counts measure attributed activity, not task meaning, quality, efficiency, routing correctness, provider/model fault, or policy violation. Raw metrics never emit signals, imply a universal model score, or create a simplistic optimization target. Their interpretation belongs to task-conditioned, evidence-citing semantic assessment and deliberate review.

See [`docs/observer.md`](../../docs/observer.md) for the architecture and runtime contract.
