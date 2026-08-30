import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDigest, createSemanticObservationTask, deriveExecutionDistribution, FAILURE_CATEGORIES, MODEL_ROUTING_OUTCOMES, OBSERVER_VERSION, ORCHESTRATION_OUTCOMES, SEMANTIC_SCHEMA, validateSemanticObservation, normalizeHostRuntimeTelemetry } from '../capabilities/observer/schema.mjs';
import { ObserverStore, appendChronicle, appendCoverageSnapshot, appendPolicyDecision, consolidate, coverageReport, createPolicyDecision, digestAndAppend, joinedRecords } from '../capabilities/observer/observer.mjs';

const execution = (id, project, status = 'success') => ({ executionId: id, project, environment: 'fixture', status, startedAt: '2026-08-29T10:00:00Z', finishedAt: '2026-08-29T10:05:00Z' });
const semantic = (id, status, signals = [], extra = {}) => ({ schema: SEMANTIC_SCHEMA, executionId: id, status: 'complete', summary: `${status} fixture`, confidence: 0.9, signals, ...extra });
const input = (id, project, status, signals = [], extra = {}) => ({ execution: execution(id, project, status), evidence: { source: 'fixture', references: [`fixture://${id}`], ...extra }, semantic: semantic(id, status, signals) });

test('host runtime telemetry is a separate validated contract', () => {
  const host = normalizeHostRuntimeTelemetry({ availability: 'available', host: { instanceId: 'h1', provider: 'local', runtimeClass: 'job', region: 'test', architecture: 'amd64', os: 'linux', imageDigest: 'sha256:x', runtimeVersion: 'v2' }, coldStart: true, resourceLimits: { cpu: '2' }, cost: { measured: false } });
  assert.equal(host.availability, 'available');
  assert.throws(() => normalizeHostRuntimeTelemetry({ availability: 'available', password: 'secret' }), /unsafe fields/);
  assert.equal(createDigest({ execution: { ...execution('host', 'alpha'), hostRuntimeTelemetry: host } }).hostRuntimeTelemetry.availability, 'available');
});

test('host telemetry deeply bounds samples, failures, resources, cost, and timestamps', () => {
  const host = normalizeHostRuntimeTelemetry({ availability: 'partial', records: [
    { schema: 'celestan-runtime-host-telemetry-v1', availability: 'available', sampleType: 'startup', sampledAt: '2026-08-29T10:00:00Z', startup: { coldStart: true, startedAt: '2026-08-29T10:00:00Z', durationMs: 12 }, resourceLimits: { cpu: '2', memory: 1024 }, cost: { measured: false, reason: 'not-measured' } },
    { schema: 'celestan-runtime-host-telemetry-v1', availability: 'available', sampleType: 'termination', sampledAt: '2026-08-29T10:05:00Z', execution: { startedAt: '2026-08-29T10:00:00Z', finishedAt: '2026-08-29T10:05:00Z', durationMs: 300000, networkFailures: 1, providerFailures: 0, failures: [{ category: 'network', errorClass: 'TimeoutError', count: 1, timestamp: '2026-08-29T10:01:00Z', retryable: true }], termination: 'success' }, resources: { cpu: 1.5, memory: '512Mi' }, cost: { measured: true, amount: 0, currency: 'usd' } }
  ] });
  assert.equal(host.records[1].cost.currency, 'USD');
  assert.equal(host.records[1].execution.failures[0].count, 1);
  assert.throws(() => normalizeHostRuntimeTelemetry({ availability: 'available', execution: { failures: [{ category: 'network', message: 'raw' }] } }), /unsupported or unsafe/);
  assert.throws(() => normalizeHostRuntimeTelemetry({ availability: 'available', execution: { networkFailures: -1 } }), /between 0/);
  assert.throws(() => normalizeHostRuntimeTelemetry({ availability: 'available', execution: { startedAt: '2026-08-30', finishedAt: '2026-08-29' } }), /reversed/);
  assert.throws(() => normalizeHostRuntimeTelemetry({ availability: 'available', records: [{ availability: 'available', records: [] }] }), /non-nested/);
});

test('creates a compact versioned digest and preserves provenance', () => {
  const digest = createDigest({ execution: execution('ok-1', 'alpha'), evidence: { source: 'actions', references: ['actions://1'] }, semantic: semantic('ok-1', 'success', [], { actions: ['run tests'], verification: { tests: 'passed' } }) });
  assert.equal(digest.schema, 'celestan-execution-digest-v1');
  assert.equal(digest.observerVersion, '1.2.0');
  assert.equal(OBSERVER_VERSION, '1.2.0');
  assert.equal(digest.execution.id, 'ok-1');
  assert.deepEqual(digest.verification, { tests: 'passed' });
  assert.deepEqual(digest.provenance.references, ['actions://1']);
  assert.equal('approaches' in digest, false);
  assert.deepEqual(digest.modelRuntimeTelemetry, { availability: 'unavailable', reason: 'runtime-model-telemetry-not-supplied' });
});

test('normalizes comprehensive model runtime telemetry with explicit availability', async () => {
  const telemetry = JSON.parse(await readFile(new URL('./fixtures/observer-model-runtime-telemetry.json', import.meta.url), 'utf8'));
  const digest = createDigest({ execution: { ...execution('telemetry', 'alpha'), modelRuntimeTelemetry: telemetry }, evidence: { references: ['fixture://telemetry', 'fixture://failure-1', 'fixture://transition-1'] } });
  const normalized = digest.modelRuntimeTelemetry;
  assert.equal(normalized.availability, 'available');
  assert.equal(normalized.invocations[0].tokens.output.availability, 'available');
  assert.equal(normalized.invocations[0].tokens.output.value, 0);
  assert.equal(normalized.invocations[1].tokens.output.availability, 'unavailable');
  assert.equal(normalized.sessions[0].cost.availability, 'unavailable');
  assert.equal(normalized.invocations[0].cost.amount, 0);
  assert.equal(normalized.failures[0].runtimeAttribution.source, 'runtime-reported');
  assert.equal(normalized.aggregate.basis, 'invocations');
  assert.equal(createSemanticObservationTask(digest).evidencePackage.modelRuntimeTelemetry.aggregate.counts.invocations, 2);
});

test('aggregates invocation facts once with partial independent dimensions and distinct durations', async () => {
  const telemetry = JSON.parse(await readFile(new URL('./fixtures/observer-model-runtime-telemetry.json', import.meta.url), 'utf8'));
  const aggregate = createDigest({ execution: { ...execution('aggregate', 'alpha'), modelRuntimeTelemetry: telemetry }, evidence: { references: ['fixture://failure-1', 'fixture://transition-1'] } }).modelRuntimeTelemetry.aggregate;
  assert.deepEqual(aggregate.coverage, { basisRecords: 2, sessionsSupplied: 1, invocationsSupplied: 2, failuresSupplied: 1, transitionEventsSupplied: 1 });
  assert.equal(aggregate.tokens.input.value, 15);
  assert.equal(aggregate.tokens.output.value, 0);
  assert.equal(aggregate.tokens.output.availability, 'partial');
  assert.equal(aggregate.tokens.reasoning.value, 3);
  assert.equal(aggregate.tokens.cacheRead.value, 4);
  assert.equal(aggregate.tokens.cacheWrite.value, 2);
  assert.equal(aggregate.tokens.total.value, 24);
  assert.equal(aggregate.context.pressure.coverage.available, 1);
  assert.equal(aggregate.context.pressure.average, 0.2);
  assert.equal(aggregate.durations.executionWall.value, 300000);
  assert.equal(aggregate.durations.additiveInvocationOrSession.sum, 4000);
  assert.deepEqual(aggregate.costs.byCurrency, [{ currency: 'EUR', amount: 2 }, { currency: 'USD', amount: 0 }]);
  assert.equal(aggregate.transitions.events, 1);
  for (const facet of ['retry', 'fallback', 'provider-switch', 'model-switch']) assert.equal(aggregate.transitions.facets[facet], 1);
});

test('uses session measurements only when no invocations exist', () => {
  const telemetry = { sessions: [{ sessionId: 'session-only', tokens: { input: 5, output: 0, total: 5 }, tools: { calls: 0, mutations: 0, failedCalls: 0 }, status: 'success' }] };
  const aggregate = createDigest({ execution: { ...execution('session-only', 'alpha'), modelRuntimeTelemetry: telemetry } }).modelRuntimeTelemetry.aggregate;
  assert.equal(aggregate.basis, 'sessions-without-invocations');
  assert.equal(aggregate.tokens.input.value, 5);
  assert.equal(aggregate.tokens.output.value, 0);
  assert.equal(aggregate.tokens.reasoning.availability, 'unavailable');
  assert.deepEqual(aggregate.tokens.reasoning.coverage, { available: 0, expected: 1 });
});

test('rejects duplicate telemetry IDs and invalid cross-references', () => {
  assert.throws(() => createDigest({ execution: { ...execution('duplicate', 'alpha'), modelRuntimeTelemetry: { sessions: [{ sessionId: 'same' }], invocations: [{ invocationId: 'same', sessionId: 'same' }] } } }), /Duplicate model runtime telemetry ID/);
  assert.throws(() => createDigest({ execution: { ...execution('unknown-session', 'alpha'), modelRuntimeTelemetry: { invocations: [{ invocationId: 'i', sessionId: 'absent' }] } } }), /Unknown sessionId/);
  assert.throws(() => createDigest({ execution: { ...execution('unknown-transition', 'alpha'), modelRuntimeTelemetry: { transitions: [{ transitionId: 't', facets: ['retry'], fromInvocationId: 'absent' }] } } }), /Unknown transition/);
  assert.throws(() => createDigest({ execution: { ...execution('cyclic-lineage', 'alpha'), modelRuntimeTelemetry: { invocations: [{ invocationId: 'a', parentInvocationId: 'b' }, { invocationId: 'b', parentInvocationId: 'a' }] } } }), /Cyclic parentInvocationId lineage/);
  assert.throws(() => createDigest({ execution: { ...execution('null-record', 'alpha'), modelRuntimeTelemetry: { failures: [null] } } }), /failures\[0\] must be an object/);
});

test('supports every broad failure category and rejects unsafe failure facts', () => {
  const failures = FAILURE_CATEGORIES.map((category, index) => ({ failureId: `failure-${index}`, invocationId: 'invoke', category }));
  const digest = createDigest({ execution: { ...execution('failures', 'alpha'), modelRuntimeTelemetry: { invocations: [{ invocationId: 'invoke', status: 'failure' }], failures } } });
  assert.deepEqual(digest.modelRuntimeTelemetry.aggregate.failures.categories.values.map((item) => item.value).sort(), [...FAILURE_CATEGORIES].sort());
  assert.throws(() => createDigest({ execution: { ...execution('bad-category', 'alpha'), modelRuntimeTelemetry: { failures: [{ failureId: 'f', category: 'bad-category' }] } } }), /category must be one of/);
  for (const field of ['message', 'headers', 'body', 'stack', 'toolArguments', 'toolOutput']) assert.throws(() => createDigest({ execution: { ...execution(`unsafe-${field}`, 'alpha'), modelRuntimeTelemetry: { failures: [{ failureId: 'f', category: 'unknown', [field]: field === 'headers' ? {} : 'secret' }] } } }), /unsupported or unsafe fields/);
});

test('does not mechanically classify infrastructure failure as model quality', () => {
  const telemetry = { invocations: [{ invocationId: 'i', provider: 'provider', model: 'model', status: 'failure' }], failures: [{ failureId: 'f', invocationId: 'i', category: 'provider-limit', errorCode: 'QUOTA' }] };
  const normalized = createDigest({ execution: { ...execution('infra', 'alpha'), modelRuntimeTelemetry: telemetry } }).modelRuntimeTelemetry;
  assert.deepEqual(normalized.aggregate.failures.categories.values, [{ value: 'provider-limit', count: 1 }]);
  assert.equal(JSON.stringify(normalized).includes('model-output-quality'), false);
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

test('semantic model routing assessment validates outcomes, evidence, telemetry references, and attributions', async () => {
  const telemetry = JSON.parse(await readFile(new URL('./fixtures/observer-model-runtime-telemetry.json', import.meta.url), 'utf8'));
  const digest = createDigest({ execution: { ...execution('routing-assessment', 'alpha'), modelRuntimeTelemetry: telemetry }, evidence: { references: ['fixture://routing', 'fixture://failure-1', 'fixture://transition-1'] } });
  const task = createSemanticObservationTask(digest);
  assert.deepEqual(task.modelRoutingAssessment.outcomes, MODEL_ROUTING_OUTCOMES);
  assert.equal(task.evidencePackage.telemetryReferences.includes('failure-1'), true);
  for (const outcome of MODEL_ROUTING_OUTCOMES) {
    const assessment = {
      outcome,
      taskCondition: 'implementation tasks with this provider limit',
      summary: 'Fallback restored execution; suitability remains conditional.',
      uncertainty: 'One execution cannot establish general routing effectiveness.',
      evidenceReferences: ['fixture://routing'],
      telemetryReferences: ['invoke-1', 'failure-1'],
      attributions: [{ kind: 'cause', category: 'provider-limit', targetType: 'provider', target: 'opencode', confidence: 'high', summary: 'The runtime reported a rate limit.', evidenceReferences: ['fixture://routing'], telemetryReferences: ['failure-1'] }]
    };
    assert.equal(validateSemanticObservation(semantic('routing-assessment', 'success', [], { modelRoutingAssessment: assessment }), 'routing-assessment', { allowedEvidenceReferences: ['fixture://routing'], allowedTelemetryReferences: task.evidencePackage.telemetryReferences }).modelRoutingAssessment.outcome, outcome);
  }
  const base = semantic('routing-assessment', 'success', [], { modelRoutingAssessment: { outcome: 'mixed', taskCondition: 'implementation', summary: 'Mixed.', uncertainty: 'Limited evidence.', evidenceReferences: ['fixture://routing'], telemetryReferences: ['invoke-1'] } });
  assert.throws(() => validateSemanticObservation({ ...base, modelRoutingAssessment: { ...base.modelRoutingAssessment, outcome: 'best' } }, 'routing-assessment'), /outcome must be one of/);
  assert.throws(() => validateSemanticObservation({ ...base, modelRoutingAssessment: { ...base.modelRoutingAssessment, telemetryReferences: ['absent'] } }, 'routing-assessment', { allowedEvidenceReferences: ['fixture://routing'], allowedTelemetryReferences: task.evidencePackage.telemetryReferences }), /unknown reference/);
  assert.throws(() => validateSemanticObservation({ ...base, modelRoutingAssessment: { ...base.modelRoutingAssessment, taskCondition: '' } }, 'routing-assessment'), /taskCondition is required/);
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

test('execution IDs with path-like characters have distinct records and remain idempotent', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'observer-'));
  const store = new ObserverStore(root);
  const first = await digestAndAppend(store, input('a/b', 'alpha'));
  const second = await digestAndAppend(store, input('a\\b', 'alpha'));
  assert.notEqual(store.recordPath('a/b'), store.recordPath('a\\b'));
  assert.equal(first.result.status, 'processed');
  assert.equal(second.result.status, 'processed');
  assert.equal((await digestAndAppend(store, input('a/b', 'alpha'))).result.status, 'duplicate');
  assert.equal((await store.all()).length, 2);
});

test('semantic failure records bounded structured reasons without raw error leakage', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'observer-'));
  const store = new ObserverStore(root);
  const result = await store.appendSemanticFailure('failure-id', { errorClass: 'Error', reason: 'raw secret should not persist', retryable: true });
  assert.equal(result.reason, 'semantic-observation-rejected');
  assert.equal(result.errorClass, 'unknown');
  assert.equal((await readFile(path.join(root, 'lifecycle.ndjson'), 'utf8')).includes('raw secret'), false);
});

test('semantic signals are bounded and allowlisted before consumers read them', () => {
  assert.throws(() => validateSemanticObservation(semantic('unsafe-signal', 'success', [{ type: 'made-up', text: 'x' }]), 'unsafe-signal'), /type must be one of/);
  assert.throws(() => validateSemanticObservation(semantic('too-many-signals', 'success', Array.from({ length: 51 }, () => ({ type: 'lesson', text: 'x' }))), 'too-many-signals'), /at most 50/);
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

test('routing-policy candidates consolidate only under the same task condition and remain review-only', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'observer-'));
  const store = new ObserverStore(root);
  const routing = (taskCondition) => ({ key: 'prefer-fallback', type: 'routing-policy', taskCondition, text: 'Review fallback routing after repeated provider limits.' });
  await digestAndAppend(store, input('route-a', 'alpha', 'success', [routing('implementation under provider limits')]));
  await digestAndAppend(store, input('route-b', 'beta', 'success', [routing('implementation under provider limits')]));
  await digestAndAppend(store, input('route-c', 'gamma', 'success', [routing('documentation tasks')]));
  const findings = (await consolidate(store)).findings.filter((finding) => finding.type === 'routing-policy');
  assert.equal(findings.length, 2);
  const repeated = findings.find((finding) => finding.taskCondition === 'implementation under provider limits');
  assert.equal(repeated.status, 'candidate');
  assert.equal(repeated.recommendedDestination, 'routing-review');
  assert.equal(findings.find((finding) => finding.taskCondition === 'documentation tasks').status, 'observation');
  assert.throws(() => createPolicyDecision(repeated, 'accept', 'routing-review'), /review-only/);
  assert.equal(createPolicyDecision(repeated, 'defer', 'routing-review').destination, 'routing-review');
  assert.throws(() => validateSemanticObservation(semantic('bad-route', 'success', [{ key: 'x', type: 'routing-policy', text: 'Unconditioned.' }]), 'bad-route'), /taskCondition/);
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
  const modelRuntimeTelemetry = { invocations: [{ invocationId: 'immutable-invocation', provider: 'provider', model: 'model', tokens: { total: 0 }, status: 'success' }] };
  const { digest } = await digestAndAppend(store, { execution: { ...execution('injection', 'alpha'), orchestration, modelRuntimeTelemetry }, evidence: { source: 'fixture', references: ['fixture://injection'], evidenceDigest: 'immutable' } });
  const injected = semantic('injection', 'success', [], {
    schema: SEMANTIC_SCHEMA,
    observerVersion: '999.0.0',
    execution: { id: 'other', project: 'other', status: 'failure', startedAt: 'never', finishedAt: 'never' },
    provenance: { references: ['attacker://replacement'] },
    executionDistribution: { availability: 'available', mutationCallCounts: { total: 0 } },
    modelRuntimeTelemetry: { availability: 'available', aggregate: { basis: 'attacker' } },
    observedAt: 'never',
    lifecycle: { state: 'consolidated' }
  });
  await store.appendSemantic('injection', injected);
  const [joined] = await joinedRecords(store);
  for (const field of ['schema', 'observerVersion', 'execution', 'provenance', 'executionDistribution', 'modelRuntimeTelemetry', 'observedAt']) assert.deepEqual(joined[field], digest[field]);
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

test('policy, coverage, and Chronicle use storage-neutral hooks when supplied', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'observer-'));
  const store = new ObserverStore(root);
  const calls = [];
  store.appendPolicyDecision = async (value) => { calls.push(['policy', value]); return value; };
  store.appendCoverageSnapshot = async (value) => { calls.push(['coverage', value]); return value; };
  store.appendChronicleArtifact = async (value, markdown) => { calls.push(['chronicle', value, markdown]); return value; };
  const candidate = { key: 'hook', evidence: ['hook-run'] };
  await appendPolicyDecision(store, createPolicyDecision(candidate, 'defer', 'foundry'));
  await appendCoverageSnapshot(store, { manifest: [], records: [] });
  await digestAndAppend(store, input('hook-run', 'alpha'));
  await appendChronicle(store, { start: '2026-08-29', end: '2026-08-29' }, path.join(root, 'chronicle', 'hook.json'));
  assert.deepEqual(calls.map((call) => call[0]), ['policy', 'coverage', 'chronicle']);
  assert.match(calls[2][2], /# Observer Chronicle/);
});
