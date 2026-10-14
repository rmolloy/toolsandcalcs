import { buildOverlayFromModes, responseOverlayFromSolver } from "./resonate_overlay.js";
import { fit4DofFromTargets } from "./resonate_solver_fit.js";

export type OverlayBoundary = {
  fit4DofFromTargets: typeof fit4DofFromTargets;
  responseOverlayFromSolver: typeof responseOverlayFromSolver;
  buildOverlayFromModes: typeof buildOverlayFromModes;
};

export const overlayBoundaryDefault: OverlayBoundary = {
  fit4DofFromTargets,
  responseOverlayFromSolver,
  buildOverlayFromModes,
};
