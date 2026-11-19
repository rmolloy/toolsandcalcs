import { pipelineEventEmit } from "./pipeline_runtime.js?rev=2f4a6c9dc10d";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
