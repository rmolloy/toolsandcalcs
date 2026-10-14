(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.resolveDofLocalizedMessages = resolveDofLocalizedMessages;
    const ENGLISH_DOF_MESSAGES = Object.freeze({
        airDampingLabel: "Air Damping Rₐ",
        airLabel: "Air",
        altitudeLabel: "Altitude (m)",
        alwaysBadge: "Always",
        ambientTemperatureLabel: "Ambient Temp (°C)",
        backDampingLabel: "Damping Rᵦ",
        backLabel: "Back",
        backMassLabel: "Mass mᵦ (g)",
        backRadiatingAreaLabel: "Radiating Area Aᵦ (m²)",
        backStiffnessLabel: "Stiffness kᵦ (N/m)",
        cavityVolumeLabel: "Cavity Volume (m³)",
        drivingForceLabel: "Driving Force F (N)",
        editCardsTitle: "Current Model",
        editCardsCopy: "Direct parameter editing for each degree of freedom.",
        environmentLabel: "Environment",
        externalAlias: "External",
        fitAirAlias: "Measured mode + body",
        fitAirCopy: "Match the air resonance from the measured mode and the body inputs you already know.",
        fitBackCopy: "Anchor the back mode with the observed frequency and the effective back properties you trust.",
        fitBadge: "Fit",
        fitCardsTitle: "Fit by System",
        fitCardsCopy: "Use measured modes and known inputs to infer the current model.",
        fitEnvironmentAlias: "Atmosphere + actions",
        fitEnvironmentCopy: "Set the measurement altitude, run the fitter, and clear the inputs when you want to start over.",
        fitPlateAlias: "Measured mode + plate",
        fitTopCopy: "Anchor the top mode with the observed frequency and the effective top properties you trust.",
        inputsAlias: "Inputs",
        movingAirMassLabel: "Moving Air Mass (g)",
        plotBaseTraceLabel: "4DOF base",
        plotComposedTraceLabel: "4DOF + Sources",
        plotCurrentTraceLabel: "Current",
        plotFrequencyAxisLabel: "Frequency (Hz)",
        plotLevelAxisLabel: "Level (dB)",
        plotResponseUnavailable: "Model response unavailable.",
        plotTargetTraceLabel: "Target",
        saveConnectedLabel: "Save",
        saveDefaultDisplayName: "Instrument",
        saveDefaultNotebookName: "Notebook",
        saveDialogLabel: "Save 4DOF Model",
        saveModelTitle: "4-DOF model",
        saveSummaryAirModeLabel: "Air T(1,1)₁",
        saveSummaryBackModeLabel: "Back T(1,1)₃",
        saveSummaryFittedModelValueTemplate: "{order}-DOF · fitted to targets",
        saveSummaryModelLabel: "Model",
        saveSummaryModeledProvenance: "modeled",
        saveSummaryTopModeLabel: "Top T(1,1)₂",
        saveDownloadLabel: "Download JSON",
        saveDownloadHint: "Notebook saving is not available here. Download the model instead.",
        saveSavedToNotebookTemplate: "Saved to {notebookName}.",
        sidesAreaLabel: "Sides Area (m²)",
        sidesDampingLabel: "Sides Damping",
        sidesLabel: "Sides",
        sidesMassLabel: "Sides Mass (g)",
        sidesStiffnessLabel: "Sides Stiffness (N/m)",
        simpleSourceAmplitudeLabel: "Amplitude (m²/kg)",
        simpleSourceAmplitudeTerm: "Amplitude",
        simpleSourceFrequencyLabel: "Frequency (Hz)",
        simpleSourceNameLabel: "name",
        simpleSourcePeakLabel: "Peak",
        simpleSourceRemoveLabel: "Remove",
        simpleSourceResponsePeakLabel: "Response peak",
        simpleSourcesTraceLabel: "Simple sources",
        solveAirAlias: "Target mode + body",
        solveAirCopy: "Set the air goal first, then shape the body inputs that most directly move it.",
        solveBackCopy: "Set the back target and the effective back properties you want the solver to respect.",
        solveBadge: "Solve",
        solveCardsTitle: "Solve by System",
        solveCardsCopy: "Set goals and constraints, then review the suggested moves.",
        solveEnvironmentAlias: "Recipe actions",
        solveEnvironmentCopy: "Constrain the recipe, solve the what-if, and review the suggested structural moves.",
        solvePlateAlias: "Target mode + plate",
        solveTopCopy: "Set the top target and the effective top properties that define the move you want.",
        soundholeAreaLabel: "Soundhole Area (m²)",
        statusCompareUnavailable: "Compare mode is unavailable.",
        statusComparisonReset: "What-If comparison reset.",
        statusEnterTargetFrequency: "Enter at least one target frequency.",
        statusFitApplied: "Fit applied.",
        statusNotebookEventRestored: "Notebook event restored.",
        statusPackageLoaded: "Loaded JSON package.",
        statusPackageLoadFailed: "Unable to load JSON package.",
        statusPackageDownloaded: "JSON package downloaded.",
        statusSolveApplied: "Solve Targets applied as a What-If recipe.",
        topDampingLabel: "Damping Rₜ",
        topLabel: "Top",
        topMassLabel: "Mass mₜ (g)",
        topRadiatingAreaLabel: "Radiating Area Aₜ (m²)",
        topStiffnessLabel: "Stiffness kₜ (N/m)",
        whatIfEmptyMessage: "Run Solve Targets to see suggested adjustments.",
        whatIfDecreaseTemplate: "Decrease {field} by {amount} {unit}",
        whatIfBackPlateMassLabel: "back plate mass",
        whatIfBackPlateStiffnessLabel: "back plate stiffness",
        whatIfCavityVolumeLabel: "cavity volume",
        whatIfIncreaseTemplate: "Increase {field} by {amount} {unit}",
        whatIfSoundholeAreaDeltaTemplate: " ({sign}{area} m²)",
        whatIfSoundholeDiameterLabel: "soundhole diameter",
        whatIfTargetLabel: "Target",
        whatIfTopPlateMassLabel: "top plate mass",
        whatIfTopPlateStiffnessLabel: "top plate stiffness",
    });
    function resolveDofLocalizedMessages(candidate) {
        return Object.freeze({
            ...ENGLISH_DOF_MESSAGES,
            ...nonEmptyMessagesRead(candidate),
        });
    }
    function nonEmptyMessagesRead(candidate) {
        if (!candidate)
            return {};
        return Object.fromEntries(Object.entries(candidate).filter(([, value]) => (typeof value === "string" && value.trim().length > 0)));
    }
});
