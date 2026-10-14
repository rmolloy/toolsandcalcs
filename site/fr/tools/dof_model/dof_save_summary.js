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
        { key: "air", label: "Air T(1,1)₁", messageKey: "airModeLabel" },
        { key: "top", label: "Top T(1,1)₂", messageKey: "topModeLabel" },
        { key: "back", label: "Back T(1,1)₃", messageKey: "backModeLabel" },
    ];
    function dofSaveSummaryBuild(args) {
        return [
            modelRow(args.modelOrder, args.taskMode, args.messages),
            ...peakRows(args.peaks, args.messages),
        ];
    }
    function modelRow(modelOrder, taskMode, messages) {
        const order = Number.isFinite(Number(modelOrder)) && Number(modelOrder) > 0 ? Number(modelOrder) : 4;
        return {
            label: messageValueRead(messages === null || messages === void 0 ? void 0 : messages.modelLabel, "Model"),
            value: modelValueRead(order, taskMode, messages),
        };
    }
    function messageValueRead(candidate, fallback) {
        return typeof candidate === "string" && candidate.trim() ? candidate : fallback;
    }
    function modelValueRead(order, taskMode, messages) {
        if (String(taskMode || "") !== "fit")
            return `${order}-DOF`;
        return messageValueRead(messages === null || messages === void 0 ? void 0 : messages.fittedModelValueTemplate, "{order}-DOF · fitted to targets").replace("{order}", String(order));
    }
    function peakRows(peaks, messages) {
        if (!peaks)
            return [];
        return MODE_ROWS
            .filter((row) => Number.isFinite(Number(peaks[row.key])) && Number(peaks[row.key]) > 0)
            .map((row) => ({
            label: peakRowLabelRead(row, messages),
            value: `${Number(peaks[row.key]).toFixed(1)} Hz`,
            provenance: messageValueRead(messages === null || messages === void 0 ? void 0 : messages.modeledProvenance, "modeled"),
        }));
    }
    function peakRowLabelRead(row, messages) {
        if (!row.messageKey)
            return row.label;
        return messageValueRead(messages === null || messages === void 0 ? void 0 : messages[row.messageKey], row.label);
    }
});
