import { mkdir, readFile, readdir, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { createDigest, validateSemanticObservation, createSemanticObservationTask, projectSemanticObservation, telemetryReferenceIds, OBSERVER_VERSION, CONSOLIDATION_SCHEMA, CHRONICLE_SCHEMA, SEMANTIC_SCHEMA } from './schema.mjs';

const json = (value) => JSON.stringify(value, null, 2) + '\n';
// Hex encoding is filesystem-safe and injective, unlike character replacement.
const safe = (id) => Buffer.from(String(id), 'utf8').toString('hex');
const now = () => new Date().toISOString();

export class ObserverStore {
  constructor(root) { this.root = root; this.records = path.join(root, 'records'); }
  async init() { await mkdir(this.records, { recursive: true }); }
  recordPath(id) { return path.join(this.records, `${safe(id)}.json`); }
  async has(id) { try { await readFile(this.recordPath(id)); return true; } catch { return false; } }
  async append(digest) {
    await this.init();
    const target = this.recordPath(digest.execution.id);
    try { await readFile(target); return { status: 'duplicate', executionId: digest.execution.id }; }
    catch { /* new record */ }
    try { await writeFile(target, json(digest), { flag: 'wx' }); }
    catch (error) { if (error.code === 'EEXIST') return { status: 'duplicate', executionId: digest.execution.id }; throw error; }
    await appendFile(path.join(this.root, 'ledger.ndjson'), JSON.stringify({ executionId: digest.execution.id, recordedAt: now(), record: path.relative(this.root, target) }) + '\n');
    await writeFile(path.join(this.root, 'cursor.json'), json({ schema: 'celestan-observer-cursor-v1', updatedAt: now(), lastExecutionId: digest.execution.id }), { flag: 'w' });
    return { status: 'processed', executionId: digest.execution.id };
  }
  async semanticTask(executionId) {
    const digest = JSON.parse(await readFile(this.recordPath(executionId), 'utf8'));
    return createSemanticObservationTask(digest);
  }
  async appendSemantic(executionId, output) {
    const digest = JSON.parse(await readFile(this.recordPath(executionId), 'utf8'));
    validateSemanticObservation(output, executionId, { allowedEvidenceReferences: digest.provenance.references || [], allowedTelemetryReferences: telemetryReferenceIds(digest.modelRuntimeTelemetry) });
    const directory = path.join(this.root, 'semantic');
    await mkdir(directory, { recursive: true });
    const target = path.join(directory, `${safe(executionId)}.json`);
    try { await readFile(target); return { status: 'duplicate', executionId }; }
    catch { /* new semantic observation */ }
    try { await writeFile(target, json(output), { flag: 'wx' }); }
    catch (error) { if (error.code === 'EEXIST') return { status: 'duplicate', executionId }; throw error; }
    await appendFile(path.join(this.root, 'lifecycle.ndjson'), JSON.stringify({ executionId, from: digest.lifecycle.state, to: 'observed', observation: path.relative(this.root, target), at: now() }) + '\n');
    return { status: 'observed', executionId, schema: SEMANTIC_SCHEMA };
  }
  async appendSemanticFailure(executionId, failure = {}, attempt = 1) {
    await this.init();
    if (!Number.isInteger(attempt) || attempt < 1 || attempt > 100000) throw new Error('attempt must be a bounded positive integer');
    const input = failure && typeof failure === 'object' ? failure : {};
    const errorClass = SAFE_FAILURE_CLASSES.has(input.errorClass) ? input.errorClass : 'unknown';
    const reason = SAFE_FAILURE_REASONS.has(input.reason) ? input.reason : 'semantic-observation-rejected';
    const event = { executionId: boundedFailureText(executionId, 'executionId', 500), from: 'semantic-analysis-pending', to: 'semantic-analysis-pending', status: 'failed', attempt, errorClass, reason, at: now() };
    if (typeof input.retryable === 'boolean') event.retryable = input.retryable;
    await appendFile(path.join(this.root, 'lifecycle.ndjson'), JSON.stringify(event) + '\n');
    return { status: 'semantic-analysis-pending', executionId, ...(event.retryable === undefined ? {} : { retryable: event.retryable }), attempt, errorClass, reason };
  }
  async list() {
    await this.init();
    return (await readdir(this.records)).filter((name) => name.endsWith('.json')).sort()
      .map(async (name) => JSON.parse(await readFile(path.join(this.records, name), 'utf8')));
  }
  async all() { return Promise.all(await this.list()); }
  async joined() { return joinedRecords(this); }
}

export async function digestAndAppend(store, input) {
  const preflightDigest = input.semantic ? createDigest({ execution: input.execution, evidence: input.evidence }) : undefined;
  const semantic = input.semantic ? validateSemanticObservation(input.semantic, input.execution.executionId, { allowedEvidenceReferences: input.evidence?.references || input.execution.references || [], allowedTelemetryReferences: telemetryReferenceIds(preflightDigest.modelRuntimeTelemetry) }) : undefined;
  const digest = createDigest({ ...input, semantic });
  const result = await store.append(digest);
  if (semantic && result.status === 'processed') await store.appendSemantic(digest.execution.id, semantic);
  return { digest, result };
}

export async function consolidate(store, { existingMemory = [], existingLessons = [] } = {}) {
  const records = await joinedRecords(store);
  const semanticOnly = records.filter(isObservedRecord);
  const known = new Set([...existingMemory, ...existingLessons].map((item) => typeof item === 'string' ? item : item.key || item.text).filter(Boolean));
  const groups = new Map();
  for (const record of semanticOnly) {
    for (const signal of record.signals || []) {
      const baseKey = signal.key || signal.type || signal.text;
      const conditionKey = signal.type === 'routing-policy' ? `condition:${Buffer.from(signal.taskCondition, 'utf8').toString('hex')}` : undefined;
      const key = conditionKey ? `${baseKey}::${conditionKey}` : baseKey;
      if (!key) continue;
      const item = groups.get(key) || { key, signalKey: baseKey, type: signal.type || 'observation', taskCondition: signal.taskCondition, occurrences: [], projects: new Set(), evidence: [] };
      item.occurrences.push(signal.text || signal.summary || key);
      item.projects.add(record.execution.project);
      item.evidence.push(record.execution.id);
      groups.set(key, item);
    }
  }
  const findings = [...groups.values()].map((item) => ({
    key: item.key,
    type: item.type,
    taskCondition: item.taskCondition,
    evidenceCount: item.occurrences.length,
    independentProjects: item.projects.size,
    evidence: item.evidence,
    status: item.projects.size > 1 || item.occurrences.length > 1 ? 'candidate' : 'observation',
    recommendedDestination: destination(item.type, item.projects.size, item.occurrences.length),
    existingMatch: known.has(item.key) || (!item.taskCondition && (known.has(item.signalKey) || known.has(item.occurrences[0]))),
    text: item.occurrences[0]
  }));
  return { schema: CONSOLIDATION_SCHEMA, observerVersion: OBSERVER_VERSION, consolidatedAt: now(), inputRecords: semanticOnly.map((r) => r.execution.id), pendingSemantic: records.filter((record) => !semanticOnly.some((observed) => observed.execution.id === record.execution.id)).map((record) => record.execution.id), existingMemoryCount: existingMemory.length, existingLessonsCount: existingLessons.length, findings };
}

export function createPolicyDecision(candidate, action, destinationName) {
  const actions = new Set(['accept', 'defer', 'reject']);
  const destinations = new Set(['episode-memory', 'project-memory', 'global-lesson-candidate', 'lessons', 'foundry', 'identity-review', 'identity-candidate-review', 'routing-review']);
  if (!candidate?.key || !Array.isArray(candidate.evidence) || !candidate.evidence.length) throw new Error('Candidate must include a key and provenance evidence');
  if (!actions.has(action)) throw new Error(`Unsupported policy action: ${action}`);
  if (!destinations.has(destinationName)) throw new Error(`Unsupported policy destination: ${destinationName}`);
  if (destinationName === 'identity-review' && action === 'accept') throw new Error('Identity changes remain review-only');
  if (destinationName === 'routing-review' && action === 'accept') throw new Error('Routing changes remain review-only');
  return { schema: 'celestan-observer-policy-decision-v1', decidedAt: now(), candidateKey: candidate.key, action, destination: destinationName, evidence: candidate.evidence, rationale: action === 'accept' ? 'Accepted by an authority-aware policy consumer.' : undefined };
}

export async function appendPolicyDecision(store, decision) {
  await store.init();
  await appendFile(path.join(store.root, 'policy-decisions.ndjson'), JSON.stringify(decision) + '\n');
  return decision;
}

function destination(type, projects, occurrences) {
  if (type === 'routing-policy') return 'routing-review';
  if (type === 'foundry-gap' || type === 'tooling-friction') return 'foundry';
  if (type === 'lesson') return projects > 1 ? 'global-lesson-candidate' : 'lessons';
  if (type === 'identity-policy') return 'identity-candidate-review';
  return occurrences > 1 ? 'project-memory' : 'episode-memory';
}

const SAFE_FAILURE_CLASSES = new Set(['ValidationError', 'SchemaError', 'TimeoutError', 'NetworkError', 'ProviderError', 'UnknownError']);
const SAFE_FAILURE_REASONS = new Set(['semantic-observation-rejected', 'provider-error', 'timeout', 'network-error', 'invalid-input', 'unknown']);
function boundedFailureText(value, field, maximum) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || /[\r\n\0]/.test(value)) throw new Error(`${field} must be a safe string of at most ${maximum} characters`);
  return value;
}

export async function appendChronicle(store, period, outputPath, markdownPath = outputPath.replace(/\.json$/i, '.md')) {
  const records = (await joinedRecords(store)).filter(isObservedRecord);
  const periodRecords = records.filter((record) => (record.execution.finishedAt || record.observedAt || '').slice(0, 10) >= period.start && (record.execution.startedAt || record.observedAt || '').slice(0, 10) <= period.end);
  const statuses = periodRecords.reduce((counts, record) => { const status = record.execution.status || 'unknown'; counts[status] = (counts[status] || 0) + 1; return counts; }, {});
  const notable = periodRecords.flatMap((r) => (r.failures || []).map((failure) => `${r.execution.project}: ${failure}`)).slice(0, 8);
  const entry = { schema: CHRONICLE_SCHEMA, observerVersion: OBSERVER_VERSION, period, generatedAt: now(), executionCount: periodRecords.length, narrative: narrative(period, periodRecords, statuses, notable), sourceExecutionIds: periodRecords.map((r) => r.execution.id) };
  try { await readFile(outputPath); throw new Error(`Chronicle period already exists: ${period.start}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, json(entry), { flag: 'wx' });
  await writeFile(markdownPath, renderChronicleMarkdown(entry, periodRecords), { flag: 'wx' });
  return entry;
}

export async function joinedRecords(store) {
  const records = [];
  for (const record of await store.all()) {
    if (record.lifecycle?.state === 'observed' && record.semanticObservation?.status === 'complete') {
      try { validateEmbeddedSemantic(record); records.push(record); }
      catch { records.push({ ...record, lifecycle: { ...record.lifecycle, state: 'semantic-analysis-pending' } }); }
    }
    else {
      try {
        const semantic = JSON.parse(await readFile(path.join(store.root, 'semantic', `${safe(record.execution.id)}.json`), 'utf8'));
        validateSemanticObservation(semantic, record.execution.id, { allowedEvidenceReferences: record.provenance.references || [], allowedTelemetryReferences: telemetryReferenceIds(record.modelRuntimeTelemetry) });
        records.push({ ...record, ...projectSemanticObservation(semantic), lifecycle: { ...record.lifecycle, state: 'observed' } });
      } catch { records.push(record); }
    }
  }
  return records;
}

function validateEmbeddedSemantic(record) {
  validateSemanticObservation({ schema: SEMANTIC_SCHEMA, executionId: record.execution.id, status: record.semanticObservation.status, summary: record.summary, confidence: record.confidence, signals: record.signals || [], orchestrationAssessment: record.orchestrationAssessment, modelRoutingAssessment: record.modelRoutingAssessment }, record.execution.id, { allowedEvidenceReferences: record.provenance?.references || [], allowedTelemetryReferences: telemetryReferenceIds(record.modelRuntimeTelemetry) });
}

export const isObservedRecord = (record) => record.lifecycle?.state === 'observed' && record.semanticObservation?.status === 'complete';

export function renderChronicleMarkdown(entry, records) {
  const sections = [`# Observer Chronicle: ${entry.period.start} to ${entry.period.end}`, '', entry.narrative, '', `## Evidence`, '', `- ${entry.executionCount} execution record${entry.executionCount === 1 ? '' : 's'}; source IDs: ${entry.sourceExecutionIds.join(', ') || 'none'}.`];
  const decisions = records.flatMap((record) => record.decisions || []).slice(0, 6);
  const lessons = records.flatMap((record) => (record.signals || []).filter((signal) => signal.type === 'lesson').map((signal) => signal.text || signal.key)).slice(0, 6);
  if (decisions.length) sections.push('', '## Decisions', '', ...decisions.map((item) => `- ${item}`));
  if (lessons.length) sections.push('', '## Lessons and Signals', '', ...lessons.map((item) => `- ${item}`));
  sections.push('', '## Integrity', '', '- This entry is append-only; corrections must be recorded in a later period entry.', '- Raw evidence is referenced, not copied.');
  return sections.join('\n') + '\n';
}

function narrative(period, records, statuses, notable) {
  const projects = [...new Set(records.map((r) => r.execution.project))].join(', ') || 'no recorded projects';
  const outcome = Object.entries(statuses).map(([status, count]) => `${count} ${status}`).join(', ') || 'no executions';
  const failures = notable.length ? ` Notable friction: ${notable.join('; ')}.` : '';
  return `During ${period.start} through ${period.end}, Celestan worked across ${projects}. The Observer ledger contains ${records.length} execution${records.length === 1 ? '' : 's'}, with ${outcome}. Significant development is represented by the linked semantic records rather than raw telemetry.${failures}`;
}

export function coverageReport({ manifest = [], records = [], failures = [] }) {
  const processed = new Set(records.map((record) => record.execution.id));
  const observed = new Set(records.filter(isObservedRecord).map((record) => record.execution.id));
  const missing = manifest.filter((item) => !processed.has(item.executionId)).map((item) => item.executionId);
  const semanticMissing = manifest.filter((item) => processed.has(item.executionId) && !observed.has(item.executionId)).map((item) => item.executionId);
  return { schema: 'celestan-observer-coverage-v1', checkedAt: now(), expected: manifest.length, processed: processed.size, semanticallyObserved: observed.size, missing, semanticMissing, failures, healthy: missing.length === 0 && semanticMissing.length === 0 && failures.length === 0 };
}
