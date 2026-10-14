import type { OverlayBoundary } from "./resonate_overlay_boundary.js";

export function overlayBoundaryEnsure(boundary: OverlayBoundary | null | undefined): OverlayBoundary {
  if (!boundary) {
    throw new Error("[Resonance Reader] overlay boundary missing");
  }
  return boundary;
}
