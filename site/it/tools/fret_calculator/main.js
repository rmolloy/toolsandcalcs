"use strict";
/*
© 2026 Rick Molloy. All rights reserved.
*/
const sharedLengthUnits = globalThis.ToolLengthUnits;
const MM_PER_INCH = 25.4;
const DEFAULT_SCALE_MM = 650;
const DEFAULT_FRET_COUNT = 24;
// localized-runtime-messages:start
const fretRuntimeMessages = Object.freeze({
    classicalStraight: "Classica (diritta)",
    enterValidScaleLength: "Inserisci un diapason valido.",
    liveComputedFromScaleLength: "In tempo reale: calcolato dal diapason attuale",
    steelFirstString: "Prima corda d’acciaio",
    steelSixthString: "Sesta corda d’acciaio",
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
        scaleMm = DEFAULT_SCALE_MM;
        unitSelect.value = (sharedLengthUnits === null || sharedLengthUnits === void 0 ? void 0 : sharedLengthUnits.read()) || "mm";
        writeScaleAndRender();
    }
    function readScaleAndRender() {
        scaleMm = scaleLengthReadInMillimeters(readUnit());
        render();
    }
    function writeScaleAndRender() {
        const factor = readUnit() === "in" ? MM_PER_INCH : 1;
        scaleInput.value = Number.isFinite(scaleMm) ? String(Number((scaleMm / factor).toFixed(6))) : "";
        scaleInput.min = String(400 / factor);
        scaleInput.max = String(1000 / factor);
        scaleInput.step = readUnit() === "in" ? "0.01" : "1";
        render();
    }
    function render() {
        const unit = readUnit();
        if (!Number.isFinite(scaleMm) || scaleMm <= 0) {
            status.textContent = fretRuntimeMessages.enterValidScaleLength;
            return;
        }
        const frets = fretPositionsBuild(scaleMm, DEFAULT_FRET_COUNT);
        const compensation = compensationBuildFromScale(scaleMm);
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
        return unit === "in" ? raw * MM_PER_INCH : raw;
    }
})();
function fretPositionsBuild(scaleMm, fretCount) {
    const rows = [];
    let previousDistanceMm = 0;
    for (let fret = 1; fret <= fretCount; fret += 1) {
        const distanceMm = scaleMm - scaleMm / Math.pow(2, fret / 12);
        const deltaMm = distanceMm - previousDistanceMm;
        const remainingMm = scaleMm - distanceMm;
        rows.push({ fret, distanceMm, deltaMm, remainingMm });
        previousDistanceMm = distanceMm;
    }
    return rows;
}
function compensationBuildFromScale(scaleMm) {
    const factor = scaleMm / DEFAULT_SCALE_MM;
    return {
        scaleMm,
        classicalSetbackMm: 2.0 * factor,
        steelFirstSetbackMm: 2.266 * factor,
        steelSixthSetbackMm: 5.470 * factor,
    };
}
function fretRowHtmlBuild(position, unit) {
    return `<tr>
    <td>${position.fret}</td>
    <td>${valueLabelBuild(position.distanceMm, unit)}</td>
    <td>${valueLabelBuild(position.deltaMm, unit)}</td>
    <td>${valueLabelBuild(position.remainingMm, unit)}</td>
  </tr>`;
}
function compensationRowsHtmlBuild(compensation, unit) {
    const classicalScale = compensation.scaleMm + compensation.classicalSetbackMm;
    const steelScaleFirst = compensation.scaleMm + compensation.steelFirstSetbackMm;
    const steelScaleSixth = compensation.scaleMm + compensation.steelSixthSetbackMm;
    return [
        rowHtmlBuild(fretRuntimeMessages.classicalStraight, compensation.classicalSetbackMm, classicalScale, unit),
        rowHtmlBuild(fretRuntimeMessages.steelFirstString, compensation.steelFirstSetbackMm, steelScaleFirst, unit),
        rowHtmlBuild(fretRuntimeMessages.steelSixthString, compensation.steelSixthSetbackMm, steelScaleSixth, unit),
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
    const unitValue = unit === "in" ? valueMm / MM_PER_INCH : valueMm;
    const suffix = unit === "in" ? "in" : "mm";
    return `${unitValue.toFixed(2)} ${suffix}`;
}
