import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDigest } from '../capabilities/observer/schema.mjs';
import { ObserverStore, appendChronicle, consolidate, coverageReport, digestAndAppend } from '../capabilities/observer/observer.mjs';

const execution = (id, project, status = 'success') => ({ executionId: id, project, environment: 'fixture', status, startedAt: '2026-08-29T10:00:00Z', finishedAt: '2026-08-29T10:05:00Z' });
const input = (id, project, status, signals = [], extra = {}) => ({ execution: execution(id, project, status), evidence: { source: 'fixture', references: [`fixture://${id}`], ...extra }, semantic: { summary: `${status} fixture`, signals } });

test('creates a compact versioned digest and preserves provenance', () => {
  const digest = createDigest({ execution: execution('ok-1', 'alpha'), evidence: { source: 'actions', references: ['actions://1'] }, semantic: { actions: ['run tests'], verification: { tests: 'passed' } } });
  assert.equal(digest.schema, 'celestan-session-digest-v1');
  assert.equal(digest.execution.id, 'ok-1');
  assert.deepEqual(digest.verification, { tests: 'passed' });
  assert.deepEqual(digest.provenance.references, ['actions://1']);
  assert.equal('approaches' in digest, false);
});

test('successful run, failed recovery, human correction, and crash remain structured', () => {
  const digest = createDigest({ execution: execution('recovered', 'alpha', 'recovered'), evidence: {}, semantic: { failures: ['initial command failed'], recoveries: ['rerouted to a supported command'], interventions: ['human corrected the target path'], autonomyBlocks: ['session ended before deployment'] } });
  assert.deepEqual(digest.failures, ['initial command failed']);
  assert.deepEqual(digest.recoveries, ['rerouted to a supported command']);
  assert.deepEqual(digest.interventions, ['human corrected the target path']);
  assert.deepEqual(digest.autonomyBlocks, ['session ended before deployment']);
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
  assert.equal(report.failures.length, 1);
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
});
