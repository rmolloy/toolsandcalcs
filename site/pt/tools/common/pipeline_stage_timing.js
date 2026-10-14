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
    exports.pipelineStageTimingEmitWithCaptureBuild = pipelineStageTimingEmitWithCaptureBuild;
    function pipelineStageTimingEmitWithCaptureBuild(emit, now = Date.now, log = () => undefined) {
        const stageStartMsById = new Map();
        return (event) => {
            pipelineStageTimingCapture(stageStartMsById, event, now, log);
            emit(event);
        };
    }
    function pipelineStageTimingCapture(stageStartMsById, event, now, log) {
        const stageId = pipelineStageTimingStageIdResolve(event);
        if (!stageId)
            return;
        if (event.eventType === "stage.started") {
            stageStartMsById.set(stageId, now());
            return;
        }
        if (event.eventType !== "stage.completed")
            return;
        const startMs = stageStartMsById.get(stageId);
        if (typeof startMs !== "number" || !Number.isFinite(startMs))
            return;
        log(stageId, now() - startMs);
    }
    function pipelineStageTimingStageIdResolve(event) {
        var _a;
        const payloadStage = (_a = event.payload) === null || _a === void 0 ? void 0 : _a.stage;
        return event.stageId || payloadStage || null;
    }
});
