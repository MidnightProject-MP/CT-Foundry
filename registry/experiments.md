# Experiment Registry

## EXP-001 - repository-state report

- **Question:** Can a deterministic read-only report remove enough repeated repository archaeology to justify a reusable capability?
- **Hypothesis:** A compact report of project conventions, verification entry points, CI, and Git state will shorten cold-start reconstruction without pretending to understand the project.
- **Smallest test:** Run the inspector on a repository with known state, compare its report with the manual first-pass inspection, then use it at the beginning of the next real task.
- **Success signal:** The next task can begin with fewer manual discovery reads, and no important starting-state fact is missed.
- **Failure signal:** The report is noisy, expensive, misleading, or still requires the same archaeology; retire or narrow it rather than adding a framework around it.
- **Current result:** The inspector is kept after three local tests and four real repository runs. It found state files, package verification, and CI, and exposed an existing Git safe-directory restriction without modifying inspected projects. Time saved remains unmeasured.

## EXP-002 - bounded state signals

- **Question:** Can deterministic extraction of recognized durable-state sections reduce the manual reading still required after file discovery?
- **Hypothesis:** Compact objective, milestone/status, next-action, open-question, and evidence-gap excerpts will make cold-start state reconstruction faster without pretending to summarize arbitrary project documents.
- **Smallest test:** Use the signal report at the beginning of the next real implementation task and compare the manual reads it replaces with the signals it misses.
- **Success signal:** The next task can identify current direction, stopping point, and next action with fewer full-file reads and no consequential omission.
- **Failure signal:** Signals are noisy, misleading, or too dependent on heading conventions; narrow or retire the extension rather than adding semantic inference.
- **Current result:** Three local tests pass and real reports are readable. Real-task evaluation is pending.
