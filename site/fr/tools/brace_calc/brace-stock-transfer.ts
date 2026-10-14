export interface BraceStockMeasurements {
  height: number;
  breadth: number;
  density: number;
  modulus: number;
}

export interface BraceStockDefaults extends BraceStockMeasurements {}

export interface BraceStockCharacterization {
  version: 1;
  method: "free-free";
  sourceLabel: string;
  longFrequencyHz: number;
  specimenLengthMm: number;
  specimenWidthMm: number;
  specimenHeightMm: number;
  specimenMassG: number;
  densityKgM3: number;
  modulusGPa: number;
  soundSpeedMps: number;
}

export function readBraceStockMeasurements(
  params: URLSearchParams,
  defaults: BraceStockDefaults,
): BraceStockMeasurements | null {
  const height = positiveQueryNumberRead(params, "brace_height");
  const breadth = positiveQueryNumberRead(params, "brace_width");
  const density = positiveQueryNumberRead(params, "brace_density");
  const modulus = positiveQueryNumberRead(params, "brace_modulus");
  if (height === null && breadth === null && density === null && modulus === null) {
    return null;
  }

  return {
    height: height ?? defaults.height,
    breadth: breadth ?? defaults.breadth,
    density: density ?? defaults.density,
    modulus: modulus ?? defaults.modulus,
  };
}

export function readBraceStockCharacterization(
  params: URLSearchParams,
): BraceStockCharacterization | null {
  if (params.get("stock_contract") !== "1" || params.get("stock_method") !== "free-free") {
    return null;
  }
  const longFrequencyHz = positiveQueryNumberRead(params, "stock_long_hz");
  const specimenLengthMm = positiveQueryNumberRead(params, "stock_specimen_length_mm");
  const specimenWidthMm = positiveQueryNumberRead(params, "stock_specimen_width_mm");
  const specimenHeightMm = positiveQueryNumberRead(params, "stock_specimen_height_mm");
  const specimenMassG = positiveQueryNumberRead(params, "stock_specimen_mass_g");
  const densityKgM3 = positiveQueryNumberRead(params, "stock_density");
  const modulusGPa = positiveQueryNumberRead(params, "stock_modulus");
  const soundSpeedMps = positiveQueryNumberRead(params, "stock_sound_speed");
  if (
    longFrequencyHz === null
    || specimenLengthMm === null
    || specimenWidthMm === null
    || specimenHeightMm === null
    || specimenMassG === null
    || densityKgM3 === null
    || modulusGPa === null
    || soundSpeedMps === null
  ) {
    return null;
  }
  return {
    version: 1,
    method: "free-free",
    sourceLabel: params.get("stock_source")?.trim() || "Brace stock measurement",
    longFrequencyHz,
    specimenLengthMm,
    specimenWidthMm,
    specimenHeightMm,
    specimenMassG,
    densityKgM3,
    modulusGPa,
    soundSpeedMps,
  };
}

function positiveQueryNumberRead(
  params: URLSearchParams,
  key: string,
): number | null {
  const value = Number.parseFloat(params.get(key) || "");
  return Number.isFinite(value) && value > 0 ? value : null;
}

export const BraceStockTransfer = {
  readBraceStockCharacterization,
  readBraceStockMeasurements,
};

declare global {
  interface Window {
    BraceStockTransfer?: typeof BraceStockTransfer;
  }
}

if (typeof window !== "undefined") {
  window.BraceStockTransfer = BraceStockTransfer;
}
