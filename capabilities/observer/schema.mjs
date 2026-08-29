export const OBSERVER_VERSION = '1.0.0';
export const DIGEST_SCHEMA = 'celestan-execution-digest-v1';
export const SEMANTIC_SCHEMA = 'celestan-semantic-observation-v1';
export const CONSOLIDATION_SCHEMA = 'celestan-observer-consolidation-v1';
export const CHRONICLE_SCHEMA = 'celestan-observer-chronicle-v1';
export const SEMANTIC_PROMPT_VERSION = 'celestan-observer-semantic-task-v1';
export const SEMANTIC_CONFIDENCE_FLOOR = 0.6;

const values = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

export function createDigest({ execution = {}, evidence = {}, semantic } = {}) {
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
    lifecycle: { state: semantic ? 'observed' : 'semantic-analysis-pending' },
    provenance: {
      references: refs,
      evidenceDigest: evidence.evidenceDigest || undefined,
      source: evidence.source || execution.source || 'supplied evidence'
    }
  };
  if (semantic) Object.assign(digest, semanticFields(semantic));
  return compact(digest);
}

export function createSemanticObservationTask(digest) {
  return {
    schema: SEMANTIC_PROMPT_VERSION,
    executionId: digest.execution.id,
    task: 'Interpret the supplied execution evidence. Return only a semantic observation matching celestan-semantic-observation-v1. Do not infer facts absent from the evidence. Separate intended from actual outcome, name uncertainty, and emit only reusable signals with evidence references.',
    evidencePackage: { execution: digest.execution, objective: digest.objective, provenance: digest.provenance, evidenceReferences: digest.provenance.references || [] },
    outputSchema: SEMANTIC_SCHEMA,
    completion: 'pending'
  };
}

export function validateSemanticObservation(output, executionId, { minimumConfidence = SEMANTIC_CONFIDENCE_FLOOR } = {}) {
  if (!output || output.schema !== SEMANTIC_SCHEMA) throw new Error(`Unsupported semantic observation schema; expected ${SEMANTIC_SCHEMA}`);
  if (output.executionId !== executionId) throw new Error('Semantic observation executionId does not match digest');
  if (output.status !== 'complete') throw new Error('Semantic observation must have status complete');
  if (typeof output.summary !== 'string' || !output.summary.trim()) throw new Error('Semantic observation summary is required');
  if (!Number.isFinite(output.confidence) || output.confidence < 0 || output.confidence > 1) throw new Error('Semantic observation confidence must be between 0 and 1');
  if (output.confidence < minimumConfidence) throw new Error(`Semantic observation confidence is below ${minimumConfidence}`);
  if (!Array.isArray(output.signals)) throw new Error('Semantic observation signals must be an array');
  return output;
}

function semanticFields(semantic) {
  return {
    objective: semantic.objective,
    summary: semantic.summary,
    actions: values(semantic.actions),
    decisions: values(semantic.decisions),
    approaches: values(semantic.approaches),
    failures: values(semantic.failures),
    recoveries: values(semantic.recoveries),
    verification: semantic.verification,
    interventions: values(semantic.interventions),
    autonomyBlocks: values(semantic.autonomyBlocks),
    friction: values(semantic.friction),
    discoveries: values(semantic.discoveries),
    modelUsage: semantic.modelUsage,
    observations: values(semantic.observations),
    signals: values(semantic.signals),
    confidence: semantic.confidence,
    semanticObservation: { schema: SEMANTIC_SCHEMA, status: semantic.status, completedAt: semantic.completedAt || new Date().toISOString() }
  };
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
