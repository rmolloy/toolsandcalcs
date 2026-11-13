import { pipelineEventEmit } from "./pipeline_runtime.js?rev=7157ade1c3cc";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
