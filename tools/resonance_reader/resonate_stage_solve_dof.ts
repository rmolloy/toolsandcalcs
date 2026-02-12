import type { ModeDetection } from "./resonate_mode_detection.js";
import { computeOverlayCurveFromState } from "./resonate_overlay_controller.js";
import { overlayBoundaryDefault } from "./resonate_overlay_boundary.js";
import { overlayToggleShouldRender } from "./resonate_overlay_gate.js";
import { emitArtifactEventFromState } from "./resonate_artifact_emit.js";
import { renderTryPanel } from "./resonate_try_panel.js";

type SolveDofDeps = {
  state: Record<string, any>;
  fitMaxIter?: number;
};

export function stageSolveDofRun(args: SolveDofDeps) {
  const spectrum = args.state.lastSpectrum;
  if (!spectrum?.freqs?.length) return;
  const modesDetected = Array.isArray(args.state.lastModesDetected) ? args.state.lastModesDetected as ModeDetection[] : [];
  if (!modesDetected.length) return;
  const freqs = Array.from(spectrum.freqs as ArrayLike<number>, (v) => Number(v));
  const dbs = Array.from((spectrum.dbs || spectrum.mags || []) as ArrayLike<number>, (v) => Number(v));
  const toggle = document.getElementById("toggle_overlay") as HTMLInputElement | null;
  if (!overlayToggleShouldRender(toggle)) {
    renderTryPanel([], [], false);
    args.state.lastOverlay = undefined;
    emitArtifactEventFromState(args.state);
    return;
  }
  const boundary = args.state.overlayBoundary || overlayBoundaryDefault;
  const fitMaxIter = args.fitMaxIter ?? 18;
  args.state.lastOverlay = computeOverlayCurveFromState(
    args.state,
    freqs,
    dbs,
    modesDetected,
    boundary,
    { fitMaxIter },
  );
  emitArtifactEventFromState(args.state);
}
