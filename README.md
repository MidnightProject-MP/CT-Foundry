# CT-Foundry

CT-Foundry is Celestan's capability workshop.

## Standing objective

Find recurring work, friction, or capability gaps in Celestan's operation and eliminate them through the simplest reliable external capability.

The working loop is:

**Observe -> select friction -> research existing solution -> build, buy, or configure -> test -> use in real work -> keep or discard.**

## Ownership boundary

Foundry owns the discovery, evaluation, acquisition, construction, testing, registry, and retirement of reusable operational capabilities.

Foundry does not:

- put executable implementation in the Celestan identity repository;
- silently change Celestan's identity, authority, or durable operating principles;
- replace project-owned product intent with a generic framework;
- create new paid commitments, destructive external changes, or material production risk without authority;
- build a capability merely because it is interesting instead of because recurring evidence justifies it.

Capabilities may live in this repository when it is their appropriate external home, or in a separate skill, CLI, workflow, container, service, or other package. This repository keeps the smallest useful registry and the evidence needed to decide whether a capability deserves to remain.

## Current state

See [`STATE.md`](./STATE.md) for the active objective, evidence, stopping point, and next justified action.

## Registry

- [Capability registry](./registry/capabilities.md)
- [Experiment registry](./registry/experiments.md)

## Local verification

This project has no runtime dependencies.

```powershell
npm test
```

The first trial capability can be run directly:

```powershell
node capabilities/repo-state-inspector/inspect.mjs <repository-path>
node capabilities/repo-state-inspector/inspect.mjs <repository-path> --format json
```
