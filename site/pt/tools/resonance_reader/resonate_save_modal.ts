import "../common/notebook_save_modal.js";
import { resonanceSubjectDraftDefaultsFromMeasureMode } from "./resonate_subject_taxonomy.js";
import { resonanceSaveTitleBuild } from "./resonate_save_title.js";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";

export { resonanceSaveTitleBuild };

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
    dialogLabel: resonanceLocalizedMessages.saveDialogLabel,
    title: resonanceSaveTitleBuild(args.measureMode),
    summary: args.summary || [],
    notebookName: args.notebookName,
    subjects: args.subjects,
    packageFiles: RESONANCE_CAPTURE_PACKAGE_FILES,
    newSubject: {
      typeKey: defaults.typeKey,
      subtypeKey: defaults.subtypeKey,
      displayNamePlaceholder: resonanceLocalizedMessages.saveDisplayNamePlaceholder,
      typeChoice: true,
    },
    eventExtras: { measureMode: args.measureMode },
  });
}

function readSharedNotebookSaveModal(): SharedNotebookSaveModal {
  const shared = (globalThis as any).CommonNotebookSaveModal as SharedNotebookSaveModal | undefined;
  if (!shared) {
    throw new Error(resonanceLocalizedMessages.saveNotebookUnavailable);
  }
  return shared;
}
