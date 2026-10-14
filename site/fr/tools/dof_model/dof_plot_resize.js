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
    exports.readDofPlotContainerWidth = readDofPlotContainerWidth;
    exports.readDofPlotGraphWidth = readDofPlotGraphWidth;
    exports.dofPlotNeedsResize = dofPlotNeedsResize;
    exports.applyDofPlotResize = applyDofPlotResize;
    const DOF_PLOT_RESIZE_TOLERANCE_PX = 1;
    function readDofPlotContainerWidth(plotElement) {
        var _a, _b, _c;
        const width = (_c = (_b = (_a = plotElement === null || plotElement === void 0 ? void 0 : plotElement.getBoundingClientRect) === null || _a === void 0 ? void 0 : _a.call(plotElement).width) !== null && _b !== void 0 ? _b : plotElement === null || plotElement === void 0 ? void 0 : plotElement.clientWidth) !== null && _c !== void 0 ? _c : null;
        return normalizeDofPlotWidth(width);
    }
    function readDofPlotGraphWidth(plotElement) {
        var _a, _b;
        return normalizeDofPlotWidth((_b = (_a = plotElement === null || plotElement === void 0 ? void 0 : plotElement._fullLayout) === null || _a === void 0 ? void 0 : _a.width) !== null && _b !== void 0 ? _b : null);
    }
    function dofPlotNeedsResize(plotElement) {
        const containerWidth = readDofPlotContainerWidth(plotElement);
        const graphWidth = readDofPlotGraphWidth(plotElement);
        if (containerWidth === null || graphWidth === null)
            return false;
        return Math.abs(containerWidth - graphWidth) > DOF_PLOT_RESIZE_TOLERANCE_PX;
    }
    function applyDofPlotResize(plotly, plotElement) {
        var _a;
        if (!dofPlotNeedsResize(plotElement))
            return Promise.resolve(false);
        const width = readDofPlotContainerWidth(plotElement);
        const resize = (_a = plotly === null || plotly === void 0 ? void 0 : plotly.Plots) === null || _a === void 0 ? void 0 : _a.resize;
        if (typeof resize === "function") {
            return Promise.resolve(resize(plotElement)).then(() => true);
        }
        if (typeof (plotly === null || plotly === void 0 ? void 0 : plotly.relayout) === "function") {
            return Promise.resolve(plotly.relayout(plotElement, { width })).then(() => true);
        }
        return Promise.resolve(false);
    }
    function normalizeDofPlotWidth(width) {
        return typeof width === "number" && Number.isFinite(width) && width > 0
            ? width
            : null;
    }
});
