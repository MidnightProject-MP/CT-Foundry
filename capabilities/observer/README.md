# Celestan Observer

Observer is a dependency-free, reusable capability for turning one execution's safe evidence into a durable semantic Session Digest, then consolidating digests into promotion candidates and an append-only weekly Chronicle.

## Boundary

Observer owns deterministic collection plumbing, normalization, idempotency, immutable ledger storage, consolidation, coverage checks, and Chronicle generation. A runtime adapter supplies execution metadata and raw-evidence references. Semantic judgment is supplied as a structured `semantic` payload by a model/runtime integration; Observer never pretends that a mechanical parser understood an execution.

The implementation is generic across repositories. It does not import project-specific rules, modify Identity, or auto-promote weak observations.

## Commands

```powershell
npm run observe -- digest --input evidence.json --store .celestan/observer
npm run observe -- consolidate --store .celestan/observer
npm run observe -- chronicle --start 2026-08-24 --end 2026-08-30 --store .celestan/observer
```

`evidence.json` contains `{ "execution": {...}, "evidence": {...} }`; an optional `--semantic` JSON file contains the semantic fields accepted by `createDigest()`.

## Storage

Runtime state belongs in a gitignored `.celestan/observer` directory (or equivalent object storage). The semantic record itself is durable and may be mirrored into a repository-owned ledger when policy permits:

- `records/<execution-id>.json`: immutable `celestan-session-digest-v1` records;
- `ledger.ndjson`: append-only index of recorded IDs and paths;
- `cursor.json`: last successful append checkpoint; records remain authoritative if a crash occurs before checkpoint update;
- `consolidation-YYYY-MM-DD.json`: generated findings and evidence references;
- `chronicle/YYYY-MM-DD.json`: one append-only weekly narrative per period.

The future CT-Runtime should keep raw Actions/local logs in its native retention store and pass safe URI/SHA references, not secrets or copied raw logs. It should write a manifest immediately after each execution and periodically invoke `digest`, `consolidate`, and `chronicle`. A manifest entry without a record is a coverage failure, never a successful no-op.

## Lifecycle and routing

`episode history -> observation -> candidate -> reinforced candidate -> durable memory/lesson` is a policy lifecycle, not an automatic truth promotion. Consolidation counts occurrences and independent projects, checks existing memory/lessons, and emits destinations such as `episode-history`, `project-lesson-candidate`, `global-lesson-candidate`, `memory-candidate`, `foundry`, and `identity-candidate-review`.

Identity candidates always remain review-only in V1. Corrections must be new records/signals that supersede earlier interpretations; old records are never rewritten. Canonical Memory, LESSONS, Identity, and Foundry registries remain authoritative and must retain links back to digest IDs and evidence references when they accept a candidate.

## Security and limits

Do not put secrets, credentials, private user data, or sensitive log content in records or Chronicle text. Use protected evidence references. This version does not delete raw evidence; retention/compression requires a runtime policy proving that provenance remains recoverable. Observer runs must be marked `observerMeta: true` by the runtime and excluded from ordinary digestion to prevent uncontrolled self-recursion; a separate health/coverage record can observe Observer failures.

See [`docs/observer.md`](../../docs/observer.md) for the architecture and runtime contract.
