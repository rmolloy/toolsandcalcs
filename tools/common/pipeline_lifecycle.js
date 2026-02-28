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
    exports.pipelineRunWithLifecycle = pipelineRunWithLifecycle;
    const pipeline_runtime_js_1 = require("./pipeline_runtime.js");
    async function pipelineRunWithLifecycle({ runIdPrefix, input, config, emit, run, }) {
        const runId = (0, pipeline_runtime_js_1.pipelineRunIdBuild)(runIdPrefix);
        (0, pipeline_runtime_js_1.pipelineEventEmit)(emit, "pipeline.started", runId, { input, config });
        try {
            await run(runId);
            (0, pipeline_runtime_js_1.pipelineEventEmit)(emit, "pipeline.completed", runId, { summary: { trigger: (input === null || input === void 0 ? void 0 : input.trigger) || null } });
        }
        catch (error) {
            (0, pipeline_runtime_js_1.pipelineEventEmit)(emit, "pipeline.failed", runId, { error: String(error) });
            throw error;
        }
    }
});
