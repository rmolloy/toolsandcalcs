import { pipelineEventEmit } from "./pipeline_runtime.js?rev=69c2b05b3eb6";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
