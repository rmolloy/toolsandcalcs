"use strict";
/*
© 2026 Rick Molloy. All rights reserved.
*/
const sharedLengthUnits = globalThis.ToolLengthUnits;
// The math is the Fret Calculator engine, loaded before this script.
const fretEngine = globalThis.FretCalculatorEngine;
// localized-runtime-messages:start
const fretRuntimeMessages = Object.freeze({
    classicalStraight: "Klassik (gerade)",
    enterValidScaleLength: "Geben Sie eine gültige Mensurlänge ein.",
    liveComputedFromScaleLength: "Live: aus der aktuellen Mensurlänge berechnet",
    steelFirstString: "Erste Stahlsaite",
    steelSixthString: "Sechste Stahlsaite",
});
// localized-runtime-messages:end
(function initFretCalculator() {
    const scaleInput = document.getElementById("scale_input");
    const unitSelect = document.getElementById("unit_select");
    const resetBtn = document.getElementById("reset_btn");
    const summaryScale = document.getElementById("summary_scale");
    const summaryClassical = document.getElementById("summary_classical");
    const summarySteel1 = document.getElementById("summary_steel_1");
    const summarySteel6 = document.getElementById("summary_steel_6");
    const status = document.getElementById("result_status");
    const fretRows = document.getElementById("fret_rows");
    const compRows = document.getElementById("comp_rows");
    let scaleMm = scaleLengthReadInMillimeters(readUnit());
    scaleInput.addEventListener("input", readScaleAndRender);
    unitSelect.addEventListener("change", writeScaleAndRender);
    resetBtn.addEventListener("click", resetDefaults);
    render();
    registerSharedLengthUnits();
    function registerSharedLengthUnits() {
        var _a;
        if (!sharedLengthUnits)
            return;
        sharedLengthUnits.register({ readUnit, applyUnit });
        const localUnitField = (_a = unitSelect.closest) === null || _a === void 0 ? void 0 : _a.call(unitSelect, "label");
        if (localUnitField)
            localUnitField.style.display = "none";
    }
    function applyUnit(unit) {
        unitSelect.value = unit;
        writeScaleAndRender();
    }
    function resetDefaults() {
        scaleMm = fretEngine.DEFAULT_SCALE_MM;
        unitSelect.value = (sharedLengthUnits === null || sharedLengthUnits === void 0 ? void 0 : sharedLengthUnits.read()) || "mm";
        writeScaleAndRender();
    }
    function readScaleAndRender() {
        scaleMm = scaleLengthReadInMillimeters(readUnit());
        render();
    }
    function writeScaleAndRender() {
        const unit = readUnit();
        scaleInput.value = Number.isFinite(scaleMm) ? String(Number(fretEngine.lengthFromMillimeters(scaleMm, unit).toFixed(6))) : "";
        scaleInput.min = String(fretEngine.lengthFromMillimeters(fretEngine.SCALE_RANGE_MM.min, unit));
        scaleInput.max = String(fretEngine.lengthFromMillimeters(fretEngine.SCALE_RANGE_MM.max, unit));
        scaleInput.step = readUnit() === "in" ? "0.01" : "1";
        render();
    }
    function render() {
        const unit = readUnit();
        if (!Number.isFinite(scaleMm) || scaleMm <= 0) {
            status.textContent = fretRuntimeMessages.enterValidScaleLength;
            return;
        }
        const frets = fretEngine.fretPositionsBuild(scaleMm, fretEngine.DEFAULT_FRET_COUNT);
        const compensation = fretEngine.compensationBuildFromScale(scaleMm);
        summaryScale.textContent = valueLabelBuild(scaleMm, unit);
        summaryClassical.textContent = valueLabelBuild(compensation.classicalSetbackMm, unit);
        summarySteel1.textContent = valueLabelBuild(compensation.steelFirstSetbackMm, unit);
        summarySteel6.textContent = valueLabelBuild(compensation.steelSixthSetbackMm, unit);
        status.textContent = fretRuntimeMessages.liveComputedFromScaleLength;
        fretRows.innerHTML = frets.map((fret) => fretRowHtmlBuild(fret, unit)).join("");
        compRows.innerHTML = compensationRowsHtmlBuild(compensation, unit);
    }
    function readUnit() {
        return unitSelect.value === "in" ? "in" : "mm";
    }
    function scaleLengthReadInMillimeters(unit) {
        const raw = parseFloat(scaleInput.value);
        if (!Number.isFinite(raw))
            return NaN;
        return fretEngine.millimetersFromLength(raw, unit);
    }
})();
function fretRowHtmlBuild(position, unit) {
    return `<tr>
    <td>${position.fret}</td>
    <td>${valueLabelBuild(position.distanceMm, unit)}</td>
    <td>${valueLabelBuild(position.deltaMm, unit)}</td>
    <td>${valueLabelBuild(position.remainingMm, unit)}</td>
  </tr>`;
}
function compensationRowsHtmlBuild(compensation, unit) {
    return [
        rowHtmlBuild(fretRuntimeMessages.classicalStraight, compensation.classicalSetbackMm, compensation.classicalNutToSaddleMm, unit),
        rowHtmlBuild(fretRuntimeMessages.steelFirstString, compensation.steelFirstSetbackMm, compensation.steelFirstNutToSaddleMm, unit),
        rowHtmlBuild(fretRuntimeMessages.steelSixthString, compensation.steelSixthSetbackMm, compensation.steelSixthNutToSaddleMm, unit),
    ].join("");
}
function rowHtmlBuild(label, setbackMm, nutToSaddleMm, unit) {
    return `<tr>
    <td>${label}</td>
    <td>${valueLabelBuild(setbackMm, unit)}</td>
    <td>${valueLabelBuild(nutToSaddleMm, unit)}</td>
  </tr>`;
}
function valueLabelBuild(valueMm, unit) {
    const unitValue = fretEngine.lengthFromMillimeters(valueMm, unit);
    const suffix = unit === "in" ? "in" : "mm";
    return `${unitValue.toFixed(2)} ${suffix}`;
}
