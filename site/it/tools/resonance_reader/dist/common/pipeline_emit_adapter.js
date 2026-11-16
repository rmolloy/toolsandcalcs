import { pipelineEventEmit } from "./pipeline_runtime.js?rev=e0bd2386cdc0";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
