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
        extra: function (baseValue, targetValue) {
            var deltaArea = targetValue - baseValue;
            var sign = deltaArea >= 0 ? "+" : "-";
            return " (" + sign + Math.abs(deltaArea).toFixed(5) + " m²)";
        }
    }
];
function whatIfRecipeAreaToDiameterMm(area) {
    if (!Number.isFinite(area) || area <= 0)
        return NaN;
    return Math.sqrt((4 * area) / Math.PI) * 1000;
}
function buildWhatIfRecipeDeltaLine(field, baseRaw, targetRaw) {
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
    var direction = deltaDisplay >= 0 ? "Increase" : "Decrease";
    var precision = typeof field.precision === "number" ? field.precision : 2;
    var amount = Math.abs(deltaDisplay).toFixed(precision);
    var line = direction + " " + field.label + " by " + amount + " " + field.unit;
    if (field.extra) {
        line += field.extra(baseValue, targetValue, deltaDisplay) || "";
    }
    return line;
}
function buildWhatIfRecipeSummaryLines(baseRaw, targetRaw) {
    if (!baseRaw || !targetRaw)
        return null;
    var lines = WHAT_IF_RECIPE_FIELDS
        .map(function (field) {
        return buildWhatIfRecipeDeltaLine(field, baseRaw, targetRaw);
    })
        .filter(function (line) {
        return Boolean(line);
    });
    return lines.length ? lines : null;
}
window.buildWhatIfRecipeSummaryLines = buildWhatIfRecipeSummaryLines;
