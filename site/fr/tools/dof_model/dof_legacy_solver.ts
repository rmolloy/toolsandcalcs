type DofLegacyRuntime = {
  computeResponse?: (params: Record<string, number>) => unknown;
  ModelCore?: {
    computeResponse?: (params: Record<string, number>) => unknown;
  };
  Atmosphere?: {
    REFERENCE_RHO?: number;
    deriveAtmosphere?: (altitude: number, temperature: number) => {
      rho: number;
      c: number;
      pressure: number;
      tempK: number;
    };
  };
};

export function computeDofLegacyResponse(
  runtime: DofLegacyRuntime,
  params: Record<string, number>,
) {
  try {
    const computeResponse = runtime.computeResponse || runtime.ModelCore?.computeResponse;
    return typeof computeResponse === "function" ? computeResponse(params) : null;
  } catch (error) {
    console.warn("computeResponse failed", error);
    return null;
  }
}

export function adaptDofLegacyParams(
  runtime: DofLegacyRuntime,
  raw: Record<string, number>,
) {
  const params: Record<string, unknown> = { ...raw };
  const deriveAtmosphere = runtime.Atmosphere?.deriveAtmosphere;
  if (typeof deriveAtmosphere !== "function") return params;

  const altitude = finiteDofValueOr(params.altitude, 0);
  const temperature = finiteDofValueOr(params.ambient_temp, 20);
  const atmosphere = deriveAtmosphere(altitude, temperature);
  params.air_density = atmosphere.rho;
  params.speed_of_sound = atmosphere.c;
  params.air_pressure = atmosphere.pressure;
  params.air_temp_k = atmosphere.tempK;
  params._atm = atmosphere;

  const movingAirMass = finiteDofValueOrNull(params.mass_air);
  if (movingAirMass !== null) {
    const referenceDensity = runtime.Atmosphere?.REFERENCE_RHO ?? 1.205;
    params.mass_air = movingAirMass * (atmosphere.rho / referenceDensity);
  }

  return params;
}

function finiteDofValueOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function finiteDofValueOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
