import { mkdir, readFile, readdir, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { createDigest, OBSERVER_VERSION, CONSOLIDATION_SCHEMA, CHRONICLE_SCHEMA } from './schema.mjs';

const json = (value) => JSON.stringify(value, null, 2) + '\n';
const safe = (id) => id.replace(/[^a-zA-Z0-9._-]/g, '_');
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
    await writeFile(target, json(digest), { flag: 'wx' });
    await appendFile(path.join(this.root, 'ledger.ndjson'), JSON.stringify({ executionId: digest.execution.id, recordedAt: now(), record: path.relative(this.root, target) }) + '\n');
    await writeFile(path.join(this.root, 'cursor.json'), json({ schema: 'celestan-observer-cursor-v1', updatedAt: now(), lastExecutionId: digest.execution.id }), { flag: 'w' });
    return { status: 'processed', executionId: digest.execution.id };
  }
  async list() {
    await this.init();
    return (await readdir(this.records)).filter((name) => name.endsWith('.json')).sort()
      .map(async (name) => JSON.parse(await readFile(path.join(this.records, name), 'utf8')));
  }
  async all() { return Promise.all(await this.list()); }
}

export async function digestAndAppend(store, input) {
  const digest = createDigest(input);
  return { digest, result: await store.append(digest) };
}

export async function consolidate(store, { existingMemory = [], existingLessons = [] } = {}) {
  const records = await store.all();
  const known = new Set([...existingMemory, ...existingLessons].map((item) => typeof item === 'string' ? item : item.key || item.text).filter(Boolean));
  const groups = new Map();
  for (const record of records) {
    for (const signal of record.signals || []) {
      const key = signal.key || signal.type || signal.text;
      if (!key) continue;
      const item = groups.get(key) || { key, type: signal.type || 'observation', occurrences: [], projects: new Set(), evidence: [] };
      item.occurrences.push(signal.text || signal.summary || key);
      item.projects.add(record.execution.project);
      item.evidence.push(record.execution.id);
      groups.set(key, item);
    }
  }
  const findings = [...groups.values()].map((item) => ({
    key: item.key,
    type: item.type,
    evidenceCount: item.occurrences.length,
    independentProjects: item.projects.size,
    evidence: item.evidence,
    status: item.projects.size > 1 || item.occurrences.length > 1 ? 'candidate' : 'observation',
    recommendedDestination: destination(item.type, item.projects.size, item.occurrences.length),
    existingMatch: known.has(item.key) || known.has(item.occurrences[0]),
    text: item.occurrences[0]
  }));
  return { schema: CONSOLIDATION_SCHEMA, observerVersion: OBSERVER_VERSION, consolidatedAt: now(), inputRecords: records.map((r) => r.execution.id), existingMemoryCount: existingMemory.length, existingLessonsCount: existingLessons.length, findings };
}

function destination(type, projects, occurrences) {
  if (type === 'foundry-gap' || type === 'tooling-friction') return 'foundry';
  if (type === 'identity-policy') return 'identity-candidate-review';
  if (type === 'lesson' && projects > 1) return 'global-lesson-candidate';
  if (type === 'lesson') return 'project-lesson-candidate';
  return occurrences > 1 ? 'memory-candidate' : 'episode-history';
}

export async function appendChronicle(store, period, outputPath) {
  const records = (await store.all()).filter((record) => (record.execution.finishedAt || record.observedAt || '').slice(0, 10) >= period.start && (record.execution.startedAt || record.observedAt || '').slice(0, 10) <= period.end);
  const statuses = records.reduce((counts, record) => { const status = record.execution.status || 'unknown'; counts[status] = (counts[status] || 0) + 1; return counts; }, {});
  const notable = records.flatMap((r) => (r.failures || []).map((failure) => `${r.execution.project}: ${failure}`)).slice(0, 8);
  const entry = { schema: CHRONICLE_SCHEMA, observerVersion: OBSERVER_VERSION, period, generatedAt: now(), executionCount: records.length, narrative: narrative(period, records, statuses, notable), sourceExecutionIds: records.map((r) => r.execution.id) };
  try { await readFile(outputPath); throw new Error(`Chronicle period already exists: ${period.start}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, json(entry), { flag: 'wx' });
  return entry;
}

function narrative(period, records, statuses, notable) {
  const projects = [...new Set(records.map((r) => r.execution.project))].join(', ') || 'no recorded projects';
  const outcome = Object.entries(statuses).map(([status, count]) => `${count} ${status}`).join(', ') || 'no executions';
  const failures = notable.length ? ` Notable friction: ${notable.join('; ')}.` : '';
  return `During ${period.start} through ${period.end}, Celestan worked across ${projects}. The Observer ledger contains ${records.length} execution${records.length === 1 ? '' : 's'}, with ${outcome}. Significant development is represented by the linked semantic records rather than raw telemetry.${failures}`;
}

export function coverageReport({ manifest = [], records = [], failures = [] }) {
  const processed = new Set(records.map((record) => record.execution.id));
  const missing = manifest.filter((item) => !processed.has(item.executionId)).map((item) => item.executionId);
  return { schema: 'celestan-observer-coverage-v1', checkedAt: now(), expected: manifest.length, processed: processed.size, missing, failures, healthy: missing.length === 0 && failures.length === 0 };
}
