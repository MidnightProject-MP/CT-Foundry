# Observer Architecture

## Closed loop

`Identity -> Memory -> Context -> Behavior -> Experience -> Observer -> Reflection/Consolidation -> Memory + Identity -> future behavior`

Observer is a generic Foundry capability, not a project feature. Workspace inventory found no CT-Runtime repository, workflow, service, or local scheduler; the only runtime evidence is the declarative external wake-up capability in Identity. Observer therefore exposes a stable CLI and JavaScript API for a runtime to call without changing the ledger contract.

## Data flow

1. The runtime executes work and writes a compact manifest immediately, containing an execution ID, project, run/session ID, commit, status, timestamps, evidence URIs, and a safe evidence digest. It may also supply `execution.orchestration` and `execution.modelRuntimeTelemetry`. Raw GitHub Actions logs or local `.celestan/` session logs remain outside Git.
2. An adapter retrieves completed evidence. Observer creates a provider-neutral semantic task with the evidence package, observation prompt, output schema, and pending completion state. Celestan's normal model-selection machinery performs inference; Observer validates the result and records failures without claiming observation.
3. Observer writes exactly one immutable `celestan-execution-digest-v1` record per execution. Evidence-only records are `semantic-analysis-pending`; they never count as semantically observed. The filename and `ledger.ndjson` provide idempotency; `cursor.json` is a restart hint, while records remain authoritative if a crash occurs before checkpoint update.
4. A valid `celestan-semantic-observation-v1` result creates an immutable semantic record and transitions the execution to `observed`. Optional orchestration and model-routing assessments are separate from generic signals, cite supplied evidence/telemetry, and state uncertainty. Routing assessment is task-conditioned and keeps semantic failure/cause attribution distinct from runtime-reported cause. Consolidation reads only observed records and existing Memory/LESSONS snapshots, groups explicit signals, counts independent projects, and emits candidates with provenance.
5. A policy-aware consumer may accept, defer, reject, or route a candidate into episode/project memory, a lesson, Foundry, or an identity-review queue. Accepted state must cite digest IDs and source evidence. Identity changes require deliberate reflection and substantially stronger evidence.
6. A scheduled weekly job writes one immutable JSON metadata artifact and one Markdown developmental Chronicle entry for the period. Corrections are later entries, not edits.

## Source adapters

The runtime adapter interface is conceptually `{ list(manifestCursor), retrieve(manifestEntry), acknowledge(executionId) }`. GitHub Actions uses `gh run list` / `gh run view --log` or the GitHub API; local execution uses a gitignored event-log path. Both normalize into the same execution/evidence input. Adapter failures are recorded in coverage output with the execution ID and reason.

CT-Runtime owns telemetry truth: whether task delegation was available, which sessions/tasks were parent or delegated, which mutation calls belong to each, and which protected evidence references support the record. Observer validates nonnegative integers, required values, and complete count pairs, then derives totals and shares. It does not reject combinations merely because one topology count appears inconsistent with another measurement: availability, sessions, tasks, and mutations may have different runtime scopes. Stronger checks should be added only for explicit relationships, such as completed/failed counts not exceeding dispatched counts if a future contract supplies all three. Observer cannot infer missing runtime topology from prose or logs.

The current OpenCode data surface was inspected directly. Assistant messages expose provider ID, model ID, variant, agent, mode, timestamps, token/cache dimensions, and cost. Task metadata exposes child lineage and model. Tool parts expose status, time, and error facts. OpenCode does not currently provide authoritative retry/fallback intent, context limit, or session finish. Local observed costs are uniformly zero, so they are not genuine measured zero for Observer unless a future runtime explicitly marks them measured. CT-Runtime must preserve this distinction rather than filling absent facts.

## Model/runtime telemetry

The optional input has four bounded record sets: sessions, invocations, failures, and transitions. Observer accepts only allowlisted safe scalar/count/reference structures, validates globally unique IDs and lineage/cross-references, and rejects raw messages, headers, bodies, tool arguments/output, stack traces, and arbitrary objects. Exact provider/model versions remain facts rather than being collapsed into model families.

Each normalized measurement explicitly says `available` or `unavailable`; zero is retained as available zero. Invocation records are atomic for additive aggregation. If any invocation exists, session measurements are not added to invocation measurements. A session-only execution may use session measurements with basis and coverage recorded. Aggregate identity/outcome/count, token, context, tool, retry, duration, and cost dimensions each carry coverage. Total tokens are never derived from input/output/reasoning/cache components, context pressure requires used tokens plus a positive limit, and currencies are never summed together. Execution wall time and additive invocation time are separate.

Failure categories cover model output quality, instruction following, context pressure, provider limits, provider capacity/5xx, network/transport/timeouts, authentication/account/billing, tool/runtime/sandbox, policy/refusal, protocol/schema/tool calls, cancellation, and unknown. Infrastructure categories remain infrastructure facts; no mechanical rule maps them to model quality. Retry/fallback/provider-switch/model-switch transition facets may overlap on one event, while the event total remains non-overlapping.

## Execution distribution

When orchestration metadata exists, Observer emits a first-class `executionDistribution` with session/task/mutation denominator counts, `parentRetainedModificationShare`, `delegationObserved`, and `elevatedParentRetentionProxy`. The proxy requires at least 10 total mutation calls and a parent share of at least 0.8. With no metadata the whole measurement is unavailable; with zero mutation calls the share is unavailable. Observer never maps unavailable to zero, aligned, compliant, or violating.

These are mechanical measurements. Tool-call attribution does not establish task semantics, delegation opportunity, work quality, necessity, or policy compliance. The semantic assessment may use the measurements alongside cited execution evidence, but must preserve uncertainty. Generic `signals` remain reusable qualitative claims and never carry these numeric metrics.

## Signal policy

Signals are explicit objects with `key`, `type`, `text`, and optional destination/provenance. Existing lesson, memory, Foundry, and identity behavior is unchanged. A `routing-policy` signal must include a task condition; only matching key-and-condition occurrences consolidate, and they route to a review-only `routing-review` destination. Raw telemetry never creates signals, routing changes, optimization targets, or a universal model score.

The precedence boundary is: Identity/authority and canonical durable principles outrank candidate Memory and episode observations. Observer history explains and challenges state; it does not override it. Existing `MEMORY-PROTOCOL.md`, `LESSONS.md`, and `CELESTAN.md` remain canonical until an explicit consumer updates them.

## Coverage, failure recovery, and self-observation

The runtime must maintain a manifest of expected executions. `coverageReport()` identifies missing evidence records, processed records still pending semantic observation, and adapter/Observer failures. `joinedRecords(store)` and `store.joined()` expose the one authoritative view containing every digest plus a validated, allowlisted semantic projection when a sidecar exists. Digest-owned schema/version, execution identity/project/status/timestamps, provenance, observation timestamp, and measurements always win. Consolidation and Chronicle filter the joined view to observed records; coverage receives the full view so pending records become `semanticMissing` rather than `missing`. Re-running a digest is safe and returns `duplicate`; malformed, unsupported, or low-confidence semantic output is rejected and can be recorded as a retryable lifecycle failure.

Observer's own runs carry a meta-observation marker and are excluded from ordinary recursive digestion. Runtime health can still create a bounded health digest or coverage failure signal for a later Observer run. This preserves self-observation without an infinite loop. Digest-owned model/runtime telemetry, like execution identity, provenance, timestamps, and execution-distribution measurements, cannot be overwritten by semantic sidecars.

## Retention

Keep the semantic ledger and source references as long-lived history. Raw logs may expire only after the evidence digest, retrieval reference, and required provenance are safely durable and no security/compliance rule requires retention. V1 does not automate deletion.

## Bounded orchestration audit

A recent local audit motivated Observer 1.1. The Observer development execution had 52 of 52 attributed mutation calls in the parent and zero child sessions (100%). Focal recent BorderCrossing parent sessions combined had 448 of 471 mutation calls (95.1%). Across all reviewed sessions after 2026-08-23, parents had 1021 of 1205 mutation calls (84.7%).

These counts are evidence-backed activity proxies from the bounded audit, not semantic findings that each call was delegable or that policy was violated. The cohorts overlap and must not be summed. They justify making execution distribution observable and reviewing elevated retention; they do not justify hard enforcement, a new routing capability, or changing Observer from `Available`. CT-Runtime remains the prospective enforcement owner if longitudinal observed records establish a durable need.

Exact OpenCode session IDs, UTC windows, metric definitions, fixed cohort bounds, and reproduction SQL are in [`observer-orchestration-audit-2026-08-29.md`](./observer-orchestration-audit-2026-08-29.md). Raw logs and the OpenCode database remain external evidence and are not copied into Git.

## Representative Execution Digest

```json
{
  "schema": "celestan-execution-digest-v1",
  "execution": { "id": "run-2026-08-29-001", "project": "CT-Foundry", "status": "recovered" },
  "summary": "Repaired a reproducible repository-state parsing defect and verified the promoted entry point.",
  "failures": ["Leading Git status whitespace was removed by normalization."],
  "recoveries": ["Preserved porcelain status columns and added a regression test."],
  "verification": { "tests": "passed", "promotion": "passed" },
  "signals": [{ "key": "verify-source-output", "type": "lesson", "text": "Inspect normalized command output before trusting it." }],
  "provenance": { "references": ["actions://run-2026-08-29-001"], "source": "github-actions" }
}
```

## Representative consolidation

```json
{
  "schema": "celestan-observer-consolidation-v1",
  "findings": [{
    "key": "verify-source-output",
    "evidenceCount": 2,
    "independentProjects": 2,
    "status": "candidate",
    "recommendedDestination": "global-lesson-candidate",
    "evidence": ["run-1", "run-2"]
  }]
}
```

## Representative Chronicle Markdown

```markdown
# Observer Chronicle: 2026-08-24 to 2026-08-30

Celestan repaired a reproducible state-inspection defect, verified the promoted entry point, and established Observer as available infrastructure. The work improved evidence handling without changing canonical identity or memory.

## Lessons and Signals

- Inspect normalized command output before trusting it.

## Integrity

- This entry is append-only; corrections must be recorded in a later period entry.
```

## Deliberately not built in V1

- No daemon, database, vector retrieval, automatic model/provider routing, or new paid service.
- No direct GitHub credential handling; the future runtime owns authentication.
- No automatic edits to Memory, LESSONS, Identity, or Foundry registries; candidates need a policy consumer and provenance-preserving acceptance.
- No raw-log deletion, public Chronicle publication, sophisticated trend analytics, or automatic identity rewrite.
- No orchestration enforcement or new routing capability; the 1.1 measurements and semantic outcome are observation only.
- No automatic routing changes, model leaderboard, universal model score, or simplistic cost/token/latency optimization target.
