import { pipelineEventEmit } from "./pipeline_runtime.js?rev=886d77f4e6db";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
