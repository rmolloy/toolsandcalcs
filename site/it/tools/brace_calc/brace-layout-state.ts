export interface BraceSegmentState<Shape extends string = string> {
  id: string;
  label: string;
  shape: Shape;
  height: number;
  breadth: number;
  density: number;
  modulus: number;
}

export interface BraceState<Shape extends string = string> {
  id: string;
  name: string;
  segments: BraceSegmentState<Shape>[];
}

export interface BraceLayoutSanitizationContext<Shape extends string> {
  nextBraceId(): string;
  nextSegmentId(): string;
  validShapes: ReadonlySet<Shape>;
  rectangleShape: Shape;
  defaultDensity: number;
  defaultModulus: number;
}

export interface BraceSegmentCreationContext<Shape extends string> {
  nextSegmentId(): string;
  shape: Shape;
  defaultHeight: number;
  defaultBreadth: number;
  defaultDensity: number;
  defaultModulus: number;
}

export interface DefaultBraceCreationContext<Shape extends string> {
  nextBraceId(): string;
  nextSegmentId(): string;
  rectangleShape: Shape;
  triangleShape: Shape;
  defaultDensity: number;
  defaultModulus: number;
}

export interface InitialBraceLayoutContext<Shape extends string>
  extends BraceLayoutSanitizationContext<Shape> {
  triangleShape: Shape;
}

export interface TransferredBraceStock {
  height: number;
  breadth: number;
  density: number;
  modulus: number;
}

export interface BraceTopState {
  span: number;
  thickness: number;
  modulus?: number;
}

export function applyBraceSegmentUpdate<T extends BraceSegmentState>(
  segment: T,
  updates: Partial<T>,
): T {
  return {
    ...segment,
    ...updates,
    height: positiveOrMinimum(updates.height, segment.height, 0),
    breadth: positiveOrMinimum(updates.breadth, segment.breadth, 0.5),
    density: positiveOrMinimum(updates.density, segment.density, 1),
    modulus: positiveOrMinimum(updates.modulus, segment.modulus, 0.1),
  };
}

export function readBraceTopFromLayout(layout: unknown): BraceTopState | null {
  const top = layout && typeof layout === "object"
    ? (layout as { top?: unknown }).top
    : null;
  const span = Number((top as { span?: unknown } | null)?.span);
  const thickness = Number((top as { thickness?: unknown } | null)?.thickness);
  const modulus = Number((top as { modulus?: unknown } | null)?.modulus);

  if (!Number.isFinite(span) || !Number.isFinite(thickness)) {
    return null;
  }

  return {
    span,
    thickness,
    modulus: Number.isFinite(modulus) ? modulus : undefined,
  };
}

export function readBraceSaveSnapshot<Shape extends string>(
  braces: BraceState<Shape>[],
): Array<{
  name: string;
  segments: Array<{
    label: string;
    shape: Shape;
    height: number;
    breadth: number;
    density: number;
    modulus: number;
  }>;
}> {
  return braces.map((brace) => ({
    name: brace.name,
    segments: brace.segments.map((segment) => ({
      label: segment.label,
      shape: segment.shape,
      height: segment.height,
      breadth: segment.breadth,
      density: segment.density,
      modulus: segment.modulus,
    })),
  }));
}

export function readBraceLayoutEventDetail<Shape extends string>(
  braces: BraceState<Shape>[],
  top: BraceTopState | null,
): {
  braces: ReturnType<typeof readBraceSaveSnapshot<Shape>>;
  top?: BraceTopState;
} {
  const detail: {
    braces: ReturnType<typeof readBraceSaveSnapshot<Shape>>;
    top?: BraceTopState;
  } = {
    braces: readBraceSaveSnapshot(braces),
  };

  if (top) {
    detail.top = top;
  }

  return detail;
}

export function readLoadedBraceLayoutEventDetail<Shape extends string>(
  rawLayout: unknown,
  braces: BraceState<Shape>[],
): {
  braces: Array<{
    name: string;
    segments: Array<{
      label: string;
      shape: Shape;
      height: number;
      breadth: number;
      modulus: number;
    }>;
  }>;
  top?: BraceTopState;
} {
  const detail: {
    braces: Array<{
      name: string;
      segments: Array<{
        label: string;
        shape: Shape;
        height: number;
        breadth: number;
        modulus: number;
      }>;
    }>;
    top?: BraceTopState;
  } = {
    braces: braces.map((brace) => ({
      name: brace.name,
      segments: brace.segments.map((segment) => ({
        label: segment.label,
        shape: segment.shape,
        height: segment.height,
        breadth: segment.breadth,
        modulus: segment.modulus,
      })),
    })),
  };
  const top = readBraceTopFromLayout(rawLayout);

  if (top) {
    detail.top = top;
  }

  return detail;
}

export function removeBraceFromLayout<Shape extends string>(
  braces: BraceState<Shape>[],
  braceId: string,
): BraceState<Shape>[] {
  return braces.length === 1
    ? braces
    : braces.filter((brace) => brace.id !== braceId);
}

export function removeBraceSegmentFromLayout<Shape extends string>(
  braces: BraceState<Shape>[],
  braceId: string,
  segmentId: string,
): BraceState<Shape>[] {
  return braces.map((brace) => {
    if (brace.id !== braceId || brace.segments.length === 1) {
      return brace;
    }

    return {
      ...brace,
      segments: brace.segments.filter((segment) => segment.id !== segmentId),
    };
  });
}

export function renameBraceInLayout<Shape extends string>(
  braces: BraceState<Shape>[],
  braceId: string,
  name: string,
): BraceState<Shape>[] {
  return braces.map((brace) => (
    brace.id === braceId
      ? { ...brace, name }
      : brace
  ));
}

export function updateBraceSegmentInLayout<Shape extends string>(
  braces: BraceState<Shape>[],
  braceId: string,
  segmentId: string,
  updates: Partial<BraceSegmentState<Shape>>,
): BraceState<Shape>[] {
  return braces.map((brace) => {
    if (brace.id !== braceId) {
      return brace;
    }

    return {
      ...brace,
      segments: brace.segments.map((segment) => (
        segment.id === segmentId
          ? applyBraceSegmentUpdate(segment, updates)
          : segment
      )),
    };
  });
}

export function appendBraceSegmentToLayout<Shape extends string>(
  braces: BraceState<Shape>[],
  braceId: string,
  context: BraceSegmentCreationContext<Shape>,
): BraceState<Shape>[] {
  return braces.map((brace) => {
    if (brace.id !== braceId) {
      return brace;
    }

    const lastSegment = brace.segments[brace.segments.length - 1];
    const segmentNumber = brace.segments.length + 1;

    return {
      ...brace,
      segments: [
        ...brace.segments,
        {
          id: context.nextSegmentId(),
          label: `Segment ${segmentNumber}`,
          shape: context.shape,
          height: lastSegment?.height ?? context.defaultHeight,
          breadth: lastSegment?.breadth ?? context.defaultBreadth,
          density: lastSegment?.density ?? context.defaultDensity,
          modulus: lastSegment?.modulus ?? context.defaultModulus,
        },
      ],
    };
  });
}

export function appendDefaultBraceToLayout<Shape extends string>(
  braces: BraceState<Shape>[],
  context: DefaultBraceCreationContext<Shape>,
): BraceState<Shape>[] {
  const braceNumber = braces.length + 1;

  return [
    ...braces,
    {
      id: context.nextBraceId(),
      name: `Brace ${braceNumber}`,
      segments: [
        {
          id: context.nextSegmentId(),
          label: "Base",
          shape: context.rectangleShape,
          height: 4,
          breadth: 10,
          density: context.defaultDensity,
          modulus: context.defaultModulus,
        },
        {
          id: context.nextSegmentId(),
          label: "Cap",
          shape: context.triangleShape,
          height: 8,
          breadth: 10,
          density: context.defaultDensity,
          modulus: context.defaultModulus,
        },
      ],
    },
  ];
}

export function createInitialBraceLayout<Shape extends string>(
  transferred: TransferredBraceStock | null,
  defaultLayout: unknown,
  context: InitialBraceLayoutContext<Shape>,
): BraceState<Shape>[] {
  if (transferred) {
    return [{
      id: context.nextBraceId(),
      name: "Transferred brace stock",
      segments: [{
        id: context.nextSegmentId(),
        label: "Measured stock",
        shape: context.rectangleShape,
        height: transferred.height,
        breadth: transferred.breadth,
        density: transferred.density,
        modulus: transferred.modulus,
      }],
    }];
  }

  const defaultBraces = sanitizeBraceLayout(defaultLayout, context);
  if (defaultBraces.length) {
    return defaultBraces;
  }

  return appendDefaultBraceToLayout([], {
    nextBraceId: context.nextBraceId,
    nextSegmentId: context.nextSegmentId,
    rectangleShape: context.rectangleShape,
    triangleShape: context.triangleShape,
    defaultDensity: context.defaultDensity,
    defaultModulus: context.defaultModulus,
  });
}

export function ensureBraceLayoutHasDefault<Shape extends string>(
  braces: BraceState<Shape>[],
  context: DefaultBraceCreationContext<Shape>,
): BraceState<Shape>[] {
  return braces.length
    ? braces
    : appendDefaultBraceToLayout(braces, context);
}

export function sanitizeBraceLayout<Shape extends string>(
  data: unknown,
  context: BraceLayoutSanitizationContext<Shape>,
): BraceState<Shape>[] {
  const braceArray = bracesReadFromLayout(data);
  return braceArray.flatMap((rawBrace, braceIndex) => {
    const brace = braceSanitize(rawBrace, braceIndex, context);
    return brace ? [brace] : [];
  });
}

function bracesReadFromLayout(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const braces = (data as { braces?: unknown }).braces;
  return Array.isArray(braces) ? braces : [];
}

function braceSanitize<Shape extends string>(
  rawBrace: unknown,
  braceIndex: number,
  context: BraceLayoutSanitizationContext<Shape>,
): BraceState<Shape> | null {
  if (!rawBrace || typeof rawBrace !== "object") return null;
  const rawSegments = Array.isArray((rawBrace as { segments?: unknown }).segments)
    ? (rawBrace as { segments: unknown[] }).segments
    : [];
  const segments = rawSegments.flatMap((rawSegment, segmentIndex) => {
    const segment = segmentSanitize(
      rawSegment,
      `Segment ${segmentIndex + 1}`,
      context,
    );
    return segment ? [segment] : [];
  });
  if (!segments.length) return null;

  return {
    id: context.nextBraceId(),
    name: nonEmptyStringRead(
      (rawBrace as { name?: unknown }).name,
      `Brace ${braceIndex + 1}`,
    ),
    segments,
  };
}

function segmentSanitize<Shape extends string>(
  rawSegment: unknown,
  fallbackLabel: string,
  context: BraceLayoutSanitizationContext<Shape>,
): BraceSegmentState<Shape> | null {
  if (!rawSegment || typeof rawSegment !== "object") return null;
  const segment = rawSegment as Record<string, unknown>;
  const height = Number(segment.height);
  if (!Number.isFinite(height) || height <= 0) return null;

  return {
    id: context.nextSegmentId(),
    label: nonEmptyStringRead(segment.label, fallbackLabel),
    shape: context.validShapes.has(segment.shape as Shape)
      ? segment.shape as Shape
      : context.rectangleShape,
    height,
    breadth: positiveNumberRead(segment.breadth, 10),
    density: positiveNumberRead(segment.density, context.defaultDensity),
    modulus: positiveNumberRead(segment.modulus, context.defaultModulus),
  };
}

function nonEmptyStringRead(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function positiveNumberRead(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function positiveOrMinimum(
  candidate: number | undefined,
  current: number,
  minimum: number,
): number {
  return candidate != null && Number.isFinite(candidate)
    ? Math.max(minimum, candidate)
    : current;
}

export const BraceLayoutState = {
  applyBraceSegmentUpdate,
  appendDefaultBraceToLayout,
  appendBraceSegmentToLayout,
  createInitialBraceLayout,
  ensureBraceLayoutHasDefault,
  readBraceLayoutEventDetail,
  readLoadedBraceLayoutEventDetail,
  readBraceTopFromLayout,
  readBraceSaveSnapshot,
  renameBraceInLayout,
  removeBraceFromLayout,
  removeBraceSegmentFromLayout,
  sanitizeBraceLayout,
  updateBraceSegmentInLayout,
};

declare global {
  interface Window {
    BraceLayoutState?: typeof BraceLayoutState;
  }
}

if (typeof window !== "undefined") {
  window.BraceLayoutState = BraceLayoutState;
}
