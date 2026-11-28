import { pipelineEventEmit } from "./pipeline_runtime.js?rev=5cd466ecbcb0";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
