import { pipelineEventEmit } from "./pipeline_runtime.js?rev=c40b9f2c1b26";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
