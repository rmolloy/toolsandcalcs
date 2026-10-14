export type OverlaySegment = {
  x: number[];
  y: number[];
  width: number;
  opacity: number;
};

export type OverlaySegmentProfile = {
  min: number;
  max: number;
  feather: number;
  widths: { thin: number; mid: number; thick: number };
  opacities: { thin: number; mid: number; thick: number };
};

export type OverlayPoint = { x: number; y: number };

function overlayWeightResolveFromFrequency(
  frequency: number,
  profile: OverlaySegmentProfile,
): number {
  if (frequency >= profile.min && frequency <= profile.max) return 1;
  if (frequency >= profile.min - profile.feather && frequency < profile.min) {
    return 1 - (profile.min - frequency) / profile.feather;
  }
  if (frequency > profile.max && frequency <= profile.max + profile.feather) {
    return 1 - (frequency - profile.max) / profile.feather;
  }
  return 0;
}

function overlayBucketResolveFromWeight(weight: number, profile: OverlaySegmentProfile) {
  if (weight > 0.66) return { width: profile.widths.thick, opacity: profile.opacities.thick };
  if (weight > 0.33) return { width: profile.widths.mid, opacity: profile.opacities.mid };
  return { width: profile.widths.thin, opacity: profile.opacities.thin };
}

export function overlaySegmentsBuildFromPoints(
  points: OverlayPoint[],
  profile: OverlaySegmentProfile,
): OverlaySegment[] {
  const segments: OverlaySegment[] = [];
  let current: OverlaySegment | null = null;

  points.forEach((point) => {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
      current = null;
      return;
    }
    const weight = overlayWeightResolveFromFrequency(point.x, profile);
    if (weight <= 0) {
      current = null;
      return;
    }
    const bucket = overlayBucketResolveFromWeight(weight, profile);
    const sameBucket = current && current.width === bucket.width && current.opacity === bucket.opacity;
    if (!sameBucket) {
      current = { x: [], y: [], width: bucket.width, opacity: bucket.opacity };
      segments.push(current);
    }
    current!.x.push(point.x);
    current!.y.push(point.y);
  });

  return segments;
}

export function overlaySegmentsBuildFromArrays(
  freqs: number[],
  values: number[],
  profile: OverlaySegmentProfile,
): OverlaySegment[] {
  const points: OverlayPoint[] = freqs.map((x, index) => ({ x, y: values[index] }));
  return overlaySegmentsBuildFromPoints(points, profile);
}
