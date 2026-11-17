import { pipelineEventEmit } from "./pipeline_runtime.js?rev=287f3b1752f9";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
