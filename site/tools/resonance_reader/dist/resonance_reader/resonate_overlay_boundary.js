import { buildOverlayFromModes, responseOverlayFromSolver } from "./resonate_overlay.js?rev=3519feba01d2";
import { fit4DofFromTargets } from "./resonate_solver_fit.js?rev=3519feba01d2";
export const overlayBoundaryDefault = {
    fit4DofFromTargets,
    responseOverlayFromSolver,
    buildOverlayFromModes,
};
