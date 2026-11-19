import { pipelineEventEmit } from "./pipeline_runtime.js?rev=8d6b00dea0a7";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
