export type DofFitInputTargets = Record<string, number | null>;

export type DofFitInputReader = (id: string) => string;

export type DofDisplayValueConverter = (param: string, value: number) => number;

const DOF_FIT_MODE_KEYS = ["air", "top", "back"] as const;

const DOF_SOLVE_TWEAK_IDS = [
  "stiffness_top",
  "stiffness_back",
  "volume_air",
  "area_hole",
] as const;

const DOF_RESTRICTED_TWEAK_IDS = ["mass_top", "mass_back", "area_hole"] as const;

function readFiniteDofFitTarget(
  readInput: DofFitInputReader,
  elementId: string,
): number | null {
  const value = parseFloat(readInput(elementId));
  return Number.isFinite(value) ? value : null;
}

export function buildDofFitInputTargets(
  readInput: DofFitInputReader,
  displayToInternal: DofDisplayValueConverter,
): DofFitInputTargets {
  const massTopDisplay = readFiniteDofFitTarget(readInput, "fit_target_mass_top");
  const massBackDisplay = readFiniteDofFitTarget(readInput, "fit_target_mass_back");
  const soundholeDiameter = readFiniteDofFitTarget(readInput, "fit_target_area_hole_diam");

  return {
    air: readFiniteDofFitTarget(readInput, "fit_target_air"),
    top: readFiniteDofFitTarget(readInput, "fit_target_top"),
    back: readFiniteDofFitTarget(readInput, "fit_target_back"),
    mass_top: Number.isFinite(massTopDisplay)
      ? displayToInternal("mass_top", massTopDisplay as number)
      : null,
    stiffness_top: readFiniteDofFitTarget(readInput, "fit_target_stiffness_top"),
    mass_back: Number.isFinite(massBackDisplay)
      ? displayToInternal("mass_back", massBackDisplay as number)
      : null,
    stiffness_back: readFiniteDofFitTarget(readInput, "fit_target_stiffness_back"),
    volume_air: readFiniteDofFitTarget(readInput, "fit_target_volume_air"),
    area_hole_diam: soundholeDiameter,
    area_hole: Number.isFinite(soundholeDiameter)
      ? Math.PI * Math.pow((soundholeDiameter as number) / 1000, 2) / 4
      : null,
  };
}

export function dofFitTargetsHaveAnyValue(targets: DofFitInputTargets) {
  return DOF_FIT_MODE_KEYS.some((mode) => Number.isFinite(targets[mode]))
    || Number.isFinite(targets.mass_top)
    || Number.isFinite(targets.stiffness_top)
    || Number.isFinite(targets.mass_back)
    || Number.isFinite(targets.stiffness_back)
    || Number.isFinite(targets.volume_air)
    || Number.isFinite(targets.area_hole);
}

export function dofFitSolveTweakIdsFromTargets(targets: DofFitInputTargets) {
  const tweakIds: string[] = Array.from(DOF_SOLVE_TWEAK_IDS);
  if (Number.isFinite(targets.mass_top)) tweakIds.push("mass_top");
  if (Number.isFinite(targets.mass_back)) tweakIds.push("mass_back");
  return tweakIds;
}

export function readDofRestrictedTweakIds() {
  return Array.from(DOF_RESTRICTED_TWEAK_IDS);
}

export function dofFitIncreaseOnlyFactorAllowed(id: string, factor: number) {
  if (!DOF_RESTRICTED_TWEAK_IDS.includes(id as typeof DOF_RESTRICTED_TWEAK_IDS[number])) {
    return false;
  }
  return factor >= 1;
}
