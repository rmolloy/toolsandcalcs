export type DofSimpleSource = {
  amplitudeM2PerKg: number;
  frequencyHz: number;
  id: string;
  name: string;
  q: number;
};

export type DofSimpleSourcePressure = {
  im: number;
  re: number;
};

export type DofSimpleSourcePoint = {
  x: number;
  y: number;
};

export type DofSimpleSourceResponseOptions = {
  airDensityKgPerM3?: number;
  distanceM?: number;
  driveForceN?: number;
  frequencyEndHz?: number;
  frequencyStartHz?: number;
  pressureReferencePa?: number;
  stepHz?: number;
};

const DEFAULT_AIR_DENSITY_KG_PER_M3 = 1.205;
const DEFAULT_DISTANCE_M = 1;
const DEFAULT_DRIVE_FORCE_N = 1;
const DEFAULT_FREQUENCY_END_HZ = 800;
const DEFAULT_FREQUENCY_START_HZ = 100;
const DEFAULT_PRESSURE_REFERENCE_PA = 0.00002;
const DEFAULT_STEP_HZ = 1;

export const CHRISTENSEN_FIGURE_THREE_SOURCES: readonly DofSimpleSource[] = [
  { id: "source_1", name: "Peak 1", frequencyHz: 200, q: 30, amplitudeM2PerKg: 0.6 },
  { id: "source_2", name: "Peak 2", frequencyHz: 400, q: 30, amplitudeM2PerKg: 0.1 },
  { id: "source_3", name: "Peak 3", frequencyHz: 600, q: 30, amplitudeM2PerKg: 0.1 },
];

export const CHRISTENSEN_FIGURE_THREE_SIGN_PRESETS = {
  allPositive: [1, 1, 1],
  secondAndThirdNegative: [1, -1, -1],
  secondNegative: [1, -1, 1],
  thirdNegative: [1, 1, -1],
} as const;

function radiansPerSecond(frequencyHz: number) {
  return 2 * Math.PI * frequencyHz;
}

function responseOptionsResolve(options: DofSimpleSourceResponseOptions) {
  return {
    airDensityKgPerM3: options.airDensityKgPerM3 ?? DEFAULT_AIR_DENSITY_KG_PER_M3,
    distanceM: options.distanceM ?? DEFAULT_DISTANCE_M,
    driveForceN: options.driveForceN ?? DEFAULT_DRIVE_FORCE_N,
    frequencyEndHz: options.frequencyEndHz ?? DEFAULT_FREQUENCY_END_HZ,
    frequencyStartHz: options.frequencyStartHz ?? DEFAULT_FREQUENCY_START_HZ,
    pressureReferencePa: options.pressureReferencePa ?? DEFAULT_PRESSURE_REFERENCE_PA,
    stepHz: options.stepHz ?? DEFAULT_STEP_HZ,
  };
}

export function simpleSourcePressureAtFrequency(
  source: DofSimpleSource,
  frequencyHz: number,
  options: DofSimpleSourceResponseOptions = {},
): DofSimpleSourcePressure {
  const resolved = responseOptionsResolve(options);
  const omega = radiansPerSecond(frequencyHz);
  const omegaZero = radiansPerSecond(source.frequencyHz);
  const dampingRate = omegaZero / source.q;
  const denominatorRe = omegaZero * omegaZero - omega * omega;
  const denominatorIm = dampingRate * omega;
  const denominatorMagnitudeSquared = denominatorRe * denominatorRe + denominatorIm * denominatorIm;
  const numerator = resolved.driveForceN
    * source.amplitudeM2PerKg
    * resolved.airDensityKgPerM3
    * omega
    * omega
    / (4 * Math.PI * resolved.distanceM);

  return {
    re: numerator * denominatorRe / denominatorMagnitudeSquared,
    im: -numerator * denominatorIm / denominatorMagnitudeSquared,
  };
}

export function simpleSourcesPressureAtFrequency(
  sources: readonly DofSimpleSource[],
  frequencyHz: number,
  options: DofSimpleSourceResponseOptions = {},
): DofSimpleSourcePressure {
  return sources.reduce(
    (total, source) => {
      const sourcePressure = simpleSourcePressureAtFrequency(source, frequencyHz, options);
      return {
        re: total.re + sourcePressure.re,
        im: total.im + sourcePressure.im,
      };
    },
    { re: 0, im: 0 },
  );
}

export function simpleSourceLevelDb(
  pressure: DofSimpleSourcePressure,
  pressureReferencePa = DEFAULT_PRESSURE_REFERENCE_PA,
) {
  const magnitude = Math.hypot(pressure.re, pressure.im);
  return 20 * Math.log10(Math.max(magnitude / pressureReferencePa, 1e-30));
}

export function simpleSourcesResponseSeries(
  sources: readonly DofSimpleSource[],
  options: DofSimpleSourceResponseOptions = {},
): DofSimpleSourcePoint[] {
  const resolved = responseOptionsResolve(options);
  const points: DofSimpleSourcePoint[] = [];

  for (
    let frequencyHz = resolved.frequencyStartHz;
    frequencyHz <= resolved.frequencyEndHz + 1e-9;
    frequencyHz += resolved.stepHz
  ) {
    const pressure = simpleSourcesPressureAtFrequency(sources, frequencyHz, resolved);
    points.push({
      x: Number(frequencyHz.toFixed(6)),
      y: simpleSourceLevelDb(pressure, resolved.pressureReferencePa),
    });
  }

  return points;
}

export function simpleSourcesCombinedResponseSeries(
  sources: readonly DofSimpleSource[],
  basePressureAtFrequency: (frequencyHz: number) => DofSimpleSourcePressure,
  options: DofSimpleSourceResponseOptions = {},
): DofSimpleSourcePoint[] {
  const resolved = responseOptionsResolve(options);
  const points: DofSimpleSourcePoint[] = [];

  for (
    let frequencyHz = resolved.frequencyStartHz;
    frequencyHz <= resolved.frequencyEndHz + 1e-9;
    frequencyHz += resolved.stepHz
  ) {
    const sourcePressure = simpleSourcesPressureAtFrequency(sources, frequencyHz, resolved);
    const basePressure = basePressureAtFrequency(frequencyHz);
    points.push({
      x: Number(frequencyHz.toFixed(6)),
      y: simpleSourceLevelDb({
        re: basePressure.re + sourcePressure.re,
        im: basePressure.im + sourcePressure.im,
      }, resolved.pressureReferencePa),
    });
  }

  return points;
}

export function simpleSourcesWithSigns(
  signs: readonly number[],
  sources: readonly DofSimpleSource[] = CHRISTENSEN_FIGURE_THREE_SOURCES,
) {
  return sources.map((source, index) => ({
    ...source,
    amplitudeM2PerKg: source.amplitudeM2PerKg * (signs[index] ?? 1),
  }));
}
