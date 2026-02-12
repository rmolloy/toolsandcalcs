function pipelineEventEmitToBus(eventType, payload, opts) {
    const bus = window.ResonatePipelineBus;
    if (typeof bus?.emit !== "function")
        return false;
    void bus.emit(eventType, { ...payload, stageId: opts.stageId });
    return true;
}
export function pipelineEventEmit(eventType, payload, opts = {}) {
    return pipelineEventEmitToBus(eventType, payload, opts);
}
