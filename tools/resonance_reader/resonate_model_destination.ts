import { measureModeNormalize } from "./resonate_mode_config.js";

export type ExternalModelDestination = {
  href: string;
  label: string;
  showOverlayToggle: boolean;
  kind: "dof" | "plate-thickness";
};

const GUITAR_DESTINATION: ExternalModelDestination = {
  href: "../dof_model/",
  label: "Open in 4-DOF model",
  showOverlayToggle: true,
  kind: "dof",
};

const PLATE_DESTINATION: ExternalModelDestination = {
  href: "../plate_thickness/",
  label: "Open in Plate Thickness calculator",
  showOverlayToggle: false,
  kind: "plate-thickness",
};

export function externalModelDestinationResolveFromMeasureMode(measureMode: unknown): ExternalModelDestination {
  if (measureModeNormalize(measureMode) === "guitar") return GUITAR_DESTINATION;
  return PLATE_DESTINATION;
}
