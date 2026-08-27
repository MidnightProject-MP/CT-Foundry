# CT-Foundry

CT-Foundry is Celestan's capability workshop.

## Standing objective

Find recurring work, friction, or capability gaps in Celestan's operation, and identify external advances that expand its action space, then acquire the simplest reliable capability.

Foundry has two acquisition lanes:

- **Demand-driven:** observe repeated friction or a capability gap, research existing solutions, build/buy/configure, test, use in real work, then keep or discard.
- **Capability Radar:** discover an external advance, evaluate its practical value and risk, optionally make it available at low cost, then prove it before making it preferred.

The Radar is a bounded minority of Foundry work. It favors high-option-value changes that unlock currently impossible work, lower material cost, improve observation, autonomy, or verification, or add a reusable modality or environment. It also compares current capabilities against credible replacements so Foundry can retire homegrown or obsolete implementations.

Discovery does not equal adoption. Capabilities progress through **Discovered -> Evaluated -> Available -> Proven -> Preferred**. `Available` means the capability is cheap and safe enough to retain for future use; it is not a recommendation to use it by default. Evaluation records purpose, cost, constraints, security implications, and test evidence in the [Radar registry](./registry/radar.md).

## Ownership boundary

Foundry owns the discovery, evaluation, acquisition, construction, testing, registry, and retirement of reusable operational capabilities.

Foundry does not:

- put executable implementation in the Celestan identity repository;
- silently install or prefer a discovered capability in `C:\Celestan\capabilities`;
- silently change Celestan's identity, authority, or durable operating principles;
- replace project-owned product intent with a generic framework;
- create new paid commitments, destructive external changes, or material production risk without authority;
- build or retain a capability merely because it is interesting without a bounded evaluation and option-value case.

Capabilities may live in this repository when it is their appropriate external home, or in a separate skill, CLI, workflow, container, service, or other package. A capability promoted for direct Celestan use may be installed or registered under `C:\Celestan\capabilities` only after its registry state and evidence support that action. This repository keeps the smallest useful registry and the evidence needed to decide whether a capability deserves to remain.

## Current state

See [`STATE.md`](./STATE.md) for the active objective, evidence, stopping point, and next justified action.

## Registry

- [Capability registry](./registry/capabilities.md)
- [Experiment registry](./registry/experiments.md)
- [Capability Radar registry](./registry/radar.md)

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
