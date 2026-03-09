"use strict";
/*
© 2026 Rick Molloy. All rights reserved.
*/
const MM_PER_INCH = 25.4;
const DEFAULT_SCALE_MM = 650;
const DEFAULT_FRET_COUNT = 24;
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
    scaleInput.addEventListener("input", render);
    unitSelect.addEventListener("change", render);
    resetBtn.addEventListener("click", resetDefaults);
    render();
    function resetDefaults() {
        scaleInput.value = String(DEFAULT_SCALE_MM);
        unitSelect.value = "mm";
        render();
    }
    function render() {
        const unit = readUnit();
        const scaleMm = scaleLengthReadInMillimeters(unit);
        if (!Number.isFinite(scaleMm) || scaleMm <= 0) {
            status.textContent = "Enter a valid scale length.";
            return;
        }
        const frets = fretPositionsBuild(scaleMm, DEFAULT_FRET_COUNT);
        const compensation = compensationBuildFromScale(scaleMm);
        summaryScale.textContent = valueLabelBuild(scaleMm, unit);
        summaryClassical.textContent = valueLabelBuild(compensation.classicalSetbackMm, unit);
        summarySteel1.textContent = valueLabelBuild(compensation.steelFirstSetbackMm, unit);
        summarySteel6.textContent = valueLabelBuild(compensation.steelSixthSetbackMm, unit);
        status.textContent = "Live: computed from current scale length";
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
        rowHtmlBuild("Classical (straight)", compensation.classicalSetbackMm, classicalScale, unit),
        rowHtmlBuild("Steel first string", compensation.steelFirstSetbackMm, steelScaleFirst, unit),
        rowHtmlBuild("Steel sixth string", compensation.steelSixthSetbackMm, steelScaleSixth, unit),
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
