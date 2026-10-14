export function pipelineRunIdBuild(prefix) {
    const timestamp = Date.now().toString(36);
    const entropy = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${timestamp}_${entropy}`;
}
export function pipelineEventBuild(eventType, runId, payload, stageId) {
    return {
        eventId: pipelineEventIdBuild(runId),
        eventType,
        timestampIso: new Date().toISOString(),
        runId,
        stageId,
        payload,
    };
}
function pipelineEventIdBuild(runId) {
    return `${runId}_${Math.random().toString(36).slice(2, 8)}`;
}
export function pipelineEventEmit(emit, eventType, runId, payload, stageId) {
    emit(pipelineEventBuild(eventType, runId, payload, stageId));
}
export function pipelineStageIdsResolveFromConfig(config, defaultStageIds) {
    const parsed = config;
    if (!parsed.useStageList || !Array.isArray(parsed.stages) || !parsed.stages.length) {
        return defaultStageIds;
    }
    const allowed = new Set(defaultStageIds);
    return parsed.stages.filter((stage) => allowed.has(stage));
}
