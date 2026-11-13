import { pipelineEventEmit } from "./pipeline_runtime.js?rev=a5f15a6afb2b";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
