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
    exports.readDofPlotAxes = readDofPlotAxes;
    exports.readDofAxisRange = readDofAxisRange;
    exports.readDofPointerFrequency = readDofPointerFrequency;
    exports.readDofPointerLevel = readDofPointerLevel;
    function readDofPlotAxes(plotElement) {
        const layout = plotElement._fullLayout;
        const xaxis = layout === null || layout === void 0 ? void 0 : layout.xaxis;
        const yaxis = layout === null || layout === void 0 ? void 0 : layout.yaxis;
        if (!xaxis
            || !yaxis
            || typeof xaxis.l2p !== "function"
            || typeof yaxis.l2p !== "function") {
            return null;
        }
        return { xaxis, yaxis };
    }
    function readDofAxisRange(xaxis) {
        if (Array.isArray(xaxis === null || xaxis === void 0 ? void 0 : xaxis.range) && xaxis.range.length === 2) {
            return [
                Math.min(xaxis.range[0], xaxis.range[1]),
                Math.max(xaxis.range[0], xaxis.range[1]),
            ];
        }
        return [50, 500];
    }
    function readDofPointerFrequency(event, plotElement) {
        const axes = readDofPlotAxes(plotElement);
        if (!axes || typeof axes.xaxis.p2l !== "function")
            return null;
        const rect = plotElement.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const plotX = localX - (axes.xaxis._offset || 0);
        const clampedPlotX = Math.max(0, Math.min(axes.xaxis._length || 0, plotX));
        const frequency = axes.xaxis.p2l(clampedPlotX);
        if (!Number.isFinite(frequency))
            return null;
        const [minimum, maximum] = readDofAxisRange(axes.xaxis);
        return Math.max(minimum, Math.min(maximum, frequency));
    }
    function readDofPointerLevel(event, plotElement) {
        const axes = readDofPlotAxes(plotElement);
        if (!axes || typeof axes.yaxis.p2l !== "function")
            return null;
        const rect = plotElement.getBoundingClientRect();
        const localY = event.clientY - rect.top;
        const plotY = localY - (axes.yaxis._offset || 0);
        const clampedPlotY = Math.max(0, Math.min(axes.yaxis._length || 0, plotY));
        const level = axes.yaxis.p2l(clampedPlotY);
        if (!Number.isFinite(level))
            return null;
        const [minimum, maximum] = readDofAxisRange(axes.yaxis);
        return Math.max(minimum, Math.min(maximum, level));
    }
});
