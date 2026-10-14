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
    exports.pipelineEmitAdapterBuild = pipelineEmitAdapterBuild;
    const pipeline_runtime_js_1 = require("./pipeline_runtime.js");
    function pipelineEmitAdapterBuild(emit) {
        return (eventType, runId, payload, stageId) => {
            (0, pipeline_runtime_js_1.pipelineEventEmit)(emit, eventType, runId, payload, stageId);
        };
    }
});
