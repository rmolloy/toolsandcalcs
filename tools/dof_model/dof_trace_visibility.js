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
    exports.DOF_TRACE_DEFAULT_VISIBLE = void 0;
    exports.isDofTraceName = isDofTraceName;
    exports.readDofTraceVisibleValue = readDofTraceVisibleValue;
    exports.applyDofTraceVisibility = applyDofTraceVisibility;
    exports.syncDofTraceVisibilityStateFromPlot = syncDofTraceVisibilityStateFromPlot;
    exports.DOF_TRACE_DEFAULT_VISIBLE = {
        Current: true,
        Target: true,
        Top: false,
        Air: false,
        Back: false,
        Sides: false,
    };
    function isDofTraceName(value) {
        return typeof value === "string" && value in exports.DOF_TRACE_DEFAULT_VISIBLE;
    }
    function readDofTraceVisibleValue(name, state) {
        const visible = state[name];
        const fallback = exports.DOF_TRACE_DEFAULT_VISIBLE[name];
        return (visible !== null && visible !== void 0 ? visible : fallback) ? true : "legendonly";
    }
    function applyDofTraceVisibility(trace, name, state) {
        if (!trace)
            return;
        trace.visible = readDofTraceVisibleValue(name, state);
    }
    function syncDofTraceVisibilityStateFromPlot(plot, state) {
        const traces = plot.data;
        if (!Array.isArray(traces))
            return;
        const nextState = {};
        traces.forEach((trace) => {
            var _a;
            const name = trace === null || trace === void 0 ? void 0 : trace.name;
            if (!isDofTraceName(name))
                return;
            const isVisible = trace.visible === undefined || trace.visible === true;
            nextState[name] = ((_a = nextState[name]) !== null && _a !== void 0 ? _a : false) || isVisible;
        });
        Object.keys(nextState).forEach((name) => {
            if (!isDofTraceName(name))
                return;
            state[name] = Boolean(nextState[name]);
        });
    }
});
