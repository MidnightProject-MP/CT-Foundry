import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDigest, createSemanticObservationTask, deriveExecutionDistribution, OBSERVER_VERSION, ORCHESTRATION_OUTCOMES, SEMANTIC_SCHEMA, validateSemanticObservation } from '../capabilities/observer/schema.mjs';
import { ObserverStore, appendChronicle, consolidate, coverageReport, createPolicyDecision, digestAndAppend, joinedRecords } from '../capabilities/observer/observer.mjs';

const execution = (id, project, status = 'success') => ({ executionId: id, project, environment: 'fixture', status, startedAt: '2026-08-29T10:00:00Z', finishedAt: '2026-08-29T10:05:00Z' });
const semantic = (id, status, signals = [], extra = {}) => ({ schema: SEMANTIC_SCHEMA, executionId: id, status: 'complete', summary: `${status} fixture`, confidence: 0.9, signals, ...extra });
const input = (id, project, status, signals = [], extra = {}) => ({ execution: execution(id, project, status), evidence: { source: 'fixture', references: [`fixture://${id}`], ...extra }, semantic: semantic(id, status, signals) });

test('creates a compact versioned digest and preserves provenance', () => {
  const digest = createDigest({ execution: execution('ok-1', 'alpha'), evidence: { source: 'actions', references: ['actions://1'] }, semantic: semantic('ok-1', 'success', [], { actions: ['run tests'], verification: { tests: 'passed' } }) });
  assert.equal(digest.schema, 'celestan-execution-digest-v1');
  assert.equal(digest.observerVersion, '1.1.0');
  assert.equal(OBSERVER_VERSION, '1.1.0');
  assert.equal(digest.execution.id, 'ok-1');
  assert.deepEqual(digest.verification, { tests: 'passed' });
  assert.deepEqual(digest.provenance.references, ['actions://1']);
  assert.equal('approaches' in digest, false);
});

test('derives execution-distribution formulas without mixing metrics into generic signals', () => {
  const orchestration = { taskAvailable: true, parentSessionCount: 1, workerSessionCount: 2, parentTaskCount: 1, delegatedTaskCount: 2, parentMutationCalls: 8, delegatedMutationCalls: 2 };
  const digest = createDigest({ execution: { ...execution('distributed', 'alpha'), orchestration }, evidence: {}, semantic: semantic('distributed', 'success') });
  assert.deepEqual(digest.executionDistribution.sessionCounts, { parent: 1, worker: 2, total: 3 });
  assert.deepEqual(digest.executionDistribution.taskCounts, { parent: 1, delegated: 2, total: 3 });
  assert.deepEqual(digest.executionDistribution.mutationCallCounts, { parent: 8, delegated: 2, total: 10 });
  assert.equal(digest.executionDistribution.parentRetainedModificationShare.value, 0.8);
  assert.equal(digest.executionDistribution.parentRetainedModificationShare.denominatorMutationCalls, 10);
  assert.equal(digest.executionDistribution.delegationObserved, true);
  assert.equal(digest.executionDistribution.elevatedParentRetentionProxy.observed, true);
  assert.deepEqual(digest.signals, undefined);
  assert.equal(createSemanticObservationTask(digest).evidencePackage.executionDistribution.mutationCallCounts.total, 10);
});

test('reports absent or denominator-free orchestration measurements as unavailable, not zero or compliant', () => {
  assert.deepEqual(deriveExecutionDistribution(), { availability: 'unavailable', reason: 'runtime-orchestration-metadata-not-supplied' });
  const distribution = deriveExecutionDistribution({ taskAvailable: true, parentSessionCount: 1, workerSessionCount: 0, parentMutationCalls: 0, delegatedMutationCalls: 0 });
  assert.equal(distribution.parentRetainedModificationShare.availability, 'unavailable');
  assert.equal(distribution.parentRetainedModificationShare.denominatorMutationCalls, 0);
  assert.equal('value' in distribution.parentRetainedModificationShare, false);
  assert.equal(distribution.elevatedParentRetentionProxy.observed, false);
});

test('rejects invalid or inconsistent runtime orchestration metadata', async () => {
  const base = { taskAvailable: true, parentSessionCount: 1, workerSessionCount: 0, parentMutationCalls: 1, delegatedMutationCalls: 0 };
  const fixture = JSON.parse(await readFile(new URL('./fixtures/observer-session-invalid.json', import.meta.url), 'utf8'));
  assert.throws(() => createDigest(fixture), /supply parentSessionCount and workerSessionCount together/);
  assert.throws(() => createDigest({ execution: { ...execution('bad-negative', 'alpha'), orchestration: { ...base, parentMutationCalls: -1 } } }), /nonnegative integer/);
  assert.throws(() => createDigest({ execution: { ...execution('bad-pair', 'alpha'), orchestration: { ...base, workerSessionCount: undefined } } }), /supply parentSessionCount and workerSessionCount together/);
  assert.throws(() => createDigest({ execution: { ...execution('bad-missing', 'alpha'), orchestration: { taskAvailable: true, parentSessionCount: 1, workerSessionCount: 0 } } }), /supply parentMutationCalls/);
  const accepted = createDigest({ execution: { ...execution('accepted-topology', 'alpha'), orchestration: { ...base, taskAvailable: false, delegatedMutationCalls: 1 } } });
  assert.equal(accepted.executionDistribution.delegationObserved, true);
});

test('successful run, failed recovery, human correction, and crash remain structured', () => {
  const digest = createDigest({ execution: execution('recovered', 'alpha', 'recovered'), evidence: {}, semantic: semantic('recovered', 'recovered', [], { failures: ['initial command failed'], recoveries: ['rerouted to a supported command'], interventions: ['human corrected the target path'], autonomyBlocks: ['session ended before deployment'] }) });
  assert.deepEqual(digest.failures, ['initial command failed']);
  assert.deepEqual(digest.recoveries, ['rerouted to a supported command']);
  assert.deepEqual(digest.interventions, ['human corrected the target path']);
  assert.deepEqual(digest.autonomyBlocks, ['session ended before deployment']);
});

test('semantic observation is explicit, provider-neutral, validated, and cannot be faked by evidence capture', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'observer-'));
  const store = new ObserverStore(root);
  const pending = await digestAndAppend(store, { execution: execution('pending', 'alpha'), evidence: { source: 'fixture', references: ['fixture://pending'] } });
  assert.equal(pending.digest.lifecycle.state, 'semantic-analysis-pending');
  assert.deepEqual((await consolidate(store)).inputRecords, []);
  const task = createSemanticObservationTask(pending.digest);
  assert.equal(task.completion, 'pending');
  assert.equal(task.outputSchema, SEMANTIC_SCHEMA);
  assert.equal(task.evidencePackage.executionDistribution.availability, 'unavailable');
  assert.deepEqual(task.orchestrationAssessment.outcomes, ORCHESTRATION_OUTCOMES);
  await assert.rejects(() => store.appendSemantic('pending', { schema: 'wrong', executionId: 'pending', status: 'complete', summary: 'bad', confidence: 1, signals: [] }), /Unsupported/);
  await assert.rejects(() => store.appendSemantic('pending', semantic('pending', 'success', [], { confidence: 0.2 })), /below/);
  assert.equal((await store.appendSemantic('pending', semantic('pending', 'success'))).status, 'observed');
  assert.equal((await consolidate(store)).inputRecords[0], 'pending');
});

test('semantic orchestration assessment accepts every bounded outcome and requires cited evidence and uncertainty', () => {
  for (const outcome of ORCHESTRATION_OUTCOMES) {
    const output = semantic('assessment', 'success', [], { orchestrationAssessment: { outcome, summary: 'Bounded assessment.', uncertainty: 'The proxy does not prove task semantics.', evidenceReferences: ['fixture://assessment'] } });
    assert.equal(validateSemanticObservation(output, 'assessment', { allowedEvidenceReferences: ['fixture://assessment'] }).orchestrationAssessment.outcome, outcome);
  }
  const base = semantic('assessment', 'success', [], { orchestrationAssessment: { outcome: 'aligned', summary: 'Bounded assessment.', uncertainty: 'Some context is unavailable.', evidenceReferences: ['fixture://assessment'] } });
  assert.throws(() => validateSemanticObservation({ ...base, orchestrationAssessment: { ...base.orchestrationAssessment, outcome: 'compliant' } }, 'assessment'), /outcome must be one of/);
  assert.throws(() => validateSemanticObservation({ ...base, orchestrationAssessment: { ...base.orchestrationAssessment, uncertainty: '' } }, 'assessment'), /uncertainty is required/);
  assert.throws(() => validateSemanticObservation({ ...base, orchestrationAssessment: { ...base.orchestrationAssessment, evidenceReferences: [] } }, 'assessment'), /requires evidenceReferences/);
  assert.throws(() => validateSemanticObservation(base, 'assessment', { allowedEvidenceReferences: ['fixture://other'] }), /unknown evidence reference/);
});

test('ledger is idempotent and consolidation distinguishes project/global signals', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'observer-'));
  const store = new ObserverStore(root);
  const signal = { key: 'verify-before-act', type: 'lesson', text: 'Read authoritative state before consequential action' };
  assert.equal((await digestAndAppend(store, input('a', 'alpha', 'success', [signal]))).result.status, 'processed');
  assert.equal((await digestAndAppend(store, input('a', 'alpha', 'success', [signal]))).result.status, 'duplicate');
  assert.equal((await digestAndAppend(store, input('b', 'beta', 'success', [signal]))).result.status, 'processed');
  const result = await consolidate(store);
  assert.equal(result.findings[0].independentProjects, 2);
  assert.equal(result.findings[0].recommendedDestination, 'global-lesson-candidate');
  assert.equal((await readFile(path.join(root, 'cursor.json'), 'utf8')).includes('"lastExecutionId": "b"'), true);
  assert.deepEqual(result.inputRecords, ['a', 'b']);
});

test('tooling friction feeds Foundry while weak identity signals stay review-only', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'observer-'));
  const store = new ObserverStore(root);
  await digestAndAppend(store, input('c', 'alpha', 'failure', [
    { key: 'broken-tool', type: 'tooling-friction', text: 'CLI assertion on Windows' },
    { key: 'identity-idea', type: 'identity-policy', text: 'Always use a different workflow' }
  ]));
  const result = await consolidate(store);
  const byKey = Object.fromEntries(result.findings.map((finding) => [finding.key, finding]));
  assert.equal(byKey['broken-tool'].recommendedDestination, 'foundry');
  assert.equal(byKey['identity-idea'].recommendedDestination, 'identity-candidate-review');
  assert.equal(byKey['identity-idea'].status, 'observation');
  const reinforced = await consolidate(store, { existingLessons: [{ key: 'broken-tool' }] });
  assert.equal(reinforced.findings.find((finding) => finding.key === 'broken-tool').existingMatch, true);
});

test('coverage detects missing and incomplete executions instead of silently skipping', () => {
  const report = coverageReport({ manifest: [{ executionId: 'seen' }, { executionId: 'missing' }], records: [{ execution: { id: 'seen' } }], failures: ['crashed: no evidence digest'] });
  assert.equal(report.healthy, false);
  assert.deepEqual(report.missing, ['missing']);
  assert.deepEqual(report.semanticMissing, ['seen']);
  assert.equal(report.failures.length, 1);
});

test('coverage requires both authoritative observed markers', () => {
  const manifest = [{ executionId: 'lifecycle-only' }, { executionId: 'semantic-only' }, { executionId: 'complete' }];
  const records = [
    { execution: { id: 'lifecycle-only' }, lifecycle: { state: 'observed' } },
    { execution: { id: 'semantic-only' }, semanticObservation: { status: 'complete' } },
    { execution: { id: 'complete' }, lifecycle: { state: 'observed' }, semanticObservation: { status: 'complete' } }
  ];
  const report = coverageReport({ manifest, records });
  assert.deepEqual(report.missing, []);
  assert.deepEqual(report.semanticMissing, ['lifecycle-only', 'semantic-only']);
  assert.equal(report.semanticallyObserved, 1);
  assert.equal(report.healthy, false);
});

test('authoritative joined records preserve pending state and support two-stage consumers', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'observer-'));
  const store = new ObserverStore(root);
  await digestAndAppend(store, { execution: execution('two-stage', 'alpha'), evidence: { references: ['fixture://two-stage'] } });
  await store.appendSemantic('two-stage', semantic('two-stage', 'success', [{ key: 'joined', type: 'lesson', text: 'Join semantic sidecars before consuming records.' }]));
  await digestAndAppend(store, { execution: execution('still-pending', 'alpha'), evidence: { references: ['fixture://still-pending'] } });
  const records = await joinedRecords(store);
  assert.equal(records.length, 2);
  assert.equal(records.find((record) => record.execution.id === 'two-stage').lifecycle.state, 'observed');
  assert.equal(records.find((record) => record.execution.id === 'still-pending').lifecycle.state, 'semantic-analysis-pending');
  assert.equal((await store.joined()).find((record) => record.execution.id === 'two-stage').summary, 'success fixture');
  assert.deepEqual((await consolidate(store)).inputRecords, ['two-stage']);
  const coverage = coverageReport({ manifest: [{ executionId: 'two-stage' }, { executionId: 'still-pending' }, { executionId: 'absent' }], records });
  assert.equal(coverage.healthy, false);
  assert.deepEqual(coverage.missing, ['absent']);
  assert.deepEqual(coverage.semanticMissing, ['still-pending']);
  const chronicle = await appendChronicle(store, { start: '2026-08-29', end: '2026-08-29' }, path.join(root, 'chronicle', 'two-stage.json'));
  assert.deepEqual(chronicle.sourceExecutionIds, ['two-stage']);
});

test('joined sidecars cannot overwrite immutable digest-owned fields', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'observer-'));
  const store = new ObserverStore(root);
  const orchestration = { taskAvailable: true, parentSessionCount: 1, workerSessionCount: 0, parentMutationCalls: 12, delegatedMutationCalls: 0 };
  const { digest } = await digestAndAppend(store, { execution: { ...execution('injection', 'alpha'), orchestration }, evidence: { source: 'fixture', references: ['fixture://injection'], evidenceDigest: 'immutable' } });
  const injected = semantic('injection', 'success', [], {
    schema: SEMANTIC_SCHEMA,
    observerVersion: '999.0.0',
    execution: { id: 'other', project: 'other', status: 'failure', startedAt: 'never', finishedAt: 'never' },
    provenance: { references: ['attacker://replacement'] },
    executionDistribution: { availability: 'available', mutationCallCounts: { total: 0 } },
    observedAt: 'never',
    lifecycle: { state: 'consolidated' }
  });
  await store.appendSemantic('injection', injected);
  const [joined] = await joinedRecords(store);
  for (const field of ['schema', 'observerVersion', 'execution', 'provenance', 'executionDistribution', 'observedAt']) assert.deepEqual(joined[field], digest[field]);
  assert.equal(joined.lifecycle.state, 'observed');
  assert.equal(joined.summary, 'success fixture');
  assert.equal('executionId' in joined, false);
});

test('chronicle is append-only by period and references source records', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'observer-'));
  const store = new ObserverStore(root);
  await digestAndAppend(store, input('chronicle-1', 'alpha', 'success', [], { summary: 'shipped verified change' }));
  const output = path.join(root, 'chronicle', '2026-08-29.json');
  const entry = await appendChronicle(store, { start: '2026-08-29', end: '2026-08-29' }, output);
  assert.equal(entry.executionCount, 1);
  assert.deepEqual(entry.sourceExecutionIds, ['chronicle-1']);
  await assert.rejects(() => appendChronicle(store, { start: '2026-08-29', end: '2026-08-29' }, output), /already exists/);
  assert.match(await readFile(output, 'utf8'), /shipped|semantic records/);
  assert.match(await readFile(output.replace('.json', '.md'), 'utf8'), /# Observer Chronicle/);
});

test('policy consumer preserves provenance and prevents identity auto-acceptance', () => {
  const candidate = { key: 'policy', evidence: ['run-a', 'run-b'] };
  assert.equal(createPolicyDecision(candidate, 'defer', 'identity-review').action, 'defer');
  assert.throws(() => createPolicyDecision(candidate, 'accept', 'identity-review'), /review-only/);
  assert.equal(createPolicyDecision(candidate, 'accept', 'lessons').evidence.length, 2);
});
