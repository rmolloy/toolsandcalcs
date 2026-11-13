import { pipelineEventEmit } from "./pipeline_runtime.js?rev=d1d4f852375a";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
