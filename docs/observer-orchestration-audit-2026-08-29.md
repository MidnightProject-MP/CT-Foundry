# Observer Orchestration Audit: 2026-08-29

## Scope and source

This bounded audit used the external OpenCode SQLite database at `%USERPROFILE%\.local\share\opencode\opencode.db`. The source remains outside Git; no raw logs, prompts, tool outputs, or database copy are committed here. The durable provenance record for the original read-only audit is OpenCode session `ses_fb0da417bffeEzKEpTuj2J8iZ5`, created `2026-08-29T20:11:08Z` and updated `2026-08-29T20:17:45Z`.

The all-session cohort selects sessions created in the half-open UTC window `[2026-08-23T00:00:00Z, 2026-08-29T20:11:09Z)`. Tool parts are bounded before `2026-08-29T20:17:46Z`, immediately after the source audit completed. These bounds fix both population and observations even as OpenCode later adds data. A parent is a selected session with `parent_id IS NULL`; a child is a selected session with non-null `parent_id`.

## Metric

A mutation call is one OpenCode `part` row where `data.type = "tool"` and `data.tool` is `apply_patch`, `edit`, or `write`. The reported audit totals count those rows regardless of final tool status because that is the query that reproduces the original snapshot totals. They are calls, not unique files, successful edits, semantic authorship, task difficulty, or proof that work was delegable.

Parent-retained modification share is `parent mutation calls / (parent + child mutation calls)`. Cohorts overlap and must not be added.

## Cohorts

| Cohort | Exact roots and UTC window | Parent | Child | Share |
| --- | --- | ---: | ---: | ---: |
| Observer development | `ses_fbb4b239fffec0Rt7OveYv0Gh6`; `2026-08-27T19:31:38Z` to `2026-08-29T20:14:50Z`; root plus direct children | 52 | 0 | 100% |
| Focal BorderCrossing | `ses_fc87d56daffe9jeFd453OGaNiw`; `2026-08-25T06:01:44Z` to `2026-08-25T14:24:52Z`, and `ses_fc5560cabffeWA49KMGv231rJX`; `2026-08-25T20:43:31Z` to `2026-08-29T13:57:44Z`; roots plus direct children | 448 | 23 | 95.1% |
| All post-cutoff sessions | Every session created in the fixed half-open cohort window above | 1021 | 184 | 84.7% |

The nine parent IDs in the all-session cohort are `ses_fcfc270baffe3f2MKRQfWOdQA9`, `ses_fcdfdb4c1ffezSFadqAehMMwpB`, `ses_fcdc7902afferOsHqyHlimLOj4`, `ses_fcb8d11baffew7RN3JgZHnVoZz`, `ses_fc8a9edbaffetsEiAUOekghfN6`, `ses_fc87d56daffe9jeFd453OGaNiw`, `ses_fc6898462ffe7FFdoE8Qq2ZLkE`, `ses_fc5560cabffeWA49KMGv231rJX`, and `ses_fbb4b239fffec0Rt7OveYv0Gh6`. The 58 children are selected mechanically by the same timestamp window and non-null `parent_id`; the fixed query is authoritative over a duplicated ID list.

## Reproduction

Run through OpenCode's read-only database command. The all-session aggregate is:

```sql
WITH cohort AS (
  SELECT id, CASE WHEN parent_id IS NULL THEN 'parent' ELSE 'child' END role
  FROM session
  WHERE time_created >= unixepoch('2026-08-23T00:00:00Z') * 1000
    AND time_created < unixepoch('2026-08-29T20:11:09Z') * 1000
)
SELECT role,
       COUNT(DISTINCT cohort.id) AS sessions,
       COUNT(part.id) FILTER (
         WHERE part.time_created < unixepoch('2026-08-29T20:17:46Z') * 1000
           AND json_extract(part.data, '$.type') = 'tool'
           AND json_extract(part.data, '$.tool') IN ('apply_patch', 'edit', 'write')
       ) AS mutation_calls
FROM cohort
LEFT JOIN part ON part.session_id = cohort.id
GROUP BY role;
```

For a focal tree, replace the timestamp predicate with `session.id = <root>` or `session.parent_id = <root>`. Use both named BorderCrossing roots for the combined cohort.

## Boundary

This external audit motivated a measurable runtime proxy; it is not an automated fixture assertion and its totals are not claimed as test coverage. Observer tests verify telemetry validation and formulas using synthetic fixtures only. Semantic evidence is still required to distinguish aligned, mixed, justified-direct, under-delegation-candidate, insufficient-evidence, and not-applicable outcomes. No routing or enforcement conclusion follows from these totals.
