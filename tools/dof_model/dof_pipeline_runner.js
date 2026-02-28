(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "../common/pipeline_runtime.js", "../common/pipeline_stage_executor.js", "../common/pipeline_lifecycle.js", "../common/pipeline_stage_events.js"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.dofPipelineRunnerRun = dofPipelineRunnerRun;
    const pipeline_runtime_js_1 = require("../common/pipeline_runtime.js");
    const pipeline_stage_executor_js_1 = require("../common/pipeline_stage_executor.js");
    const pipeline_lifecycle_js_1 = require("../common/pipeline_lifecycle.js");
    const pipeline_stage_events_js_1 = require("../common/pipeline_stage_events.js");
    async function dofPipelineRunnerRun(input, config, emit, deps) {
        await (0, pipeline_lifecycle_js_1.pipelineRunWithLifecycle)({
            runIdPrefix: "dof",
            input,
            config,
            emit,
            run: async (runId) => {
                const handlers = dofPipelineStageHandlersBuild(runId, emit, deps);
                const stageIds = (0, pipeline_runtime_js_1.pipelineStageIdsResolveFromConfig)(config, dofPipelineStageIdsDefaultBuild());
                await (0, pipeline_stage_executor_js_1.pipelineStageIdsExecuteSequential)(stageIds, async (stageId) => {
                    await dofPipelineStageRunById(stageId, handlers);
                });
            },
        });
    }
    function dofPipelineStageIdsDefaultBuild() {
        return ["refresh"];
    }
    async function dofPipelineStageRunById(stageId, handlers) {
        await handlers[stageId]();
    }
    function dofPipelineStageHandlersBuild(runId, emit, deps) {
        return {
            refresh: () => dofPipelineStageRefreshRun(runId, emit, deps),
        };
    }
    async function dofPipelineStageRefreshRun(runId, emit, deps) {
        (0, pipeline_stage_events_js_1.pipelineStageStartedEmit)(emit, runId, "refresh");
        await deps.refresh();
        (0, pipeline_stage_events_js_1.pipelineStageCompletedEmit)(emit, runId, "refresh");
    }
});
