import type { PipelineBus } from "./pipeline_bus.js";
import type { PipelineRuntimeEvent } from "./pipeline_runtime.js";

function pipelineRuntimePayloadBuild(event: PipelineRuntimeEvent) {
  return {
    ...event.payload,
    runId: event.runId,
    stageId: event.stageId,
  };
}

export function pipelineRuntimeEventForwardToBus(
  bus: PipelineBus,
  event: PipelineRuntimeEvent,
): void {
  void bus.emit("pipeline.event", {
    eventType: event.eventType,
    runId: event.runId,
    stageId: event.stageId,
    payload: event.payload,
  });
  void bus.emit(event.eventType, pipelineRuntimePayloadBuild(event));
}
