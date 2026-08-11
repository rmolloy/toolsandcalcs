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
    exports.readDofParamsFromSearch = readDofParamsFromSearch;
    exports.dofDisplayValueToInternal = dofDisplayValueToInternal;
    exports.dofInternalValueToDisplay = dofInternalValueToDisplay;
    exports.isDofUncommittedDecimalInput = isDofUncommittedDecimalInput;
    function readDofParamsFromSearch(search, allowedKeys) {
        const raw = new URLSearchParams(search).get("params");
        if (!raw)
            return null;
        try {
            const parsed = JSON.parse(decodeURIComponent(raw));
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                return null;
            }
            const values = parsed;
            const params = {};
            allowedKeys.forEach((key) => {
                const value = values[key];
                if (Number.isFinite(value))
                    params[key] = value;
            });
            return Object.keys(params).length > 0 ? params : null;
        }
        catch {
            return null;
        }
    }
    function dofDisplayValueToInternal(param, value) {
        if (!Number.isFinite(value))
            return value;
        return param.startsWith("mass_") ? value / 1000 : value;
    }
    function dofInternalValueToDisplay(param, value) {
        if (!Number.isFinite(value))
            return value;
        return param.startsWith("mass_") ? value * 1000 : value;
    }
    function isDofUncommittedDecimalInput(value) {
        return /^-?\d+\.$/.test(value.trim());
    }
});
