/*
© 2025 Rick Molloy. All rights reserved.

Monopole mobility engine: the Gore-style static jig and the dynamic mass-loading calculations, their input
checks and their bench warnings. Shared by the page, the Guitar Lab connector panel and Vitest. It holds no
words: results and warnings carry message keys the caller turns into its own localized text.
*/

(() => {
  const GRAVITY_M_PER_S2 = 9.8;
  const INPUT_MATCH_TOLERANCE = 1e-9;

  // Rick Molloy's OM bench readings of 10/25/2025, the readings the page opens with.
  const referenceReadings: { static: MonopoleStaticInputs; dynamic: MonopoleDynamicInputs } = Object.freeze({
    static: Object.freeze({ freq: 153, deflection: 0.18, mass: 1.02 }),
    dynamic: Object.freeze({ f0: 153, f1: 141, addedMass: 20 }),
  });

  type MonopoleRefusalKey =
    | "waitingForCompleteInputs"
    | "addedMassGreaterThanZero"
    | "loadedFrequencyMustBeLower"
    | "invalidDenominator"
    | "invalidEffectiveMass";

  type MonopoleWarningKey =
    | "staticFrequencyWarning"
    | "deflectionSmallWarning"
    | "deflectionHighWarning"
    | "testMassWarning"
    | "dynamicFrequencyWarning"
    | "dynamicAddedMassWarning"
    | "frequencyShiftSmallWarning"
    | "mobilityLowWarning"
    | "mobilityHighWarning";

  interface MonopoleMobilitySolution {
    ok: true;
    stiffness: number; // N/m
    meffKg: number; // kg
    mobilityScore: number;
    warnings: MonopoleWarningKey[];
  }

  interface MonopoleMobilityRefusal {
    ok: false;
    messageKey: MonopoleRefusalKey;
  }

  type MonopoleMobilityResult = MonopoleMobilitySolution | MonopoleMobilityRefusal;

  interface MonopoleStaticInputs {
    freq: number; // Hz, sealed-soundhole monopole peak
    deflection: number; // mm under the test mass
    mass: number; // kg test mass
  }

  interface MonopoleDynamicInputs {
    f0: number; // Hz unloaded
    f1: number; // Hz loaded
    addedMass: number; // g
  }

  function computeStaticMobility(freq: number, deflection: number, mass: number): MonopoleMobilityResult {
    const valid =
      Number.isFinite(freq) &&
      Number.isFinite(deflection) &&
      Number.isFinite(mass) &&
      freq > 0 &&
      deflection > 0 &&
      mass > 0;

    if (!valid) {
      return refusal("waitingForCompleteInputs");
    }

    const defM = deflection / 1000;
    const stiffness = (mass * GRAVITY_M_PER_S2) / defM;
    const meffKg = stiffness / Math.pow(2 * Math.PI * freq, 2);
    const mobilityScore = 1000 / Math.sqrt(stiffness * meffKg);

    return {
      ok: true,
      stiffness,
      meffKg,
      mobilityScore,
      warnings: staticWarnings({ freq, deflection, mass }, mobilityScore),
    };
  }

  function computeDynamicMobility(f0: number, f1: number, addedMassGrams: number): MonopoleMobilityResult {
    const valid =
      Number.isFinite(f0) &&
      Number.isFinite(f1) &&
      Number.isFinite(addedMassGrams) &&
      f0 > 0 &&
      f1 > 0;

    if (!valid) {
      return refusal("waitingForCompleteInputs");
    }

    if (addedMassGrams <= 0) {
      return refusal("addedMassGreaterThanZero");
    }

    if (f1 >= f0) {
      return refusal("loadedFrequencyMustBeLower");
    }

    const addedMassKg = addedMassGrams / 1000;
    const denom = Math.pow(f0, 2) - Math.pow(f1, 2);

    if (denom <= 0) {
      return refusal("invalidDenominator");
    }

    const meffKg = (Math.pow(f1, 2) * addedMassKg) / denom;
    if (!Number.isFinite(meffKg) || meffKg <= 0) {
      return refusal("invalidEffectiveMass");
    }

    const stiffness = Math.pow(2 * Math.PI * f0, 2) * meffKg;
    const mobilityScore = 1000 / Math.sqrt(stiffness * meffKg);

    return {
      ok: true,
      stiffness,
      meffKg,
      mobilityScore,
      warnings: dynamicWarnings({ f0, f1, addedMass: addedMassGrams }, mobilityScore),
    };
  }

  function staticWarnings({ freq, deflection, mass }: MonopoleStaticInputs, mobilityScore: number): MonopoleWarningKey[] {
    const warnings: MonopoleWarningKey[] = [];
    if (freq < 90 || freq > 220) {
      warnings.push("staticFrequencyWarning");
    }
    if (deflection < 0.05) {
      warnings.push("deflectionSmallWarning");
    } else if (deflection > 0.5) {
      warnings.push("deflectionHighWarning");
    }
    if (mass < 0.3 || mass > 2.0) {
      warnings.push("testMassWarning");
    }
    return warnings.concat(mobilityWarnings(mobilityScore));
  }

  function dynamicWarnings({ f0, f1, addedMass }: MonopoleDynamicInputs, mobilityScore: number): MonopoleWarningKey[] {
    const warnings: MonopoleWarningKey[] = [];
    if (f0 < 90 || f0 > 240) {
      warnings.push("dynamicFrequencyWarning");
    }
    if (addedMass < 2 || addedMass > 80) {
      warnings.push("dynamicAddedMassWarning");
    }
    if (f0 - f1 < 2) {
      warnings.push("frequencyShiftSmallWarning");
    }
    return warnings.concat(mobilityWarnings(mobilityScore));
  }

  function mobilityWarnings(mobilityScore: number): MonopoleWarningKey[] {
    if (!Number.isFinite(mobilityScore)) {
      return [];
    }
    if (mobilityScore < 15) {
      return ["mobilityLowWarning"];
    }
    if (mobilityScore > 40) {
      return ["mobilityHighWarning"];
    }
    return [];
  }

  function staticInputsMatch(inputs: MonopoleStaticInputs, reference: MonopoleStaticInputs): boolean {
    return (
      valuesMatch(inputs.freq, reference.freq) &&
      valuesMatch(inputs.deflection, reference.deflection) &&
      valuesMatch(inputs.mass, reference.mass)
    );
  }

  function dynamicInputsMatch(inputs: MonopoleDynamicInputs, reference: MonopoleDynamicInputs): boolean {
    return (
      valuesMatch(inputs.f0, reference.f0) &&
      valuesMatch(inputs.f1, reference.f1) &&
      valuesMatch(inputs.addedMass, reference.addedMass)
    );
  }

  function valuesMatch(value: number, reference: number): boolean {
    return Math.abs(value - reference) < INPUT_MATCH_TOLERANCE;
  }

  function refusal(messageKey: MonopoleRefusalKey): MonopoleMobilityRefusal {
    return { ok: false, messageKey };
  }

  const MonopoleMobilityEngine = {
    computeStaticMobility,
    computeDynamicMobility,
    staticInputsMatch,
    dynamicInputsMatch,
    referenceReadings,
  };

  (typeof window !== "undefined" ? window : (globalThis as any)).MonopoleMobilityEngine = MonopoleMobilityEngine;
  if (typeof module !== "undefined" && (module as any).exports) {
    (module as any).exports = MonopoleMobilityEngine;
  }
})();
