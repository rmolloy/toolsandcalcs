import { pipelineEventEmit } from "./pipeline_runtime.js?rev=2c871654a0c5";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
