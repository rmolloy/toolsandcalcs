function pipelineRuntimePayloadBuild(event) {
    return {
        ...event.payload,
        runId: event.runId,
        stageId: event.stageId,
    };
}
export function pipelineRuntimeEventForwardToBus(bus, event) {
    void bus.emit("pipeline.event", {
        eventType: event.eventType,
        runId: event.runId,
        stageId: event.stageId,
        payload: event.payload,
    });
    void bus.emit(event.eventType, pipelineRuntimePayloadBuild(event));
}
