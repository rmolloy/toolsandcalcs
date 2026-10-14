import { pipelineEventEmit } from "./pipeline_runtime.js?rev=88a3838e0e5a";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
