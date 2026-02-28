import { pipelineEventEmit, type PipelineRuntimeEmit } from "./pipeline_runtime.js";

export function pipelineStageStartedEmit(
  emit: PipelineRuntimeEmit,
  runId: string,
  stageId: string,
): void {
  pipelineEventEmit(emit, "stage.started", runId, { stage: stageId }, stageId);
}

export function pipelineStageCompletedEmit(
  emit: PipelineRuntimeEmit,
  runId: string,
  stageId: string,
  payload: Record<string, unknown> = {},
): void {
  pipelineEventEmit(emit, "stage.completed", runId, { stage: stageId, ...payload }, stageId);
}
