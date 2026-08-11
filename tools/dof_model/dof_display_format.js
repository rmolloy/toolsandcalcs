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
    exports.colorWithAlpha = colorWithAlpha;
    exports.sliderFillPercent = sliderFillPercent;
    exports.decimalPlacesFromStep = decimalPlacesFromStep;
    exports.formatOverlayDisplayValue = formatOverlayDisplayValue;
    exports.buildDofOverlayPresentation = buildDofOverlayPresentation;
    function colorWithAlpha(color, alpha) {
        const hex = color.trim().replace(/^#/, "");
        if (/^[0-9a-fA-F]{3}$/.test(hex)) {
            const r = parseInt(`${hex[0]}${hex[0]}`, 16);
            const g = parseInt(`${hex[1]}${hex[1]}`, 16);
            const b = parseInt(`${hex[2]}${hex[2]}`, 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        if (/^[0-9a-fA-F]{6}$/.test(hex)) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        const rgb = color.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
        if (rgb)
            return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
        const rgba = color.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*[\d.]+\s*\)$/i);
        if (rgba)
            return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${alpha})`;
        return color;
    }
    function sliderFillPercent(slider, value) {
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min)
            return 0;
        const normalized = (value - min) / (max - min);
        return Math.max(0, Math.min(100, normalized * 100));
    }
    function decimalPlacesFromStep(stepValue) {
        if (!Number.isFinite(stepValue) || stepValue <= 0)
            return 0;
        const text = stepValue.toString();
        const decimal = text.split(".")[1];
        return decimal ? decimal.length : 0;
    }
    function formatOverlayDisplayValue(value, stepValue) {
        if (!Number.isFinite(value))
            return "--";
        const decimals = Math.min(4, decimalPlacesFromStep(stepValue));
        return value.toFixed(decimals);
    }
    function buildDofOverlayPresentation(options) {
        const step = parseFloat(options.overlaySlider.step || "0.0001");
        const epsilon = Math.max(1e-6, step * 0.5);
        const hasValues = Number.isFinite(options.baseValue)
            && Number.isFinite(options.overlayValue);
        const isActive = hasValues
            && Math.abs(options.overlayValue - options.baseValue) > epsilon;
        const baseFill = sliderFillPercent(options.baseSlider, options.baseValue);
        const overlayFill = sliderFillPercent(options.overlaySlider, options.overlayValue);
        const start = Math.min(baseFill, overlayFill);
        const end = Math.max(baseFill, overlayFill);
        return {
            isActive,
            baseFill,
            overlayFill,
            start,
            end,
            deltaBarActive: isActive && end > start,
            whatIfActive: options.showWhatIf && isActive,
            overlayValueText: formatOverlayDisplayValue(options.overlayValue, step),
            delta: isActive ? options.overlayValue - options.baseValue : null,
            deltaDigits: decimalPlacesFromStep(step),
        };
    }
});
