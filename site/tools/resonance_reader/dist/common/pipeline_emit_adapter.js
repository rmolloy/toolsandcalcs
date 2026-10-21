import { pipelineEventEmit } from "./pipeline_runtime.js?rev=4a9544c40f78";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
