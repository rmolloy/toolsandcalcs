import { pipelineEventEmit } from "./pipeline_runtime.js?rev=886d77f4e6db";
export function pipelineStageStartedEmit(emit, runId, stageId) {
    pipelineEventEmit(emit, "stage.started", runId, { stage: stageId }, stageId);
}
export function pipelineStageCompletedEmit(emit, runId, stageId, payload = {}) {
    pipelineEventEmit(emit, "stage.completed", runId, { stage: stageId, ...payload }, stageId);
}
