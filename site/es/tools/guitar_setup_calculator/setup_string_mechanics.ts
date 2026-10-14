import { requirePositive } from "./numeric_validation.ts";
import type { ProfileMaterialFamily } from "./instrument_profiles.ts";
import type { StringConstruction } from "./setup_model.ts";

const MILLIMETERS_PER_METER = 1000;
const MILLIMETERS_PER_INCH = 25.4;
const DEFAULT_STRING_DENSITY_KG_PER_CUBIC_METER = 7850;
const DEFAULT_STEEL_YOUNG_MODULUS_PA = 195_000_000_000;
const DEFAULT_NYLON_DENSITY_KG_PER_CUBIC_METER = 1140;
const DEFAULT_NYLON_YOUNG_MODULUS_PA = 3_000_000_000;

export function estimateStringMechanicalProperties({
  gaugeMm,
  construction = "plain",
  materialFamily = "steel",
  densityKgPerCubicMeter,
  youngModulusPa,
}: {
  gaugeMm: number;
  construction?: StringConstruction;
  materialFamily?: ProfileMaterialFamily;
  densityKgPerCubicMeter?: number;
  youngModulusPa?: number;
}): { unitMassKgPerMeter: number; axialStiffnessN: number } {
  requirePositive(gaugeMm, "gaugeMm");
  requireStringConstruction(construction);
  const materialDefaults = materialDefaultsForFamily(materialFamily);
  const outsideAreaM2 = calculateCircularAreaM2(gaugeMm);
  const axialDiameterMm = estimateAxialDiameterMm({
    outsideDiameterMm: gaugeMm,
    construction,
    materialFamily,
  });

  return {
    unitMassKgPerMeter: (densityKgPerCubicMeter ?? materialDefaults.densityKgPerCubicMeter)
      * outsideAreaM2
      * unitMassFillFactorForConstruction(construction),
    axialStiffnessN: (youngModulusPa ?? materialDefaults.youngModulusPa)
      * calculateCircularAreaM2(axialDiameterMm),
  };
}

function materialDefaultsForFamily(materialFamily: ProfileMaterialFamily) {
  if (materialFamily === "nylon") {
    return {
      densityKgPerCubicMeter: DEFAULT_NYLON_DENSITY_KG_PER_CUBIC_METER,
      youngModulusPa: DEFAULT_NYLON_YOUNG_MODULUS_PA,
    };
  }
  return {
    densityKgPerCubicMeter: DEFAULT_STRING_DENSITY_KG_PER_CUBIC_METER,
    youngModulusPa: DEFAULT_STEEL_YOUNG_MODULUS_PA,
  };
}

function calculateCircularAreaM2(diameterMm: number): number {
  const radiusM = diameterMm / 2 / MILLIMETERS_PER_METER;
  return Math.PI * radiusM ** 2;
}

function unitMassFillFactorForConstruction(construction: StringConstruction): number {
  return construction === "wound" ? 0.72 : 1;
}

function estimateAxialDiameterMm({
  outsideDiameterMm,
  construction,
  materialFamily,
}: {
  outsideDiameterMm: number;
  construction: StringConstruction;
  materialFamily: ProfileMaterialFamily;
}): number {
  if (construction === "plain") return outsideDiameterMm;
  if (materialFamily === "nylon") return outsideDiameterMm * 0.6;
  const outsideDiameterIn = outsideDiameterMm / MILLIMETERS_PER_INCH;
  const estimatedCoreDiameterIn = 0.008 + 0.224 * outsideDiameterIn;
  return Math.min(outsideDiameterMm, estimatedCoreDiameterIn * MILLIMETERS_PER_INCH);
}

function requireStringConstruction(construction: string): asserts construction is StringConstruction {
  if (construction !== "plain" && construction !== "wound") {
    throw new RangeError("construction must be plain or wound");
  }
}
