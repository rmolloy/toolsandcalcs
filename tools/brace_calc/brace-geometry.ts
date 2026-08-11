type FlexCalcAPI = typeof import("../calculator").FlexuralRigidity;

declare const require: undefined | ((path: string) => any);

export function resolveFlexuralRigidity(
  browserApi: FlexCalcAPI | undefined,
  commonJsRequire: typeof require,
): FlexCalcAPI | undefined {
  if (browserApi) return browserApi;
  if (!commonJsRequire) return undefined;
  return (commonJsRequire("../calculator") as { FlexuralRigidity: FlexCalcAPI })
    .FlexuralRigidity;
}

const FlexuralRigidity = resolveFlexuralRigidity(
  typeof window !== "undefined" ? window.FlexuralRigidity : undefined,
  typeof require === "function" ? require : undefined,
);

if (!FlexuralRigidity) {
  throw new Error("FlexuralRigidity calculator is unavailable.");
}

const { computeBraceElasticRigidity, shapeProperties, Shapes } = FlexuralRigidity;

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

export interface BraceCalculationInput {
  id: string;
  segments: Array<BraceSegmentSpec & {
    breadth: number;
    density: number;
    modulus: number;
  }>;
}

export interface BraceCalculationInfo {
  result?: BraceGeometryResult;
  error?: string;
}

export interface BraceCalculationModel {
  renderInfo: Record<string, BraceCalculationInfo>;
  scales: {
    referenceBreadth: number;
    maxHeight: number;
  };
}

export interface BraceComparisonInput extends BraceCalculationInput {
  name: string;
}

export interface BraceComparisonEntry {
  id: string;
  name: string;
  relativeEI: number;
  relativeI: number;
  relativeMass: number;
  relativeArea: number;
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
  const elasticRigidity = computeBraceElasticRigidity(
    {
      b: defaultBreadth,
      segments: rawSegments.map((segment) => ({
        label: segment.label,
        shape: segment.shape,
        h: segment.height,
        breadth: segment.breadth,
        material: { E: segment.modulus * 1000 },
      })),
    },
    defaultBreadth,
    1000,
  );

  return {
    breadth: defaultBreadth,
    height: runningBase,
    area: areaSum,
    centroid,
    I: ITotal,
    massPerLength: massSum,
    EI: elasticRigidity.EI / 1e6,
    segments: rawSegments
  };
}

export function calculateBraceRenderModel(
  braces: BraceCalculationInput[],
  defaults: {
    density: number;
    modulus: number;
  },
): BraceCalculationModel {
  const renderInfo: Record<string, BraceCalculationInfo> = {};
  const totalHeights: number[] = [];
  const breadths: number[] = [];

  braces.forEach((brace) => {
    const stack = brace.segments
      .map((segment) => ({
        label: segment.label,
        shape: segment.shape,
        height: Math.max(0, segment.height),
        breadth: Math.max(0.5, segment.breadth ?? 10),
        density: segment.density ?? defaults.density,
        modulus: segment.modulus ?? defaults.modulus,
      }))
      .filter((segment) => segment.height > 0);
    const totalHeight = stack.reduce((sum, segment) => sum + segment.height, 0);
    totalHeights.push(totalHeight);
    breadths.push(stack.length ? stack[stack.length - 1].breadth : 10);

    try {
      renderInfo[brace.id] = {
        result: computeBraceGeometry(stack[0]?.breadth ?? 10, stack),
      };
    } catch (error) {
      renderInfo[brace.id] = {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  return {
    renderInfo,
    scales: {
      referenceBreadth: Math.max(10, Math.max(...breadths, 10) * 1.2),
      maxHeight: Math.max(...totalHeights, 10),
    },
  };
}

export function calculateBraceComparisonModel(
  braces: BraceComparisonInput[],
  renderInfo: Record<string, BraceCalculationInfo>,
): BraceComparisonEntry[] {
  const entries = braces.flatMap((brace) => {
    const result = renderInfo[brace.id]?.result;
    return result ? [{ brace, result }] : [];
  });

  if (!entries.length) {
    return [];
  }

  const reference = entries[0].result;
  const referenceMass = reference.massPerLength || 1;
  const referenceEI = reference.EI || 1;
  const referenceArea = reference.area || 1;
  const referenceI = reference.I || 1;

  return entries.map(({ brace, result }) => ({
    id: brace.id,
    name: brace.name,
    relativeEI: (result.EI / referenceEI) * 100,
    relativeI: (result.I / referenceI) * 100,
    relativeMass: (result.massPerLength / referenceMass) * 100,
    relativeArea: (result.area / referenceArea) * 100,
  }));
}

export const BraceGeometry = {
  Shapes,
  calculateBraceComparisonModel,
  calculateBraceRenderModel,
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

if (
  typeof module !== "undefined" &&
  typeof module.exports !== "undefined" &&
  Object.prototype.toString.call(module.exports) !== "[object Module]" &&
  Object.isExtensible(module.exports)
) {
  module.exports = BraceGeometry;
}
