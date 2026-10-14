"use strict";
const WHAT_IF_RECIPE_FIELDS = [
    { id: "mass_top", label: "top plate mass", unit: "g", precision: 1, threshold: 0.1 },
    { id: "stiffness_top", label: "top plate stiffness", unit: "N/m", precision: 0, threshold: 50 },
    { id: "mass_back", label: "back plate mass", unit: "g", precision: 1, threshold: 0.1 },
    { id: "stiffness_back", label: "back plate stiffness", unit: "N/m", precision: 0, threshold: 50 },
    { id: "volume_air", label: "cavity volume", unit: "m³", precision: 4, threshold: 0.00005 },
    {
        id: "area_hole",
        label: "soundhole diameter",
        unit: "mm",
        precision: 1,
        threshold: 0.1,
        transform: whatIfRecipeAreaToDiameterMm,
        extra: function (baseValue, targetValue, _deltaValue, messages) {
            var deltaArea = targetValue - baseValue;
            var sign = deltaArea >= 0 ? "+" : "-";
            return messageValueRead(messages === null || messages === void 0 ? void 0 : messages.soundholeAreaDeltaTemplate, " ({sign}{area} m²)")
                .replace("{sign}", sign)
                .replace("{area}", Math.abs(deltaArea).toFixed(5));
        }
    }
];
function whatIfRecipeAreaToDiameterMm(area) {
    if (!Number.isFinite(area) || area <= 0)
        return NaN;
    return Math.sqrt((4 * area) / Math.PI) * 1000;
}
function buildWhatIfRecipeDeltaLine(field, baseRaw, targetRaw, messages) {
    var _a;
    var baseValue = baseRaw[field.id];
    var targetValue = targetRaw[field.id];
    if (!Number.isFinite(baseValue) || !Number.isFinite(targetValue))
        return null;
    var baseDisplay = baseValue;
    var targetDisplay = targetValue;
    if (typeof field.transform === "function") {
        baseDisplay = field.transform(baseValue);
        targetDisplay = field.transform(targetValue);
    }
    if (!Number.isFinite(baseDisplay) || !Number.isFinite(targetDisplay))
        return null;
    var deltaDisplay = targetDisplay - baseDisplay;
    if (Math.abs(deltaDisplay) < ((_a = field.threshold) !== null && _a !== void 0 ? _a : 0))
        return null;
    var precision = typeof field.precision === "number" ? field.precision : 2;
    var amount = Math.abs(deltaDisplay).toFixed(precision);
    var line = whatIfRecipeLineBuild(field, amount, deltaDisplay, messages);
    if (field.extra) {
        line += field.extra(baseValue, targetValue, deltaDisplay, messages) || "";
    }
    return line;
}
function whatIfRecipeLineBuild(field, amount, delta, messages) {
    var template = delta >= 0
        ? messageValueRead(messages === null || messages === void 0 ? void 0 : messages.increaseTemplate, "Increase {field} by {amount} {unit}")
        : messageValueRead(messages === null || messages === void 0 ? void 0 : messages.decreaseTemplate, "Decrease {field} by {amount} {unit}");
    return template
        .replace("{field}", whatIfRecipeFieldLabelRead(field, messages))
        .replace("{amount}", amount)
        .replace("{unit}", field.unit);
}
function whatIfRecipeFieldLabelRead(field, messages) {
    var _a;
    return messageValueRead((_a = messages === null || messages === void 0 ? void 0 : messages.fieldLabels) === null || _a === void 0 ? void 0 : _a[field.id], field.label);
}
function messageValueRead(candidate, fallback) {
    return typeof candidate === "string" && candidate.trim() ? candidate : fallback;
}
function buildWhatIfRecipeSummaryLines(baseRaw, targetRaw, messages) {
    if (!baseRaw || !targetRaw)
        return null;
    var lines = WHAT_IF_RECIPE_FIELDS
        .map(function (field) {
        return buildWhatIfRecipeDeltaLine(field, baseRaw, targetRaw, messages);
    })
        .filter(function (line) {
        return Boolean(line);
    });
    return lines.length ? lines : null;
}
window.buildWhatIfRecipeSummaryLines = buildWhatIfRecipeSummaryLines;
