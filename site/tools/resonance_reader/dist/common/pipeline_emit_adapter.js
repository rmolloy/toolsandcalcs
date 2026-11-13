import { pipelineEventEmit } from "./pipeline_runtime.js?rev=8974cca7f62c";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
