import { pipelineEventEmit } from "./pipeline_runtime.js?rev=a9c4c0145336";
export function pipelineStageStartedEmit(emit, runId, stageId) {
    pipelineEventEmit(emit, "stage.started", runId, { stage: stageId }, stageId);
}
export function pipelineStageCompletedEmit(emit, runId, stageId, payload = {}) {
    pipelineEventEmit(emit, "stage.completed", runId, { stage: stageId, ...payload }, stageId);
}
