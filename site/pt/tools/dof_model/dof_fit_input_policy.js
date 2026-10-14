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
    exports.buildDofFitInputTargets = buildDofFitInputTargets;
    exports.dofFitTargetsHaveAnyValue = dofFitTargetsHaveAnyValue;
    exports.dofFitSolveTweakIdsFromTargets = dofFitSolveTweakIdsFromTargets;
    exports.readDofRestrictedTweakIds = readDofRestrictedTweakIds;
    exports.dofFitIncreaseOnlyFactorAllowed = dofFitIncreaseOnlyFactorAllowed;
    const DOF_FIT_MODE_KEYS = ["air", "top", "back"];
    const DOF_SOLVE_TWEAK_IDS = [
        "stiffness_top",
        "stiffness_back",
        "volume_air",
        "area_hole",
    ];
    const DOF_RESTRICTED_TWEAK_IDS = ["mass_top", "mass_back", "area_hole"];
    function readFiniteDofFitTarget(readInput, elementId) {
        const value = parseFloat(readInput(elementId));
        return Number.isFinite(value) ? value : null;
    }
    function buildDofFitInputTargets(readInput, displayToInternal) {
        const massTopDisplay = readFiniteDofFitTarget(readInput, "fit_target_mass_top");
        const massBackDisplay = readFiniteDofFitTarget(readInput, "fit_target_mass_back");
        const soundholeDiameter = readFiniteDofFitTarget(readInput, "fit_target_area_hole_diam");
        return {
            air: readFiniteDofFitTarget(readInput, "fit_target_air"),
            top: readFiniteDofFitTarget(readInput, "fit_target_top"),
            back: readFiniteDofFitTarget(readInput, "fit_target_back"),
            mass_top: Number.isFinite(massTopDisplay)
                ? displayToInternal("mass_top", massTopDisplay)
                : null,
            stiffness_top: readFiniteDofFitTarget(readInput, "fit_target_stiffness_top"),
            mass_back: Number.isFinite(massBackDisplay)
                ? displayToInternal("mass_back", massBackDisplay)
                : null,
            stiffness_back: readFiniteDofFitTarget(readInput, "fit_target_stiffness_back"),
            volume_air: readFiniteDofFitTarget(readInput, "fit_target_volume_air"),
            area_hole_diam: soundholeDiameter,
            area_hole: Number.isFinite(soundholeDiameter)
                ? Math.PI * Math.pow(soundholeDiameter / 1000, 2) / 4
                : null,
        };
    }
    function dofFitTargetsHaveAnyValue(targets) {
        return DOF_FIT_MODE_KEYS.some((mode) => Number.isFinite(targets[mode]))
            || Number.isFinite(targets.mass_top)
            || Number.isFinite(targets.stiffness_top)
            || Number.isFinite(targets.mass_back)
            || Number.isFinite(targets.stiffness_back)
            || Number.isFinite(targets.volume_air)
            || Number.isFinite(targets.area_hole);
    }
    function dofFitSolveTweakIdsFromTargets(targets) {
        const tweakIds = Array.from(DOF_SOLVE_TWEAK_IDS);
        if (Number.isFinite(targets.mass_top))
            tweakIds.push("mass_top");
        if (Number.isFinite(targets.mass_back))
            tweakIds.push("mass_back");
        return tweakIds;
    }
    function readDofRestrictedTweakIds() {
        return Array.from(DOF_RESTRICTED_TWEAK_IDS);
    }
    function dofFitIncreaseOnlyFactorAllowed(id, factor) {
        if (!DOF_RESTRICTED_TWEAK_IDS.includes(id)) {
            return false;
        }
        return factor >= 1;
    }
});
