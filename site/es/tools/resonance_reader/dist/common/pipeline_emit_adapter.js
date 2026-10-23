import { pipelineEventEmit } from "./pipeline_runtime.js?rev=3d07b6bb6d26";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
