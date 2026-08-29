export const OBSERVER_VERSION = '1.0.0';
export const DIGEST_SCHEMA = 'celestan-session-digest-v1';
export const CONSOLIDATION_SCHEMA = 'celestan-observer-consolidation-v1';
export const CHRONICLE_SCHEMA = 'celestan-observer-chronicle-v1';

const values = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

export function createDigest({ execution = {}, evidence = {}, semantic = {} } = {}) {
  if (!execution.executionId) throw new Error('execution.executionId is required');
  const status = execution.status || evidence.status || 'unknown';
  const refs = values(evidence.references || execution.references);
  const digest = {
    schema: DIGEST_SCHEMA,
    observerVersion: OBSERVER_VERSION,
    execution: {
      id: execution.executionId,
      project: execution.project || 'unknown',
      workstream: execution.workstream || undefined,
      environment: execution.environment || 'unknown',
      sessionId: execution.sessionId || undefined,
      commit: execution.commit || undefined,
      startedAt: execution.startedAt || undefined,
      finishedAt: execution.finishedAt || undefined,
      status
    },
    observedAt: new Date().toISOString(),
    objective: semantic.objective || evidence.objective || undefined,
    summary: semantic.summary || evidence.summary || `${status} execution in ${execution.project || 'unknown'}`,
    actions: values(semantic.actions || evidence.actions),
    decisions: values(semantic.decisions || evidence.decisions),
    approaches: values(semantic.approaches || evidence.approaches),
    failures: values(semantic.failures || evidence.failures),
    recoveries: values(semantic.recoveries || evidence.recoveries),
    verification: semantic.verification || evidence.verification || undefined,
    interventions: values(semantic.interventions || evidence.interventions),
    autonomyBlocks: values(semantic.autonomyBlocks || evidence.autonomyBlocks),
    friction: values(semantic.friction || evidence.friction),
    discoveries: values(semantic.discoveries || evidence.discoveries),
    modelUsage: semantic.modelUsage || evidence.modelUsage || undefined,
    observations: values(semantic.observations || evidence.observations),
    signals: values(semantic.signals || evidence.signals),
    confidence: semantic.confidence ?? evidence.confidence ?? 0.5,
    provenance: {
      references: refs,
      evidenceDigest: evidence.evidenceDigest || undefined,
      source: evidence.source || execution.source || 'supplied evidence'
    }
  };
  return compact(digest);
}

function compact(value) {
  if (Array.isArray(value)) return value.length ? value.map(compact) : undefined;
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    const clean = compact(child);
    if (clean !== undefined && clean !== null && clean !== '') result[key] = clean;
  }
  return result;
}
