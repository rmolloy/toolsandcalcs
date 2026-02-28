import { measureModeNormalize } from "./resonate_mode_config.js";
const GUITAR_DESTINATION = {
    href: "../dof_model/",
    label: "Open in 4-DOF model",
    showOverlayToggle: true,
    showModelRow: true,
    kind: "dof",
};
const PLAYED_NOTE_DESTINATION = {
    href: "",
    label: "",
    showOverlayToggle: false,
    showModelRow: false,
    kind: "dof",
};
const PLATE_DESTINATION = {
    href: "../plate_thickness/",
    label: "Open in Plate Thickness calculator",
    showOverlayToggle: false,
    showModelRow: true,
    kind: "plate-thickness",
};
export function externalModelDestinationResolveFromMeasureMode(measureMode) {
    const normalized = measureModeNormalize(measureMode);
    if (normalized === "guitar")
        return GUITAR_DESTINATION;
    if (normalized === "played_note")
        return PLAYED_NOTE_DESTINATION;
    return PLATE_DESTINATION;
}
