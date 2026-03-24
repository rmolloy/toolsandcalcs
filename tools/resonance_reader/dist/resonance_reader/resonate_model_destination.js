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
const BRACE_STOCK_DESTINATION = {
    href: "",
    label: "",
    showOverlayToggle: false,
    showModelRow: false,
    kind: "plate-thickness",
};
const PLATE_STOCK_DESTINATION = {
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
    if (normalized === "brace_stock")
        return BRACE_STOCK_DESTINATION;
    return PLATE_STOCK_DESTINATION;
}
