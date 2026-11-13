import { pipelineEventEmit } from "./pipeline_runtime.js?rev=6e6ab0f635c5";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
