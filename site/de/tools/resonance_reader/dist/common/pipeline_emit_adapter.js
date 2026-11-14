import { pipelineEventEmit } from "./pipeline_runtime.js?rev=1f0fca766fb9";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
