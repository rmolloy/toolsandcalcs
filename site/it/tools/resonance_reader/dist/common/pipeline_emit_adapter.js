import { pipelineEventEmit } from "./pipeline_runtime.js?rev=b6ec15c45357";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
