import "../common/notebook_save_modal.js?rev=3f87131f64e6";
import { resonanceSubjectDraftDefaultsFromMeasureMode } from "./resonate_subject_taxonomy.js?rev=3f87131f64e6";
import { measureModeLabelBuild, measureModeNormalize } from "./resonate_mode_config.js?rev=3f87131f64e6";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=3f87131f64e6";
const RESONANCE_CAPTURE_PACKAGE_FILES = ["state.json", "source.wav", "plot.png"];
export async function openConnectedResonanceSaveModal(args) {
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
// The entry title the builder sees before renaming it: what was done, and in which mode.
export function resonanceSaveTitleBuild(measureMode) {
    const normalized = measureModeNormalize(measureMode);
    if (normalized === "played_note")
        return resonanceLocalizedMessages.measureModePlayedNote;
    if (normalized === "peak_analysis")
        return resonanceLocalizedMessages.savePeakAnalysisTitle;
    return resonanceLocalizedMessages.saveTapTestTitleTemplate.replace("{mode}", measureModeLabelBuild(measureMode));
}
function readSharedNotebookSaveModal() {
    const shared = globalThis.CommonNotebookSaveModal;
    if (!shared) {
        throw new Error(resonanceLocalizedMessages.saveNotebookUnavailable);
    }
    return shared;
}
