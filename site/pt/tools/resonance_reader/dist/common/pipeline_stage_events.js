import { pipelineEventEmit } from "./pipeline_runtime.js?rev=7157ade1c3cc";
export function pipelineStageStartedEmit(emit, runId, stageId) {
    pipelineEventEmit(emit, "stage.started", runId, { stage: stageId }, stageId);
}
export function pipelineStageCompletedEmit(emit, runId, stageId, payload = {}) {
    pipelineEventEmit(emit, "stage.completed", runId, { stage: stageId, ...payload }, stageId);
}
