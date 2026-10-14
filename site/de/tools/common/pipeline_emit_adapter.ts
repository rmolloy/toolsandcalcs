import { pipelineEventEmit, type PipelineRuntimeEmit } from "./pipeline_runtime.js";

export function pipelineEmitAdapterBuild(emit: PipelineRuntimeEmit) {
  return (
    eventType: string,
    runId: string,
    payload: Record<string, unknown>,
    stageId?: string,
  ) => {
    pipelineEventEmit(emit, eventType, runId, payload, stageId);
  };
}
