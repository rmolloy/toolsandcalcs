import { measureModeNormalize } from "./resonate_mode_config.js";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";

export type ExternalModelDestination = {
  href: string;
  label: string;
  showOverlayToggle: boolean;
  showModelRow: boolean;
  kind: "dof" | "plate-thickness" | "brace-calculator";
};

const GUITAR_DESTINATION: ExternalModelDestination = {
  href: "../dof_model/index.html",
  label: resonanceLocalizedMessages.modelDestinationDofLabel,
  showOverlayToggle: true,
  showModelRow: true,
  kind: "dof",
};

const PLAYED_NOTE_DESTINATION: ExternalModelDestination = {
  href: "",
  label: "",
  showOverlayToggle: false,
  showModelRow: false,
  kind: "dof",
};

const BRACE_STOCK_DESTINATION: ExternalModelDestination = {
  href: "../flexural_rigidity/brace_calc/",
  label: resonanceLocalizedMessages.modelDestinationBraceLabel,
  showOverlayToggle: false,
  showModelRow: true,
  kind: "brace-calculator",
};

const PLATE_STOCK_DESTINATION: ExternalModelDestination = {
  href: "../plate_thickness/index.html",
  label: resonanceLocalizedMessages.modelDestinationPlateLabel,
  showOverlayToggle: false,
  showModelRow: true,
  kind: "plate-thickness",
};

export function externalModelDestinationResolveFromMeasureMode(measureMode: unknown): ExternalModelDestination {
  const normalized = measureModeNormalize(measureMode);
  if (normalized === "guitar") return GUITAR_DESTINATION;
  if (normalized === "played_note") return PLAYED_NOTE_DESTINATION;
  if (normalized === "brace_stock") return BRACE_STOCK_DESTINATION;
  return PLATE_STOCK_DESTINATION;
}
