import { computeSlice, type BraceSpec } from "../calculator.js";
import { computeBraceGeometry } from "./brace-geometry.js";
import {
  braceMatchPlanSolve,
  type BraceMatchPlanBrace,
  type BraceMatchPlanOptions,
  type BraceMatchPlanResult,
  type BraceMatchPlanStock,
} from "./brace-match-plan.js";

export type BraceMatchSystemTop = {
  spanMm: number;
  thicknessMm: number;
  modulusGPa: number;
};

export type BraceMatchSystemResult = {
  feasible: boolean;
  message: string;
  plans: BraceMatchPlanResult[];
  targetEINm2: number;
  proposedEINm2: number;
  systemDifferencePercent: number;
  heightCorrectionScale: number;
};

export function braceMatchSystemSolve(
  braces: BraceMatchPlanBrace[],
  stock: BraceMatchPlanStock,
  referenceTop: BraceMatchSystemTop,
  actualTop: BraceMatchSystemTop,
  options: BraceMatchPlanOptions = {},
  adjustableBraceIds?: readonly string[],
): BraceMatchSystemResult {
  braceMatchSystemTopValidate(referenceTop, "Reference top");
  braceMatchSystemTopValidate(actualTop, "Actual top");
  const basePlans = braces.map((brace) => braceMatchPlanSolve(brace, stock, options));
  const adjustableIds = new Set(adjustableBraceIds ?? braces.map((brace) => brace.id));
  const targetEI = braceMatchSystemSliceCalculate(referenceTop, braces.map((brace) => brace.segments)).EI;
  const fixedBraceSegments = basePlans
    .filter((plan) => !adjustableIds.has(plan.id))
    .map((plan) => plan.planned.segments);
  const minimumEI = braceMatchSystemSliceCalculate(actualTop, fixedBraceSegments).EI;
  const unchangedSystemEI = braceMatchSystemSliceCalculate(
    actualTop,
    basePlans.map((plan) => plan.planned.segments),
  ).EI;

  if (adjustableIds.size === 0) {
    return braceMatchSystemResultCreate(
      true,
      "All braces held unchanged; showing the effect of the actual top without brace resizing.",
      braceMatchSystemPlansPreserve(basePlans),
      targetEI,
      unchangedSystemEI,
      1,
    );
  }

  if (minimumEI >= targetEI) {
    return braceMatchSystemResultCreate(
      false,
      fixedBraceSegments.length === 0
        ? "The actual top alone meets or exceeds the plan target; brace-only matching is not possible."
        : "The actual top and unchanged braces meet or exceed the plan target; resize another brace or change the inputs.",
      braceMatchSystemPlansPreserve(basePlans),
      targetEI,
      unchangedSystemEI,
      0,
    );
  }

  const correctionScale = braceMatchSystemHeightCorrectionSolve(
    targetEI,
    actualTop,
    basePlans,
    adjustableIds,
  );
  const correctedPlans = braceMatchSystemPlansCorrect(
    basePlans,
    correctionScale,
    options,
    adjustableIds,
  );
  const proposedEI = braceMatchSystemSliceCalculate(
    actualTop,
    correctedPlans.map((plan) => plan.proposedSegments),
  ).EI;

  return braceMatchSystemResultCreate(
    true,
    braceMatchSystemMessageBuild(basePlans.length, adjustableIds.size),
    correctedPlans,
    targetEI,
    proposedEI,
    correctionScale,
  );
}

function braceMatchSystemHeightCorrectionSolve(
  targetEI: number,
  actualTop: BraceMatchSystemTop,
  plans: BraceMatchPlanResult[],
  adjustableIds: Set<string>,
) {
  const calculateEI = (heightScale: number) => braceMatchSystemSliceCalculate(
    actualTop,
    plans.map((plan) => adjustableIds.has(plan.id)
      ? braceMatchSystemSegmentsScaleHeight(plan.exactSegments, heightScale)
      : plan.planned.segments),
  ).EI;
  let low = 0;
  let high = 1;
  while (calculateEI(high) < targetEI && high < 64) high *= 2;
  if (calculateEI(high) < targetEI) {
    throw new Error("Match Plan could not reach the system rigidity target within practical scaling bounds.");
  }
  for (let iteration = 0; iteration < 60; iteration += 1) {
    const middle = (low + high) / 2;
    if (calculateEI(middle) < targetEI) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

function braceMatchSystemPlansCorrect(
  plans: BraceMatchPlanResult[],
  heightScale: number,
  options: BraceMatchPlanOptions,
  adjustableIds: Set<string>,
) {
  return plans.map((plan) => {
    if (!adjustableIds.has(plan.id)) return braceMatchSystemPlanPreserve(plan);
    const exactSegments = braceMatchSystemSegmentsScaleHeight(plan.exactSegments, heightScale);
    const proposedSegments = braceMatchSystemSegmentsRound(exactSegments, options);
    const exact = computeBraceGeometry(braceMatchSystemBreadthRead(exactSegments), exactSegments);
    const proposed = computeBraceGeometry(braceMatchSystemBreadthRead(proposedSegments), proposedSegments);
    return {
      ...plan,
      exact,
      proposed,
      exactSegments,
      proposedSegments,
      heightScale: plan.heightScale * heightScale,
      rigidityDifferencePercent: braceMatchSystemDifferencePercent(proposed.EI, plan.planned.EI),
      massDifferencePercent: braceMatchSystemDifferencePercent(proposed.massPerLength, plan.planned.massPerLength),
    };
  });
}

function braceMatchSystemPlansPreserve(plans: BraceMatchPlanResult[]) {
  return plans.map(braceMatchSystemPlanPreserve);
}

function braceMatchSystemPlanPreserve(plan: BraceMatchPlanResult): BraceMatchPlanResult {
  return {
    ...plan,
    exact: plan.planned,
    proposed: plan.planned,
    exactSegments: plan.planned.segments,
    proposedSegments: plan.planned.segments,
    breadthScale: 1,
    heightScale: 1,
    rigidityDifferencePercent: 0,
    massDifferencePercent: 0,
    constraintNotices: [],
  };
}

function braceMatchSystemMessageBuild(braceCount: number, adjustableCount: number) {
  const unchangedCount = braceCount - adjustableCount;
  if (unchangedCount === 0) {
    return "Actual top held fixed; all brace heights adjusted to match the plan system rigidity.";
  }
  return `Actual top and ${unchangedCount} ${unchangedCount === 1 ? "brace" : "braces"} held unchanged; remaining brace heights adjusted to match the plan system rigidity.`;
}

function braceMatchSystemSegmentsScaleHeight(
  segments: BraceMatchPlanResult["exactSegments"],
  heightScale: number,
) {
  return segments.map((segment) => ({
    ...segment,
    height: (segment.height as number) * heightScale,
  }));
}

function braceMatchSystemSegmentsRound(
  segments: BraceMatchPlanResult["exactSegments"],
  options: BraceMatchPlanOptions,
) {
  const increment = options.incrementMm ?? 0.1;
  const minimumBreadth = options.minimumBreadthMm ?? 0;
  const minimumHeight = options.minimumHeightMm ?? 0;
  return segments.map((segment) => ({
    ...segment,
    breadth: Math.max(minimumBreadth, braceMatchSystemRound(segment.breadth as number, increment)),
    height: Math.max(minimumHeight, braceMatchSystemRound(segment.height as number, increment)),
  }));
}

function braceMatchSystemSliceCalculate(
  top: BraceMatchSystemTop,
  braceSegments: BraceMatchPlanBrace["segments"][],
) {
  return computeSlice({
    spanAA: top.spanMm,
    topThickness: top.thicknessMm,
    topModulus: top.modulusGPa * 1000,
    braces: braceSegments.map(braceMatchSystemBraceSpecCreate),
  });
}

function braceMatchSystemBraceSpecCreate(
  segments: BraceMatchPlanBrace["segments"],
): BraceSpec {
  return {
    b: braceMatchSystemBreadthRead(segments),
    segments: segments.map((segment) => ({
      label: segment.label,
      shape: segment.shape,
      h: segment.height,
      breadth: segment.breadth,
      material: { E: (segment.modulus as number) * 1000 },
    })),
  };
}

function braceMatchSystemBreadthRead(segments: BraceMatchPlanBrace["segments"]) {
  return Math.max(...segments.map((segment) => segment.breadth as number));
}

function braceMatchSystemResultCreate(
  feasible: boolean,
  message: string,
  plans: BraceMatchPlanResult[],
  targetEI: number,
  proposedEI: number,
  heightCorrectionScale: number,
): BraceMatchSystemResult {
  return {
    feasible,
    message,
    plans,
    targetEINm2: targetEI / 1e6,
    proposedEINm2: proposedEI / 1e6,
    systemDifferencePercent: braceMatchSystemDifferencePercent(proposedEI, targetEI),
    heightCorrectionScale,
  };
}

function braceMatchSystemDifferencePercent(actual: number, target: number) {
  return ((actual - target) / target) * 100;
}

function braceMatchSystemRound(value: number, increment: number) {
  return Math.max(increment, Math.round(value / increment) * increment);
}

function braceMatchSystemTopValidate(top: BraceMatchSystemTop, label: string) {
  if (!Number.isFinite(top.spanMm) || top.spanMm <= 0) throw new Error(`${label} span must be positive.`);
  if (!Number.isFinite(top.thicknessMm) || top.thicknessMm <= 0) throw new Error(`${label} thickness must be positive.`);
  if (!Number.isFinite(top.modulusGPa) || top.modulusGPa <= 0) throw new Error(`${label} modulus must be positive.`);
}

export const BraceMatchSystem = {
  solve: braceMatchSystemSolve,
};

declare global {
  interface Window {
    BraceMatchSystem?: typeof BraceMatchSystem;
  }
}

if (typeof window !== "undefined") {
  window.BraceMatchSystem = BraceMatchSystem;
}
