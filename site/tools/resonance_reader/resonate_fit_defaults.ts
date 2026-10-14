export const BASE_PARAMS = {
  model_order: 4,
  ambient_temp: 20,
  altitude: 0,
  driving_force: 0.4,
  area_hole: 0.0055,
  mass_air: 0.5,
  volume_air: 0.0141,
  damping_air: 0.005,
  mass_top: 43.0,
  stiffness_top: 42700,
  damping_top: 1.5,
  area_top: 0.039,
  mass_back: 94.0,
  stiffness_back: 130000,
  damping_back: 7.0,
  area_back: 0.040,
  mass_sides: 800.0,
  stiffness_sides: 1400000,
  damping_sides: 10.0,
  area_sides: 0.025,
};

export const MASS_PARAM_IDS = ["mass_air", "mass_top", "mass_back", "mass_sides"] as const;

export const FIT_BOUNDS: Record<string, { min: number; max: number }> = {
  area_hole: { min: 0.003, max: 0.01 },
  volume_air: { min: 0.01, max: 0.025 },
  stiffness_top: { min: 20000, max: 150000 },
  stiffness_back: { min: 80000, max: 220000 },
  mass_top: { min: 20, max: 220 },
  mass_back: { min: 40, max: 360 },
};
