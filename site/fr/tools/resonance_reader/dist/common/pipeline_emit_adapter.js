import { pipelineEventEmit } from "./pipeline_runtime.js?rev=9b7373dc94f1";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
