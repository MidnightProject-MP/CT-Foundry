import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRoutingPolicyReview, createRoutingPolicySignal, deriveRoutingPolicyCandidate, consolidateRoutingPolicyCandidates, RoutingPolicyStore, validateRoutingPolicySignal } from '../capabilities/routing-policy/routing-policy.mjs';

const observation = (id = 'obs-1') => ({ observation_id: id, schema: 'celestan-semantic-observation-v1', evidenceId: `ev-${id}`, physicalExecutionId: null, observation: { schema: 'celestan-semantic-observation-v1', envelopeId: `env-${id}`, observations: [{ claimId: 'claim-1', statement: 'bounded fact', interpretation: 'supports bounded use', sourceClass: 'execution', claimType: 'fact', supportSourceIds: [`ev-${id}`] }] }, provenance: { evidenceId: `ev-${id}`, hash: id === 'obs-1' || id === 'obs-a' ? 'a'.repeat(64) : 'b'.repeat(64) } });
const proposal = (project) => ({ subject: { model: 'provider/model', role: 'worker', taskClass: 'implementation' }, direction: 'negative', proposedEffect: 'lower-preference', scopeLimit: { globalDemotion: false, unrelatedWorkUnassessed: true, boundedWorkerUsePermitted: true, ...(project ? { project } : {}) }, citedClaimIds: ['claim-1'] });

test('derivation is observation-only, deterministic, and strips claim text', () => {
  const candidate = deriveRoutingPolicyCandidate(observation(), proposal());
  assert.equal(candidate.status, 'review-required'); assert.equal(candidate.observationEvidenceHash, 'a'.repeat(64)); assert.equal('statement' in candidate, false);
  assert.deepEqual(candidate, deriveRoutingPolicyCandidate(observation(), proposal()));
  assert.throws(() => deriveRoutingPolicyCandidate({ ...observation(), modelRuntimeTelemetry: {} }, proposal()), /forbidden/);
  assert.throws(() => deriveRoutingPolicyCandidate(observation(), { ...proposal(), direction: 'positive' }), /inconsistent/);
  assert.throws(() => deriveRoutingPolicyCandidate({ ...observation(), schema: 'wrong-schema' }, proposal()), /schema/);
});

test('consolidation is invariant under candidate input permutation', () => {
  const first = deriveRoutingPolicyCandidate(observation('obs-a'), proposal());
  const second = deriveRoutingPolicyCandidate(observation('obs-b'), proposal());
  assert.deepEqual(consolidateRoutingPolicyCandidates([first, second]), consolidateRoutingPolicyCandidates([second, first]));
});

test('store is immutable and accepted review creates active negative signal', async () => {
  const store = new RoutingPolicyStore(await mkdtemp(path.join(os.tmpdir(), 'routing-policy-')), { authorizedReviewerIds: ['reviewer'] }); const obs = observation(); const candidate = deriveRoutingPolicyCandidate(obs, proposal());
  await store.appendObservation(obs); await store.appendCandidate(candidate); await assert.rejects(() => store.appendCandidate({ ...candidate, evidenceId: 'changed' }), /Conflicting|candidateId|deterministic|lineage/);
  const consolidation = consolidateRoutingPolicyCandidates([candidate]); await store.appendConsolidation(consolidation);
  const review = createRoutingPolicyReview(consolidation, consolidation.findings[0], { decision: 'accept', reviewerId: 'reviewer', rationale: 'bounded', reviewedAt: '2026-09-02T00:00:00.000Z', supersedesSignalIds: [], supersessionMode: 'replace' });
  const result = await store.appendReview(review); assert.equal(result.value.signal.status, 'active'); assert.equal((await store.activeSignals()).length, 1);
  assert.deepEqual(Object.keys(result.value.signal).sort(), ['acceptedAt', 'candidateIds', 'citedClaimIds', 'consolidationId', 'contentHash', 'direction', 'envelopeIds', 'evidenceIds', 'findingId', 'observationEvidenceHashes', 'observationIds', 'proposedEffect', 'reviewId', 'schema', 'scopeLimit', 'signalId', 'status', 'subject', 'supersedesSignalIds', 'supersessionMode']);
  validateRoutingPolicySignal(result.value.signal);
});

test('consolidation is reconstructed from stored candidates and reviewers are authorized', async () => {
  const store = new RoutingPolicyStore(await mkdtemp(path.join(os.tmpdir(), 'routing-policy-')), { authorizedReviewerIds: ['trusted'] });
  const candidate = deriveRoutingPolicyCandidate(observation(), proposal());
  await store.appendObservation(observation()); await store.appendCandidate(candidate);
  const consolidation = consolidateRoutingPolicyCandidates([candidate]);
  const forged = { ...consolidation, findings: [{ ...consolidation.findings[0], candidateIds: ['rpc_forged'] }] };
  assert.throws(() => validateRoutingPolicySignal({}), /signal/);
  await assert.rejects(() => store.appendConsolidation(forged), /hash|stored candidates|missing/);
  await store.appendConsolidation(consolidation);
  const review = createRoutingPolicyReview(consolidation, consolidation.findings[0], { decision: 'accept', reviewerId: 'untrusted', rationale: 'no', reviewedAt: '2026-09-02T00:00:01.000Z', supersedesSignalIds: [], supersessionMode: 'replace' });
  await assert.rejects(() => store.appendReview(review), /unauthorized/);
});

test('tampering with an immutable artifact fails closed on read', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'routing-policy-'));
  const store = new RoutingPolicyStore(root, { authorizedReviewerIds: ['reviewer'] }); const obs = observation(); const candidate = deriveRoutingPolicyCandidate(obs, proposal());
  await store.appendObservation(obs); await store.appendCandidate(candidate);
  const file = path.join(root, 'candidates', `${Buffer.from(candidate.candidateId).toString('hex')}.json`);
  await writeFile(file, (await readFile(file, 'utf8')).replace('review-required', 'tampered'));
  await assert.rejects(() => store.get('candidates', candidate.candidateId), /candidate|invalid/);
});

test('Foundry golden producer vector matches Runtime signal vector', () => {
  const finding = { subject: { model: 'provider/model-golden', role: 'implementation-worker', taskClass: 'implementation' }, direction: 'negative', proposedEffect: 'lower-preference', scopeLimit: { globalDemotion: false, unrelatedWorkUnassessed: true, boundedWorkerUsePermitted: true }, candidateIds: ['rpc_golden'], observationIds: ['obs_golden'], observationEvidenceHashes: ['a'.repeat(64)], evidenceIds: ['evidence_golden'], envelopeIds: ['envelope_golden'], citedClaimIds: ['claim_golden'] };
  const review = { reviewId: 'rpr_golden', consolidationId: 'rcon_golden', findingId: 'rf_golden', supersedesSignalIds: [], supersessionMode: 'replace', reviewedAt: '2026-08-31T10:00:00.000Z' };
  const signal = createRoutingPolicySignal(finding, review);
  assert.equal(signal.contentHash, 'f7fd8e8523eb01f7377c8dc5e1fbaa0a6fb530931110b44e8abef8fabc81ddb8');
  assert.equal(signal.signalId, 'rps_f7fd8e8523eb01f7377c8dc5e1fbaa0a');
  assert.doesNotThrow(() => validateRoutingPolicySignal(signal));
});

const accepted = async (store, obsId, project, at, supersedesSignalIds = [], supersessionMode = 'replace') => {
  const obs = observation(obsId); const classified = supersessionMode !== 'replace' ? { ...proposal(project), direction: 'positive', proposedEffect: 'restore-default' } : proposal(project); const candidate = deriveRoutingPolicyCandidate(obs, classified);
  await store.appendObservation(obs); await store.appendCandidate(candidate); const consolidation = consolidateRoutingPolicyCandidates([candidate]); await store.appendConsolidation(consolidation);
  return store.appendReview(createRoutingPolicyReview(consolidation, consolidation.findings[0], { decision: 'accept', reviewerId: 'reviewer', rationale: 'bounded', reviewedAt: at, supersedesSignalIds, supersessionMode }));
};

test('forged recomputed consolidation is rejected', async () => {
  const store = new RoutingPolicyStore(await mkdtemp(path.join(os.tmpdir(), 'routing-policy-')), { authorizedReviewerIds: ['reviewer'] }); const c = deriveRoutingPolicyCandidate(observation(), proposal()); await store.appendObservation(observation()); await store.appendCandidate(c); const consolidation = consolidateRoutingPolicyCandidates([c]);
  const forged = { ...consolidation, contentHash: 'b'.repeat(64), consolidationId: 'rcon_forged' }; await assert.rejects(() => store.appendConsolidation(forged), /hash|deterministic|match/);
});

test('forged review lineage is rejected', async () => {
  const store = new RoutingPolicyStore(await mkdtemp(path.join(os.tmpdir(), 'routing-policy-')), { authorizedReviewerIds: ['reviewer'] }); const obs = observation(); const c = deriveRoutingPolicyCandidate(obs, proposal()); await store.appendObservation(obs); await store.appendCandidate(c); const con = consolidateRoutingPolicyCandidates([c]); await store.appendConsolidation(con);
  const review = createRoutingPolicyReview(con, con.findings[0], { decision: 'accept', reviewerId: 'reviewer', rationale: 'x', reviewedAt: '2026-09-02T01:00:00.000Z', supersedesSignalIds: [], supersessionMode: 'replace' }); await assert.rejects(() => store.appendReview({ ...review, citedClaimIds: ['claim-forged'] }), /lineage|hash/);
});

test('positive restore requires active target', async () => {
  const store = new RoutingPolicyStore(await mkdtemp(path.join(os.tmpdir(), 'routing-policy-')), { authorizedReviewerIds: ['reviewer'] }); const negative = await accepted(store, 'obs-1', undefined, '2026-09-02T02:00:00.000Z');
  await assert.rejects(() => accepted(store, 'obs-empty', undefined, '2026-09-02T02:00:00.500Z', [], 'restore'), /supersession|target/);
  await assert.rejects(() => accepted(store, 'obs-scoped', 'project-a', '2026-09-02T02:00:00.750Z', [negative.value.signal.signalId], 'restore'), /incompatible/);
  const positive = await accepted(store, 'obs-2', undefined, '2026-09-02T02:00:01.000Z', [negative.value.signal.signalId], 'restore'); await assert.rejects(() => accepted(store, 'obs-3', undefined, '2026-09-02T02:00:02.000Z', [negative.value.signal.signalId], 'restore'), /inactive|target/); assert.equal((await store.activeSignals()).length, 1); assert.equal(positive.value.signal.direction, 'positive');
});

test('exact restore retires negative', async () => {
  const store = new RoutingPolicyStore(await mkdtemp(path.join(os.tmpdir(), 'routing-policy-')), { authorizedReviewerIds: ['reviewer'] }); const negative = await accepted(store, 'obs-1', undefined, '2026-09-02T03:00:00.000Z');
  const obs = observation('obs-restore'); const candidate = deriveRoutingPolicyCandidate(obs, { ...proposal(), direction: 'positive', proposedEffect: 'restore-default' }); await store.appendObservation(obs); await store.appendCandidate(candidate); const con = consolidateRoutingPolicyCandidates([candidate]); await store.appendConsolidation(con); const restored = await store.appendReview(createRoutingPolicyReview(con, con.findings[0], { decision: 'accept', reviewerId: 'reviewer', rationale: 'restore', reviewedAt: '2026-09-02T03:00:01.000Z', supersedesSignalIds: [negative.value.signal.signalId], supersessionMode: 'restore' })); assert.deepEqual((await store.activeSignals()).map(s => s.signalId), [restored.value.signal.signalId]);
});

test('narrow restore retains broad negative', async () => {
  const store = new RoutingPolicyStore(await mkdtemp(path.join(os.tmpdir(), 'routing-policy-')), { authorizedReviewerIds: ['reviewer'] }); const negative = await accepted(store, 'obs-1', undefined, '2026-09-02T04:00:00.000Z'); const obs = observation('obs-narrow'); const candidate = deriveRoutingPolicyCandidate(obs, { ...proposal('project-a'), direction: 'positive', proposedEffect: 'restore-default' }); await store.appendObservation(obs); await store.appendCandidate(candidate); const con = consolidateRoutingPolicyCandidates([candidate]); await store.appendConsolidation(con); const narrow = await store.appendReview(createRoutingPolicyReview(con, con.findings[0], { decision: 'accept', reviewerId: 'reviewer', rationale: 'narrow', reviewedAt: '2026-09-02T04:00:01.000Z', supersedesSignalIds: [negative.value.signal.signalId], supersessionMode: 'narrow' })); assert.equal((await store.activeSignals()).length, 2); assert.equal(narrow.value.signal.supersessionMode, 'narrow');
  await assert.rejects(() => accepted(store, 'obs-replace', undefined, '2026-09-02T04:00:02.000Z', [negative.value.signal.signalId], 'replace'), /narrow dependent/);
  const replacement = await accepted(store, 'obs-replace-all', undefined, '2026-09-02T04:00:03.000Z', [negative.value.signal.signalId, narrow.value.signal.signalId], 'replace');
  assert.deepEqual((await store.activeSignals()).map(signal => signal.signalId), [replacement.value.signal.signalId]);
});

test('concurrent supersession admits one review', async () => {
  const store = new RoutingPolicyStore(await mkdtemp(path.join(os.tmpdir(), 'routing-policy-')), { authorizedReviewerIds: ['reviewer'] }); const negative = await accepted(store, 'obs-1', undefined, '2026-09-02T05:00:00.000Z'); const make = id => { const obs = observation(id); const p = { ...proposal(), direction: 'positive', proposedEffect: 'restore-default' }; return (async () => { await store.appendObservation(obs); const c = deriveRoutingPolicyCandidate(obs, p); await store.appendCandidate(c); const con = consolidateRoutingPolicyCandidates([c]); await store.appendConsolidation(con); return store.appendReview(createRoutingPolicyReview(con, con.findings[0], { decision: 'accept', reviewerId: 'reviewer', rationale: id, reviewedAt: `2026-09-02T05:00:0${id === 'obs-a' ? '1' : '2'}.000Z`, supersedesSignalIds: [negative.value.signal.signalId], supersessionMode: 'restore' })); })(); }; const results = await Promise.allSettled([make('obs-a'), make('obs-b')]); assert.equal(results.filter(x => x.status === 'fulfilled').length, 1); assert.equal(results.filter(x => x.status === 'rejected').length, 1); assert.match(results.find(x => x.status === 'rejected').reason.message, /inactive|target/);
});

test('tampered stored review fails closed', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'routing-policy-')); const store = new RoutingPolicyStore(root, { authorizedReviewerIds: ['reviewer'] }); const result = await accepted(store, 'obs-1', undefined, '2026-09-02T06:00:00.000Z'); const file = path.join(root, 'reviews', `${Buffer.from(result.value.reviewId).toString('hex')}.json`); await writeFile(file, (await readFile(file, 'utf8')).replace('reviewer', 'forged')); await assert.rejects(() => store.get('reviews', result.value.reviewId), /hash|reviewer|unauthorized|forbidden/);
});

test('stored review is rebound to its finding on every read', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'routing-policy-')); const store = new RoutingPolicyStore(root, { authorizedReviewerIds: ['reviewer'] }); const result = await accepted(store, 'obs-1', undefined, '2026-09-02T07:00:00.000Z'); const review = result.value; const forgedSignal = createRoutingPolicySignal({ ...review.signal, subject: { ...review.signal.subject, model: 'other/model' } }, review); const file = path.join(root, 'reviews', `${Buffer.from(review.reviewId).toString('hex')}.json`); await writeFile(file, JSON.stringify({ ...review, signal: forgedSignal }, null, 2)); await assert.rejects(() => store.get('reviews', review.reviewId), /stored embedded signal lineage/);
});
