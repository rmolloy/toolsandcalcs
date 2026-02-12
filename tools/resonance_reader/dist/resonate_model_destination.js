import { measureModeNormalize } from "./resonate_mode_config.js";
const GUITAR_DESTINATION = {
    href: "../dof_model/",
    label: "Open in 4-DOF model",
    showOverlayToggle: true,
    kind: "dof",
};
const PLATE_DESTINATION = {
    href: "../plate_thickness/",
    label: "Open in Plate Thickness calculator",
    showOverlayToggle: false,
    kind: "plate-thickness",
};
export function externalModelDestinationResolveFromMeasureMode(measureMode) {
    if (measureModeNormalize(measureMode) === "guitar")
        return GUITAR_DESTINATION;
    return PLATE_DESTINATION;
}
