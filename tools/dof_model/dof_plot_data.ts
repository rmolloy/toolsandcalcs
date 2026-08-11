export type DofPlotPoint = {
  x: number;
  y: number;
};

export type DofOverlaySegment = {
  x: number[];
  y: number[];
  width: number;
  opacity: number;
};

export type DofTargetOverlayConfig = {
  min: number;
  max: number;
  feather: number;
  widths: {
    thin: number;
    mid: number;
    thick: number;
  };
  opacities: {
    thin: number;
    mid: number;
    thick: number;
  };
};

type SharedOverlayBuilder = (
  points: DofPlotPoint[],
  config: DofTargetOverlayConfig,
) => DofOverlaySegment[];

export function buildDofTrace(
  points: DofPlotPoint[],
  name: string,
  color: string,
  lineOptions: Record<string, unknown> = {},
) {
  if (!Array.isArray(points) || points.length === 0) return null;
  return {
    x: points.map((point) => point.x),
    y: points.map((point) => point.y),
    mode: "lines",
    name,
    line: { color, ...(lineOptions || {}) },
    hovertemplate: `%{x:.1f} Hz · %{y:.1f} dB<extra>${name}</extra>`,
  };
}

function overlayBucketFromWeight(
  weight: number,
  config: DofTargetOverlayConfig,
) {
  if (weight > 0.66) {
    return { width: config.widths.thick, opacity: config.opacities.thick };
  }
  if (weight > 0.33) {
    return { width: config.widths.mid, opacity: config.opacities.mid };
  }
  return { width: config.widths.thin, opacity: config.opacities.thin };
}

function overlayWeightAtFrequency(
  frequency: number,
  config: DofTargetOverlayConfig,
) {
  const { min, max, feather } = config;
  if (frequency >= min && frequency <= max) return 1;
  if (frequency >= min - feather && frequency < min) {
    return 1 - (min - frequency) / feather;
  }
  if (frequency > max && frequency <= max + feather) {
    return 1 - (frequency - max) / feather;
  }
  return 0;
}

export function buildDofTargetOverlaySegments(
  points: DofPlotPoint[],
  config: DofTargetOverlayConfig,
  sharedBuilder?: SharedOverlayBuilder,
) {
  if (sharedBuilder) return sharedBuilder(points, config);
  const segments: DofOverlaySegment[] = [];
  let current: DofOverlaySegment | null = null;

  points.forEach((point) => {
    const frequency = point?.x;
    const level = point?.y;
    if (!Number.isFinite(frequency) || !Number.isFinite(level)) {
      current = null;
      return;
    }
    const weight = overlayWeightAtFrequency(frequency, config);
    if (weight <= 0) {
      current = null;
      return;
    }
    const bucket = overlayBucketFromWeight(weight, config);
    const sameBucket = current
      && current.width === bucket.width
      && current.opacity === bucket.opacity;
    if (!sameBucket) {
      current = { x: [], y: [], width: bucket.width, opacity: bucket.opacity };
      segments.push(current);
    }
    current!.x.push(frequency);
    current!.y.push(level);
  });

  return segments;
}

export function buildDofTargetOverlayTraces(
  points: DofPlotPoint[],
  color: string,
  config: DofTargetOverlayConfig,
  colorWithAlpha: (color: string, alpha: number) => string,
  sharedBuilder?: SharedOverlayBuilder,
) {
  const segments = buildDofTargetOverlaySegments(points, config, sharedBuilder);
  return segments.map((segment, index) => ({
    x: segment.x,
    y: segment.y,
    mode: "lines",
    name: "Target",
    legendgroup: "target",
    showlegend: index === 0,
    line: {
      color: colorWithAlpha(color, segment.opacity),
      width: segment.width,
      dash: "dash",
    },
    hovertemplate: "%{x:.1f} Hz · %{y:.1f} dB<extra>Target</extra>",
  }));
}

export function computeDofYRange(
  series: DofPlotPoint[],
  pad = 6,
  minX?: number,
  maxX?: number,
) {
  if (!Array.isArray(series) || !series.length) return null;
  let min = Infinity;
  let max = -Infinity;

  series.forEach((point) => {
    if (!Number.isFinite(point?.y)) return;
    if (Number.isFinite(minX) && Number.isFinite(maxX)) {
      if (!Number.isFinite(point?.x)) return;
      if (point.x < (minX as number) || point.x > (maxX as number)) return;
    }
    min = Math.min(min, point.y);
    max = Math.max(max, point.y);
  });

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const padding = Math.max(2, pad);
  return [min - padding, max + padding];
}
