type FlexCalcAPI = typeof import("../calculator").FlexuralRigidity;

declare const require: undefined | ((path: string) => any);

const FlexuralRigidity: FlexCalcAPI | undefined =
  (typeof window !== "undefined" && window.FlexuralRigidity) ||
  (typeof require === "function" ? (require("../calculator") as { FlexuralRigidity: FlexCalcAPI }).FlexuralRigidity : undefined);

if (!FlexuralRigidity) {
  throw new Error("FlexuralRigidity calculator is unavailable.");
}

const { shapeProperties, Shapes } = FlexuralRigidity;

export type ShapeKind = typeof Shapes[keyof typeof Shapes];

export interface BraceSegmentSpec {
  label?: string;
  shape: ShapeKind;
  height: number;
  breadth?: number;
  density?: number; // kg/m³
  modulus?: number; // GPa
}

export interface BraceSegmentDetail {
  label?: string;
  shape: ShapeKind;
  height: number;
  breadth: number;
  base: number;
  area: number;
  centroid: number;
  centroidFromBase: number;
  I: number;
  density: number;
  modulus: number;
  massPerLength: number;
  EI: number;
}

export interface BraceGeometryResult {
  breadth: number;
  height: number;
  area: number;
  centroid: number;
  I: number;
  massPerLength: number;
  EI: number;
  segments: BraceSegmentDetail[];
}

function assertPositive(value: number, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number`);
  }
}

const DEFAULT_DENSITY = 420; // kg/m³, spruce-ish
const DEFAULT_MODULUS = 11; // GPa

export function computeBraceGeometry(defaultBreadth: number, segments: BraceSegmentSpec[]): BraceGeometryResult {
  assertPositive(defaultBreadth, "Brace breadth");
  if (!segments.length) {
    throw new Error("Add at least one segment to compute brace geometry.");
  }

  let runningBase = 0;
  let areaSum = 0;
  let centroidNumerator = 0;
  let massSum = 0;
  let eisum = 0;
  const rawSegments: BraceSegmentDetail[] = [];

  for (const segment of segments) {
    const { shape, height } = segment;
    assertPositive(height, `${segment.label || "Segment"} height`);
    const segBreadth = segment.breadth ?? defaultBreadth;
    assertPositive(segBreadth, `${segment.label || "Segment"} breadth`);
    const density = segment.density ?? DEFAULT_DENSITY;
    assertPositive(density, `${segment.label || "Segment"} density`);
    const modulus = segment.modulus ?? DEFAULT_MODULUS;
    assertPositive(modulus, `${segment.label || "Segment"} modulus`);
    const props = shapeProperties(shape, segBreadth, height);
    const centroidAbs = runningBase + props.centroid;
    areaSum += props.area;
    centroidNumerator += props.area * centroidAbs;
    const areaM2 = props.area * 1e-6;
    const massPerLength = density * areaM2;
    const EIvalue = modulus * 1e9 * (props.I * 1e-12);
    massSum += massPerLength;
    eisum += EIvalue;
    rawSegments.push({
      label: segment.label,
      shape,
      height,
      breadth: segBreadth,
      base: runningBase,
      area: props.area,
      centroid: centroidAbs,
      centroidFromBase: props.centroid,
      I: props.I,
      density,
      modulus,
      massPerLength,
      EI: EIvalue
    });
    runningBase += height;
  }

  if (areaSum === 0) {
    throw new Error("Total area is zero; check segment inputs.");
  }

  const centroid = centroidNumerator / areaSum;
  let ITotal = 0;
  for (const segment of rawSegments) {
    const distance = centroid - segment.centroid;
    ITotal += segment.I + segment.area * distance ** 2;
  }

  return {
    breadth: defaultBreadth,
    height: runningBase,
    area: areaSum,
    centroid,
    I: ITotal,
    massPerLength: massSum,
    EI: eisum,
    segments: rawSegments
  };
}

export const BraceGeometry = {
  Shapes,
  computeBraceGeometry
};

export default BraceGeometry;

declare global {
  interface Window {
    BraceGeometry?: typeof BraceGeometry;
  }
}

if (typeof window !== "undefined") {
  window.BraceGeometry = BraceGeometry;
}

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = BraceGeometry;
}
