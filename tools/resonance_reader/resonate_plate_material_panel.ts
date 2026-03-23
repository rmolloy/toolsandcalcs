import { measureModeNormalize, type MeasureMode } from "./resonate_mode_config.js";

export type PlateMaterialMeasurements = {
  panelLengthMm: number;
  panelWidthMm: number;
  panelHeightMm: number;
  panelMassG: number;
};

type PlateMaterialFieldKey = keyof PlateMaterialMeasurements;
type PlateMaterialCardCopy = { title: string; description: string };

const DEFAULT_PLATE_MATERIAL_MEASUREMENTS: PlateMaterialMeasurements = {
  panelLengthMm: 555,
  panelWidthMm: 227,
  panelHeightMm: 4.1,
  panelMassG: 211.4,
};

const FIELD_TO_INPUT_ID: Record<PlateMaterialFieldKey, string> = {
  panelLengthMm: "plate_material_length",
  panelWidthMm: "plate_material_width",
  panelHeightMm: "plate_material_height",
  panelMassG: "plate_material_mass",
};

export function plateMaterialPanelInitialize(state: Record<string, any>) {
  plateMaterialMeasurementsSeedIntoState(state);
  plateMaterialPanelBindOnce(state);
  plateMaterialPanelRenderFromState(state);
}

export function plateMaterialPanelRenderFromState(state: Record<string, any>) {
  plateMaterialCardVisibilitySyncFromState(state);
  plateMaterialCardCopySyncFromState(state);
  plateMaterialInputsSyncFromState(state);
}

export function plateMaterialMeasurementsResolveFromState(state: Record<string, any>): PlateMaterialMeasurements {
  plateMaterialMeasurementsSeedIntoState(state);
  return { ...state.plateMaterialMeasurements };
}

function plateMaterialMeasurementsSeedIntoState(state: Record<string, any>) {
  if (state.plateMaterialMeasurements) return;
  state.plateMaterialMeasurements = { ...DEFAULT_PLATE_MATERIAL_MEASUREMENTS };
}

function plateMaterialPanelBindOnce(state: Record<string, any>) {
  const card = plateMaterialCardElementGet();
  if (!card || card.dataset.bound === "true") return;
  card.dataset.bound = "true";
  plateMaterialInputEntriesBuild().forEach(([fieldKey, input]) => {
    input.addEventListener("input", () => plateMaterialInputHandle(state, fieldKey, input));
  });
}

function plateMaterialInputHandle(
  state: Record<string, any>,
  fieldKey: PlateMaterialFieldKey,
  input: HTMLInputElement,
) {
  plateMaterialMeasurementsSeedIntoState(state);
  state.plateMaterialMeasurements[fieldKey] = plateMaterialNumberParseOrDefault(input.value, fieldKey);
}

function plateMaterialCardVisibilitySyncFromState(state: Record<string, any>) {
  const card = plateMaterialCardElementGet();
  if (!card) return;
  card.hidden = !plateMaterialPanelVisibleForMeasureMode(state.measureMode);
}

export function plateMaterialPanelVisibleForMeasureMode(measureMode: unknown) {
  const normalized = measureModeNormalize(measureMode);
  return normalized === "plate_stock" || normalized === "brace_stock";
}

export function plateMaterialCardCopyResolveFromMeasureMode(measureMode: unknown): PlateMaterialCardCopy {
  const normalized = measureModeNormalize(measureMode);
  if (normalized === "brace_stock") {
    return {
      title: "Brace Stock Properties",
      description: "Capture the stock dimensions and mass alongside the detected brace-stock modes.",
    };
  }
  return {
    title: "Material Properties",
    description: "These measurements travel with the detected plate modes into the Plate Thickness calculator.",
  };
}

function plateMaterialCardCopySyncFromState(state: Record<string, any>) {
  const copy = plateMaterialCardCopyResolveFromMeasureMode(state.measureMode);
  plateMaterialCardTitleElementGet()?.replaceChildren(document.createTextNode(copy.title));
  plateMaterialCardDescriptionElementGet()?.replaceChildren(document.createTextNode(copy.description));
}

function plateMaterialInputsSyncFromState(state: Record<string, any>) {
  const measurements = plateMaterialMeasurementsResolveFromState(state);
  plateMaterialInputEntriesBuild().forEach(([fieldKey, input]) => {
    input.value = plateMaterialNumberFormat(measurements[fieldKey]);
  });
}

function plateMaterialInputEntriesBuild() {
  return (Object.entries(FIELD_TO_INPUT_ID) as Array<[PlateMaterialFieldKey, string]>)
    .map(([fieldKey, inputId]) => {
      const input = document.getElementById(inputId) as HTMLInputElement | null;
      return input ? [fieldKey, input] as [PlateMaterialFieldKey, HTMLInputElement] : null;
    })
    .filter((entry): entry is [PlateMaterialFieldKey, HTMLInputElement] => entry !== null);
}

function plateMaterialCardElementGet() {
  return document.getElementById("plate_material_card") as HTMLElement | null;
}

function plateMaterialCardTitleElementGet() {
  return document.getElementById("plate_material_title") as HTMLElement | null;
}

function plateMaterialCardDescriptionElementGet() {
  return document.getElementById("plate_material_description") as HTMLElement | null;
}

function plateMaterialNumberParseOrDefault(raw: string, fieldKey: PlateMaterialFieldKey) {
  const value = Number.parseFloat(raw);
  if (Number.isFinite(value) && value > 0) return value;
  return DEFAULT_PLATE_MATERIAL_MEASUREMENTS[fieldKey];
}

function plateMaterialNumberFormat(value: number) {
  if (!Number.isFinite(value)) return "";
  const fixed = value.toFixed(2);
  return fixed.replace(/\.?0+$/, "");
}
