export const OBSERVER_VERSION = '1.1.0';
export const DIGEST_SCHEMA = 'celestan-execution-digest-v1';
export const SEMANTIC_SCHEMA = 'celestan-semantic-observation-v1';
export const CONSOLIDATION_SCHEMA = 'celestan-observer-consolidation-v1';
export const CHRONICLE_SCHEMA = 'celestan-observer-chronicle-v1';
export const SEMANTIC_PROMPT_VERSION = 'celestan-observer-semantic-task-v1';
export const SEMANTIC_CONFIDENCE_FLOOR = 0.6;

export const ORCHESTRATION_OUTCOMES = Object.freeze([
  'aligned', 'mixed', 'justified-direct', 'under-delegation-candidate',
  'insufficient-evidence', 'not-applicable'
]);
export const MODEL_ROUTING_OUTCOMES = Object.freeze([
  'effective', 'mixed', 'ineffective-candidate', 'insufficient-evidence', 'not-applicable'
]);
export const FAILURE_CATEGORIES = Object.freeze([
  'model-output-quality', 'instruction-following', 'context-pressure', 'provider-limit',
  'provider-capacity', 'network-transport-timeout', 'authentication-account-billing',
  'tool-runtime-sandbox', 'policy-refusal', 'protocol-schema-tool-call', 'cancellation', 'unknown'
]);
export const TASK_TYPES = Object.freeze([
  'implementation', 'debugging', 'review', 'verification', 'research', 'planning',
  'architecture', 'documentation', 'operations', 'orchestration', 'other', 'unknown'
]);
const SIGNAL_TYPES = new Set(['lesson', 'memory', 'foundry-gap', 'tooling-friction', 'identity-policy', 'routing-policy']);

const RECORD_STATUSES = new Set(['pending', 'running', 'success', 'succeeded', 'failure', 'failed', 'error', 'cancelled', 'timeout', 'recovered', 'complete', 'unknown']);
const TRANSITION_FACETS = new Set(['retry', 'fallback', 'provider-switch', 'model-switch']);
const ATTRIBUTION_TARGETS = new Set(['provider', 'model', 'provider-model', 'runtime', 'tool', 'sandbox', 'policy', 'network', 'account', 'unknown']);
const ATTRIBUTION_CONFIDENCE = new Set(['low', 'medium', 'high']);
const values = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

export function createDigest({ execution = {}, evidence = {}, semantic } = {}) {
  if (!execution.executionId) throw new Error('execution.executionId is required');
  const orchestration = validateOrchestrationMetadata(execution.orchestration);
  const status = execution.status || evidence.status || 'unknown';
  const refs = values(evidence.references || execution.references);
  const modelRuntimeTelemetry = normalizeModelRuntimeTelemetry(execution.modelRuntimeTelemetry, execution, refs);
  if (semantic) validateSemanticObservation(semantic, execution.executionId, { allowedEvidenceReferences: refs, allowedTelemetryReferences: telemetryReferenceIds(modelRuntimeTelemetry) });
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
    modelRuntimeTelemetry,
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
  const telemetryReferences = telemetryReferenceIds(digest.modelRuntimeTelemetry);
  return {
    schema: SEMANTIC_PROMPT_VERSION,
    executionId: digest.execution.id,
    task: 'Interpret the supplied execution evidence. Return only a semantic observation matching celestan-semantic-observation-v1. Do not infer facts absent from the evidence. Separate intended from actual outcome, name uncertainty, and emit only reusable generic signals with evidence references. Assess orchestration and model/routing suitability separately when evidence permits. Mechanical runtime counts are factual activity measurements, not proof of quality, efficiency, routing correctness, model fault, or a universal score. Infrastructure, quota, network, and provider failures must not be relabeled as model-output quality without cited semantic evidence.',
    evidencePackage: {
      execution: digest.execution,
      executionDistribution: digest.executionDistribution,
      modelRuntimeTelemetry: digest.modelRuntimeTelemetry,
      objective: digest.objective,
      provenance: digest.provenance,
      evidenceReferences: digest.provenance.references || [],
      telemetryReferences
    },
    outputSchema: SEMANTIC_SCHEMA,
    orchestrationAssessment: { optional: true, outcomes: ORCHESTRATION_OUTCOMES, requiredFields: ['outcome', 'summary', 'uncertainty', 'evidenceReferences'] },
    modelRoutingAssessment: { optional: true, outcomes: MODEL_ROUTING_OUTCOMES, requiredFields: ['outcome', 'taskCondition', 'summary', 'uncertainty', 'evidenceReferences', 'telemetryReferences'] },
    completion: 'pending'
  };
}

export function validateSemanticObservation(output, executionId, { minimumConfidence = SEMANTIC_CONFIDENCE_FLOOR, allowedEvidenceReferences, allowedTelemetryReferences } = {}) {
  if (!output || output.schema !== SEMANTIC_SCHEMA) throw new Error(`Unsupported semantic observation schema; expected ${SEMANTIC_SCHEMA}`);
  if (output.executionId !== executionId) throw new Error('Semantic observation executionId does not match digest');
  if (output.status !== 'complete') throw new Error('Semantic observation must have status complete');
  requiredText(output.summary, 'Semantic observation summary');
  boundedNumber(output.confidence, 'Semantic observation confidence', 0, 1);
  if (output.confidence < minimumConfidence) throw new Error(`Semantic observation confidence is below ${minimumConfidence}`);
  if (!Array.isArray(output.signals)) throw new Error('Semantic observation signals must be an array');
  const signals = validateSignals(output.signals, allowedEvidenceReferences);
  if (output.orchestrationAssessment !== undefined) validateOrchestrationAssessment(output.orchestrationAssessment, allowedEvidenceReferences);
  if (output.modelRoutingAssessment !== undefined) validateModelRoutingAssessment(output.modelRoutingAssessment, allowedEvidenceReferences, allowedTelemetryReferences);
  return { ...output, signals };
}

export function normalizeModelRuntimeTelemetry(telemetry, execution = {}, allowedEvidenceReferences = []) {
  if (telemetry === undefined || telemetry === null) return { availability: 'unavailable', reason: 'runtime-model-telemetry-not-supplied' };
  plainObject(telemetry, 'execution.modelRuntimeTelemetry');
  rejectUnknown(telemetry, ['sessions', 'invocations', 'failures', 'transitions'], 'execution.modelRuntimeTelemetry');
  for (const field of ['sessions', 'invocations', 'failures', 'transitions']) if (telemetry[field] !== undefined && !Array.isArray(telemetry[field])) throw new Error(`execution.modelRuntimeTelemetry.${field} must be an array`);

  const sessions = telemetry.sessions === undefined ? [] : telemetry.sessions.map(normalizeSession);
  const invocations = telemetry.invocations === undefined ? [] : telemetry.invocations.map(normalizeInvocation);
  const failures = telemetry.failures === undefined ? [] : telemetry.failures.map(normalizeFailure);
  const transitions = telemetry.transitions === undefined ? [] : telemetry.transitions.map(normalizeTransition);
  validateTelemetryReferences({ sessions, invocations, failures, transitions }, allowedEvidenceReferences);
  const records = invocations.length ? invocations : sessions;
  const basis = invocations.length ? 'invocations' : sessions.length ? 'sessions-without-invocations' : 'none';
  return compact({
    availability: 'available',
    sessions,
    invocations,
    failures,
    transitions,
    aggregate: aggregateTelemetry({ sessions, invocations, failures, transitions }, records, basis, execution)
  });
}

function normalizeSession(raw, index) {
  const where = `execution.modelRuntimeTelemetry.sessions[${index}]`;
  plainObject(raw, where);
  rejectUnknown(raw, commonRecordFields(['sessionId', 'parentSessionId']), where);
  return normalizeRuntimeRecord(raw, where, 'sessionId', ['parentSessionId']);
}

function normalizeInvocation(raw, index) {
  const where = `execution.modelRuntimeTelemetry.invocations[${index}]`;
  plainObject(raw, where);
  rejectUnknown(raw, commonRecordFields(['invocationId', 'sessionId', 'parentInvocationId']), where);
  return normalizeRuntimeRecord(raw, where, 'invocationId', ['sessionId', 'parentInvocationId']);
}

function commonRecordFields(ids) {
  return [...ids, 'provider', 'model', 'providerVersion', 'modelVersion', 'agent', 'role', 'task', 'startedAt', 'finishedAt', 'durationMs', 'turns', 'tokens', 'context', 'tools', 'retry', 'cost', 'status', 'outcome'];
}

function normalizeRuntimeRecord(raw, where, idField, referenceFields) {
  const id = safeText(raw[idField], `${where}.${idField}`, 160, true);
  const result = { id };
  for (const field of referenceFields) if (raw[field] !== undefined) result[field] = safeText(raw[field], `${where}.${field}`, 160, true);
  for (const field of ['provider', 'model', 'providerVersion', 'modelVersion', 'agent', 'role']) if (raw[field] !== undefined) result[field] = safeText(raw[field], `${where}.${field}`, 160, true);
  if (raw.task !== undefined) result.task = normalizeTask(raw.task, `${where}.task`);
  result.startedAt = optionalTimestamp(raw.startedAt, `${where}.startedAt`);
  result.finishedAt = optionalTimestamp(raw.finishedAt, `${where}.finishedAt`);
  result.durationMs = durationMeasurement(raw.durationMs, raw.startedAt, raw.finishedAt, `${where}.durationMs`);
  result.turns = measurement(raw.turns, `${where}.turns`, true);
  result.tokens = normalizeMeasurements(raw.tokens, ['input', 'output', 'reasoning', 'cacheRead', 'cacheWrite', 'total'], `${where}.tokens`);
  result.context = normalizeContext(raw.context, `${where}.context`);
  result.tools = normalizeTools(raw.tools, `${where}.tools`);
  result.retry = normalizeRetry(raw.retry, `${where}.retry`);
  result.cost = normalizeCost(raw.cost, `${where}.cost`);
  if (raw.status !== undefined) result.status = boundedEnum(raw.status, RECORD_STATUSES, `${where}.status`);
  if (raw.outcome !== undefined) result.outcome = boundedEnum(raw.outcome, RECORD_STATUSES, `${where}.outcome`);
  return compact(result);
}

function normalizeTask(raw, where) {
  plainObject(raw, where);
  rejectUnknown(raw, ['type', 'label', 'id'], where);
  const result = { type: boundedEnum(raw.type, new Set(TASK_TYPES), `${where}.type`) };
  if (raw.label !== undefined) result.label = safeText(raw.label, `${where}.label`, 240, true);
  if (raw.id !== undefined) result.id = safeText(raw.id, `${where}.id`, 160, true);
  return result;
}

function normalizeContext(raw, where) {
  const result = normalizeMeasurements(raw, ['usedTokens', 'limitTokens', 'compactionCount'], where);
  const used = valueOf(result.usedTokens);
  const limit = valueOf(result.limitTokens);
  result.pressure = used !== undefined && limit !== undefined && limit > 0
    ? { availability: 'available', value: used / limit, basis: 'usedTokens/limitTokens' }
    : { availability: 'unavailable', reason: 'requires-usedTokens-and-positive-limitTokens' };
  return result;
}

function normalizeTools(raw, where) {
  if (raw === undefined || raw === null) return unavailableMeasurements(['calls', 'mutations', 'failedCalls']);
  plainObject(raw, where);
  rejectUnknown(raw, ['calls', 'mutations', 'failedCalls', 'byName'], where);
  const result = Object.fromEntries(['calls', 'mutations', 'failedCalls'].map((field) => [field, measurement(raw[field], `${where}.${field}`, true)]));
  if (raw.byName !== undefined) {
    plainObject(raw.byName, `${where}.byName`);
    if (Object.keys(raw.byName).length > 100) throw new Error(`${where}.byName exceeds 100 entries`);
    result.byName = Object.keys(raw.byName).sort().map((name) => {
      safeText(name, `${where}.byName key`, 120, true);
      return { name, ...normalizeMeasurements(raw.byName[name], ['calls', 'mutations', 'failedCalls'], `${where}.byName.${name}`) };
    });
  }
  return result;
}

function normalizeRetry(raw, where) {
  return normalizeMeasurements(raw, ['attempt', 'retryCount', 'backoffMs', 'waitMs'], where);
}

function normalizeCost(raw, where) {
  if (raw === undefined || raw === null) return { availability: 'unavailable', reason: 'not-supplied-or-not-authoritatively-measured' };
  plainObject(raw, where);
  rejectUnknown(raw, ['amount', 'currency', 'measured'], where);
  if (raw.measured !== true) return { availability: 'unavailable', reason: 'runtime-did-not-assert-genuine-measurement' };
  boundedNumber(raw.amount, `${where}.amount`, 0);
  const currency = safeText(raw.currency, `${where}.currency`, 12, true).toUpperCase();
  if (!/^[A-Z][A-Z0-9]{2,11}$/.test(currency)) throw new Error(`${where}.currency must be a bounded currency code`);
  return { availability: 'available', amount: raw.amount, currency, measured: true };
}

function normalizeFailure(raw, index) {
  const where = `execution.modelRuntimeTelemetry.failures[${index}]`;
  plainObject(raw, where);
  rejectUnknown(raw, ['failureId', 'sessionId', 'invocationId', 'category', 'errorClass', 'errorCode', 'httpStatus', 'timestamp', 'durationBeforeFailureMs', 'retryable', 'retryCount', 'backoffMs', 'waitMs', 'sameModelSubsequentSuccess', 'fallbackProvider', 'fallbackModel', 'fallbackOutcome', 'tokens', 'context', 'evidenceReferences', 'runtimeAttribution'], where);
  const result = {
    id: safeText(raw.failureId, `${where}.failureId`, 160, true),
    category: boundedEnum(raw.category, new Set(FAILURE_CATEGORIES), `${where}.category`)
  };
  for (const field of ['sessionId', 'invocationId']) if (raw[field] !== undefined) result[field] = safeText(raw[field], `${where}.${field}`, 160, true);
  for (const field of ['errorClass', 'errorCode', 'fallbackProvider', 'fallbackModel']) if (raw[field] !== undefined) result[field] = safeText(raw[field], `${where}.${field}`, 160, true);
  if (raw.httpStatus !== undefined) { boundedNumber(raw.httpStatus, `${where}.httpStatus`, 100, 599, true); result.httpStatus = raw.httpStatus; }
  result.timestamp = optionalTimestamp(raw.timestamp, `${where}.timestamp`);
  result.durationBeforeFailureMs = measurement(raw.durationBeforeFailureMs, `${where}.durationBeforeFailureMs`);
  if (raw.retryable !== undefined) { if (typeof raw.retryable !== 'boolean') throw new Error(`${where}.retryable must be a boolean`); result.retryable = raw.retryable; }
  for (const field of ['retryCount', 'backoffMs', 'waitMs']) if (raw[field] !== undefined) { boundedNumber(raw[field], `${where}.${field}`, 0, undefined, true); result[field] = raw[field]; }
  if (raw.sameModelSubsequentSuccess !== undefined) { if (typeof raw.sameModelSubsequentSuccess !== 'boolean') throw new Error(`${where}.sameModelSubsequentSuccess must be a boolean`); result.sameModelSubsequentSuccess = raw.sameModelSubsequentSuccess; }
  if (raw.fallbackOutcome !== undefined) result.fallbackOutcome = boundedEnum(raw.fallbackOutcome, RECORD_STATUSES, `${where}.fallbackOutcome`);
  result.tokens = normalizeMeasurements(raw.tokens, ['input', 'output', 'reasoning', 'cacheRead', 'cacheWrite', 'total'], `${where}.tokens`);
  result.context = normalizeContext(raw.context, `${where}.context`);
  result.evidenceReferences = normalizeReferences(raw.evidenceReferences, `${where}.evidenceReferences`);
  if (raw.runtimeAttribution !== undefined) {
    plainObject(raw.runtimeAttribution, `${where}.runtimeAttribution`);
    rejectUnknown(raw.runtimeAttribution, ['cause', 'confidence'], `${where}.runtimeAttribution`);
    result.runtimeAttribution = {
      source: 'runtime-reported',
      cause: safeText(raw.runtimeAttribution.cause, `${where}.runtimeAttribution.cause`, 160, true),
      confidence: boundedEnum(raw.runtimeAttribution.confidence, ATTRIBUTION_CONFIDENCE, `${where}.runtimeAttribution.confidence`)
    };
  }
  return compact(result);
}

function normalizeTransition(raw, index) {
  const where = `execution.modelRuntimeTelemetry.transitions[${index}]`;
  plainObject(raw, where);
  rejectUnknown(raw, ['transitionId', 'facets', 'fromInvocationId', 'toInvocationId', 'timestamp', 'fromProvider', 'toProvider', 'fromModel', 'toModel', 'retryCount', 'backoffMs', 'waitMs', 'outcome', 'evidenceReferences'], where);
  if (!Array.isArray(raw.facets) || !raw.facets.length) throw new Error(`${where}.facets must be a non-empty array`);
  const facets = [...new Set(raw.facets.map((facet) => boundedEnum(facet, TRANSITION_FACETS, `${where}.facets`)))].sort();
  const result = { id: safeText(raw.transitionId, `${where}.transitionId`, 160, true), facets };
  for (const field of ['fromInvocationId', 'toInvocationId', 'fromProvider', 'toProvider', 'fromModel', 'toModel']) if (raw[field] !== undefined) result[field] = safeText(raw[field], `${where}.${field}`, 160, true);
  if (!result.fromInvocationId && !result.toInvocationId) throw new Error(`${where} requires fromInvocationId or toInvocationId`);
  result.timestamp = optionalTimestamp(raw.timestamp, `${where}.timestamp`);
  for (const field of ['retryCount', 'backoffMs', 'waitMs']) if (raw[field] !== undefined) { boundedNumber(raw[field], `${where}.${field}`, 0, undefined, true); result[field] = raw[field]; }
  if (raw.outcome !== undefined) result.outcome = boundedEnum(raw.outcome, RECORD_STATUSES, `${where}.outcome`);
  result.evidenceReferences = normalizeReferences(raw.evidenceReferences, `${where}.evidenceReferences`);
  return compact(result);
}

function validateTelemetryReferences({ sessions, invocations, failures, transitions }, allowedEvidenceReferences) {
  const all = [...sessions, ...invocations, ...failures, ...transitions];
  const ids = new Set();
  for (const record of all) {
    if (ids.has(record.id)) throw new Error(`Duplicate model runtime telemetry ID: ${record.id}`);
    ids.add(record.id);
  }
  const sessionIds = new Set(sessions.map((item) => item.id));
  const invocationIds = new Set(invocations.map((item) => item.id));
  const invocationById = new Map(invocations.map((item) => [item.id, item]));
  for (const session of sessions) if (session.parentSessionId && (!sessionIds.has(session.parentSessionId) || session.parentSessionId === session.id)) throw new Error(`Unknown or self-referencing parentSessionId: ${session.parentSessionId}`);
  for (const invocation of invocations) {
    if (invocation.sessionId && !sessionIds.has(invocation.sessionId)) throw new Error(`Unknown sessionId: ${invocation.sessionId}`);
    if (invocation.parentInvocationId && (!invocationIds.has(invocation.parentInvocationId) || invocation.parentInvocationId === invocation.id)) throw new Error(`Unknown or self-referencing parentInvocationId: ${invocation.parentInvocationId}`);
  }
  for (const invocation of invocations) {
    const visited = new Set([invocation.id]);
    let parentId = invocation.parentInvocationId;
    while (parentId) {
      if (visited.has(parentId)) throw new Error(`Cyclic parentInvocationId lineage at: ${parentId}`);
      visited.add(parentId);
      parentId = invocationById.get(parentId)?.parentInvocationId;
    }
  }
  for (const failure of failures) {
    if (failure.sessionId && !sessionIds.has(failure.sessionId)) throw new Error(`Unknown failure sessionId: ${failure.sessionId}`);
    if (failure.invocationId && !invocationIds.has(failure.invocationId)) throw new Error(`Unknown failure invocationId: ${failure.invocationId}`);
    if (failure.sessionId && failure.invocationId && invocationById.get(failure.invocationId).sessionId && invocationById.get(failure.invocationId).sessionId !== failure.sessionId) throw new Error(`Failure ${failure.id} has inconsistent sessionId and invocationId`);
  }
  for (const transition of transitions) for (const field of ['fromInvocationId', 'toInvocationId']) if (transition[field] && !invocationIds.has(transition[field])) throw new Error(`Unknown transition ${field}: ${transition[field]}`);
  const allowed = new Set(allowedEvidenceReferences);
  for (const record of all) if (record.evidenceReferences?.some((reference) => !allowed.has(reference))) throw new Error(`Telemetry record ${record.id} contains an unknown evidence reference`);
}

function aggregateTelemetry(telemetry, records, basis, execution) {
  const expected = records.length;
  const dimensions = {
    providers: grouped(records, (record) => record.provider),
    models: grouped(records, (record) => record.model),
    providerVersions: grouped(records, (record) => record.providerVersion),
    modelVersions: grouped(records, (record) => record.modelVersion),
    agents: grouped(records, (record) => record.agent),
    roles: grouped(records, (record) => record.role),
    taskTypes: grouped(records, (record) => record.task?.type),
    taskLabels: grouped(records, (record) => record.task?.label),
    taskIds: grouped(records, (record) => record.task?.id),
    statuses: grouped(records, (record) => record.status),
    outcomes: grouped(records, (record) => record.outcome)
  };
  const tokens = Object.fromEntries(['input', 'output', 'reasoning', 'cacheRead', 'cacheWrite', 'total'].map((field) => [field, sumMeasurement(records, (record) => record.tokens?.[field], expected)]));
  const contextPressure = summaryMeasurement(records, (record) => record.context?.pressure, expected);
  const tools = Object.fromEntries(['calls', 'mutations', 'failedCalls'].map((field) => [field, sumMeasurement(records, (record) => record.tools?.[field], expected)]));
  const toolNames = [...new Set(records.flatMap((record) => values(record.tools?.byName).map((item) => item.name)))].sort().map((name) => ({
    name,
    calls: sumMeasurement(records, (record) => record.tools?.byName?.find((item) => item.name === name)?.calls, expected),
    mutations: sumMeasurement(records, (record) => record.tools?.byName?.find((item) => item.name === name)?.mutations, expected),
    failedCalls: sumMeasurement(records, (record) => record.tools?.byName?.find((item) => item.name === name)?.failedCalls, expected)
  }));
  const facets = Object.fromEntries([...TRANSITION_FACETS].sort().map((facet) => [facet, telemetry.transitions.filter((event) => event.facets.includes(facet)).length]));
  const wallDuration = durationMeasurement(undefined, execution.startedAt, execution.finishedAt, 'execution wall duration');
  return compact({
    availability: expected ? 'available' : 'unavailable',
    reason: expected ? undefined : 'no-session-or-invocation-records',
    basis,
    coverage: { basisRecords: expected, sessionsSupplied: telemetry.sessions.length, invocationsSupplied: telemetry.invocations.length, failuresSupplied: telemetry.failures.length, transitionEventsSupplied: telemetry.transitions.length },
    counts: { sessions: telemetry.sessions.length, invocations: telemetry.invocations.length, successfulBasisRecords: records.filter(successful).length, failedBasisRecords: records.filter(failed).length },
    identities: dimensions,
    tokens,
    context: { pressure: contextPressure, compactionCount: sumMeasurement(records, (record) => record.context?.compactionCount, expected) },
    tools: { ...tools, byName: toolNames },
    failures: { total: telemetry.failures.length, categories: grouped(telemetry.failures, (failure) => failure.category) },
    transitions: { events: telemetry.transitions.length, facets, note: 'Facet counts may overlap; events is the non-overlapping total.' },
    retries: { retryCount: sumMeasurement(records, (record) => record.retry?.retryCount, expected), failureRetryCount: sumRaw(telemetry.failures, 'retryCount'), transitionRetryCount: sumRaw(telemetry.transitions, 'retryCount') },
    durations: { executionWall: wallDuration, additiveInvocationOrSession: summaryMeasurement(records, (record) => record.durationMs, expected) },
    costs: aggregateCosts(records, expected)
  });
}

function aggregateCosts(records, expected) {
  const available = records.filter((record) => record.cost?.availability === 'available');
  const currencies = new Map();
  for (const record of available) currencies.set(record.cost.currency, (currencies.get(record.cost.currency) || 0) + record.cost.amount);
  return { availability: coverageAvailability(available.length, expected), coverage: { available: available.length, expected }, byCurrency: [...currencies].sort(([a], [b]) => compareCodePoints(a, b)).map(([currency, amount]) => ({ currency, amount })), note: 'Currencies are never summed together.' };
}

function grouped(records, getter) {
  const counts = new Map();
  for (const record of records) { const value = getter(record); if (value !== undefined) counts.set(value, (counts.get(value) || 0) + 1); }
  const available = [...counts.values()].reduce((sum, count) => sum + count, 0);
  return { availability: coverageAvailability(available, records.length), coverage: { available, expected: records.length }, values: [...counts].sort(([a], [b]) => compareCodePoints(String(a), String(b))).map(([value, count]) => ({ value, count })) };
}

function sumMeasurement(records, getter, expected) {
  const available = records.map(getter).filter((item) => item?.availability === 'available');
  return { availability: coverageAvailability(available.length, expected), value: available.length ? available.reduce((sum, item) => sum + item.value, 0) : undefined, coverage: { available: available.length, expected } };
}

function summaryMeasurement(records, getter, expected) {
  const available = records.map(getter).filter((item) => item?.availability === 'available').map((item) => item.value);
  return { availability: coverageAvailability(available.length, expected), coverage: { available: available.length, expected }, sum: available.length ? available.reduce((sum, value) => sum + value, 0) : undefined, minimum: available.length ? Math.min(...available) : undefined, maximum: available.length ? Math.max(...available) : undefined, average: available.length ? available.reduce((sum, value) => sum + value, 0) / available.length : undefined };
}

function sumRaw(records, field) {
  const available = records.filter((record) => record[field] !== undefined);
  return { availability: coverageAvailability(available.length, records.length), value: available.length ? available.reduce((sum, record) => sum + record[field], 0) : undefined, coverage: { available: available.length, expected: records.length } };
}

function coverageAvailability(available, expected) {
  if (!expected || !available) return 'unavailable';
  return available === expected ? 'available' : 'partial';
}

function successful(record) { return ['success', 'succeeded', 'recovered', 'complete'].includes(record.outcome || record.status); }
function failed(record) { return ['failure', 'failed', 'error', 'timeout', 'cancelled'].includes(record.outcome || record.status); }

export function validateOrchestrationMetadata(metadata) {
  if (metadata === undefined || metadata === null) return undefined;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('execution.orchestration must be an object');
  if (typeof metadata.taskAvailable !== 'boolean') throw new Error('execution.orchestration.taskAvailable must be a boolean');
  const integerFields = ['parentSessionCount', 'workerSessionCount', 'parentTaskCount', 'delegatedTaskCount', 'parentMutationCalls', 'delegatedMutationCalls'];
  for (const field of integerFields) if (metadata[field] !== undefined && (!Number.isInteger(metadata[field]) || metadata[field] < 0)) throw new Error(`execution.orchestration.${field} must be a nonnegative integer`);
  for (const [parent, worker] of [['parentSessionCount', 'workerSessionCount'], ['parentTaskCount', 'delegatedTaskCount']]) if ((metadata[parent] === undefined) !== (metadata[worker] === undefined)) throw new Error(`execution.orchestration must supply ${parent} and ${worker} together`);
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
    availability: 'available', taskAvailable: orchestration.taskAvailable,
    sessionCounts: orchestration.parentSessionCount === undefined ? undefined : { parent: orchestration.parentSessionCount, worker: orchestration.workerSessionCount, total: orchestration.parentSessionCount + orchestration.workerSessionCount },
    taskCounts: orchestration.parentTaskCount === undefined ? undefined : { parent: orchestration.parentTaskCount, delegated: orchestration.delegatedTaskCount, total: orchestration.parentTaskCount + orchestration.delegatedTaskCount },
    mutationCallCounts: { parent: orchestration.parentMutationCalls, delegated: orchestration.delegatedMutationCalls, total: totalMutationCalls },
    parentRetainedModificationShare: shareAvailable ? { availability: 'available', value: parentShare, denominatorMutationCalls: totalMutationCalls } : { availability: 'unavailable', denominatorMutationCalls: 0 },
    delegationObserved,
    elevatedParentRetentionProxy: { observed: shareAvailable && totalMutationCalls >= 10 && parentShare >= 0.8, minimumMutationCalls: 10, minimumParentShare: 0.8 }
  });
}

function validateOrchestrationAssessment(assessment, allowedEvidenceReferences) {
  plainObject(assessment, 'Semantic orchestrationAssessment');
  if (!ORCHESTRATION_OUTCOMES.includes(assessment.outcome)) throw new Error(`Semantic orchestrationAssessment outcome must be one of: ${ORCHESTRATION_OUTCOMES.join(', ')}`);
  requiredText(assessment.summary, 'Semantic orchestrationAssessment summary');
  requiredText(assessment.uncertainty, 'Semantic orchestrationAssessment uncertainty');
  if (!Array.isArray(assessment.evidenceReferences) || !assessment.evidenceReferences.length || assessment.evidenceReferences.some((reference) => typeof reference !== 'string' || !reference.trim())) throw new Error('Semantic orchestrationAssessment requires evidenceReferences');
  if (allowedEvidenceReferences !== undefined) {
    const allowed = new Set(allowedEvidenceReferences);
    if (assessment.evidenceReferences.some((reference) => !allowed.has(reference))) throw new Error('Semantic orchestrationAssessment contains an unknown evidence reference');
  }
}

function validateModelRoutingAssessment(assessment, allowedEvidenceReferences, allowedTelemetryReferences) {
  plainObject(assessment, 'Semantic modelRoutingAssessment');
  rejectUnknown(assessment, ['outcome', 'taskCondition', 'summary', 'uncertainty', 'evidenceReferences', 'telemetryReferences', 'attributions'], 'Semantic modelRoutingAssessment');
  if (!MODEL_ROUTING_OUTCOMES.includes(assessment.outcome)) throw new Error(`Semantic modelRoutingAssessment outcome must be one of: ${MODEL_ROUTING_OUTCOMES.join(', ')}`);
  for (const [field, label] of [['taskCondition', 'taskCondition'], ['summary', 'summary'], ['uncertainty', 'uncertainty']]) requiredText(assessment[field], `Semantic modelRoutingAssessment ${label}`);
  validateAllowedReferences(assessment.evidenceReferences, allowedEvidenceReferences, 'Semantic modelRoutingAssessment evidence', true);
  validateAllowedReferences(assessment.telemetryReferences, allowedTelemetryReferences, 'Semantic modelRoutingAssessment telemetry', false);
  if (assessment.attributions !== undefined) {
    if (!Array.isArray(assessment.attributions)) throw new Error('Semantic modelRoutingAssessment attributions must be an array');
    for (const [index, attribution] of assessment.attributions.entries()) {
      const where = `Semantic modelRoutingAssessment attributions[${index}]`;
      plainObject(attribution, where);
      rejectUnknown(attribution, ['kind', 'category', 'targetType', 'target', 'confidence', 'summary', 'evidenceReferences', 'telemetryReferences'], where);
      boundedEnum(attribution.kind, new Set(['failure', 'cause']), `${where}.kind`);
      boundedEnum(attribution.category, new Set(FAILURE_CATEGORIES), `${where}.category`);
      boundedEnum(attribution.targetType, ATTRIBUTION_TARGETS, `${where}.targetType`);
      safeText(attribution.target, `${where}.target`, 160, true);
      boundedEnum(attribution.confidence, ATTRIBUTION_CONFIDENCE, `${where}.confidence`);
      requiredText(attribution.summary, `${where}.summary`);
      validateAllowedReferences(attribution.evidenceReferences, allowedEvidenceReferences, `${where} evidence`, true);
      validateAllowedReferences(attribution.telemetryReferences, allowedTelemetryReferences, `${where} telemetry`, false);
    }
  }
}

function validateSignals(signals, allowedEvidenceReferences) {
  if (signals.length > 50) throw new Error('Semantic signals must contain at most 50 items');
  const normalized = [];
  for (const [index, signal] of signals.entries()) {
    const where = `Semantic signal[${index}]`;
    plainObject(signal, where);
    rejectUnknown(signal, ['key', 'type', 'text', 'summary', 'taskCondition', 'evidenceReferences'], where);
    const result = {};
    if (signal.key !== undefined) result.key = safeText(signal.key, `${where}.key`, 160, true);
    if (signal.type !== undefined) result.type = boundedEnum(signal.type, SIGNAL_TYPES, `${where}.type`);
    for (const field of ['text', 'summary']) if (signal[field] !== undefined) result[field] = safeText(signal[field], `${where}.${field}`, 2000, true);
    if (result.type === 'routing-policy') result.taskCondition = safeText(signal.taskCondition, `${where}.taskCondition`, 500, true);
    else if (signal.taskCondition !== undefined) result.taskCondition = safeText(signal.taskCondition, `${where}.taskCondition`, 500, true);
    if (signal.evidenceReferences !== undefined) {
      result.evidenceReferences = normalizeReferences(signal.evidenceReferences, `${where}.evidenceReferences`);
      validateAllowedReferences(result.evidenceReferences, allowedEvidenceReferences, `${where} evidence`, false);
    }
    if (!result.key && !result.type && !result.text && !result.summary) throw new Error(`${where} requires key, type, text, or summary`);
    normalized.push(compact(result));
  }
  return normalized;
}

export function projectSemanticObservation(semantic) {
  return compact({
    objective: semantic.objective, summary: semantic.summary, actions: values(semantic.actions), decisions: values(semantic.decisions), approaches: values(semantic.approaches), failures: values(semantic.failures), recoveries: values(semantic.recoveries), verification: semantic.verification, interventions: values(semantic.interventions), autonomyBlocks: values(semantic.autonomyBlocks), friction: values(semantic.friction), discoveries: values(semantic.discoveries), modelUsage: semantic.modelUsage, observations: values(semantic.observations), signals: values(semantic.signals), orchestrationAssessment: semantic.orchestrationAssessment, modelRoutingAssessment: semantic.modelRoutingAssessment, confidence: semantic.confidence,
    semanticObservation: { schema: SEMANTIC_SCHEMA, status: semantic.status, completedAt: semantic.completedAt || new Date().toISOString() }
  });
}

export function telemetryReferenceIds(telemetry) {
  if (!telemetry || telemetry.availability !== 'available') return [];
  return ['sessions', 'invocations', 'failures', 'transitions'].flatMap((field) => values(telemetry[field]).map((record) => record.id));
}

function normalizeMeasurements(raw, fields, where) {
  if (raw === undefined || raw === null) return unavailableMeasurements(fields);
  plainObject(raw, where);
  rejectUnknown(raw, fields, where);
  return Object.fromEntries(fields.map((field) => [field, measurement(raw[field], `${where}.${field}`, true)]));
}
function unavailableMeasurements(fields) { return Object.fromEntries(fields.map((field) => [field, { availability: 'unavailable', reason: 'not-supplied' }])); }
function measurement(value, where, integer = false) {
  if (value === undefined || value === null) return { availability: 'unavailable', reason: 'not-supplied' };
  boundedNumber(value, where, 0, undefined, integer);
  return { availability: 'available', value };
}
function durationMeasurement(value, startedAt, finishedAt, where) {
  if (value !== undefined && value !== null) return { ...measurement(value, where), basis: 'runtime-reported' };
  if (startedAt !== undefined && finishedAt !== undefined) {
    optionalTimestamp(startedAt, `${where}.startedAt`); optionalTimestamp(finishedAt, `${where}.finishedAt`);
    const duration = Date.parse(finishedAt) - Date.parse(startedAt);
    if (duration < 0) throw new Error(`${where} timestamps produce a negative duration`);
    return { availability: 'available', value: duration, basis: 'timestamps-derived' };
  }
  return { availability: 'unavailable', reason: 'duration-and-complete-timestamps-not-supplied' };
}
function valueOf(measurementValue) { return measurementValue?.availability === 'available' ? measurementValue.value : undefined; }
function optionalTimestamp(value, where) { if (value === undefined) return undefined; if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error(`${where} must be an ISO-compatible timestamp`); return value; }
function boundedNumber(value, where, minimum, maximum, integer = false) { if (!Number.isFinite(value) || value < minimum || (maximum !== undefined && value > maximum) || (integer && !Number.isInteger(value))) throw new Error(`${where} must be ${integer ? 'an integer ' : ''}between ${minimum} and ${maximum ?? 'infinity'}`); return value; }
function requiredText(value, label) { if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`); if (value.length > 2000) throw new Error(`${label} exceeds 2000 characters`); return value; }
function safeText(value, where, maximum, required = false) { if (value === undefined && !required) return undefined; if (typeof value !== 'string' || (required && !value.trim()) || value.length > maximum || /[\r\n\0]/.test(value)) throw new Error(`${where} must be a safe string of at most ${maximum} characters`); return value; }
function boundedEnum(value, allowed, where) { if (!allowed.has(value)) throw new Error(`${where} must be one of: ${[...allowed].join(', ')}`); return value; }
function plainObject(value, where) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${where} must be an object`); }
function rejectUnknown(value, allowed, where) { const unknown = Object.keys(value).filter((key) => !allowed.includes(key)); if (unknown.length) throw new Error(`${where} contains unsupported or unsafe fields: ${unknown.join(', ')}`); }
function normalizeReferences(references, where) { if (references === undefined) return undefined; if (!Array.isArray(references) || references.length > 50) throw new Error(`${where} must be an array of at most 50 safe references`); return references.map((reference, index) => safeText(reference, `${where}[${index}]`, 500, true)); }
function validateAllowedReferences(references, allowedReferences, where, requireOne) { if (!Array.isArray(references) || (requireOne && !references.length) || references.some((reference) => typeof reference !== 'string' || !reference.trim())) throw new Error(`${where} requires ${requireOne ? 'one or more ' : ''}references`); if (allowedReferences !== undefined) { const allowed = new Set(allowedReferences); if (references.some((reference) => !allowed.has(reference))) throw new Error(`${where} contains an unknown reference`); } }

function compareCodePoints(left, right) {
  const a = Array.from(String(left));
  const b = Array.from(String(right));
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    const difference = a[index].codePointAt(0) - b[index].codePointAt(0);
    if (difference) return difference;
  }
  return a.length - b.length;
}

function compact(value) {
  if (Array.isArray(value)) return value.length ? value.map(compact) : undefined;
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) { const clean = compact(child); if (clean !== undefined && clean !== null && clean !== '') result[key] = clean; }
  return result;
}
