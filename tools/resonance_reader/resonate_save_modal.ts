import "../common/notebook_save_modal.js";
import { resonanceSubjectDraftDefaultsFromMeasureMode } from "./resonate_subject_taxonomy.js";
import { measureModeLabelBuild, measureModeNormalize } from "./resonate_mode_config.js";

type ResonanceSaveSelection = { subject: Record<string, any>; event: Record<string, any> };

type SharedNotebookSaveModal = {
  openNotebookSaveModal: (args: Record<string, unknown>) => Promise<ResonanceSaveSelection | null>;
};

const RESONANCE_CAPTURE_PACKAGE_FILES = ["state.json", "source.wav", "plot.png"];

type ResonanceSaveSummaryRow = { label: string; value: string; provenance?: string };

export async function openConnectedResonanceSaveModal(args: {
  measureMode: unknown;
  notebookName: string;
  subjects: any[];
  summary?: ResonanceSaveSummaryRow[];
}): Promise<ResonanceSaveSelection | null> {
  const defaults = resonanceSubjectDraftDefaultsFromMeasureMode(args.measureMode);
  return await readSharedNotebookSaveModal().openNotebookSaveModal({
    dialogLabel: "Save Resonance Capture",
    title: resonanceSaveTitleBuild(args.measureMode),
    summary: args.summary || [],
    notebookName: args.notebookName,
    subjects: args.subjects,
    packageFiles: RESONANCE_CAPTURE_PACKAGE_FILES,
    newSubject: {
      typeKey: defaults.typeKey,
      subtypeKey: defaults.subtypeKey,
      displayNamePlaceholder: "European Spruce Top",
      typeChoice: true,
    },
    eventExtras: { measureMode: args.measureMode },
  });
}

// The entry title the builder sees before renaming it: what was done, and in which mode.
export function resonanceSaveTitleBuild(measureMode: unknown): string {
  const normalized = measureModeNormalize(measureMode);
  if (normalized === "played_note") return "Played note";
  if (normalized === "peak_analysis") return "Peak/Q analysis";
  return `Tap test · ${measureModeLabelBuild(measureMode)}`;
}

function readSharedNotebookSaveModal(): SharedNotebookSaveModal {
  const shared = (globalThis as any).CommonNotebookSaveModal as SharedNotebookSaveModal | undefined;
  if (!shared) {
    throw new Error("Common notebook save modal is unavailable.");
  }
  return shared;
}
