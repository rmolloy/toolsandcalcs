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
    exports.dofSaveSummaryBuild = dofSaveSummaryBuild;
    const MODE_ROWS = [
        { key: "air", label: "Air T(1,1)₁" },
        { key: "top", label: "Top T(1,1)₂" },
        { key: "back", label: "Back T(1,1)₃" },
    ];
    function dofSaveSummaryBuild(args) {
        return [modelRow(args.modelOrder, args.taskMode), ...peakRows(args.peaks)];
    }
    function modelRow(modelOrder, taskMode) {
        const order = Number.isFinite(Number(modelOrder)) && Number(modelOrder) > 0 ? Number(modelOrder) : 4;
        return { label: "Model", value: `${order}-DOF${taskModeSuffix(taskMode)}` };
    }
    function taskModeSuffix(taskMode) {
        return String(taskMode || "") === "fit" ? " · fitted to targets" : "";
    }
    function peakRows(peaks) {
        if (!peaks)
            return [];
        return MODE_ROWS
            .filter((row) => Number.isFinite(Number(peaks[row.key])) && Number(peaks[row.key]) > 0)
            .map((row) => ({
            label: row.label,
            value: `${Number(peaks[row.key]).toFixed(1)} Hz`,
            provenance: "modeled",
        }));
    }
});
