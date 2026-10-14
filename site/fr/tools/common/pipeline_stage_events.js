(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./pipeline_runtime.js"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pipelineStageStartedEmit = pipelineStageStartedEmit;
    exports.pipelineStageCompletedEmit = pipelineStageCompletedEmit;
    const pipeline_runtime_js_1 = require("./pipeline_runtime.js");
    function pipelineStageStartedEmit(emit, runId, stageId) {
        (0, pipeline_runtime_js_1.pipelineEventEmit)(emit, "stage.started", runId, { stage: stageId }, stageId);
    }
    function pipelineStageCompletedEmit(emit, runId, stageId, payload = {}) {
        (0, pipeline_runtime_js_1.pipelineEventEmit)(emit, "stage.completed", runId, { stage: stageId, ...payload }, stageId);
    }
});
