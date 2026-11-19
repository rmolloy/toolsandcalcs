/*
© 2026 Rick Molloy. All rights reserved.
*/

type Unit = "mm" | "in";
type SharedLengthUnits = {
  read(): Unit;
  register(adapter: { readUnit(): Unit; applyUnit(unit: Unit): void }): boolean;
};
const sharedLengthUnits = (globalThis as typeof globalThis & { ToolLengthUnits?: SharedLengthUnits }).ToolLengthUnits;

type FretPosition = {
  fret: number;
  distanceMm: number;
  deltaMm: number;
  remainingMm: number;
};

type BridgeCompensation = {
  scaleMm: number;
  classicalSetbackMm: number;
  steelFirstSetbackMm: number;
  steelSixthSetbackMm: number;
  classicalNutToSaddleMm: number;
  steelFirstNutToSaddleMm: number;
  steelSixthNutToSaddleMm: number;
};

// The math is the Fret Calculator engine, loaded before this script.
const fretEngine = (globalThis as typeof globalThis & {
  FretCalculatorEngine: {
    DEFAULT_SCALE_MM: number;
    DEFAULT_FRET_COUNT: number;
    SCALE_RANGE_MM: { min: number; max: number };
    fretPositionsBuild(scaleMm: number, fretCount: number): FretPosition[];
    compensationBuildFromScale(scaleMm: number): BridgeCompensation;
    lengthFromMillimeters(valueMm: number, unit: Unit): number;
    millimetersFromLength(value: number, unit: Unit): number;
  };
}).FretCalculatorEngine;

// localized-runtime-messages:start
const fretRuntimeMessages = Object.freeze({
  classicalStraight: "Classical (straight)",
  enterValidScaleLength: "Enter a valid scale length.",
  liveComputedFromScaleLength: "Live: computed from current scale length",
  steelFirstString: "Steel first string",
  steelSixthString: "Steel sixth string",
});
// localized-runtime-messages:end

(function initFretCalculator() {
  const scaleInput = document.getElementById("scale_input") as HTMLInputElement;
  const unitSelect = document.getElementById("unit_select") as HTMLSelectElement;
  const resetBtn = document.getElementById("reset_btn") as HTMLButtonElement;

  const summaryScale = document.getElementById("summary_scale") as HTMLElement;
  const summaryClassical = document.getElementById("summary_classical") as HTMLElement;
  const summarySteel1 = document.getElementById("summary_steel_1") as HTMLElement;
  const summarySteel6 = document.getElementById("summary_steel_6") as HTMLElement;
  const status = document.getElementById("result_status") as HTMLElement;

  const fretRows = document.getElementById("fret_rows") as HTMLTableSectionElement;
  const compRows = document.getElementById("comp_rows") as HTMLTableSectionElement;

  let scaleMm = scaleLengthReadInMillimeters(readUnit());
  scaleInput.addEventListener("input", readScaleAndRender);
  unitSelect.addEventListener("change", writeScaleAndRender);
  resetBtn.addEventListener("click", resetDefaults);

  render();
  registerSharedLengthUnits();

  function registerSharedLengthUnits() {
    if (!sharedLengthUnits) return;
    sharedLengthUnits.register({ readUnit, applyUnit });
    const localUnitField = unitSelect.closest?.("label");
    if (localUnitField) localUnitField.style.display = "none";
  }

  function applyUnit(unit: Unit) {
    unitSelect.value = unit;
    writeScaleAndRender();
  }

  function resetDefaults() {
    scaleMm = fretEngine.DEFAULT_SCALE_MM;
    unitSelect.value = sharedLengthUnits?.read() || "mm";
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

  function readUnit(): Unit {
    return unitSelect.value === "in" ? "in" : "mm";
  }

  function scaleLengthReadInMillimeters(unit: Unit): number {
    const raw = parseFloat(scaleInput.value);
    if (!Number.isFinite(raw)) return NaN;
    return fretEngine.millimetersFromLength(raw, unit);
  }
})();

function fretRowHtmlBuild(position: FretPosition, unit: Unit): string {
  return `<tr>
    <td>${position.fret}</td>
    <td>${valueLabelBuild(position.distanceMm, unit)}</td>
    <td>${valueLabelBuild(position.deltaMm, unit)}</td>
    <td>${valueLabelBuild(position.remainingMm, unit)}</td>
  </tr>`;
}

function compensationRowsHtmlBuild(compensation: BridgeCompensation, unit: Unit): string {
  return [
    rowHtmlBuild(
      fretRuntimeMessages.classicalStraight,
      compensation.classicalSetbackMm,
      compensation.classicalNutToSaddleMm,
      unit,
    ),
    rowHtmlBuild(
      fretRuntimeMessages.steelFirstString,
      compensation.steelFirstSetbackMm,
      compensation.steelFirstNutToSaddleMm,
      unit,
    ),
    rowHtmlBuild(
      fretRuntimeMessages.steelSixthString,
      compensation.steelSixthSetbackMm,
      compensation.steelSixthNutToSaddleMm,
      unit,
    ),
  ].join("");
}

function rowHtmlBuild(label: string, setbackMm: number, nutToSaddleMm: number, unit: Unit): string {
  return `<tr>
    <td>${label}</td>
    <td>${valueLabelBuild(setbackMm, unit)}</td>
    <td>${valueLabelBuild(nutToSaddleMm, unit)}</td>
  </tr>`;
}

function valueLabelBuild(valueMm: number, unit: Unit): string {
  const unitValue = fretEngine.lengthFromMillimeters(valueMm, unit);
  const suffix = unit === "in" ? "in" : "mm";
  return `${unitValue.toFixed(2)} ${suffix}`;
}
