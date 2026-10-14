import {
  computeBraceGeometry,
  type BraceGeometryResult,
  type BraceSegmentSpec,
} from "./brace-geometry.js";

export type BraceMatchPlanStock = {
  sourceLabel: string;
  densityKgM3: number;
  modulusGPa: number;
};

export type BraceMatchPlanBrace = {
  id: string;
  name: string;
  segments: BraceSegmentSpec[];
};

export type BraceMatchPlanResult = {
  id: string;
  name: string;
  planned: BraceGeometryResult;
  exact: BraceGeometryResult;
  proposed: BraceGeometryResult;
  exactSegments: BraceSegmentSpec[];
  proposedSegments: BraceSegmentSpec[];
  breadthScale: number;
  heightScale: number;
  rigidityDifferencePercent: number;
  massDifferencePercent: number;
  constraintNotices: string[];
};

export type BraceMatchPlanOptions = {
  incrementMm?: number;
  policy?: "match-stiffness-and-weight" | "keep-width";
  fixedBreadthMm?: number;
  minimumBreadthMm?: number;
  minimumHeightMm?: number;
};

export function braceMatchPlanSolve(
  brace: BraceMatchPlanBrace,
  stock: BraceMatchPlanStock,
  optionsOrIncrement: BraceMatchPlanOptions | number = 0.1,
): BraceMatchPlanResult {
  const options = braceMatchPlanOptionsResolve(optionsOrIncrement);
  braceMatchPlanStockValidate(stock);
  braceMatchPlanOptionsValidate(options);
  const plannedBreadth = braceMatchPlanDefaultBreadthResolve(brace.segments);
  const planned = computeBraceGeometry(plannedBreadth, brace.segments);
  const scales = braceMatchPlanScalesCalculate(planned, stock, plannedBreadth, options);
  const exactSegments = brace.segments.map((segment) => braceMatchPlanSegmentScale(
    segment,
    plannedBreadth,
    scales,
    stock,
    null,
  ));
  const constraintNotices: string[] = [];
  const proposedSegments = exactSegments.map((segment) => braceMatchPlanSegmentConstrain(
    segment,
    options,
    constraintNotices,
  ));
  const exactBreadth = braceMatchPlanDefaultBreadthResolve(exactSegments);
  const proposedBreadth = braceMatchPlanDefaultBreadthResolve(proposedSegments);
  const exact = computeBraceGeometry(exactBreadth, exactSegments);
  const proposed = computeBraceGeometry(proposedBreadth, proposedSegments);
  return {
    id: brace.id,
    name: brace.name,
    planned,
    exact,
    proposed,
    exactSegments,
    proposedSegments,
    breadthScale: scales.breadth,
    heightScale: scales.height,
    rigidityDifferencePercent: braceMatchPlanDifferencePercent(proposed.EI, planned.EI),
    massDifferencePercent: braceMatchPlanDifferencePercent(proposed.massPerLength, planned.massPerLength),
    constraintNotices: [...new Set(constraintNotices)],
  };
}

function braceMatchPlanScalesCalculate(
  planned: BraceGeometryResult,
  stock: BraceMatchPlanStock,
  plannedBreadthMm: number,
  options: Required<BraceMatchPlanOptions>,
) {
  const areaM2 = planned.area * 1e-6;
  const inertiaM4 = planned.I * 1e-12;
  const areaScale = planned.massPerLength / (stock.densityKgM3 * areaM2);
  const rigidityScale = planned.EI / (stock.modulusGPa * 1e9 * inertiaM4);
  if (options.policy === "keep-width") {
    const breadth = options.fixedBreadthMm / plannedBreadthMm;
    return {
      breadth,
      height: Math.cbrt(rigidityScale / breadth),
    };
  }
  const height = Math.sqrt(rigidityScale / areaScale);
  const breadth = areaScale / height;
  return { breadth, height };
}

function braceMatchPlanSegmentScale(
  segment: BraceSegmentSpec,
  defaultBreadth: number,
  scales: { breadth: number; height: number },
  stock: BraceMatchPlanStock,
  incrementMm: number | null,
): BraceSegmentSpec {
  const height = (segment.height as number) * scales.height;
  const breadth = (segment.breadth ?? defaultBreadth) * scales.breadth;
  return {
    ...segment,
    height: incrementMm ? braceMatchPlanRound(height, incrementMm) : height,
    breadth: incrementMm ? braceMatchPlanRound(breadth, incrementMm) : breadth,
    density: stock.densityKgM3,
    modulus: stock.modulusGPa,
  };
}

function braceMatchPlanSegmentConstrain(
  segment: BraceSegmentSpec,
  options: Required<BraceMatchPlanOptions>,
  notices: string[],
) {
  const roundedHeight = braceMatchPlanRound(segment.height as number, options.incrementMm);
  const roundedBreadth = braceMatchPlanRound(segment.breadth as number, options.incrementMm);
  const height = Math.max(options.minimumHeightMm, roundedHeight);
  const breadth = Math.max(options.minimumBreadthMm, roundedBreadth);
  if (height !== roundedHeight) notices.push(`Minimum height ${options.minimumHeightMm} mm applied.`);
  if (breadth !== roundedBreadth) notices.push(`Minimum breadth ${options.minimumBreadthMm} mm applied.`);
  return { ...segment, height, breadth };
}

function braceMatchPlanDefaultBreadthResolve(segments: BraceSegmentSpec[]) {
  const breadth = segments.find((segment) => Number.isFinite(segment.breadth))?.breadth;
  if (!Number.isFinite(breadth) || (breadth as number) <= 0) {
    throw new Error("Match Plan requires a positive planned brace breadth.");
  }
  return breadth as number;
}

function braceMatchPlanDifferencePercent(actual: number, target: number) {
  return ((actual - target) / target) * 100;
}

function braceMatchPlanRound(value: number, incrementMm: number) {
  return Math.max(incrementMm, Math.round(value / incrementMm) * incrementMm);
}

function braceMatchPlanOptionsResolve(
  optionsOrIncrement: BraceMatchPlanOptions | number,
): Required<BraceMatchPlanOptions> {
  const options = typeof optionsOrIncrement === "number"
    ? { incrementMm: optionsOrIncrement }
    : optionsOrIncrement;
  return {
    incrementMm: options.incrementMm ?? 0.1,
    policy: options.policy ?? "match-stiffness-and-weight",
    fixedBreadthMm: options.fixedBreadthMm ?? 6,
    minimumBreadthMm: options.minimumBreadthMm ?? 0,
    minimumHeightMm: options.minimumHeightMm ?? 0,
  };
}

function braceMatchPlanStockValidate(stock: BraceMatchPlanStock) {
  if (!Number.isFinite(stock.densityKgM3) || stock.densityKgM3 <= 0) {
    throw new Error("Match Plan stock density must be positive.");
  }
  if (!Number.isFinite(stock.modulusGPa) || stock.modulusGPa <= 0) {
    throw new Error("Match Plan stock modulus must be positive.");
  }
}

function braceMatchPlanOptionsValidate(options: Required<BraceMatchPlanOptions>) {
  if (!Number.isFinite(options.incrementMm) || options.incrementMm <= 0) {
    throw new Error("Match Plan increment must be positive.");
  }
  if (options.policy === "keep-width" && (!Number.isFinite(options.fixedBreadthMm) || options.fixedBreadthMm <= 0)) {
    throw new Error("Match Plan fixed breadth must be positive.");
  }
  if (!Number.isFinite(options.minimumBreadthMm) || options.minimumBreadthMm < 0) {
    throw new Error("Match Plan minimum breadth cannot be negative.");
  }
  if (!Number.isFinite(options.minimumHeightMm) || options.minimumHeightMm < 0) {
    throw new Error("Match Plan minimum height cannot be negative.");
  }
}

export const BraceMatchPlan = {
  solve: braceMatchPlanSolve,
};

declare global {
  interface Window {
    BraceMatchPlan?: typeof BraceMatchPlan;
  }
}

if (typeof window !== "undefined") {
  window.BraceMatchPlan = BraceMatchPlan;
}
