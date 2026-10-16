import { pipelineEventEmit } from "./pipeline_runtime.js?rev=3f87131f64e6";
export function pipelineEmitAdapterBuild(emit) {
    return (eventType, runId, payload, stageId) => {
        pipelineEventEmit(emit, eventType, runId, payload, stageId);
    };
}
