import "../common/notebook_save_modal.js?rev=dae658f6289e";
import { resonanceSubjectDraftDefaultsFromMeasureMode } from "./resonate_subject_taxonomy.js?rev=dae658f6289e";
import { resonanceSaveTitleBuild } from "./resonate_save_title.js?rev=dae658f6289e";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=dae658f6289e";
export { resonanceSaveTitleBuild };
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
function readSharedNotebookSaveModal() {
    const shared = globalThis.CommonNotebookSaveModal;
    if (!shared) {
        throw new Error(resonanceLocalizedMessages.saveNotebookUnavailable);
    }
    return shared;
}
