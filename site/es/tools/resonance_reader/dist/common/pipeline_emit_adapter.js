import { pipelineEventEmit } from "./pipeline_runtime.js?rev=c46dc1d6973b";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
