(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pipelineRuntimeEventForwardToBus = pipelineRuntimeEventForwardToBus;
    function pipelineRuntimePayloadBuild(event) {
        return {
            ...event.payload,
            runId: event.runId,
            stageId: event.stageId,
        };
    }
    function pipelineRuntimeEventForwardToBus(bus, event) {
        void bus.emit("pipeline.event", {
            eventType: event.eventType,
            runId: event.runId,
            stageId: event.stageId,
            payload: event.payload,
        });
        void bus.emit(event.eventType, pipelineRuntimePayloadBuild(event));
    }
});
