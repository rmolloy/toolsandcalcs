export function pipelineStageTimingEmitWithCaptureBuild(emit, now = Date.now, log = () => undefined) {
    const stageStartMsById = new Map();
    return (event) => {
        pipelineStageTimingCapture(stageStartMsById, event, now, log);
        emit(event);
    };
}
function pipelineStageTimingCapture(stageStartMsById, event, now, log) {
    const stageId = pipelineStageTimingStageIdResolve(event);
    if (!stageId)
        return;
    if (event.eventType === "stage.started") {
        stageStartMsById.set(stageId, now());
        return;
    }
    if (event.eventType !== "stage.completed")
        return;
    const startMs = stageStartMsById.get(stageId);
    if (typeof startMs !== "number" || !Number.isFinite(startMs))
        return;
    log(stageId, now() - startMs);
}
function pipelineStageTimingStageIdResolve(event) {
    const payloadStage = event.payload?.stage;
    return event.stageId || payloadStage || null;
}
