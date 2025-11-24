export const Shapes = {
  RECTANGLE: "rectangle",
  TRIANGLE: "triangle",
  PARABOLIC: "parabolic",
  NONE: "none"
} as const;

export type ShapeKind = typeof Shapes[keyof typeof Shapes];

export interface SectionProps {
  area: number;
  centroid: number;
  I: number;
}

export interface SegmentSpec {
  label?: string;
  shape?: ShapeKind;
  h?: number;
  height?: number;
  material?: { E?: number };
  E?: number;
}

export interface BraceSpec {
  segments?: SegmentSpec[];
  bottom?: SegmentSpec;
  middle?: SegmentSpec;
  top?: SegmentSpec;
  b?: number;
  w_plan?: number;
  phi_deg?: number;
  phiDeg?: number;
  phi?: number;
}

export interface BraceSegmentDetail {
  label?: string;
  shape: ShapeKind;
  height: number;
  breadth: number;
  area: number;
  centroid: number;
  I: number;
  modularRatio: number;
  APrime: number;
  IPrime: number;
}

export interface BraceTransformResult {
  breadth: number;
  height: number;
  transformedArea: number;
  transformedCentroid: number;
  transformedI: number;
  segments: BraceSegmentDetail[];
}

export interface TopSection {
  area: number;
  centroid: number;
  I: number;
}

export interface SliceParams {
  spanAA: number;
  topThickness: number;
  topModulus: number;
  braces?: BraceSpec[];
}

export interface SliceResult {
  centroid: number;
  transformedI: number;
  EI: number;
  top: TopSection;
  braces: BraceTransformResult[];
}

function assertPositive(value: number | undefined, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite, positive number.`);
  }
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function shapeProperties(shape: ShapeKind, breadth: number, height: number): SectionProps {
  if (shape === Shapes.NONE) return { area: 0, centroid: 0, I: 0 };
  assertPositive(breadth, "breadth");
  assertPositive(height, "height");

  switch (shape) {
    case Shapes.RECTANGLE: {
      const area = breadth * height;
      const centroid = height / 2;
      const I = (breadth * height ** 3) / 12;
      return { area, centroid, I };
    }
    case Shapes.TRIANGLE: {
      const area = (breadth * height) / 2;
      const centroid = height / 3;
      const I = (breadth * height ** 3) / 36;
      return { area, centroid, I };
    }
    case Shapes.PARABOLIC: {
      const area = (2 / 3) * breadth * height;
      const centroid = (2 / 5) * height;
      const I = (8 / 175) * breadth * height ** 3;
      return { area, centroid, I };
    }
    default:
      throw new Error(`Unsupported shape: ${shape}`);
  }
}

export function computeInterceptBreadth(brace: BraceSpec, spanAA: number): number {
  assertPositive(spanAA, "AA span");
  if (brace.b) {
    assertPositive(brace.b, "brace breadth b");
    return clamp(brace.b, 0, spanAA);
  }
  assertPositive(brace.w_plan, "brace plan width");
  const phiDeg = brace.phi_deg ?? brace.phiDeg ?? brace.phi;
  assertPositive(phiDeg, "brace angle");
  const sinPhi = Math.sin(degToRad(phiDeg));
  if (Math.abs(sinPhi) < 1e-3) {
    throw new Error("Brace angle too shallow; enter intercept breadth b directly.");
  }
  const bRaw = brace.w_plan! / Math.abs(sinPhi);
  return clamp(bRaw, 0, spanAA);
}

export function computeBraceTransformed(
  brace: BraceSpec,
  spanAA: number,
  ETop: number,
  baseOffset: number = 0
): BraceTransformResult {
  assertPositive(ETop, "top modulus");
  if (!Number.isFinite(baseOffset) || baseOffset < 0) {
    throw new Error("brace base offset must be a finite, non-negative number.");
  }
  const breadth = computeInterceptBreadth(brace, spanAA);

  const segments: BraceSegmentDetail[] = [];
  const normalizedSegments = (brace.segments ?? []).map((segment, index) => ({
    ...segment,
    label: segment.label ?? `segment ${index + 1}`
  }));
  const fallbackStack = [
    brace.bottom && { ...brace.bottom, label: brace.bottom.label ?? "bottom" },
    brace.middle && { ...brace.middle, label: brace.middle.label ?? "middle" },
    brace.top && { ...brace.top, label: brace.top.label ?? "top" }
  ].filter(Boolean) as Array<SegmentSpec & { label: string }>;
  const stack = normalizedSegments.length ? normalizedSegments : fallbackStack;

  let runningBase = 0;
  let transformedArea = 0;
  let transformedCentroidNumerator = 0;
  const transformedMoments: Array<{ APrime: number; IPrime: number; yAbs: number }> = [];

  for (const segment of stack) {
    const shape = segment.shape ?? Shapes.NONE;
    const height = segment.h ?? segment.height ?? 0;
    if (height <= 0 || shape === Shapes.NONE) {
      continue;
    }
    const props = shapeProperties(shape, breadth, height);
    const yAbs = baseOffset + runningBase + props.centroid;
    const Eseg = segment.material?.E ?? segment.E;
    assertPositive(Eseg, `${segment.label || "segment"} modulus`);
    const modularRatio = Eseg / ETop;
    const APrime = modularRatio * props.area;
    const IPrime = modularRatio * props.I;

    transformedArea += APrime;
    transformedCentroidNumerator += APrime * yAbs;
    transformedMoments.push({ APrime, IPrime, yAbs });

    segments.push({
      label: segment.label,
      shape,
      height,
      breadth,
      area: props.area,
      centroid: yAbs,
      I: props.I,
      modularRatio,
      APrime,
      IPrime
    });

    runningBase += height;
  }

  if (transformedArea === 0) {
    throw new Error("Brace has no active segments.");
  }

  const yBar = transformedCentroidNumerator / transformedArea;
  let ITransformed = 0;
  for (const entry of transformedMoments) {
    const dy = yBar - entry.yAbs;
    ITransformed += entry.IPrime + entry.APrime * dy ** 2;
  }

  return {
    breadth,
    height: runningBase,
    transformedArea,
    transformedCentroid: yBar,
    transformedI: ITransformed,
    segments
  };
}

export function computeTopSection(spanAA: number, thickness: number): TopSection {
  assertPositive(spanAA, "AA span");
  assertPositive(thickness, "top thickness");
  const area = spanAA * thickness;
  const centroid = thickness / 2;
  const I = (spanAA * thickness ** 3) / 12;
  return { area, centroid, I };
}

export function computeSlice(params: SliceParams): SliceResult {
  const { spanAA, topThickness, topModulus, braces = [] } = params;
  assertPositive(topModulus, "top modulus");
  const top = computeTopSection(spanAA, topThickness);

  const braceResults = braces.map(brace =>
    computeBraceTransformed(brace, spanAA, topModulus, topThickness)
  );

  const totalTransformedArea = braceResults.reduce((sum, brace) => sum + brace.transformedArea, top.area);
  const centroidNumerator =
    top.area * top.centroid +
    braceResults.reduce((sum, brace) => sum + brace.transformedArea * brace.transformedCentroid, 0);
  const yBar = centroidNumerator / totalTransformedArea;

  let ITransformed = top.I + top.area * (yBar - top.centroid) ** 2;
  for (const brace of braceResults) {
    const dy = yBar - brace.transformedCentroid;
    ITransformed += brace.transformedI + brace.transformedArea * dy ** 2;
  }

  const EI = topModulus * ITransformed;

  return {
    centroid: yBar,
    transformedI: ITransformed,
    EI,
    top,
    braces: braceResults
  };
}

export const FlexuralRigidity = {
  Shapes,
  shapeProperties,
  computeInterceptBreadth,
  computeBraceTransformed,
  computeTopSection,
  computeSlice,
  clamp,
  degToRad
};

export default FlexuralRigidity;

declare global {
  interface Window {
    FlexuralRigidity?: typeof FlexuralRigidity;
  }
}

if (typeof window !== "undefined") {
  window.FlexuralRigidity = FlexuralRigidity;
}

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = FlexuralRigidity;
}
