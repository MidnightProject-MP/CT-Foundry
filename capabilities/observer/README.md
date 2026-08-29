# Celestan Observer

Observer 1.1.0 is a dependency-free, reusable capability for turning one execution's safe evidence into an immutable Execution Digest, then running a first-class semantic observation pass, consolidating observations into promotion candidates, and generating an append-only weekly Chronicle. Existing optional V1 fields and V1 schema names remain compatible.

## Boundary

Observer owns deterministic collection plumbing, normalization, idempotency, immutable ledger storage, semantic-task contract/validation, consolidation, coverage checks, and Chronicle generation. A provider-neutral runtime boundary supplies both telemetry and model judgment; Observer never pretends that a mechanical parser understood an execution.

The implementation is generic across repositories. It does not import project-specific rules, modify Identity, or auto-promote weak observations.

## Commands

```powershell
npm run observe -- digest --input evidence.json --store .celestan/observer
npm run observe -- consolidate --store .celestan/observer
npm run observe -- chronicle --start 2026-08-24 --end 2026-08-30 --store .celestan/observer
```

`evidence.json` contains `{ "execution": {...}, "evidence": {...} }`. `execution.orchestration` is optional. When supplied, it must include `taskAvailable`, nonnegative `parentMutationCalls` and `delegatedMutationCalls`, and either a complete `parentSessionCount`/`workerSessionCount` pair, a complete `parentTaskCount`/`delegatedTaskCount` pair, or both. Observer validates nonnegative integers, required fields, and pair completeness. It does not infer causal consistency between availability, topology counts, and mutation counts because those measurements may describe different runtime scopes.

Observer deterministically emits `executionDistribution`: session/task/mutation denominators, parent-retained modification share, whether delegation was observed, and `elevatedParentRetentionProxy.observed`. The proxy is true only when total mutation calls are at least 10 and parent share is at least 0.8. Missing runtime metadata yields `availability: "unavailable"`; zero mutation calls make the share unavailable. Neither state means compliant.

`semantic-task` includes these measurements in its evidence package. `semantic --input` accepts only a validated `celestan-semantic-observation-v1` result. An optional first-class `orchestrationAssessment` has one of `aligned`, `mixed`, `justified-direct`, `under-delegation-candidate`, `insufficient-evidence`, or `not-applicable`, plus a summary, uncertainty, and references drawn from the execution evidence. Numeric measurements stay in `executionDistribution`, not generic `signals`. Evidence-only records remain `semantic-analysis-pending` until the semantic pass succeeds.

## Storage

Runtime state belongs in a gitignored `.celestan/observer` directory (or equivalent object storage). The semantic record itself is durable and may be mirrored into a repository-owned ledger when policy permits:

- `records/<execution-id>.json`: immutable `celestan-execution-digest-v1` records;
- `semantic/<execution-id>.json`: immutable semantic observation results;
- `ledger.ndjson`: append-only index of recorded IDs and paths;
- `cursor.json`: last successful append checkpoint; records remain authoritative if a crash occurs before checkpoint update;
- `consolidation-YYYY-MM-DD.json`: generated findings and evidence references;
- `chronicle/YYYY-MM-DD.json` and `.md`: one append-only structured and human-readable entry per period.

The future CT-Runtime should keep raw Actions/local logs in its native retention store and pass safe URI/SHA references, not secrets or copied raw logs. It should write a manifest immediately after each execution and periodically invoke `digest`, `consolidate`, and `chronicle`. A manifest entry without a record is a coverage failure, never a successful no-op.

CT-Runtime owns truthful capture of task availability, session/task topology, mutation-call attribution, and evidence references. Observer cannot reconstruct omitted telemetry. If longitudinal evidence eventually warrants routing or enforcement, CT-Runtime is the owner; Observer 1.1 adds observation, not hard enforcement or a routing capability.

## Lifecycle and routing

`manifested -> evidence-collected -> semantic-analysis-pending -> observed -> consolidated` is the execution lifecycle. Separately, `episode history -> observation -> candidate -> reinforced candidate -> durable memory/lesson` is a policy lifecycle, not an automatic truth promotion. Consolidation counts occurrences and independent projects, checks existing memory/lessons, and emits destinations such as `episode-history`, `project-lesson-candidate`, `global-lesson-candidate`, `memory-candidate`, `foundry`, and `identity-candidate-review`.

Identity candidates always remain review-only in V1. Corrections must be new records/signals that supersede earlier interpretations; old records are never rewritten. Canonical Memory, LESSONS, Identity, and Foundry registries remain authoritative and must retain links back to digest IDs and evidence references when they accept a candidate.

`joinedRecords(store)` (also `store.joined()`) is the authoritative view of every immutable digest, including pending digests, joined with a valid semantic sidecar when present. Sidecars are reduced to an allowlisted semantic projection and cannot replace digest schema/version, execution identity/project/status/timestamps, provenance, observation timestamp, or execution-distribution measurements. Consolidation and Chronicle filter this view to observed records; coverage uses the full view so pending records are `semanticMissing`, not `missing`.

## Security and limits

Do not put secrets, credentials, private user data, or sensitive log content in records or Chronicle text. Use protected evidence references. This version does not delete raw evidence; retention/compression requires a runtime policy proving that provenance remains recoverable. Observer runs must be marked `observerMeta: true` by the runtime and excluded from ordinary digestion to prevent uncontrolled self-recursion; a separate health/coverage record can observe Observer failures.

Mutation calls measure attributed tool activity, not task meaning, difficulty, quality, opportunity to delegate, or policy violation. Parent retention can be justified; delegated work can still be poor. The elevated-retention proxy is a review trigger whose interpretation belongs to evidence-citing semantic assessment.

See [`docs/observer.md`](../../docs/observer.md) for the architecture and runtime contract.
