import { pipelineEventEmit } from "./pipeline_runtime.js?rev=b5b8fa4adb00";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
