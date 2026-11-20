import { pipelineEventEmit } from "./pipeline_runtime.js?rev=e906c8d81506";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
