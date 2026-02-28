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
    exports.pipelineRunIdBuild = pipelineRunIdBuild;
    exports.pipelineEventBuild = pipelineEventBuild;
    exports.pipelineEventEmit = pipelineEventEmit;
    exports.pipelineStageIdsResolveFromConfig = pipelineStageIdsResolveFromConfig;
    function pipelineRunIdBuild(prefix) {
        const timestamp = Date.now().toString(36);
        const entropy = Math.random().toString(36).slice(2, 8);
        return `${prefix}_${timestamp}_${entropy}`;
    }
    function pipelineEventBuild(eventType, runId, payload, stageId) {
        return {
            eventId: pipelineEventIdBuild(runId),
            eventType,
            timestampIso: new Date().toISOString(),
            runId,
            stageId,
            payload,
        };
    }
    function pipelineEventIdBuild(runId) {
        return `${runId}_${Math.random().toString(36).slice(2, 8)}`;
    }
    function pipelineEventEmit(emit, eventType, runId, payload, stageId) {
        emit(pipelineEventBuild(eventType, runId, payload, stageId));
    }
    function pipelineStageIdsResolveFromConfig(config, defaultStageIds) {
        const parsed = config;
        if (!parsed.useStageList || !Array.isArray(parsed.stages) || !parsed.stages.length) {
            return defaultStageIds;
        }
        const allowed = new Set(defaultStageIds);
        return parsed.stages.filter((stage) => allowed.has(stage));
    }
});
