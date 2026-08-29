export const OBSERVER_VERSION = '1.1.0';
export const DIGEST_SCHEMA = 'celestan-execution-digest-v1';
export const SEMANTIC_SCHEMA = 'celestan-semantic-observation-v1';
export const CONSOLIDATION_SCHEMA = 'celestan-observer-consolidation-v1';
export const CHRONICLE_SCHEMA = 'celestan-observer-chronicle-v1';
export const SEMANTIC_PROMPT_VERSION = 'celestan-observer-semantic-task-v1';
export const SEMANTIC_CONFIDENCE_FLOOR = 0.6;

export const ORCHESTRATION_OUTCOMES = Object.freeze([
  'aligned',
  'mixed',
  'justified-direct',
  'under-delegation-candidate',
  'insufficient-evidence',
  'not-applicable'
]);

const values = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

export function createDigest({ execution = {}, evidence = {}, semantic } = {}) {
  if (!execution.executionId) throw new Error('execution.executionId is required');
  const orchestration = validateOrchestrationMetadata(execution.orchestration);
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
      status,
      orchestration
    },
    executionDistribution: deriveExecutionDistribution(orchestration),
    observedAt: new Date().toISOString(),
    lifecycle: { state: semantic ? 'observed' : 'semantic-analysis-pending' },
    provenance: {
      references: refs,
      evidenceDigest: evidence.evidenceDigest || undefined,
      source: evidence.source || execution.source || 'supplied evidence'
    }
  };
  if (semantic) Object.assign(digest, projectSemanticObservation(semantic));
  return compact(digest);
}

export function createSemanticObservationTask(digest) {
  return {
    schema: SEMANTIC_PROMPT_VERSION,
    executionId: digest.execution.id,
    task: 'Interpret the supplied execution evidence. Return only a semantic observation matching celestan-semantic-observation-v1. Do not infer facts absent from the evidence. Separate intended from actual outcome, name uncertainty, and emit only reusable generic signals with evidence references. Assess orchestration separately when evidence permits: mechanical execution-distribution measurements are proxies, not proof of semantic policy compliance or violation.',
    evidencePackage: { execution: digest.execution, executionDistribution: digest.executionDistribution, objective: digest.objective, provenance: digest.provenance, evidenceReferences: digest.provenance.references || [] },
    outputSchema: SEMANTIC_SCHEMA,
    orchestrationAssessment: { optional: true, outcomes: ORCHESTRATION_OUTCOMES, requiredFields: ['outcome', 'summary', 'uncertainty', 'evidenceReferences'] },
    completion: 'pending'
  };
}

export function validateSemanticObservation(output, executionId, { minimumConfidence = SEMANTIC_CONFIDENCE_FLOOR, allowedEvidenceReferences } = {}) {
  if (!output || output.schema !== SEMANTIC_SCHEMA) throw new Error(`Unsupported semantic observation schema; expected ${SEMANTIC_SCHEMA}`);
  if (output.executionId !== executionId) throw new Error('Semantic observation executionId does not match digest');
  if (output.status !== 'complete') throw new Error('Semantic observation must have status complete');
  if (typeof output.summary !== 'string' || !output.summary.trim()) throw new Error('Semantic observation summary is required');
  if (!Number.isFinite(output.confidence) || output.confidence < 0 || output.confidence > 1) throw new Error('Semantic observation confidence must be between 0 and 1');
  if (output.confidence < minimumConfidence) throw new Error(`Semantic observation confidence is below ${minimumConfidence}`);
  if (!Array.isArray(output.signals)) throw new Error('Semantic observation signals must be an array');
  if (output.orchestrationAssessment !== undefined) validateOrchestrationAssessment(output.orchestrationAssessment, allowedEvidenceReferences);
  return output;
}

export function validateOrchestrationMetadata(metadata) {
  if (metadata === undefined || metadata === null) return undefined;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('execution.orchestration must be an object');
  if (typeof metadata.taskAvailable !== 'boolean') throw new Error('execution.orchestration.taskAvailable must be a boolean');

  const integerFields = ['parentSessionCount', 'workerSessionCount', 'parentTaskCount', 'delegatedTaskCount', 'parentMutationCalls', 'delegatedMutationCalls'];
  for (const field of integerFields) {
    if (metadata[field] !== undefined && (!Number.isInteger(metadata[field]) || metadata[field] < 0)) {
      throw new Error(`execution.orchestration.${field} must be a nonnegative integer`);
    }
  }
  for (const [parent, worker] of [['parentSessionCount', 'workerSessionCount'], ['parentTaskCount', 'delegatedTaskCount']]) {
    if ((metadata[parent] === undefined) !== (metadata[worker] === undefined)) throw new Error(`execution.orchestration must supply ${parent} and ${worker} together`);
  }
  if (metadata.parentSessionCount === undefined && metadata.parentTaskCount === undefined) throw new Error('execution.orchestration must supply session counts or task counts');
  if (metadata.parentMutationCalls === undefined || metadata.delegatedMutationCalls === undefined) throw new Error('execution.orchestration must supply parentMutationCalls and delegatedMutationCalls');

  return Object.fromEntries(['taskAvailable', ...integerFields].filter((field) => metadata[field] !== undefined).map((field) => [field, metadata[field]]));
}

export function deriveExecutionDistribution(orchestration) {
  if (!orchestration) return { availability: 'unavailable', reason: 'runtime-orchestration-metadata-not-supplied' };
  const totalMutationCalls = orchestration.parentMutationCalls + orchestration.delegatedMutationCalls;
  const shareAvailable = totalMutationCalls > 0;
  const parentShare = shareAvailable ? orchestration.parentMutationCalls / totalMutationCalls : undefined;
  const delegationObserved = orchestration.delegatedMutationCalls > 0 || orchestration.workerSessionCount > 0 || orchestration.delegatedTaskCount > 0;
  return compact({
    availability: 'available',
    taskAvailable: orchestration.taskAvailable,
    sessionCounts: orchestration.parentSessionCount === undefined ? undefined : { parent: orchestration.parentSessionCount, worker: orchestration.workerSessionCount, total: orchestration.parentSessionCount + orchestration.workerSessionCount },
    taskCounts: orchestration.parentTaskCount === undefined ? undefined : { parent: orchestration.parentTaskCount, delegated: orchestration.delegatedTaskCount, total: orchestration.parentTaskCount + orchestration.delegatedTaskCount },
    mutationCallCounts: { parent: orchestration.parentMutationCalls, delegated: orchestration.delegatedMutationCalls, total: totalMutationCalls },
    parentRetainedModificationShare: shareAvailable ? { availability: 'available', value: parentShare, denominatorMutationCalls: totalMutationCalls } : { availability: 'unavailable', denominatorMutationCalls: 0 },
    delegationObserved,
    elevatedParentRetentionProxy: {
      observed: shareAvailable && totalMutationCalls >= 10 && parentShare >= 0.8,
      minimumMutationCalls: 10,
      minimumParentShare: 0.8
    }
  });
}

function validateOrchestrationAssessment(assessment, allowedEvidenceReferences) {
  if (!assessment || typeof assessment !== 'object' || Array.isArray(assessment)) throw new Error('Semantic orchestrationAssessment must be an object');
  if (!ORCHESTRATION_OUTCOMES.includes(assessment.outcome)) throw new Error(`Semantic orchestrationAssessment outcome must be one of: ${ORCHESTRATION_OUTCOMES.join(', ')}`);
  if (typeof assessment.summary !== 'string' || !assessment.summary.trim()) throw new Error('Semantic orchestrationAssessment summary is required');
  if (typeof assessment.uncertainty !== 'string' || !assessment.uncertainty.trim()) throw new Error('Semantic orchestrationAssessment uncertainty is required');
  if (!Array.isArray(assessment.evidenceReferences) || !assessment.evidenceReferences.length || assessment.evidenceReferences.some((reference) => typeof reference !== 'string' || !reference.trim())) throw new Error('Semantic orchestrationAssessment requires evidenceReferences');
  if (allowedEvidenceReferences !== undefined) {
    const allowed = new Set(allowedEvidenceReferences);
    if (assessment.evidenceReferences.some((reference) => !allowed.has(reference))) throw new Error('Semantic orchestrationAssessment contains an unknown evidence reference');
  }
}

export function projectSemanticObservation(semantic) {
  return compact({
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
    orchestrationAssessment: semantic.orchestrationAssessment,
    confidence: semantic.confidence,
    semanticObservation: { schema: SEMANTIC_SCHEMA, status: semantic.status, completedAt: semantic.completedAt || new Date().toISOString() }
  });
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
