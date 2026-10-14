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
    exports.pipelineRunCoalescedTriggerBuild = pipelineRunCoalescedTriggerBuild;
    function pipelineRunCoalescedTriggerBuild(run) {
        let active = false;
        let queuedTrigger = null;
        return async (trigger) => {
            if (active) {
                queuedTrigger = trigger;
                return;
            }
            active = true;
            try {
                await run(trigger);
                const queued = queuedTrigger;
                queuedTrigger = null;
                if (!queued)
                    return;
                await run(queued);
            }
            finally {
                active = false;
            }
        };
    }
});
