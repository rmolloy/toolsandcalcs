import { pipelineEventEmit } from "./pipeline_runtime.js?rev=1d50c39bd456";
export function pipelineStageStartedEmit(emit, runId, stageId) {
    pipelineEventEmit(emit, "stage.started", runId, { stage: stageId }, stageId);
}
export function pipelineStageCompletedEmit(emit, runId, stageId, payload = {}) {
    pipelineEventEmit(emit, "stage.completed", runId, { stage: stageId, ...payload }, stageId);
}
