import { pipelineEventEmit } from "./pipeline_runtime.js?rev=7cd6e97dd9da";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
