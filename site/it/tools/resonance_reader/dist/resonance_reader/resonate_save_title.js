import { measureModeLabelBuild, measureModeNormalize } from "./resonate_mode_config.js?rev=5cd466ecbcb0";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=5cd466ecbcb0";
// The entry title the builder sees before renaming it: what was done, and in which mode.
export function resonanceSaveTitleBuild(measureMode) {
    const normalized = measureModeNormalize(measureMode);
    if (normalized === "played_note")
        return resonanceLocalizedMessages.measureModePlayedNote;
    if (normalized === "peak_analysis")
        return resonanceLocalizedMessages.savePeakAnalysisTitle;
    return resonanceLocalizedMessages.saveTapTestTitleTemplate.replace("{mode}", measureModeLabelBuild(measureMode));
}
