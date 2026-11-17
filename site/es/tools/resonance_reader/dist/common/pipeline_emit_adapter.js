import { pipelineEventEmit } from "./pipeline_runtime.js?rev=a9c4c0145336";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
