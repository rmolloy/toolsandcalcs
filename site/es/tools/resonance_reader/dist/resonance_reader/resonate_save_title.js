import { measureModeLabelBuild, measureModeNormalize } from "./resonate_mode_config.js?rev=dae658f6289e";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=dae658f6289e";
// The entry title the builder sees before renaming it: what was done, and in which mode.
export function resonanceSaveTitleBuild(measureMode) {
    const normalized = measureModeNormalize(measureMode);
    if (normalized === "played_note")
        return resonanceLocalizedMessages.measureModePlayedNote;
    if (normalized === "peak_analysis")
        return resonanceLocalizedMessages.savePeakAnalysisTitle;
    return resonanceLocalizedMessages.saveTapTestTitleTemplate.replace("{mode}", measureModeLabelBuild(measureMode));
}
