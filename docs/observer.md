# Observer Architecture

## Closed loop

`Identity -> Memory -> Context -> Behavior -> Experience -> Observer -> Reflection/Consolidation -> Memory + Identity -> future behavior`

Observer is a generic Foundry capability, not a project feature. Workspace inventory found no CT-Runtime repository, workflow, service, or local scheduler; the only runtime evidence is the declarative external wake-up capability in Identity. Observer therefore exposes a stable CLI and JavaScript API for a runtime to call without changing the ledger contract.

## Data flow

1. The runtime executes work and writes a compact manifest immediately, containing an execution ID, project, run/session ID, commit, status, timestamps, evidence URIs, and a safe evidence digest. It may also supply `execution.orchestration`: task availability, parent/worker session counts and/or parent/delegated task counts, plus parent/delegated mutation-call counts. Raw GitHub Actions logs or local `.celestan/` session logs remain outside Git.
2. An adapter retrieves completed evidence. Observer creates a provider-neutral semantic task with the evidence package, observation prompt, output schema, and pending completion state. Celestan's normal model-selection machinery performs inference; Observer validates the result and records failures without claiming observation.
3. Observer writes exactly one immutable `celestan-execution-digest-v1` record per execution. Evidence-only records are `semantic-analysis-pending`; they never count as semantically observed. The filename and `ledger.ndjson` provide idempotency; `cursor.json` is a restart hint, while records remain authoritative if a crash occurs before checkpoint update.
4. A valid `celestan-semantic-observation-v1` result creates an immutable semantic record and transitions the execution to `observed`. Its optional orchestration assessment is separate from generic signals, cites supplied evidence, states uncertainty, and uses one bounded outcome: `aligned`, `mixed`, `justified-direct`, `under-delegation-candidate`, `insufficient-evidence`, or `not-applicable`. Consolidation reads only observed records and existing Memory/LESSONS snapshots, groups explicit signals, counts independent projects, and emits candidates with provenance.
5. A policy-aware consumer may accept, defer, reject, or route a candidate into episode/project memory, a lesson, Foundry, or an identity-review queue. Accepted state must cite digest IDs and source evidence. Identity changes require deliberate reflection and substantially stronger evidence.
6. A scheduled weekly job writes one immutable JSON metadata artifact and one Markdown developmental Chronicle entry for the period. Corrections are later entries, not edits.

## Source adapters

The runtime adapter interface is conceptually `{ list(manifestCursor), retrieve(manifestEntry), acknowledge(executionId) }`. GitHub Actions uses `gh run list` / `gh run view --log` or the GitHub API; local execution uses a gitignored event-log path. Both normalize into the same execution/evidence input. Adapter failures are recorded in coverage output with the execution ID and reason.

CT-Runtime owns telemetry truth: whether task delegation was available, which sessions/tasks were parent or delegated, which mutation calls belong to each, and which protected evidence references support the record. Observer validates nonnegative integers, required values, and complete count pairs, then derives totals and shares. It does not reject combinations merely because one topology count appears inconsistent with another measurement: availability, sessions, tasks, and mutations may have different runtime scopes. Stronger checks should be added only for explicit relationships, such as completed/failed counts not exceeding dispatched counts if a future contract supplies all three. Observer cannot infer missing runtime topology from prose or logs.

## Execution distribution

When orchestration metadata exists, Observer emits a first-class `executionDistribution` with session/task/mutation denominator counts, `parentRetainedModificationShare`, `delegationObserved`, and `elevatedParentRetentionProxy`. The proxy requires at least 10 total mutation calls and a parent share of at least 0.8. With no metadata the whole measurement is unavailable; with zero mutation calls the share is unavailable. Observer never maps unavailable to zero, aligned, compliant, or violating.

These are mechanical measurements. Tool-call attribution does not establish task semantics, delegation opportunity, work quality, necessity, or policy compliance. The semantic assessment may use the measurements alongside cited execution evidence, but must preserve uncertainty. Generic `signals` remain reusable qualitative claims and never carry these numeric metrics.

## Signal policy

Signals are explicit objects with `key`, `type`, `text`, and optional destination/provenance. Types include `lesson`, `memory`, `tooling-friction`, `foundry-gap`, `self-evaluation`, and `identity-policy`. One occurrence is normally an episode observation. Repeated independent occurrences become candidates. A recurring tooling or capability gap routes to Foundry; a lesson across projects can become a global-lesson candidate; identity-policy signals remain review-only until corroborated and deliberately reflected on.

The precedence boundary is: Identity/authority and canonical durable principles outrank candidate Memory and episode observations. Observer history explains and challenges state; it does not override it. Existing `MEMORY-PROTOCOL.md`, `LESSONS.md`, and `CELESTAN.md` remain canonical until an explicit consumer updates them.

## Coverage, failure recovery, and self-observation

The runtime must maintain a manifest of expected executions. `coverageReport()` identifies missing evidence records, processed records still pending semantic observation, and adapter/Observer failures. `joinedRecords(store)` and `store.joined()` expose the one authoritative view containing every digest plus a validated, allowlisted semantic projection when a sidecar exists. Digest-owned schema/version, execution identity/project/status/timestamps, provenance, observation timestamp, and measurements always win. Consolidation and Chronicle filter the joined view to observed records; coverage receives the full view so pending records become `semanticMissing` rather than `missing`. Re-running a digest is safe and returns `duplicate`; malformed, unsupported, or low-confidence semantic output is rejected and can be recorded as a retryable lifecycle failure.

Observer's own runs carry a meta-observation marker and are excluded from ordinary recursive digestion. Runtime health can still create a bounded health digest or coverage failure signal for a later Observer run. This preserves self-observation without an infinite loop.

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
