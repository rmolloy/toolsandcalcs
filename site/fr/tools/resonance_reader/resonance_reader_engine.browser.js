var ResonanceReaderEngine = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/common/tool_document.js
  var require_tool_document = __commonJS({
    "tools/common/tool_document.js"(exports, module) {
      "use strict";
      (function(globalScope) {
        function buildToolDocumentHeader2(args) {
          var source = args || {};
          return {
            toolDocumentType: String(source.toolDocumentType || "").trim(),
            toolDocumentVersion: Number(source.toolDocumentVersion || 1),
            toolId: String(source.toolId || "").trim(),
            toolVersion: readToolDocumentVersion(source.toolVersion),
            savedAtIso: String(source.savedAtIso || "").trim()
          };
        }
        function readToolDocumentVersion(value) {
          var version = String(value || "").trim();
          return version || void 0;
        }
        function isToolDocumentHeader(value) {
          return Boolean(
            value && typeof value === "object" && typeof value.toolDocumentType === "string" && typeof value.toolDocumentVersion === "number" && typeof value.toolId === "string" && typeof value.savedAtIso === "string"
          );
        }
        var api = {
          buildToolDocumentHeader: buildToolDocumentHeader2,
          isToolDocumentHeader
        };
        globalScope.CommonToolDocument = api;
        if (typeof module !== "undefined" && module.exports) {
          module.exports = api;
        }
      })(typeof window !== "undefined" ? window : globalThis);
    }
  });

  // tools/resonance_reader/resonance_reader_engine.ts
  var resonance_reader_engine_exports = {};
  __export(resonance_reader_engine_exports, {
    RESONANCE_RECORDING_MEASURE_MODES: () => RESONANCE_RECORDING_MEASURE_MODES,
    braceStockMaterialBuildFromMeasurements: () => braceStockMaterialBuildFromMeasurements,
    peakSideOfStrongerPeakHz: () => peakSideOfStrongerPeakHz,
    resonanceRecordingAnalyze: () => resonanceRecordingAnalyze,
    resonanceRecordingFromSave: () => resonanceRecordingFromSave,
    resonanceRecordingSaveBuild: () => resonanceRecordingSaveBuild
  });

  // tools/resonance_reader/resonate_color_roles.ts
  var COLOR_PALETTE_OKABE_ITO = {
    black: [0, 0, 0],
    orange: [230, 159, 0],
    skyBlue: [86, 180, 233],
    bluishGreen: [0, 158, 115],
    yellow: [240, 228, 66],
    blue: [0, 114, 178],
    vermillion: [213, 94, 0],
    reddishPurple: [204, 121, 167]
  };
  var COLOR_ROLE_TO_PALETTE = {
    fftLine: "skyBlue",
    modelOverlay: "orange",
    stringFundamental: "skyBlue",
    secondPartial: "orange",
    thirdPartial: "yellow",
    airMode: "vermillion",
    topMode: "bluishGreen",
    backMode: "reddishPurple",
    plateTransverseMode: "vermillion",
    plateLongMode: "bluishGreen",
    plateCrossMode: "reddishPurple",
    customMode: "blue",
    wavePrimarySelection: "orange",
    waveNoteSelection: "bluishGreen",
    waveTapMarker: "reddishPurple",
    peakAnalysisWaveform: "skyBlue",
    peakAnalysisProjection: "yellow"
  };
  function resolvePaletteRgbFromName(colorName) {
    return COLOR_PALETTE_OKABE_ITO[colorName];
  }
  function resolvePaletteColorNameFromRole(roleName) {
    return COLOR_ROLE_TO_PALETTE[roleName];
  }
  function toHex2(value) {
    return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  }
  function resolveColorHexFromRole(roleName) {
    const paletteName = resolvePaletteColorNameFromRole(roleName);
    const [r, g, b] = resolvePaletteRgbFromName(paletteName);
    return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
  }

  // tools/resonance_reader/resonate_localized_messages.ts
  var ENGLISH_RESONANCE_MESSAGES = Object.freeze({
    braceEstimateClearLong: "Clear Long",
    braceEstimateDensityLabel: "Density",
    braceEstimateEditMeasurements: "Edit measurements",
    braceEstimateIncompleteSummary: "Add the stock length, width, height, and mass to characterize this piece.",
    braceEstimateLongLabel: "Long",
    braceEstimateMatchFlexuralRigidity: "Match in Flexural Rigidity",
    braceEstimateNeedsConfirmationSummary: "Measurements are ready. Confirm the selected peak as the Long mode.",
    braceEstimateReadySummary: "Brace stock estimate",
    braceEstimateSetMeasurements: "Set measurements",
    braceEstimateSoundSpeedLabel: "Sound speed",
    braceEstimateUseInspectedLongTemplate: "Use inspected {frequencyHz} Hz as Long",
    braceEstimateUseSelectedLong: "Use selected as Long",
    braceTransferAdditionalMeasurementsTitle: "Additional Measurements",
    braceTransferClose: "Close",
    braceTransferContinue: "Continue to Brace Calculator",
    braceTransferDialogLabel: "Prepare transfer to Brace Calculator",
    braceTransferFromMeasurement: "(from measurement)",
    braceTransferHeightLabel: "Height",
    braceTransferLengthLabel: "Length",
    braceTransferMassLabel: "Mass",
    braceTransferModesTitle: "Modes",
    braceTransferNotDetected: "Not detected",
    braceTransferOptional: "(optional)",
    braceTransferSkip: "Skip for now",
    braceTransferTitle: "Prepare Transfer -> Brace Calculator",
    braceTransferWidthLabel: "Width",
    braceStockDetailsCancel: "Cancel",
    braceStockDetailsClose: "Close",
    braceStockDetailsConfirmedEvidenceTitle: "Confirmed Long evidence",
    braceStockDetailsDensityLabel: "Density",
    braceStockDetailsDialogLabel: "Brace stock details",
    braceStockDetailsHeightLabel: "Height",
    braceStockDetailsInstructions: "Save the measurements, then confirm the selected Peak/Q candidate as Long.",
    braceStockDetailsIntroduction: "Free-free stock characterization. These are specimen dimensions, not finished brace dimensions.",
    braceStockDetailsLengthLabel: "Length",
    braceStockDetailsLongModeTitle: "Long mode",
    braceStockDetailsMassLabel: "Mass",
    braceStockDetailsMeasurementsTitle: "Measurements",
    braceStockDetailsSave: "Save measurements",
    braceStockDetailsSectionMomentLabel: "Section I",
    braceStockDetailsSoundSpeedLabel: "Sound speed",
    braceStockDetailsTitle: "Brace stock details",
    braceStockDetailsWidthLabel: "Width",
    energyTransferBodyDominanceTemplate: "Body dominance begins (~{seconds} s)",
    energyTransferBodyTraceTemplate: "Body ({mode})",
    energyTransferFundamentalTrace: "Fundamental",
    energyTransferHoverAmplitudeLabel: "Amp",
    energyTransferHoverCentsLabel: "Cents",
    energyTransferSecondPartialTrace: "Second Partial",
    energyTransferThirdPartialTrace: "Third Partial",
    energyTransferXAxisTitle: "Seconds from selected window start",
    energyTransferYAxisTitle: "Relative band energy",
    importFailedStatus: "Import failed. Try a short WAV/AIFF file.",
    importLoadedStatus: "Loaded.",
    importLoadingTemplate: "Loading {fileName}...",
    flexuralRigidityDefaultSource: "Brace stock measurement",
    pipelineCompletedStatus: "Pipeline completed.",
    pipelineFailedStatus: "Pipeline failed.",
    pipelineNoNotesStatus: "No notes detected yet.",
    pipelineNotesDetectedTemplate: "{noteCount} notes detected.",
    pipelineOneNoteStatus: "1 note detected.",
    pipelineRenderReadyStatus: "Render ready.",
    pipelineStageCompletedTemplate: "Completed {stage}.",
    pipelineStageStartedTemplate: "Running {stage}...",
    pipelineStartedStatus: "Pipeline started.",
    pipelineUnavailableLabel: "n/a",
    pipelineUnknownStageLabel: "unknown",
    pipelineWaveformLoadedTemplate: "Loaded. {sampleCount} samples @ {sampleRate} Hz ({endLabel}).{renderDiagnostics}{pipelineDiagnostics}",
    pipelineWaveformPipelineDiagnosticsTemplate: " pipeMax={pipelineMax}",
    pipelineWaveformRenderDiagnosticsTemplate: " yMax={yMax} maxAbs={maxAbs}",
    modeCardsAddCustomAriaLabel: "Add custom measurement",
    modeCardsAddMode: "Add Mode",
    modeCardsConfirmedLong: "Long",
    modeCardsDeleteCustomTitle: "Delete custom measurement",
    modeCardsNoPeak: "No peak",
    modeCardsCustomFallbackLabel: "Custom",
    modeCardsCustomNamePrompt: "Custom measurement name",
    modeCardsCustomSequenceTemplate: "Custom {sequence}",
    modeCardsCustomTooltipTemplate: "{label}\nCustom measurement",
    modeCardsCustomValuePrompt: "Set custom value (Hz)",
    modeCardsReassignPeakTitle: "Reassign peak",
    modeCardsReset: "reset",
    modeCardsSetTarget: "Set target",
    modeCardsSetValue: "Set value",
    modeCardsSuggestedLong: "Suggested Long",
    modeCardsTargetLabel: "Target",
    modeCardsWolfLikely: "likely",
    modeCardsWolfPossible: "possible",
    modeCardsWolfTemplate: "Wolf {likelihood}",
    measureModeBraceStock: "Brace stock",
    measureModeGuitar: "Guitar",
    measureModePeakAnalysis: "Peak/Q",
    measureModePlateStock: "Plate stock",
    measureModePlayedNote: "Played note",
    modeAirLabel: "Air",
    modeAirTooltip: "Air (T(1,1)\u2081)\nHelmholtz air resonance of the cavity.",
    modeBackLabel: "Back",
    modeBackTooltip: "Back (T(1,1)\u2083)\nPrimary back-plate low-frequency mode.",
    modeBraceLongTooltip: "Long\nLong-grain brace-stock mode.",
    modeCrossLabel: "Cross",
    modeCrossTooltip: "Cross\nCross-grain plate mode.",
    modeLongLabel: "Long",
    modePlateLongTooltip: "Long\nLong-grain plate mode.",
    modeTopLabel: "Top",
    modeTopTooltip: "Top (T(1,1)\u2082)\nPrimary top-plate low-frequency mode.",
    modeTransverseLabel: "Transverse",
    modeTransverseTooltip: "Transverse\nTransverse/twisting plate mode.",
    modelDestinationBraceLabel: "Open in Brace Calculator",
    modelDestinationDofLabel: "Open in 4-DOF model",
    modelDestinationPlateLabel: "Open in Plate Thickness calculator",
    notebookCommonRpcUnavailable: "Common notebook rpc client is unavailable.",
    notebookRestoreFetchUnavailable: "Resonance notebook restore fetch is unavailable.",
    notebookSaveFailed: "Notebook save failed.",
    plateTransferAdditionalMeasurementsTitle: "Additional Measurements",
    plateTransferClose: "Close",
    plateTransferContinue: "Continue to Plate Calculator",
    plateTransferDialogLabel: "Prepare transfer to Plate Calculator",
    plateTransferFromMeasurement: "(from measurement)",
    plateTransferLengthLabel: "Length",
    plateTransferMassLabel: "Mass",
    plateTransferModesTitle: "Modes",
    plateTransferNotDetected: "Not detected",
    plateTransferOptional: "(optional)",
    plateTransferSkip: "Skip for now",
    plateTransferThicknessLabel: "Thickness",
    plateTransferTitle: "Prepare Transfer -> Plate Calculator",
    plateTransferWidthLabel: "Width",
    peakTapNavigatorDescription: "Select a tap to inspect its Peak/Q ring-down. Every marker is a detected tap.",
    peakTapNavigatorTitle: "Tap Navigator",
    peakAnalysisCandidateLabel: "Peak",
    peakAnalysisCandidatesTrace: "Peak candidates",
    peakAnalysisFrequencyResponseTrace: "Frequency response",
    peakAnalysisRingdownAmplitudeAxis: "Amplitude",
    peakAnalysisRingdownDecayFitTrace: "Decay fit",
    peakAnalysisRingdownEnvelopeTrace: "Envelope",
    peakAnalysisRingdownFitLabel: "Fit",
    peakAnalysisRingdownSecondsAxis: "Seconds",
    peakAnalysisRingdownSelectedResponseTrace: "Selected tap response",
    peakAnalysisProvenanceAdaptiveFit: "Adaptive decay fit",
    peakAnalysisProvenanceAdaptiveStatusTemplate: " \xB7 {fit} \xB7 noise {noiseStatus}",
    peakAnalysisProvenanceAutomaticBandwidth: "automatic spectral BW",
    peakAnalysisProvenanceDecayFitUnavailableTemplate: "Decay fit unavailable: {reasons}",
    peakAnalysisProvenanceFilterSensitive: "filter-sensitive",
    peakAnalysisProvenanceFullFileStart: "full file start",
    peakAnalysisProvenanceIsolationBandwidthTemplate: "isolation {bandwidthHz} Hz",
    peakAnalysisProvenanceNextTapLimit: " (next tap)",
    peakAnalysisProvenanceNoConsistentDecay: "no consistent decay",
    peakAnalysisProvenanceOverlappingPeaks: "overlapping peaks",
    peakAnalysisProvenancePoorFit: "poor fit",
    peakAnalysisProvenanceTargetNotObserved: "no resonance at the selected frequency",
    peakAnalysisProvenanceRecordingEndsLimit: " (recording ends)",
    peakAnalysisProvenanceSourceTemplate: "Ring-down source: {tapLabel} \xB7 {window} \xB7 {preOnsetMs} ms pre-onset \xB7 {bandwidth} \xB7 {sampleRateHz} Hz{adaptiveStatus}",
    peakAnalysisProvenanceSpectralBandwidthTemplate: "spectral BW {bandwidthHz} Hz",
    peakAnalysisProvenanceTapTemplate: "tap {tapNumber} of {tapCount}",
    peakAnalysisProvenanceTooLittleDecay: "too little decay",
    peakAnalysisProvenanceWindowTemplate: "Tap window: {seconds} seconds{limit}",
    peakAnalysisEvidenceExported: "Peak/Q evidence exported.",
    peakAnalysisAveragingPowerMean: "power mean tap average",
    peakAnalysisAveragingSingleTap: "single tap",
    peakAnalysisConfidenceProvisional: "provisional",
    peakAnalysisConfidenceStrong: "strong",
    peakAnalysisConfidenceUnavailable: "unavailable",
    peakAnalysisConfidenceUsable: "usable",
    peakAnalysisConfidenceWeak: "weak",
    peakAnalysisNextFallback: "next",
    peakAnalysisPositionEmpty: "Peak -",
    peakAnalysisPositionTemplate: "Peak {current} of {total}",
    peakAnalysisPreviousFallback: "previous",
    peakAnalysisReviewingTemplate: "Reviewing {label} peak.",
    peakAnalysisSmoothingOff: "smoothing off",
    peakAnalysisSmoothingOn: "smoothing on",
    peakAnalysisSelectedTrace: "Selected peak",
    plateMaterialBraceDescription: "Capture the stock dimensions and mass alongside the detected brace-stock modes.",
    plateMaterialBraceTitle: "Brace Stock Properties",
    plateMaterialDescription: "These measurements travel with the detected plate modes into the Plate Thickness calculator.",
    plateMaterialTitle: "Material Properties",
    recordingFailedStatus: "Recording failed or denied.",
    recordingMicrophoneLabel: "Recording (mic)",
    recordingRecordedStatus: "Recorded.",
    recordingRecordingStatus: "Recording...",
    recordingStoppedStatus: "Recording stopped.",
    restoreNotebookConnectedStatus: "Notebook connected. Review the draft and save again.",
    restoreNotebookDraftLabel: "Notebook draft",
    restoreNotebookEventStatus: "Notebook event restored.",
    saveActionLabel: "Save",
    saveButtonMenuLabel: "Save \u25BE",
    saveButtonSavedLabel: "\u2713 Saved",
    saveConnectNotebookDescription: "Connect first, then save the package into your notebook.",
    saveConnectNotebookLabel: "Connect Google Drive + Notebook",
    saveDefaultNotebookName: "Notebook",
    saveDialogLabel: "Save Resonance Capture",
    saveDisplayNamePlaceholder: "European Spruce Top",
    saveDownloadPackageDescription: "Save state.json, source.wav, and plot.png locally.",
    saveDownloadPackageLabel: "Download Package",
    saveHelpConnected: "Save attaches the current capture to a record in your connected Notebook, including its audio and analysis evidence.",
    saveHelpDisconnected: "Save offers a capture package containing the current audio, analysis state and a plot image. You can also connect a Notebook to attach the capture to a record.",
    saveHelpOffline: "Save downloads the current audio as a WAV file. It does not save the analysis settings or the entire session.",
    saveIdleStatus: "Load or record to view the waveform.",
    saveIdleStatusWithHintTemplate: "Load or record to view the waveform. {hint}",
    saveLoadFirstStatus: "Load or record before saving.",
    saveNotebookUnavailable: "Common notebook save modal is unavailable.",
    savePeakAnalysisTitle: "Peak/Q analysis",
    savePackageDownloadedStatus: "Package downloaded.",
    saveSavedToNotebookTemplate: "Saved to {notebookName}.",
    saveTapTestTitleTemplate: "Tap test \xB7 {mode}",
    saveWavHint: "Save the current WAV file locally.",
    saveWavSavedStatus: "WAV saved.",
    saveSummaryMeasured: "measured",
    saveSummaryMeasuring: "Measuring",
    saveSummaryMode: "Mode",
    saveSummaryRecording: "Recording",
    stockMeasurementsApply: "Apply",
    stockMeasurementsAdd: "Add measurements",
    stockMeasurementsBraceAssumption: "Free-free bending assumption. Specimen dimensions, not finished brace dimensions.",
    stockMeasurementsBraceHeightLabel: "Height in bending direction (mm)",
    stockMeasurementsBraceKind: "Brace stock",
    stockMeasurementsCancel: "Cancel",
    stockMeasurementsChange: "Change",
    stockMeasurementsClearLong: "Clear Long",
    stockMeasurementsChooseKind: "Choose a specimen type",
    stockMeasurementsChooseKindPreview: "Choose a specimen type.",
    stockMeasurementsEnterPositive: "Enter four positive measurements.",
    stockMeasurementsEdit: "Edit measurements",
    stockMeasurementsKindChangeConsequence: "Applying this specimen change clears its Long assignment.",
    stockMeasurementsLengthLabel: "Length (mm)",
    stockMeasurementsLongModeUnconfirmed: "Long mode not assigned.",
    stockMeasurementsLongModeUnconfirmedPanel: "Long mode not assigned",
    stockMeasurementsMatchFlexuralRigidity: "Match in Flexural Rigidity",
    stockMeasurementsMassLabel: "Mass (g)",
    stockMeasurementsPlateAssumption: "Free-free rectangular plate bending assumption. Length follows the grain; confirm the first Long bending mode.",
    stockMeasurementsPlateHeightLabel: "Thickness (mm)",
    stockMeasurementsPlateKind: "Plate",
    stockMeasurementsReadyPreviewTemplate: "Draft calculation \xB7 Long {frequencyHz} Hz \xB7 Calculated longitudinal sound speed {soundSpeedMps} m/s \xB7 Calculated E {youngsModulusGPa} GPa \xB7 Density {densityKgM3} kg/m\xB3",
    stockMeasurementsReadyDetailsTemplate: "Free-free bending assumption \xB7 Calculated density {densityKgM3} kg/m\xB3{rigidity}",
    stockMeasurementsReadySummaryTemplate: "Long {frequencyHz} Hz \xB7 Calculated longitudinal sound speed {soundSpeedMps} m/s \xB7 Calculated E {youngsModulusGPa} GPa \xB7 Free-free bending",
    stockMeasurementsRigidityTemplate: " \xB7 Specimen EI {rigidityNm2} N\xB7m\xB2",
    stockMeasurementsSpecimenLabel: "Specimen",
    stockMeasurementsSummaryTemplate: "L {lengthMm} \xD7 W {widthMm} \xD7 H {heightMm} mm \xB7 {massG} g",
    stockMeasurementsTitle: "Stock measurements",
    stockMeasurementsUseAsLongTemplate: "Use {frequencyHz} Hz as Long",
    stockMeasurementsConfirmedLongTemplate: "Long {frequencyHz} Hz",
    stockMeasurementsWidthLabel: "Width (mm)",
    stockPeakLabel: "Peak",
    stockSupportLongRatio: "Hold or support lightly 22.4% of the length from either end for Long.",
    stockSupportLongDistance: "Hold or support lightly {distanceMm} mm from either end for Long.",
    stockSupportCrossRatio: "For Cross, hold or support lightly 22.4% of the width from either side.",
    stockSupportCrossDistance: "For Cross, hold or support lightly {distanceMm} mm from either side.",
    stockSupportHelpLink: "How to hold, tap & measure Q accurately",
    settingsAudioDefaultMicrophone: "Default microphone",
    settingsAudioMicrophoneTemplate: "Microphone {number}",
    settingsRefreshFailedStatus: "FFT settings updated. Refresh failed.",
    settingsUpdatedStatus: "FFT settings updated.",
    spectrumHoverNoteLabel: "Note",
    spectrumMeasuredTrace: "Measured",
    spectrumModelTrace: "Model",
    spectrumPeakHoldTrace: "Peak Hold",
    spectrumPolymaxStabilityLabel: "stability",
    spectrumPolymaxStablePole: "PolyMAX Stable Pole",
    spectrumSelectedNoteWindowTrace: "Selected Note Window",
    spectrumSettingsTitle: "FFT and microphone settings",
    subjectAssembly: "Assembly",
    subjectBlank: "Blank",
    subjectBrace: "Brace",
    subjectBraceStock: "Brace Stock",
    subjectFixture: "Fixture",
    subjectGeneral: "General",
    subjectGeneric: "Generic",
    subjectGuitar: "Guitar",
    subjectInstrument: "Instrument",
    subjectJig: "Jig",
    subjectMaterial: "Material",
    subjectPart: "Part",
    subjectPlate: "Plate",
    subjectPlateStock: "Plate Stock",
    subjectSetupComponent: "Setup Component",
    takeOverlayCurrentLabel: "Current",
    takeOverlaySelectLabel: "Select",
    transportDemoPrompt: "Demo (click record)",
    transportPlayLabel: "Play",
    transportRecordLabel: "Record",
    transportStopLabel: "Stop",
    transportStoppedStatus: "Stopped.",
    waveformNavigatorDescription: "Drag yellow range for FFT analysis. Drag green range for note selection. Click a note label (or Option/Command-click a note slice) to override its note.",
    waveformNavigatorTitle: "Frequency Response",
    waveformAnalyzingFullClip: "Analyzing full clip",
    waveformAnalyzingSelectedRegion: "Analyzing selected region",
    waveformAnalyzingSelectedTapWindow: "Analyzing selected tap window",
    waveformNoteEditorApply: "Apply",
    waveformNoteEditorClear: "Clear",
    waveformNoteEditorClose: "Close",
    waveformNoteEditorDetectedLabel: "Detected:",
    waveformNoteEditorDetectedTemplate: "Detected: {note}",
    waveformNoteEditorPlaceholder: "Type note (e.g. E4)",
    waveformNoteEditorTapOverrideUnavailable: "Tap labels are automatic; note override is available on note slices.",
    waveformTapLabel: "Tap",
    whatIfAirVolumeIncreaseTemplate: "Increase effective air volume by {amountPercent}%",
    whatIfAirVolumeReduceTemplate: "Reduce effective air volume by {amountPercent}%",
    whatIfBackMassTemplate: "Add {massG} g mass to back plate",
    whatIfBackStiffnessSoftenTemplate: "Soften back by {amountPercent}% (brace height/scope)",
    whatIfBackStiffnessStiffenTemplate: "Stiffen back by {amountPercent}% (brace height/scope)",
    whatIfSoundholeIncreaseTemplate: "Increase soundhole diameter by {amountMm} mm",
    whatIfSoundholeReduceTemplate: "Reduce soundhole diameter by {amountMm} mm",
    whatIfTopMassTemplate: "Add {massG} g mass near bridge (top)",
    whatIfTopStiffnessSoftenTemplate: "Soften top by {amountPercent}% (brace height/scope)",
    whatIfTopStiffnessStiffenTemplate: "Stiffen top by {amountPercent}% (brace height/scope)"
  });
  function resolveResonanceLocalizedMessages(candidate) {
    return Object.freeze({
      ...ENGLISH_RESONANCE_MESSAGES,
      ...nonEmptyMessagesRead(candidate)
    });
  }
  function nonEmptyMessagesRead(candidate) {
    if (!candidate) return {};
    return Object.fromEntries(
      Object.entries(candidate).filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    );
  }
  var runtimeMessages = globalThis.ToneLabResonanceMessages;
  var resonanceLocalizedMessages = resolveResonanceLocalizedMessages(
    runtimeMessages
  );

  // tools/resonance_reader/resonate_mode_config.ts
  var GUITAR_BANDS = {
    air: { low: 75, high: 115 },
    top: { low: 150, high: 205 },
    back: { low: 210, high: 260 }
  };
  var GUITAR_META = {
    air: {
      label: resonanceLocalizedMessages.modeAirLabel,
      aliasHtml: "T(1,1)<sub>1</sub>",
      aliasText: "T(1,1)\u2081",
      tooltip: resonanceLocalizedMessages.modeAirTooltip,
      color: resolveColorHexFromRole("airMode")
    },
    top: {
      label: resonanceLocalizedMessages.modeTopLabel,
      aliasHtml: "T(1,1)<sub>2</sub>",
      aliasText: "T(1,1)\u2082",
      tooltip: resonanceLocalizedMessages.modeTopTooltip,
      color: resolveColorHexFromRole("topMode")
    },
    back: {
      label: resonanceLocalizedMessages.modeBackLabel,
      aliasHtml: "T(1,1)<sub>3</sub>",
      aliasText: "T(1,1)\u2083",
      tooltip: resonanceLocalizedMessages.modeBackTooltip,
      color: resolveColorHexFromRole("backMode")
    }
  };
  var PLATE_STOCK_BANDS = {
    long: { low: 65, high: 100 },
    cross: { low: 110, high: 140 },
    transverse: { low: 24, high: 55 }
  };
  var PLATE_STOCK_META = {
    long: {
      label: resonanceLocalizedMessages.modeLongLabel,
      aliasHtml: "L",
      aliasText: "L",
      tooltip: resonanceLocalizedMessages.modePlateLongTooltip,
      color: resolveColorHexFromRole("plateLongMode")
    },
    cross: {
      label: resonanceLocalizedMessages.modeCrossLabel,
      aliasHtml: "C",
      aliasText: "C",
      tooltip: resonanceLocalizedMessages.modeCrossTooltip,
      color: resolveColorHexFromRole("plateCrossMode")
    },
    transverse: {
      label: resonanceLocalizedMessages.modeTransverseLabel,
      aliasHtml: "T",
      aliasText: "T",
      tooltip: resonanceLocalizedMessages.modeTransverseTooltip,
      color: resolveColorHexFromRole("plateTransverseMode")
    }
  };
  var BRACE_STOCK_BANDS = {
    long: { low: 100, high: 500 }
  };
  var BRACE_STOCK_META = {
    long: {
      label: resonanceLocalizedMessages.modeLongLabel,
      aliasHtml: "L",
      aliasText: "L",
      tooltip: resonanceLocalizedMessages.modeBraceLongTooltip,
      color: resolveColorHexFromRole("plateLongMode")
    }
  };
  var MODE_PROFILES = {
    guitar: { bands: GUITAR_BANDS, meta: GUITAR_META },
    played_note: { bands: GUITAR_BANDS, meta: GUITAR_META },
    peak_analysis: { bands: GUITAR_BANDS, meta: GUITAR_META },
    plate_stock: { bands: PLATE_STOCK_BANDS, meta: PLATE_STOCK_META },
    brace_stock: { bands: BRACE_STOCK_BANDS, meta: BRACE_STOCK_META }
  };
  var modeBands = GUITAR_BANDS;
  function measureModeNormalize(input) {
    if (input === "played_note") return "played_note";
    if (input === "peak_analysis") return "peak_analysis";
    if (input === "plate_stock" || input === "top") return "plate_stock";
    if (input === "back") return "brace_stock";
    if (input === "brace_stock") return "brace_stock";
    return "guitar";
  }
  function modeProfileResolveFromMeasureMode(measureMode) {
    return MODE_PROFILES[measureModeNormalize(measureMode)];
  }
  function peakAnalysisSourceMeasureModeResolve(state) {
    const measureMode = measureModeNormalize(state?.measureMode);
    if (measureMode !== "peak_analysis") return measureMode;
    const sourceMode = measureModeNormalize(state?.peakAnalysisSourceMeasureMode);
    return sourceMode === "peak_analysis" ? "guitar" : sourceMode;
  }
  function measureModeLabelBuild(measureMode) {
    const normalized = measureModeNormalize(measureMode);
    if (normalized === "played_note") return resonanceLocalizedMessages.measureModePlayedNote;
    if (normalized === "peak_analysis") return resonanceLocalizedMessages.measureModePeakAnalysis;
    if (normalized === "plate_stock") return resonanceLocalizedMessages.measureModePlateStock;
    if (normalized === "brace_stock") return resonanceLocalizedMessages.measureModeBraceStock;
    return resonanceLocalizedMessages.measureModeGuitar;
  }
  function modeProfileResolveFromState(state) {
    return modeProfileResolveFromMeasureMode(peakAnalysisSourceMeasureModeResolve(state));
  }

  // tools/resonance_reader/resonate_mode_metrics.ts
  function median(arr) {
    if (!arr.length) return 0;
    const s = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
  function noteAndCentsFromFreq(freq) {
    if (!Number.isFinite(freq)) return { note: null, cents: null };
    const FFTUtils = window.FFTUtils;
    const f = freq;
    if (FFTUtils?.freqToNoteCents) {
      try {
        const out = FFTUtils.freqToNoteCents(f);
        const note = typeof out?.name === "string" ? out.name : null;
        const centsNum = Number.isFinite(out?.centsNum) ? out.centsNum : null;
        return { note, cents: centsNum !== null ? Math.round(centsNum) : null };
      } catch {
        return noteAndCentsCalculateFromFreq(f);
      }
    }
    return noteAndCentsCalculateFromFreq(f);
  }
  function noteAndCentsCalculateFromFreq(freq) {
    if (!Number.isFinite(freq) || freq <= 0) return { note: null, cents: null };
    const midi = 69 + 12 * Math.log2(freq / 440);
    const nearest = Math.round(midi);
    const cents = Math.round((midi - nearest) * 100);
    return {
      note: noteNameFromMidi(nearest),
      cents
    };
  }
  function noteNameFromMidi(midi) {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    return `${names[(midi % 12 + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  }
  function severityFromProminence(prom) {
    if (!Number.isFinite(prom)) return "Low";
    if (prom >= 14) return "High";
    if (prom >= 9) return "Medium";
    return "Low";
  }
  function severityFromNoteProximity(centsAbs) {
    if (!Number.isFinite(centsAbs)) return "Low";
    if (centsAbs <= 7) return "High";
    if (centsAbs < 15) return "Medium";
    return "Low";
  }
  function pickSeverity(a, b) {
    const rank = { Low: 1, Medium: 2, High: 3 };
    return rank[a] >= rank[b] ? a : b;
  }
  function computeSeverity(prominence, centsAbs) {
    return pickSeverity(
      severityFromProminence(prominence),
      severityFromNoteProximity(centsAbs)
    );
  }
  function estimateQFromDb(freqs, dbs, peak) {
    if (freqs.length !== dbs.length || freqs.length < 3) return null;
    const { freq: f0, db: peakDb } = peak;
    if (!Number.isFinite(f0) || !Number.isFinite(peakDb)) return null;
    const cutoff = peakDb - 3;
    let idx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < freqs.length; i += 1) {
      const d = Math.abs(freqs[i] - f0);
      if (d < bestDist) {
        bestDist = d;
        idx = i;
      }
    }
    const interpCrossing = (i0, i1) => {
      const fA = freqs[i0];
      const fB = freqs[i1];
      const yA = dbs[i0];
      const yB = dbs[i1];
      if (!Number.isFinite(fA) || !Number.isFinite(fB) || !Number.isFinite(yA) || !Number.isFinite(yB)) return null;
      if (yA === yB) return fA;
      const t = (cutoff - yA) / (yB - yA);
      if (!Number.isFinite(t)) return null;
      const tt = Math.max(0, Math.min(1, t));
      return fA + tt * (fB - fA);
    };
    let left = idx;
    while (left > 0 && dbs[left] > cutoff) left -= 1;
    const leftF = left === idx ? null : interpCrossing(left, Math.min(left + 1, freqs.length - 1));
    let right = idx;
    while (right < dbs.length - 1 && dbs[right] > cutoff) right += 1;
    const rightF = right === idx ? null : interpCrossing(Math.max(0, right - 1), right);
    if (!Number.isFinite(leftF) || !Number.isFinite(rightF)) return null;
    const bw = Math.max(1e-6, Math.abs(rightF - leftF));
    const q = f0 / bw;
    if (!Number.isFinite(q) || q <= 0) return null;
    return q;
  }
  function wolfRiskFromSeverity(sev) {
    if (!sev) return null;
    if (sev === "High") return "High";
    if (sev === "Medium") return "Med";
    return "Low";
  }

  // tools/resonance_reader/resonate_debug_flags.ts
  var RESONANCE_TONELAB_DEFAULTS = {
    fftProfile: "tonelab",
    fftInputScope: null,
    fftWindow: null,
    fftResolution: null,
    spectrumSmoothingMode: null,
    spectrumAveragingMode: null,
    spectrumDisplayRange: null,
    spectrumDbScale: null,
    spectrumYAxisMode: null,
    spectrumXAxisScale: null,
    useHannWindow: true,
    useTapAveraging: true,
    useSpectrumSmoothing: false,
    usePeakHold: true,
    useParabolicPeakRefine: true,
    usePolymaxValidation: false,
    usePaddedTapWindow: true,
    useTapOnsetAlignment: true,
    spectrumSmoothingHz: null,
    spectrumSmoothingBins: 8,
    spectrumLineWidth: 1,
    spectrumXAxisMin: 30,
    spectrumXAxisMax: null,
    spectrumYAxisMin: null,
    spectrumYAxisMax: null,
    tapSliceWindowMs: 400,
    energyBandWidthHz: null
  };
  var DEBUG_FLAGS_DEFAULTS = RESONANCE_TONELAB_DEFAULTS;
  function debugWindowResolve() {
    return typeof window !== "undefined" ? window : globalThis;
  }
  function debugFlagsStoreResolve() {
    const scope = debugWindowResolve();
    if (!scope.__RR_DEBUG_FLAGS || typeof scope.__RR_DEBUG_FLAGS !== "object") scope.__RR_DEBUG_FLAGS = {};
    debugUrlFlagsApplyOnce(scope, scope.__RR_DEBUG_FLAGS);
    return scope.__RR_DEBUG_FLAGS;
  }
  function debugFlagValueResolve(flagName) {
    const store = debugFlagsStoreResolve();
    const raw = store[flagName];
    if (typeof raw === "boolean") return raw;
    return DEBUG_FLAGS_DEFAULTS[flagName];
  }
  function debugFlagsCurrentResolve() {
    const store = debugFlagsStoreResolve();
    const smoothingHzRaw = store.spectrumSmoothingHz;
    const smoothingHz = Number.isFinite(smoothingHzRaw) ? Number(smoothingHzRaw) : null;
    const smoothingBinsRaw = store.spectrumSmoothingBins;
    const smoothingBins = Number.isFinite(smoothingBinsRaw) ? Number(smoothingBinsRaw) : DEBUG_FLAGS_DEFAULTS.spectrumSmoothingBins;
    const lineWidthRaw = store.spectrumLineWidth;
    const lineWidth = Number.isFinite(lineWidthRaw) ? Number(lineWidthRaw) : DEBUG_FLAGS_DEFAULTS.spectrumLineWidth;
    const xAxisMinRaw = store.spectrumXAxisMin;
    const xAxisMin = Number.isFinite(xAxisMinRaw) ? Number(xAxisMinRaw) : DEBUG_FLAGS_DEFAULTS.spectrumXAxisMin;
    const xAxisMaxRaw = store.spectrumXAxisMax;
    const xAxisMax = Number.isFinite(xAxisMaxRaw) ? Number(xAxisMaxRaw) : null;
    const yAxisMinRaw = store.spectrumYAxisMin;
    const yAxisMin = Number.isFinite(yAxisMinRaw) ? Number(yAxisMinRaw) : null;
    const yAxisMaxRaw = store.spectrumYAxisMax;
    const yAxisMax = Number.isFinite(yAxisMaxRaw) ? Number(yAxisMaxRaw) : null;
    const tapSliceWindowMsRaw = store.tapSliceWindowMs;
    const tapSliceWindowMs = Number.isFinite(tapSliceWindowMsRaw) ? Number(tapSliceWindowMsRaw) : DEBUG_FLAGS_DEFAULTS.tapSliceWindowMs;
    const energyBandWidthHzRaw = store.energyBandWidthHz;
    const energyBandWidthHz = Number.isFinite(energyBandWidthHzRaw) ? Number(energyBandWidthHzRaw) : null;
    return {
      fftProfile: debugStringValueResolve("fftProfile", ["tonelab", "celestial"], DEBUG_FLAGS_DEFAULTS.fftProfile),
      fftInputScope: debugNullableStringValueResolve("fftInputScope", ["selection", "full-file"]),
      fftWindow: debugNullableStringValueResolve("fftWindow", ["hann", "hamming", "rect"]),
      fftResolution: debugNullableStringValueResolve("fftResolution", ["fast", "balanced", "fine", "very-fine"]),
      spectrumSmoothingMode: debugNullableStringValueResolve("spectrumSmoothingMode", ["gaussian-bins", "triangular-hz"]),
      spectrumAveragingMode: debugNullableStringValueResolve("spectrumAveragingMode", ["off", "avg-4", "avg-8", "exp-80", "forever"]),
      spectrumDisplayRange: debugNullableStringValueResolve("spectrumDisplayRange", ["mode-default", "celestial"]),
      spectrumDbScale: debugNullableStringValueResolve("spectrumDbScale", ["relative-floor", "celestial-fixed"]),
      spectrumYAxisMode: debugNullableStringValueResolve("spectrumYAxisMode", ["auto", "celestial-fixed"]),
      spectrumXAxisScale: debugNullableStringValueResolve("spectrumXAxisScale", ["linear", "log"]),
      useHannWindow: debugFlagValueResolve("useHannWindow"),
      useTapAveraging: debugFlagValueResolve("useTapAveraging"),
      useSpectrumSmoothing: debugFlagValueResolve("useSpectrumSmoothing"),
      usePeakHold: debugFlagValueResolve("usePeakHold"),
      useParabolicPeakRefine: debugFlagValueResolve("useParabolicPeakRefine"),
      usePolymaxValidation: debugFlagValueResolve("usePolymaxValidation"),
      usePaddedTapWindow: debugFlagValueResolve("usePaddedTapWindow"),
      useTapOnsetAlignment: debugFlagValueResolve("useTapOnsetAlignment"),
      spectrumSmoothingHz: smoothingHz,
      spectrumSmoothingBins: smoothingBins,
      spectrumLineWidth: lineWidth,
      spectrumXAxisMin: xAxisMin,
      spectrumXAxisMax: xAxisMax,
      spectrumYAxisMin: yAxisMin,
      spectrumYAxisMax: yAxisMax,
      tapSliceWindowMs,
      energyBandWidthHz
    };
  }
  function debugStringValueResolve(name, allowed, fallback) {
    const raw = debugFlagsStoreResolve()[name];
    return allowed.includes(raw) ? raw : fallback;
  }
  function debugNullableStringValueResolve(name, allowed) {
    const raw = debugFlagsStoreResolve()[name];
    return allowed.includes(raw) ? raw : null;
  }
  function debugFlagsSet(next) {
    Object.assign(debugFlagsStoreResolve(), next);
    return debugFlagsCurrentResolve();
  }
  function debugFlagsReset() {
    const store = debugFlagsStoreResolve();
    delete store.useHannWindow;
    delete store.fftProfile;
    delete store.fftInputScope;
    delete store.fftWindow;
    delete store.fftResolution;
    delete store.spectrumSmoothingMode;
    delete store.spectrumAveragingMode;
    delete store.spectrumDisplayRange;
    delete store.spectrumDbScale;
    delete store.spectrumYAxisMode;
    delete store.spectrumXAxisScale;
    delete store.useTapAveraging;
    delete store.useSpectrumSmoothing;
    delete store.usePeakHold;
    delete store.useParabolicPeakRefine;
    delete store.usePolymaxValidation;
    delete store.usePaddedTapWindow;
    delete store.useTapOnsetAlignment;
    delete store.spectrumSmoothingHz;
    delete store.spectrumSmoothingBins;
    delete store.spectrumLineWidth;
    delete store.spectrumXAxisMin;
    delete store.spectrumXAxisMax;
    delete store.spectrumYAxisMin;
    delete store.spectrumYAxisMax;
    delete store.tapSliceWindowMs;
    delete store.energyBandWidthHz;
    return debugFlagsCurrentResolve();
  }
  function debugUrlFlagsApplyOnce(scope, store) {
    if (scope.__RR_DEBUG_URL_FLAGS_APPLIED) return;
    scope.__RR_DEBUG_URL_FLAGS_APPLIED = true;
    const patch = debugFlagsPatchBuildFromUrlSearch(String(scope.location?.search || ""));
    Object.entries(patch).forEach(([key, value]) => {
      if (typeof store[key] === "undefined") store[key] = value;
    });
  }
  function debugFlagsPatchBuildFromUrlSearch(search) {
    const params = urlParamsBuild(search);
    const patch = {};
    urlEnumParamApply(params, patch, "fftProfile", ["tonelab", "celestial"]);
    urlEnumParamApply(params, patch, "fftInputScope", ["selection", "full-file"], "fftScope");
    urlEnumParamApply(params, patch, "fftWindow", ["hann", "hamming", "rect"]);
    urlEnumParamApply(params, patch, "fftResolution", ["fast", "balanced", "fine", "very-fine"]);
    urlEnumParamApply(params, patch, "spectrumDisplayRange", ["mode-default", "celestial"], "displayRange");
    urlEnumParamApply(params, patch, "spectrumDbScale", ["relative-floor", "celestial-fixed"], "dbScale");
    urlEnumParamApply(params, patch, "spectrumYAxisMode", ["auto", "celestial-fixed"], "yAxis");
    urlEnumParamApply(params, patch, "spectrumXAxisScale", ["linear", "log"], "xScale");
    urlSmoothingParamApply(params, patch);
    urlEnumParamApply(params, patch, "spectrumAveragingMode", ["off", "avg-4", "avg-8", "exp-80", "forever"], "averaging");
    urlDirectFftAliasApply(params, patch);
    urlBooleanParamApply(params, patch, "useHannWindow");
    urlBooleanParamApply(params, patch, "useTapAveraging");
    urlBooleanParamApply(params, patch, "useSpectrumSmoothing");
    urlBooleanParamApply(params, patch, "usePeakHold");
    urlBooleanParamApply(params, patch, "useParabolicPeakRefine");
    urlBooleanParamApply(params, patch, "usePolymaxValidation");
    urlBooleanParamApply(params, patch, "usePaddedTapWindow");
    urlBooleanParamApply(params, patch, "useTapOnsetAlignment");
    urlNumberParamApply(params, patch, "spectrumSmoothingHz", 0);
    urlNumberParamApply(params, patch, "spectrumSmoothingBins", 0, "gaussianBins");
    urlNumberParamApply(params, patch, "spectrumLineWidth", 0, "lineWidth");
    urlNumberParamApply(params, patch, "spectrumXAxisMin", 0, "xMin");
    urlNumberParamApply(params, patch, "spectrumXAxisMax", 0, "xMax");
    urlFiniteNumberParamApply(params, patch, "spectrumYAxisMin", "yMin");
    urlFiniteNumberParamApply(params, patch, "spectrumYAxisMax", "yMax");
    urlNumberParamApply(params, patch, "tapSliceWindowMs", 0);
    urlNumberParamApply(params, patch, "energyBandWidthHz", 0);
    return patch;
  }
  function urlFiniteNumberParamApply(params, patch, key, alias) {
    const raw = urlParamRead(params, String(key), alias);
    if (raw === null || raw === "") return;
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    patch[key] = value;
  }
  function urlParamsBuild(search) {
    try {
      return new URLSearchParams(search || "");
    } catch {
      return new URLSearchParams("");
    }
  }
  function urlEnumParamApply(params, patch, key, allowed, alias) {
    const raw = urlParamRead(params, String(key), alias);
    if (!raw || !allowed.includes(raw)) return;
    patch[key] = raw;
  }
  function urlSmoothingParamApply(params, patch) {
    const raw = urlParamRead(params, "spectrumSmoothingMode", "smoothing");
    if (!raw) return;
    if (raw === "off") {
      patch.useSpectrumSmoothing = false;
      patch.spectrumSmoothingMode = null;
      return;
    }
    if (["gaussian-bins", "triangular-hz"].includes(raw)) {
      patch.useSpectrumSmoothing = true;
      patch.spectrumSmoothingMode = raw;
    }
  }
  function urlDirectFftAliasApply(params, patch) {
    const enabled = urlBooleanParamRead(params, "directFftDefault");
    if (enabled === null) return;
    patch.fftInputScope = enabled ? "full-file" : "selection";
  }
  function urlBooleanParamApply(params, patch, key) {
    const value = urlBooleanParamRead(params, key);
    if (value === null) return;
    patch[key] = value;
  }
  function urlNumberParamApply(params, patch, key, minExclusive, alias) {
    const raw = urlParamRead(params, String(key), alias);
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= minExclusive) return;
    patch[key] = value;
  }
  function urlParamRead(params, key, alias) {
    if (params.has(key)) return String(params.get(key) || "").trim();
    if (alias && params.has(alias)) return String(params.get(alias) || "").trim();
    return null;
  }
  function urlBooleanParamRead(params, key) {
    const raw = urlParamRead(params, key)?.toLowerCase();
    if (!raw) return null;
    if (["1", "true", "on", "yes"].includes(raw)) return true;
    if (["0", "false", "off", "no"].includes(raw)) return false;
    return null;
  }
  function debugApiInstallOnWindow() {
    const scope = debugWindowResolve();
    if (scope.__RR_DEBUG_API_INSTALLED) return;
    scope.__RR_DEBUG_API_INSTALLED = true;
    scope.ResonanceDebug = {
      show: () => debugFlagsCurrentResolve(),
      set: (next) => debugFlagsSet(next),
      reset: () => debugFlagsReset()
    };
  }
  function debugApiEnsureInstalled() {
    debugApiInstallOnWindow();
  }
  function resonanceFftWindowResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    if (current.fftWindow) return current.fftWindow;
    if (current.fftProfile === "celestial") return "hamming";
    return debugFlagValueResolve("useHannWindow") ? "hann" : "rect";
  }
  function resonanceFftMinSamplesResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    if (current.fftResolution === "fast") return 8192;
    if (current.fftResolution === "balanced") return 32768;
    if (current.fftResolution === "fine") return 65536;
    if (current.fftResolution === "very-fine") return 131072;
    return 32768;
  }
  function resonanceSpectrumSmoothingModeResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    if (!current.useSpectrumSmoothing) return "off";
    if (current.spectrumSmoothingMode) return current.spectrumSmoothingMode;
    return "gaussian-bins";
  }
  function resonanceSpectrumDisplayRangeResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    if (current.spectrumDisplayRange) return current.spectrumDisplayRange;
    return current.fftProfile === "celestial" ? "celestial" : "mode-default";
  }
  function resonanceSpectrumDbScaleResolve() {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve();
    if (current.spectrumDbScale) return current.spectrumDbScale;
    return current.fftProfile === "celestial" ? "celestial-fixed" : "relative-floor";
  }
  function resonanceTapAveragingEnabled() {
    debugApiEnsureInstalled();
    return debugFlagValueResolve("useTapAveraging");
  }
  function resonanceSpectrumSmoothingHzResolve(defaultHz) {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve().spectrumSmoothingHz;
    if (!Number.isFinite(current) || current < 0) return defaultHz;
    return current;
  }
  function resonanceSpectrumSmoothingBinsResolve(defaultBins) {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve().spectrumSmoothingBins;
    if (!Number.isFinite(current) || current <= 0) return defaultBins;
    return current;
  }
  function resonanceTapSliceWindowMsResolve(defaultMs) {
    debugApiEnsureInstalled();
    const current = debugFlagsCurrentResolve().tapSliceWindowMs;
    if (!Number.isFinite(current) || current <= 0) return defaultMs;
    return current;
  }
  function resonanceParabolicPeakRefineEnabled() {
    debugApiEnsureInstalled();
    return debugFlagValueResolve("useParabolicPeakRefine");
  }
  function resonanceUsePaddedTapWindowResolve() {
    debugApiEnsureInstalled();
    return debugFlagValueResolve("usePaddedTapWindow");
  }
  function resonanceUseTapOnsetAlignmentResolve() {
    debugApiEnsureInstalled();
    return debugFlagValueResolve("useTapOnsetAlignment");
  }
  debugApiEnsureInstalled();

  // tools/resonance_reader/resonate_mode_detection.ts
  function smoothSpectrumFast(freqs, mags, smoothHz) {
    if (!smoothHz || smoothHz <= 0) return mags;
    if (freqs.length < 3 || mags.length < 3) return mags;
    const bw = Math.abs(freqs[1] - freqs[0]);
    if (!Number.isFinite(bw) || bw <= 0) return mags;
    const r = Math.max(1, Math.round(smoothHz / bw));
    const n = mags.length;
    const prefix = new Float64Array(n + 1);
    const prefixIdx = new Float64Array(n + 1);
    for (let i = 0; i < n; i += 1) {
      const v = mags[i];
      prefix[i + 1] = prefix[i] + v;
      prefixIdx[i + 1] = prefixIdx[i] + v * i;
    }
    const sumRange = (a, b) => prefix[b + 1] - prefix[a];
    const sumIdxRange = (a, b) => prefixIdx[b + 1] - prefixIdx[a];
    const out = new Array(n);
    const denom = r;
    for (let i = 0; i < n; i += 1) {
      const lo = Math.max(0, i - r);
      const hi = Math.min(n - 1, i + r);
      const leftLo = lo;
      const leftHi = Math.max(lo, i - 1);
      const rightLo = Math.min(hi, i + 1);
      const rightHi = hi;
      let acc = mags[i];
      let wSum = 1;
      if (leftHi >= leftLo && i - 1 >= lo) {
        const count = leftHi - leftLo + 1;
        const base = 1 + i / denom;
        const sumV = sumRange(leftLo, leftHi);
        const sumIV = sumIdxRange(leftLo, leftHi);
        acc += base * sumV - 1 / denom * sumIV;
        wSum += count * base - 1 / denom * ((leftLo + leftHi) * count / 2);
      }
      if (rightHi >= rightLo && i + 1 <= hi) {
        const count = rightHi - rightLo + 1;
        const base = 1 - i / denom;
        const sumV = sumRange(rightLo, rightHi);
        const sumIV = sumIdxRange(rightLo, rightHi);
        acc += base * sumV + 1 / denom * sumIV;
        wSum += count * base + 1 / denom * ((rightLo + rightHi) * count / 2);
      }
      out[i] = wSum > 0 ? acc / wSum : mags[i];
    }
    return out;
  }
  function smoothSpectrumGaussianBins(mags, sigmaBins) {
    if (!sigmaBins || sigmaBins <= 0) return mags;
    if (mags.length < 3) return mags;
    const kernel = gaussianKernelBuild(sigmaBins);
    const halfSize = Math.floor(kernel.length / 2);
    const out = new Array(mags.length);
    for (let i = 0; i < mags.length; i += 1) {
      let value = 0;
      for (let j = -halfSize; j <= halfSize; j += 1) {
        const index = i + j;
        if (index >= 0 && index < mags.length) value += mags[index] * kernel[j + halfSize];
      }
      out[i] = value;
    }
    return out;
  }
  function gaussianKernelBuild(sigmaBins) {
    const kernelSize = Math.ceil(sigmaBins * 3) * 2 + 1;
    const kernel = new Array(kernelSize);
    const halfSize = Math.floor(kernelSize / 2);
    let sum = 0;
    for (let i = -halfSize; i <= halfSize; i += 1) {
      const value = Math.exp(-(i * i) / (2 * sigmaBins * sigmaBins));
      kernel[i + halfSize] = value;
      sum += value;
    }
    return kernel.map((value) => value / sum);
  }
  function refineParabolicPeak(freqs, ys, idx) {
    if (idx <= 0 || idx >= ys.length - 1) return null;
    const a = ys[idx - 1];
    const b = ys[idx];
    const c = ys[idx + 1];
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return null;
    const bw = freqs.length > 1 ? Math.abs(freqs[1] - freqs[0]) : null;
    if (!bw || !Number.isFinite(bw) || bw <= 0) return null;
    const denom = a - 2 * b + c;
    if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return null;
    const delta = 0.5 * (a - c) / denom;
    if (!Number.isFinite(delta)) return null;
    const clamped = Math.max(-1, Math.min(1, delta));
    const freq = freqs[idx] + clamped * bw;
    const y = b - (a - c) * clamped / 4;
    return { freq, y, delta: clamped };
  }
  function analyzeModes(spectrum) {
    return analyzeModesWithBands(spectrum, modeBands);
  }
  function analyzeModesWithBands(spectrum, bands) {
    return Object.entries(bands).map(([key, band]) => {
      const primary = modePeakCandidatesBuild(spectrum, band).sort((left, right) => right.db - left.db)[0] || null;
      return modeDetectionBuildFromCandidate(key, spectrum, primary);
    });
  }
  function analyzeModesWithBandsByQAndLevel(spectrum, bands, estimateQ) {
    return Object.entries(bands).map(([key, band]) => {
      const primary = modePeakCandidatesBuild(spectrum, band).sort((left, right) => modePeakQAndLevelCompare(spectrum, estimateQ, left, right))[0] || null;
      return modeDetectionBuildFromCandidate(key, spectrum, primary);
    });
  }
  function modePeakQAndLevelCompare(spectrum, estimateQ, left, right) {
    const leftScore = modePeakQAndLevelScoreResolve(spectrum, estimateQ, left);
    const rightScore = modePeakQAndLevelScoreResolve(spectrum, estimateQ, right);
    if (leftScore !== null && rightScore !== null && leftScore !== rightScore) return rightScore - leftScore;
    if (leftScore !== null && rightScore === null) return -1;
    if (leftScore === null && rightScore !== null) return 1;
    return right.db - left.db;
  }
  function modePeakQAndLevelScoreResolve(spectrum, estimateQ, candidate) {
    const frequencyHz = spectrum.freqs[candidate.idx];
    const q = estimateQ(spectrum.freqs, spectrum.dbs, { freq: frequencyHz, db: candidate.db });
    if (!Number.isFinite(q) || q <= 0) return null;
    const linearAmplitude = 10 ** (candidate.db / 20);
    return q * linearAmplitude;
  }
  function modePeakCandidatesBuild(spectrum, band) {
    const { freqs, dbs } = spectrum;
    const peaks = [];
    for (let index = 1; index < freqs.length - 1; index += 1) {
      if (!(dbs[index] > dbs[index - 1] && dbs[index] > dbs[index + 1])) continue;
      if (freqs[index] < band.low || freqs[index] > band.high) continue;
      peaks.push({
        idx: index,
        db: dbs[index],
        prominence: modePeakProminenceResolve(dbs, index)
      });
    }
    return peaks;
  }
  function modePeakProminenceResolve(dbs, index) {
    const start = Math.max(0, index - 6);
    const end = Math.min(dbs.length - 1, index + 6);
    const neighbors = dbs.slice(start, end + 1);
    neighbors.splice(index - start, 1);
    const baseline = neighbors.length ? median(neighbors) : dbs[index];
    return dbs[index] - baseline;
  }
  function modeDetectionBuildFromCandidate(mode, spectrum, candidate) {
    if (!candidate) return { mode, peakFreq: null, peakDb: null, peakIdx: null, prominenceDb: null };
    const refined = resonanceParabolicPeakRefineEnabled() ? refineParabolicPeak(spectrum.freqs, spectrum.dbs, candidate.idx) : null;
    return {
      mode,
      peakFreq: refined?.freq ?? spectrum.freqs[candidate.idx],
      peakDb: refined?.y ?? candidate.db,
      peakIdx: candidate.idx,
      prominenceDb: candidate.prominence
    };
  }

  // tools/resonance_reader/resonate_analysis_boundary.ts
  var analysisBoundaryDefault = {
    smoothSpectrumFast,
    smoothSpectrumGaussianBins,
    analyzeModes,
    analyzeModesWithBands,
    analyzeModesWithBandsByQAndLevel,
    noteAndCentsFromFreq,
    estimateQFromDb,
    computeSeverity,
    wolfRiskFromSeverity
  };

  // tools/resonance_reader/resonate_render_events.ts
  var RESONATE_RENDER_EVENT_FLAG = {
    name: "resonate_render_from_events",
    owner: "resonate",
    defaultValue: true,
    rolloutMode: "on",
    removalCondition: "after parity is proven",
    removalTask: "remove render-from-events flag once event rendering is default"
  };
  function renderPayloadBuildFromState(state) {
    if (!state?.lastSpectrum) return null;
    const freqs = Array.isArray(state.lastSpectrum.freqs) ? state.lastSpectrum.freqs : [];
    const mags = Array.isArray(state.lastSpectrum.dbs) ? state.lastSpectrum.dbs : Array.isArray(state.lastSpectrum.mags) ? state.lastSpectrum.mags : [];
    const overlay = Array.isArray(state.lastOverlay) ? state.lastOverlay : null;
    const modes = Array.isArray(state.lastModesDetected) ? state.lastModesDetected : [];
    const cards = Array.isArray(state.lastModeCards) ? state.lastModeCards : [];
    const peakHoldSpectrum = renderPeakHoldSpectrumBuild(state.lastPeakHoldSpectrum);
    if (!freqs.length || !mags.length) return null;
    const payload = { freqs, mags, overlay, modes, cards };
    if (peakHoldSpectrum) payload.peakHoldSpectrum = peakHoldSpectrum;
    return payload;
  }
  function renderPeakHoldSpectrumBuild(peakHold) {
    if (!Array.isArray(peakHold?.freqs) || !Array.isArray(peakHold?.dbs)) return null;
    if (!peakHold.freqs.length || !peakHold.dbs.length) return null;
    return { freqs: peakHold.freqs, mags: peakHold.dbs };
  }
  function renderPayloadBuildFromEvent(event) {
    if (!event || event.eventType !== "artifact.emitted") return null;
    return event.payload?.renderPayload || null;
  }
  if (typeof window !== "undefined") {
    window.ResonateRenderEvents = {
      RESONATE_RENDER_EVENT_FLAG,
      renderPayloadBuildFromState,
      renderPayloadBuildFromEvent
    };
  }

  // tools/resonance_reader/resonate_capture_package.ts
  var import_tool_document = __toESM(require_tool_document(), 1);

  // tools/resonance_reader/resonate_brace_stock_material.ts
  function braceStockMaterialBuildFromMeasurements(measurements, longModeFrequencyHz) {
    if (!braceStockFrequencyValid(longModeFrequencyHz)) return null;
    const specimen = braceStockSpecimenConvertToSi(measurements);
    if (!braceStockSpecimenValid(specimen)) return null;
    const densityKgM3 = braceStockDensityCalculate(specimen);
    const dynamicYoungsModulusGPa = braceStockModulusCalculate(specimen, longModeFrequencyHz);
    const sectionMomentOfInertiaM4 = braceStockSectionMomentOfInertiaCalculateFromSpecimen(specimen);
    const flexuralRigidityNm2 = braceStockFlexuralRigidityCalculateFromValidInputs(
      dynamicYoungsModulusGPa,
      sectionMomentOfInertiaM4
    );
    const longitudinalSoundSpeedMps = braceStockSoundSpeedCalculateFromValidInputs(
      dynamicYoungsModulusGPa,
      densityKgM3
    );
    return {
      densityKgM3,
      dynamicYoungsModulusGPa,
      sectionMomentOfInertiaM4,
      flexuralRigidityNm2,
      longitudinalSoundSpeedMps
    };
  }
  function braceStockSoundSpeedCalculateFromValidInputs(dynamicYoungsModulusGPa, densityKgM3) {
    return Math.sqrt(dynamicYoungsModulusGPa * 1e9 / densityKgM3);
  }
  function braceStockFlexuralRigidityCalculateFromValidInputs(dynamicYoungsModulusGPa, sectionMomentOfInertiaM4) {
    return dynamicYoungsModulusGPa * 1e9 * sectionMomentOfInertiaM4;
  }
  function braceStockSpecimenConvertToSi(measurements) {
    return {
      lengthM: measurements.stockLengthMm / 1e3,
      widthM: measurements.stockWidthMm / 1e3,
      heightM: measurements.stockHeightMm / 1e3,
      massKg: measurements.stockMassG / 1e3
    };
  }
  function braceStockSpecimenValid(specimen) {
    return Object.values(specimen).every((value) => Number.isFinite(value) && value > 0);
  }
  function braceStockFrequencyValid(frequencyHz) {
    return Number.isFinite(frequencyHz) && frequencyHz > 0;
  }
  function braceStockDensityCalculate(specimen) {
    return specimen.massKg / (specimen.lengthM * specimen.widthM * specimen.heightM);
  }
  function braceStockSectionMomentOfInertiaCalculateFromSpecimen(specimen) {
    return specimen.widthM * Math.pow(specimen.heightM, 3) / 12;
  }
  function braceStockModulusCalculate(specimen, frequencyHz) {
    const correctionFactor = 1 + 6.585 * Math.pow(specimen.heightM / specimen.lengthM, 2);
    const modulusPa = 0.9465 * (specimen.massKg * Math.pow(frequencyHz, 2) * Math.pow(specimen.lengthM, 3) / (specimen.widthM * Math.pow(specimen.heightM, 3))) * correctionFactor;
    return modulusPa / 1e9;
  }

  // tools/resonance_reader/resonate_stock_measurements.ts
  function stockMeasurementsEvidenceBuild(state) {
    if (!state.stockMeasurementKind && !state.braceStockMeasurements) return {};
    return {
      stockMeasurementKind: stockKindResolve(state),
      braceStockMeasurements: state.braceStockMeasurements ?? null,
      braceStockConfirmedLongMode: state.braceStockConfirmedLongMode ?? null,
      plateStockConfirmedLongMode: state.plateStockConfirmedLongMode ?? null,
      peakAnalysisSourceMeasureMode: state.peakAnalysisSourceMeasureMode ?? null
    };
  }
  function stockKindResolve(state) {
    if (stockKindValid(state.stockMeasurementKind)) return state.stockMeasurementKind;
    if (state.braceStockMeasurements) return "brace_stock";
    const context = state.measureMode === "peak_analysis" ? peakAnalysisSourceMeasureModeResolve(state) : state.measureMode;
    return stockKindValid(context) ? context : null;
  }
  function stockKindValid(kind) {
    return kind === "plate_stock" || kind === "brace_stock";
  }

  // tools/resonance_reader/resonate_q_aggregation.ts
  var DEFAULT_Q_AGGREGATION = "p75";
  var QUANTILES = { median: 0.5, max: 1, p75: 0.75 };
  function aggregateDecayQ(values, aggregation = DEFAULT_Q_AGGREGATION) {
    const accepted = values.filter(isPositiveFiniteQ).sort((left, right) => left - right);
    if (!accepted.length) return null;
    return interpolateSortedQ(accepted, (accepted.length - 1) * QUANTILES[aggregation]);
  }
  function isPositiveFiniteQ(value) {
    return Number.isFinite(value) && Number(value) > 0;
  }
  function interpolateSortedQ(sorted, position) {
    const lower = sorted[Math.floor(position)];
    const upper = sorted[Math.ceil(position)];
    return lower + (upper - lower) * (position % 1);
  }

  // tools/resonance_reader/resonate_q_settings.ts
  function qSettingsResolve(state) {
    return {
      method: state.qSettings?.method === "spectral" ? "spectral" : "decay",
      aggregation: qAggregationResolve(state.qSettings?.aggregation)
    };
  }
  function qAggregationResolve(value) {
    if (value === "median" || value === "max" || value === "p75") return value;
    return DEFAULT_Q_AGGREGATION;
  }

  // tools/resonance_reader/resonate_capture_package.ts
  function resonanceCaptureStateJsonBuild(args) {
    return {
      ...(0, import_tool_document.buildToolDocumentHeader)({
        toolDocumentType: "RESONANCE_READER_SAVE",
        toolId: "resonance_reader",
        toolVersion: args.toolVersion,
        savedAtIso: args.savedAtIso
      }),
      packageVersion: 1,
      toolId: "resonance_reader",
      toolVersion: args.toolVersion,
      savedAt: args.savedAtIso,
      measureMode: String(args.state.measureMode ?? ""),
      ...args.state.qSettings ? { qSettings: qSettingsResolve(args.state) } : {},
      recordingLabel: args.recordingLabel,
      renderPayload: renderPayloadBuildFromState(args.state),
      currentWave: buildResonanceCaptureStoredWave(resonanceCaptureWaveResolve(args.state)),
      plateMaterialMeasurements: resonanceCapturePlainValueClone(args.state.plateMaterialMeasurements ?? null),
      ...resonanceCapturePlainValueClone(stockMeasurementsEvidenceBuild(args.state)),
      selection: {
        viewRangeMs: resonanceCaptureRangeClone(args.state.viewRangeMs),
        noteSelectionRangeMs: resonanceCaptureRangeClone(args.state.noteSelectionRangeMs)
      },
      customMeasurements: resonanceCapturePlainValueClone(args.state.customMeasurements ?? []),
      summary: resonanceCaptureSummaryBuild(args.state)
    };
  }
  function resonanceCaptureWaveBlobBuild(state) {
    const wave = resonanceCaptureWaveResolve(state);
    if (!wave) {
      throw new Error("Waveform capture is unavailable.");
    }
    return resonanceCaptureWavBlobBuild(wave.samples, wave.sampleRate);
  }
  function resonanceCaptureSummaryBuild(state) {
    const renderPayload = renderPayloadBuildFromState(state);
    return {
      modeCardCount: Array.isArray(renderPayload?.cards) ? renderPayload.cards.length : 0,
      detectedModeCount: Array.isArray(renderPayload?.modes) ? renderPayload.modes.length : 0,
      spectrumPointCount: Array.isArray(renderPayload?.freqs) ? renderPayload.freqs.length : 0
    };
  }
  function resonanceCaptureRangeClone(value) {
    if (!Array.isArray(value) || value.length < 2) {
      return null;
    }
    return [Number(value[0]), Number(value[1])];
  }
  function resonanceCapturePlainValueClone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function resonanceCaptureWaveResolve(state) {
    const currentWave = readResonanceCaptureRuntimeWave() ?? state.currentWave;
    const samples = currentWave?.wave;
    const sampleRate = Number(currentWave?.sampleRate);
    if (!samples || !Number.isFinite(sampleRate) || sampleRate <= 0) {
      return null;
    }
    return { samples, sampleRate };
  }
  function readResonanceCaptureRuntimeWave() {
    var runtime = globalThis;
    return runtime.FFTState?.currentWave || null;
  }
  function buildResonanceCaptureStoredWave(wave) {
    if (!wave) {
      return null;
    }
    return {
      sampleRate: wave.sampleRate,
      samplesBase64: resonanceCaptureSamplesBase64Build(wave.samples)
    };
  }
  function resonanceCaptureSamplesBase64Build(samples) {
    const floatSamples = new Float32Array(samples.length);
    for (let index = 0; index < samples.length; index += 1) {
      floatSamples[index] = Number(samples[index] || 0);
    }
    return resonanceCaptureBase64BuildFromBytes(new Uint8Array(floatSamples.buffer));
  }
  function resonanceCaptureBase64BuildFromBytes(bytes) {
    const nodeBuffer = readResonanceCaptureNodeBuffer();
    if (nodeBuffer) {
      return nodeBuffer.from(bytes).toString("base64");
    }
    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  }
  function readResonanceCaptureNodeBuffer() {
    return globalThis.Buffer || null;
  }
  function resonanceCaptureWavBlobBuild(samples, sampleRate) {
    const bytes = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(bytes);
    resonanceCaptureRiffHeaderWrite(view, samples.length, sampleRate);
    resonanceCapturePcmSamplesWrite(view, samples);
    return new Blob([bytes], { type: "audio/wav" });
  }
  function resonanceCaptureRiffHeaderWrite(view, sampleCount, sampleRate) {
    resonanceCaptureAsciiWrite(view, 0, "RIFF");
    view.setUint32(4, 36 + sampleCount * 2, true);
    resonanceCaptureAsciiWrite(view, 8, "WAVE");
    resonanceCaptureAsciiWrite(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    resonanceCaptureAsciiWrite(view, 36, "data");
    view.setUint32(40, sampleCount * 2, true);
  }
  function resonanceCaptureAsciiWrite(view, offset, text) {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  }
  function resonanceCapturePcmSamplesWrite(view, samples) {
    for (let index = 0; index < samples.length; index += 1) {
      view.setInt16(44 + index * 2, resonanceCapturePcmSampleBuild(samples[index]), true);
    }
  }
  function resonanceCapturePcmSampleBuild(value) {
    const clamped = Math.max(-1, Math.min(1, value));
    return clamped < 0 ? clamped * 32768 : clamped * 32767;
  }

  // tools/resonance_reader/resonate_notebook_connect_draft.ts
  function restoreResonanceNotebookConnectDraftState(state, draft) {
    if (!draft) {
      return false;
    }
    state.measureMode = draft.measureMode;
    state.qSettings = draft.qSettings ? qSettingsResolve({ qSettings: draft.qSettings }) : void 0;
    state.recordingLabel = draft.recordingLabel;
    state.plateMaterialMeasurements = cloneResonanceNotebookConnectDraftValue(draft.plateMaterialMeasurements);
    state.stockMeasurementKind = draft.stockMeasurementKind ?? null;
    state.braceStockMeasurements = cloneResonanceNotebookConnectDraftValue(draft.braceStockMeasurements ?? null);
    state.braceStockConfirmedLongMode = cloneResonanceNotebookConnectDraftValue(draft.braceStockConfirmedLongMode ?? null);
    state.plateStockConfirmedLongMode = cloneResonanceNotebookConnectDraftValue(draft.plateStockConfirmedLongMode ?? null);
    state.peakAnalysisSourceMeasureMode = draft.peakAnalysisSourceMeasureMode ?? null;
    state.customMeasurements = cloneResonanceNotebookConnectDraftValue(draft.customMeasurements) || [];
    state.viewRangeMs = cloneResonanceNotebookConnectDraftRange(draft.selection.viewRangeMs);
    state.noteSelectionRangeMs = cloneResonanceNotebookConnectDraftRange(draft.selection.noteSelectionRangeMs);
    state.currentWave = buildResonanceNotebookConnectDraftWaveFromStored(draft.currentWave);
    restoreResonanceNotebookConnectDraftRenderState(state, draft.renderPayload);
    return true;
  }
  function restoreResonanceSavedStateDocument(state, savedDocument) {
    if (!isResonanceSavedStateDocument(savedDocument)) {
      return false;
    }
    return restoreResonanceNotebookConnectDraftState(
      state,
      buildResonanceNotebookConnectDraftFromSavedDocument(savedDocument)
    );
  }
  function buildResonanceNotebookConnectDraftFromSavedDocument(savedDocument) {
    return {
      version: 1,
      returnTo: "",
      recordingLabel: String(savedDocument.recordingLabel || "").trim(),
      measureMode: String(savedDocument.measureMode || "").trim(),
      qSettings: savedDocument.qSettings,
      renderPayload: cloneResonanceNotebookConnectDraftValue(savedDocument.renderPayload),
      plateMaterialMeasurements: cloneResonanceNotebookConnectDraftValue(savedDocument.plateMaterialMeasurements ?? null),
      ...cloneResonanceNotebookConnectDraftValue(stockMeasurementsEvidenceBuild(savedDocument)),
      customMeasurements: cloneResonanceNotebookConnectDraftValue(savedDocument.customMeasurements ?? []),
      selection: {
        viewRangeMs: cloneResonanceNotebookConnectDraftRange(savedDocument.selection?.viewRangeMs),
        noteSelectionRangeMs: cloneResonanceNotebookConnectDraftRange(savedDocument.selection?.noteSelectionRangeMs)
      },
      currentWave: readResonanceSavedDocumentCurrentWave(savedDocument)
    };
  }
  function readResonanceSavedDocumentCurrentWave(savedDocument) {
    const currentWave = savedDocument.currentWave;
    if (!currentWave || typeof currentWave !== "object") {
      return null;
    }
    const sampleRate = Number(currentWave.sampleRate);
    const samplesBase64 = String(currentWave.samplesBase64 || "").trim();
    if (!Number.isFinite(sampleRate) || sampleRate <= 0 || samplesBase64 === "") {
      return null;
    }
    return {
      sampleRate,
      samplesBase64
    };
  }
  function isResonanceSavedStateDocument(savedDocument) {
    return String(savedDocument?.toolDocumentType || "").trim() === "RESONANCE_READER_SAVE";
  }
  function cloneResonanceNotebookConnectDraftValue(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }
  function cloneResonanceNotebookConnectDraftRange(value) {
    if (!Array.isArray(value) || value.length < 2) {
      return null;
    }
    return [Number(value[0]), Number(value[1])];
  }
  function buildResonanceNotebookConnectDraftWaveFromStored(currentWave) {
    if (!currentWave) {
      return null;
    }
    return {
      sampleRate: Number(currentWave.sampleRate),
      wave: decodeResonanceNotebookConnectDraftSamples(currentWave.samplesBase64)
    };
  }
  function decodeResonanceNotebookConnectDraftSamples(base64) {
    const bytes = decodeResonanceNotebookConnectDraftBytes(base64);
    return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  }
  function decodeResonanceNotebookConnectDraftBytes(base64) {
    const nodeBuffer = readResonanceNotebookConnectDraftNodeBuffer();
    if (nodeBuffer) {
      return new Uint8Array(nodeBuffer.from(base64, "base64"));
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  function readResonanceNotebookConnectDraftNodeBuffer() {
    const candidate = globalThis.Buffer;
    return candidate || null;
  }
  function restoreResonanceNotebookConnectDraftRenderState(state, renderPayload) {
    if (!renderPayload) {
      state.lastSpectrum = null;
      state.lastModesDetected = [];
      state.lastModeCards = [];
      state.lastOverlay = null;
      return;
    }
    state.lastSpectrum = {
      freqs: cloneResonanceNotebookConnectDraftValue(renderPayload.freqs),
      mags: cloneResonanceNotebookConnectDraftValue(renderPayload.mags),
      dbs: cloneResonanceNotebookConnectDraftValue(renderPayload.mags)
    };
    state.lastModesDetected = cloneResonanceNotebookConnectDraftValue(renderPayload.modes) || [];
    state.lastModeCards = cloneResonanceNotebookConnectDraftValue(renderPayload.cards) || [];
    state.lastOverlay = cloneResonanceNotebookConnectDraftValue(renderPayload.overlay);
  }

  // tools/resonance_reader/resonate_ringdown_noise.ts
  function estimateLocalModalNoise(args) {
    if (!Number.isFinite(args.sampleRate) || args.sampleRate <= 0) return noiseUnavailable();
    const windows = quietWindows(args.wave.length, args.sampleRate, args.taps, args.selectedStart);
    const references = windows.flatMap(([start, end]) => {
      const samples = Float64Array.from({ length: end - start }, (_, i) => Number(args.wave[start + i]));
      if (!samples.every(Number.isFinite)) return [];
      const amplitude2 = stationaryNoiseAmplitude(args.envelope(samples), args.sampleRate);
      return amplitude2 === null ? [] : [{ startSec: start / args.sampleRate, endSec: end / args.sampleRate, amplitude: amplitude2 }];
    }).slice(0, 4);
    if (!references.length) return noiseUnavailable();
    const amplitudes = references.map((reference) => reference.amplitude);
    const amplitude = Math.max(...amplitudes);
    return { status: amplitude / Math.min(...amplitudes) > 2 ? "variable" : "measured", amplitude, references };
  }
  function stationaryNoiseAmplitude(envelope, sampleRate) {
    const trim = Math.round(sampleRate * 0.12);
    const interior = Array.from(envelope).slice(trim, -trim);
    if (interior.length < sampleRate * 0.25 || !interior.every(Number.isFinite)) return null;
    const quarters = quarterLevels(interior);
    const median3 = percentile(interior, 0.5);
    if (median3 <= 1e-10 || Math.min(...quarters) <= 0) return null;
    if (Math.max(...quarters) / Math.min(...quarters) > 1.8) return null;
    if (percentile(interior, 0.95) / median3 > 3) return null;
    const consistentlyFalling = quarters.slice(1).every((level, i) => level < quarters[i]);
    if (consistentlyFalling && quarters[0] / quarters[3] > 1.2) return null;
    return percentile(interior, 0.75);
  }
  function quietWindows(length, sampleRate, taps, selected) {
    const guard = Math.ceil(sampleRate * 0.1);
    const width = Math.ceil(sampleRate * 0.6);
    const valid = taps.filter((tap) => Number.isFinite(tap.start) && Number.isFinite(tap.end) && tap.end > tap.start).sort((left, right) => left.start - right.start);
    if (!valid.length) return [];
    const windows = [];
    let previousEnd = 0;
    for (const tap of [...valid, { start: length, end: length }]) {
      const start = Math.max(previousEnd + guard, selected - 8 * sampleRate, 0);
      const end = Math.min(tap.start - guard, selected + 8 * sampleRate, length);
      for (let offset = Math.ceil(start); offset + width <= end; offset += width) windows.push([offset, offset + width]);
      previousEnd = Math.max(previousEnd, tap.end);
    }
    return windows.sort((a, b) => Math.abs(a[0] - selected) - Math.abs(b[0] - selected)).slice(0, 16);
  }
  function quarterLevels(values) {
    const quarter = Math.floor(values.length / 4);
    return Array.from({ length: 4 }, (_, i) => percentile(values.slice(i * quarter, (i + 1) * quarter), 0.5));
  }
  function percentile(values, fraction) {
    const sorted = values.slice().sort((a, b) => a - b);
    return sorted[Math.floor((sorted.length - 1) * fraction)] ?? 0;
  }
  function noiseUnavailable() {
    return { status: "unavailable", amplitude: null, references: [] };
  }

  // tools/resonance_reader/resonate_ringdown_fit_window.ts
  function selectDecayWindow(args) {
    const { envelope, sampleRate, frequencyHz } = args;
    if (!(sampleRate > 0 && frequencyHz > 0) || !envelope.length) return emptyWindow();
    const frames = envelopeFrames(envelope, sampleRate);
    if (!frames.length || !frames.every(Number.isFinite)) return emptyWindow();
    const peakIndex = frames.indexOf(Math.max(...frames));
    const earliest = Math.max(peakIndex * 0.01 + 2 / frequencyHz, args.onsetSec + args.settlingSec);
    const start = firstBelow(frames, Math.ceil(earliest / 0.01), frames[peakIndex] * 10 ** (-5 / 20), 1);
    const measuredNoise = Number.isFinite(args.noiseAmplitude) && args.noiseAmplitude > 0;
    const floor = measuredNoise ? args.noiseAmplitude * 10 ** (10 / 20) : frames[peakIndex] * 10 ** (-26 / 20);
    const hold = Math.max(2, Math.ceil(2 / frequencyHz / 0.01));
    const crossing = firstBelow(frames, start, floor, hold);
    const end = Math.max(start, crossing < frames.length ? crossing - 1 : frames.length - 1);
    const dropDb = 20 * Math.log10(frames[start] / frames[end]);
    const cycles = (end - start) * 0.01 * frequencyHz;
    const tau = decayTimeConstant(frames.slice(start, end + 1));
    const rejection = !Number.isFinite(dropDb) || dropDb < 10 || cycles < 6 ? "insufficient_decay" : tau === null ? "non_decaying" : null;
    return {
      startSec: Math.min(start * 0.01, envelope.length / sampleRate),
      endSec: Math.min((end + 0.5) * 0.01, envelope.length / sampleRate),
      tau: rejection ? null : tau,
      dropDb: Number.isFinite(dropDb) ? dropDb : 0,
      cycles,
      endReason: crossing === frames.length ? "recording_end" : measuredNoise ? "noise_floor" : "relative_floor",
      rejection
    };
  }
  function envelopeFrames(envelope, sampleRate) {
    const width = Math.max(1, Math.round(sampleRate * 0.01));
    const frames = [];
    for (let start = 0; start + width <= envelope.length; start += width) {
      let total = 0;
      for (let i = start; i < start + width; i += 1) total += envelope[i];
      frames.push(total / width);
    }
    return frames;
  }
  function firstBelow(frames, start, threshold, hold) {
    for (let i = start; i + hold <= frames.length; i += 1) {
      if (frames.slice(i, i + hold).every((value) => value <= threshold)) return i;
    }
    return frames.length;
  }
  function decayTimeConstant(amplitudes) {
    const center = (amplitudes.length - 1) / 2;
    let covariance = 0;
    let variance = 0;
    amplitudes.forEach((amplitude, index) => {
      const time = (index - center) * 0.01;
      covariance += time * Math.log(Math.max(amplitude, 1e-20));
      variance += time * time;
    });
    const slope = covariance / variance;
    return Number.isFinite(slope) && slope < 0 ? -1 / slope : null;
  }
  function emptyWindow() {
    return { startSec: 0, endSec: 0, tau: null, dropDb: 0, cycles: 0, endReason: "recording_end", rejection: "insufficient_decay" };
  }

  // tools/resonance_reader/resonate_ringdown_isolation.ts
  function selectIsolationBand(frequencyHz, spectralWidthHz, neighbors) {
    const width = Number.isFinite(spectralWidthHz) && spectralWidthHz > 0 ? spectralWidthHz : 0;
    const distances = neighbors.filter((f) => Number.isFinite(f) && f > 0 && Math.abs(f - frequencyHz) > 0.5).map((f) => Math.abs(f - frequencyHz));
    const clearance = Math.min(...distances);
    const widthHz = Math.min(Math.max(12, frequencyHz * 0.56, width * 4), frequencyHz * 1.5, clearance * 1.3);
    return { widthHz, settlingSec: Math.max(0.015, Math.min(0.3, 2 / widthHz)), overlap: widthHz < Math.max(8, width * 4) };
  }
  function isolateAnalyticMode(samples, sampleRate, frequencyHz, widthHz, transform) {
    if (!(sampleRate > 0 && frequencyHz > 0 && frequencyHz < sampleRate / 2 && widthHz > 0)) throw new Error("Invalid ring-down isolation band");
    if (!samples.length) return { response: new Float64Array(), envelope: new Float64Array() };
    const padding = Math.ceil(sampleRate * Math.max(0.5, Math.min(2, 6 / widthHz)));
    const length = 2 ** Math.ceil(Math.log2(samples.length + 2 * padding));
    const real = new Float64Array(length);
    const imaginary = new Float64Array(length);
    const mean = Array.from(samples).reduce((sum, value) => sum + value, 0) / samples.length;
    for (let i = 0; i < samples.length; i += 1) real[i + padding] = samples[i] - mean;
    transform(real, imaginary);
    applyAnalyticPassband(real, imaginary, sampleRate, frequencyHz, widthHz);
    transform(real, imaginary, true);
    const response = real.slice(padding, padding + samples.length);
    const amplitude = response.map((value, i) => Math.hypot(value, imaginary[i + padding]));
    return { response, envelope: smoothOneCycle(amplitude, Math.max(1, Math.round(sampleRate / frequencyHz))) };
  }
  function applyAnalyticPassband(real, imaginary, sampleRate, frequencyHz, widthHz) {
    for (let bin = 0; bin < real.length; bin += 1) {
      const distance = (bin * sampleRate / real.length - frequencyHz) / (widthHz / 2);
      const gain = bin > 0 && bin < real.length / 2 ? 2 / (1 + distance ** 8) : 0;
      real[bin] *= gain;
      imaginary[bin] *= gain;
    }
  }
  function smoothOneCycle(amplitude, width) {
    const prefix = new Float64Array(amplitude.length + 1);
    amplitude.forEach((value, i) => {
      prefix[i + 1] = prefix[i] + value;
    });
    return amplitude.map((_, i) => {
      const start = Math.max(0, i - Math.floor(width / 2));
      const end = Math.min(amplitude.length, i + Math.ceil(width / 2));
      return (prefix[end] - prefix[start]) / (end - start);
    });
  }

  // tools/resonance_reader/resonate_ringdown_adaptive.ts
  function analyzeAdaptiveRingdown(input, math) {
    assertValidInput(input);
    const band = selectIsolationBand(input.targetFrequencyHz, input.spectralWidthHz, input.neighborFrequencies);
    const isolate = (samples, factor = 1) => isolateAnalyticMode(
      samples,
      input.sampleRate,
      input.targetFrequencyHz,
      band.widthHz * factor,
      math.transformComplex
    );
    const noise = estimateLocalModalNoise({ ...input, envelope: (samples) => isolate(samples).envelope });
    const isolated = isolate(input.buffer);
    const window2 = selectDecayWindow({
      envelope: isolated.envelope,
      sampleRate: input.sampleRate,
      frequencyHz: input.targetFrequencyHz,
      noiseAmplitude: noise.amplitude,
      settlingSec: band.settlingSec,
      onsetSec: input.onsetSec
    });
    const fit = fitSelectedWindow(isolated.response, input, window2, math);
    const variation = fit.tau ? bandwidthSensitivity(input, window2, math, isolate, fit.tau) : null;
    const flags = [
      ...noise.status === "measured" ? [] : [`noise_${noise.status}`],
      ...window2.rejection ? [window2.rejection] : [],
      ...window2.endReason === "recording_end" ? ["observation_truncated"] : [],
      ...band.overlap ? ["overlapping_modes"] : [],
      ...variation !== null && variation > 0.15 ? ["filter_sensitive"] : [],
      ...!fit.r2 || fit.r2 < 0.85 ? ["unstable_decay"] : []
    ];
    const rejected = Boolean(window2.rejection || band.overlap || !fit.tau || !fit.r2 || fit.r2 < 0.85 || variation !== null && variation > 0.15);
    const preview = responsePreview(isolated, input.sampleRate);
    return {
      ...preview,
      f0: input.targetFrequencyHz,
      tau: rejected ? null : fit.tau,
      Q: rejected ? null : Math.PI * fit.frequencyHz * fit.tau,
      deltaF: input.spectralWidthHz,
      envelopeR2: fit.r2,
      slope: rejected ? null : fit.slope,
      fitStartSec: window2.startSec,
      fitEndSec: window2.endSec,
      flags,
      sampleRate: input.sampleRate,
      attackSkipMs: (window2.startSec - input.onsetSec) * 1e3,
      smoothWindowMs: 1e3 / input.targetFrequencyHz,
      fitMethod: "damped_sinusoid",
      isolationBandwidthHz: band.widthHz,
      evidence: {
        method: "adaptive-v1",
        noise,
        window: window2,
        fittedFrequencyHz: fit.frequencyHz,
        bandwidthVariation: variation,
        rejected,
        ...input.neighborEvidence ? { neighbors: input.neighborEvidence } : {}
      }
    };
  }
  function fitSelectedWindow(response, input, window2, math) {
    if (window2.rejection) return { frequencyHz: null, tau: null, r2: null, slope: null };
    return math.fitDampedSinusoid({
      signal: response,
      sampleRate: input.sampleRate,
      targetFrequencyHz: input.targetFrequencyHz,
      fitStartSec: window2.startSec,
      fitEndSec: window2.endSec,
      initialTau: window2.tau
    });
  }
  function bandwidthSensitivity(input, window2, math, isolate, tau) {
    const estimates = [0.8, 1.2].map((factor) => fitSelectedWindow(isolate(input.buffer, factor).response, input, window2, math).tau);
    if (estimates.some((value) => value === null || !Number.isFinite(value))) return 1;
    return Math.max(...estimates.map((value) => Math.abs(value / tau - 1)));
  }
  function responsePreview(isolated, sampleRate) {
    const step = Math.max(1, Math.floor(isolated.response.length / 800));
    const peak = isolated.envelope.reduce((max, value) => Math.max(max, value), 1e-20);
    const indices = Array.from({ length: Math.ceil(isolated.response.length / step) }, (_, i) => i * step);
    return {
      response: indices.map((i) => isolated.response[i] / peak),
      envelope: indices.map((i) => isolated.envelope[i] / peak),
      timeAxis: indices.map((i) => i / sampleRate)
    };
  }
  function assertValidInput(input) {
    if (!Number.isFinite(input.sampleRate) || input.sampleRate <= 0 || !input.buffer.length) throw new Error("Ring-down requires audio and a valid sample rate");
    if (!Number.isFinite(input.targetFrequencyHz) || input.targetFrequencyHz <= 0 || input.targetFrequencyHz >= input.sampleRate / 2) throw new Error("Ring-down requires a frequency below Nyquist");
    if (!Array.from(input.buffer).every(Number.isFinite)) throw new Error("Ring-down audio contains invalid samples");
  }

  // tools/resonance_reader/resonate_ringdown_neighbors.ts
  var DECAY_FIT_DYNAMIC_RANGE_DB = 26;
  var MIN_NEIGHBOR_PROMINENCE_DB = 4.5;
  function measureDecayNeighborEvidence(samples, sampleRate, targetFrequencyHz, transform) {
    const evidence = emptyNeighborEvidence(samples.length, sampleRate);
    if (!neighborObservationIsValid(samples, sampleRate, targetFrequencyHz)) return evidence;
    const magnitudes = calculateWindowedMagnitudes(samples, transform);
    const binWidthHz = sampleRate / (magnitudes.length * 2);
    const indices = findSpectralPeakIndices(magnitudes);
    const nearestIndex = findNearestPeakIndex(indices, binWidthHz, targetFrequencyHz);
    if (nearestIndex === null) return { ...evidence, binWidthHz, status: "no_peak" };
    const targetToleranceHz = 1 / evidence.durationSec + binWidthHz / 2;
    const targetIndex = Math.abs(nearestIndex * binWidthHz - targetFrequencyHz) <= targetToleranceHz ? nearestIndex : null;
    return {
      ...evidence,
      binWidthHz,
      targetToleranceHz,
      status: targetIndex === null ? "target_not_observed" : "measured",
      targetPeakFrequencyHz: targetIndex === null ? null : targetIndex * binWidthHz,
      peaks: measureNeighborPeaks(magnitudes, indices, nearestIndex, targetIndex, binWidthHz)
    };
  }
  function emptyNeighborEvidence(sampleCount, sampleRate) {
    return {
      method: "hann-decay-window-v1",
      sampleCount,
      sampleRate,
      durationSec: sampleRate > 0 ? sampleCount / sampleRate : 0,
      binWidthHz: null,
      targetToleranceHz: null,
      relativeFloorDb: DECAY_FIT_DYNAMIC_RANGE_DB,
      targetPeakFrequencyHz: null,
      peaks: [],
      status: "insufficient_observation"
    };
  }
  function neighborObservationIsValid(samples, sampleRate, frequencyHz) {
    return Number.isFinite(sampleRate) && sampleRate > 0 && Number.isFinite(frequencyHz) && frequencyHz > 0 && frequencyHz < sampleRate / 2 && samples.length >= 4 && samples.length * frequencyHz / sampleRate >= 6 && Array.from(samples).every(Number.isFinite);
  }
  function calculateWindowedMagnitudes(samples, transform) {
    const length = 2 ** Math.ceil(Math.log2(samples.length));
    const real = new Float64Array(length);
    const imaginary = new Float64Array(length);
    const mean = Array.from(samples).reduce((sum, value) => sum + value, 0) / samples.length;
    for (let index = 0; index < samples.length; index += 1) {
      real[index] = (samples[index] - mean) * (0.5 - 0.5 * Math.cos(2 * Math.PI * index / (samples.length - 1)));
    }
    transform(real, imaginary);
    return Float64Array.from({ length: length / 2 }, (_, index) => Math.hypot(real[index], imaginary[index]));
  }
  function findSpectralPeakIndices(magnitudes) {
    const peaks = [];
    for (let index = 1; index < magnitudes.length - 1; index += 1) {
      if (magnitudes[index] > magnitudes[index - 1] && magnitudes[index] > magnitudes[index + 1]) peaks.push(index);
    }
    return peaks;
  }
  function findNearestPeakIndex(indices, binWidthHz, targetFrequencyHz) {
    return indices.reduce((nearest, index) => nearest === null || Math.abs(index * binWidthHz - targetFrequencyHz) < Math.abs(nearest * binWidthHz - targetFrequencyHz) ? index : nearest, null);
  }
  function measureNeighborPeaks(magnitudes, indices, referenceIndex, targetIndex, binWidthHz) {
    return indices.filter((index) => index !== targetIndex).map((index) => ({
      frequencyHz: index * binWidthHz,
      relativeDb: 20 * Math.log10(magnitudes[index] / magnitudes[referenceIndex]),
      prominenceDb: measurePeakProminenceDb(magnitudes, index)
    })).filter((peak) => peak.relativeDb >= -DECAY_FIT_DYNAMIC_RANGE_DB && peak.prominenceDb >= MIN_NEIGHBOR_PROMINENCE_DB);
  }
  function measurePeakProminenceDb(magnitudes, index) {
    const trough = Math.max(findAdjacentTrough(magnitudes, index, -1), findAdjacentTrough(magnitudes, index, 1));
    return 20 * Math.log10(magnitudes[index] / Math.max(trough, Number.MIN_VALUE));
  }
  function findAdjacentTrough(magnitudes, index, direction) {
    let trough = magnitudes[index];
    for (let next = index + direction; next >= 0 && next < magnitudes.length && magnitudes[next] <= trough; next += direction) trough = magnitudes[next];
    return trough;
  }

  // tools/resonance_reader/resonate_ringdown_observed.ts
  function analyzeObservedRingdown(input, math) {
    const neighborEvidence = measureDecayNeighborEvidence(input.buffer, input.sampleRate, input.targetFrequencyHz, math.transformComplex);
    const neighborFrequencies = neighborEvidence.status === "insufficient_observation" ? input.neighborFrequencies : neighborEvidence.peaks.map((peak) => peak.frequencyHz);
    const result = analyzeAdaptiveRingdown({ ...input, neighborFrequencies, neighborEvidence }, math);
    if (neighborEvidence.status === "measured" || neighborEvidence.status === "insufficient_observation") return result;
    return {
      ...result,
      Q: null,
      tau: null,
      slope: null,
      flags: [...result.flags, "target_not_observed"],
      evidence: { ...result.evidence, rejected: true }
    };
  }

  // tools/resonance_reader/resonate_model_destination.ts
  var GUITAR_DESTINATION = {
    href: "../dof_model/index.html",
    label: resonanceLocalizedMessages.modelDestinationDofLabel,
    showOverlayToggle: true,
    showModelRow: true,
    kind: "dof"
  };
  var BRACE_STOCK_DESTINATION = {
    href: "../flexural_rigidity/brace_calc/",
    label: resonanceLocalizedMessages.modelDestinationBraceLabel,
    showOverlayToggle: false,
    showModelRow: true,
    kind: "brace-calculator"
  };
  var PLATE_STOCK_DESTINATION = {
    href: "../plate_thickness/index.html",
    label: resonanceLocalizedMessages.modelDestinationPlateLabel,
    showOverlayToggle: false,
    showModelRow: true,
    kind: "plate-thickness"
  };

  // tools/resonance_reader/resonate_brace_stock_confirmation.ts
  function braceStockLongModeConfirmationBuild(selection) {
    const peakKey = String(selection.peakKey || "").trim();
    const frequencyHz = Number(selection.frequencyHz);
    if (!peakKey || !Number.isFinite(frequencyHz) || frequencyHz <= 0) return null;
    const tapIndex = Number(selection.tapIndex);
    return {
      mode: "long",
      peakKey,
      frequencyHz,
      tapIndex: Number.isInteger(tapIndex) && tapIndex >= 0 ? tapIndex : null,
      sourceLabel: String(selection.sourceLabel || "").trim()
    };
  }

  // tools/resonance_reader/resonate_stock_long_assignment.ts
  function stockLongAssignedModeResolve(state) {
    if (stockKindResolve(state) !== peakAnalysisSourceMeasureModeResolve(state)) return void 0;
    return stockLongAssignmentBuildFromCard(state, stockLongCardRead(state));
  }
  function stockLongCardRead(state) {
    const card = state.lastModeCards?.find((mode) => mode.key === "long");
    if (card) return { key: card.key, freq: card.freq };
    return stockLongCardBuildFromDetection(state);
  }
  function stockLongCardBuildFromDetection(state) {
    const detection = state.lastModesDetected?.find((mode) => mode.mode === "long");
    return detection ? { key: "long", freq: detection.peakFreq } : null;
  }
  function stockLongAssignmentBuildFromCard(state, card) {
    if (!card) return void 0;
    return braceStockLongModeConfirmationBuild({
      peakKey: card.key,
      frequencyHz: card.freq,
      tapIndex: state.peakAnalysisSelectedTapIndex,
      sourceLabel: state.recordingLabel
    });
  }

  // tools/resonance_reader/resonate_stock_long_confirmation.ts
  var CONFIRMATION_FIELDS = { plate_stock: "plateStockConfirmedLongMode", brace_stock: "braceStockConfirmedLongMode" };
  function stockLongAssignmentCapture(state) {
    const assigned = stockLongAssignedModeResolve(state);
    if (assigned !== void 0) stockLongSavedAssignmentWrite(state, assigned);
  }
  function stockLongSavedAssignmentWrite(state, assignment) {
    const kind = stockKindResolve(state);
    if (kind) state[CONFIRMATION_FIELDS[kind]] = assignment;
  }

  // tools/resonance_reader/resonate_stock_measurements_prompt.ts
  var FIELDS = [
    ["stockLengthMm", resonanceLocalizedMessages.stockMeasurementsLengthLabel],
    ["stockWidthMm", resonanceLocalizedMessages.stockMeasurementsWidthLabel],
    ["stockHeightMm", resonanceLocalizedMessages.stockMeasurementsPlateHeightLabel],
    ["stockMassG", resonanceLocalizedMessages.stockMeasurementsMassLabel]
  ];

  // tools/resonance_reader/resonate_q_measurement.ts
  function resolveQForModeCards(state, cards, fit) {
    if (qSettingsResolve(state).method === "spectral") return cards;
    return cards.map((card) => resolveDecayQForMode(state, card, fit));
  }
  function resolveDecayQForMode(state, card, fit) {
    const aggregation = qSettingsResolve(state).aggregation;
    const taps = decayQFitsForMode(state, card, fit);
    const pending = taps.some((tap) => tap.pending);
    return { ...card, q: pending ? null : aggregateDecayQ(taps.map((tap) => tap.q), aggregation), qEvidence: {
      method: "decay",
      aggregation,
      spectralQ: spectralQFromMode(card),
      taps,
      ...pending ? { pending: true } : {}
    } };
  }
  function spectralQFromMode(mode) {
    return mode.qEvidence ? mode.qEvidence.spectralQ : mode.q;
  }
  function decayQFitsForMode(state, card, fit) {
    if (!fit || !Number.isFinite(card.freq)) return [];
    return tapIndexesInAnalysisWindow(state).map((tapIndex) => decayQFitForTap(state, card, tapIndex, fit));
  }
  function decayQFitForTap(state, card, tapIndex, fit) {
    const data = fit({ ...state, peakAnalysisSelectedTapIndex: tapIndex }, card);
    return { tapIndex, q: data?.result.Q ?? null, flags: data?.result.flags ?? [], ...data?.pending ? { pending: true } : {} };
  }
  function tapIndexesInAnalysisWindow(state) {
    const taps = state.tapSegments || [];
    return taps.map((tap, index) => ({ tap, index })).filter(({ tap }) => tapOnsetIsInAnalysisWindow(state, tap.start)).map(({ index }) => index);
  }
  function tapOnsetIsInAnalysisWindow(state, startSample) {
    const range = qAnalysisWindowFromState(state);
    const onsetMs = 1e3 * startSample / Number(state.currentWave?.sampleRate);
    const startMs = Number(range?.start ?? range?.[0] ?? 0);
    const endMs = Number(range?.end ?? range?.[1] ?? Infinity);
    return Number.isFinite(onsetMs) && onsetMs >= startMs && onsetMs < endMs;
  }
  function qAnalysisWindowFromState(state) {
    if ("qAnalysisWindowMs" in state) return state.qAnalysisWindowMs;
    return state.viewRangeMs;
  }

  // tools/resonance_reader/resonate_ringdown_cache.ts
  var MAX_CACHED_RINGDOWN_FITS = 128;
  var audioCaches = /* @__PURE__ */ new WeakMap();
  function reuseRingdownFit(audio, context, key, calculate) {
    const results = ringdownResultsForContext(audio, context);
    if (results.has(key)) return results.get(key);
    return retainRingdownFit(results, key, calculate());
  }
  function ringdownResultsForContext(audio, context) {
    const cached = audioCaches.get(audio);
    if (cached && ringdownContextMatches(cached.context, context)) return cached.results;
    return introduceRingdownContext(audio, context);
  }
  function ringdownContextMatches(previous, current) {
    return previous.length === current.length && previous.every((value, index) => Object.is(value, current[index]));
  }
  function introduceRingdownContext(audio, context) {
    const results = /* @__PURE__ */ new Map();
    audioCaches.set(audio, { context: [...context], results });
    return results;
  }
  function retainRingdownFit(results, key, result) {
    if (results.size >= MAX_CACHED_RINGDOWN_FITS) results.delete(results.keys().next().value);
    results.set(key, result);
    return result;
  }

  // tools/resonance_reader/resonate_peak_analysis_panel.ts
  var PEAK_RINGDOWN_DEFAULT_WINDOW_MS = 1200;
  var PEAK_RINGDOWN_MIN_WINDOW_MS = PEAK_RINGDOWN_DEFAULT_WINDOW_MS;
  var PEAK_RINGDOWN_MAX_WINDOW_MS = 3e3;
  var PEAK_RINGDOWN_PRE_ONSET_MS = 20;
  var PEAK_RINGDOWN_NEXT_TAP_GUARD_MS = 20;
  var PEAK_RINGDOWN_ATTACK_SKIP_MS = 40;
  var PEAK_RINGDOWN_SMOOTH_MS = 5;
  var PEAK_RINGDOWN_FIT_FLOOR_DB = 26;
  var PEAK_ANALYSIS_FULL_RESPONSE_MAX_HZ = 500;
  var PEAK_ANALYSIS_CANDIDATE_PROMINENCE_DB = 4.5;
  var PEAK_ANALYSIS_CANDIDATE_NEIGHBOR_COUNT = 6;
  var PEAK_ANALYSIS_CANDIDATE_MODE_MATCH_HZ = 3;
  var PEAK_ANALYSIS_WAVEFORM_COLOR = resolveColorHexFromRole("peakAnalysisWaveform");
  var PEAK_ANALYSIS_PROJECTION_COLOR = resolveColorHexFromRole("peakAnalysisProjection");
  function peakAnalysisSpectrumReadFromState(state) {
    return state.lastSpectrum || state.lastSpectrumRaw || null;
  }
  function peakAnalysisWidthHzResolveFromMode(mode) {
    const spectralQ = mode ? spectralQFromMode(mode) : null;
    if (!Number.isFinite(mode?.freq) || !Number.isFinite(spectralQ) || spectralQ <= 0) return null;
    return mode?.freq / spectralQ;
  }
  function peakAnalysisRingdownDataBuild(state, selectedMode) {
    if (typeof state.ringdownDataRead === "function") return state.ringdownDataRead(state, selectedMode);
    const api = peakAnalysisRingdownApiResolve();
    const adaptive = new URLSearchParams(String(globalThis.window?.location?.search || "")).get("ringdownMethod") !== "legacy";
    const input = peakAnalysisRingdownInputBuild(state, selectedMode, adaptive);
    if (!api || !input) return null;
    return peakAnalysisRingdownFitReuse(state, selectedMode, input, api, adaptive);
  }
  function peakAnalysisRingdownFitReuse(state, selectedMode, input, api, adaptive) {
    return reuseRingdownFit(
      input.wave,
      [
        api.analyzeModeRingdown,
        api.transformComplex,
        api.fitDampedSinusoid,
        adaptive,
        input.wave.length,
        input.provenance.sampleRate,
        JSON.stringify(state.tapSegments || []),
        JSON.stringify(peakAnalysisNeighborFrequenciesRead(state, selectedMode.freq)),
        adaptive ? null : JSON.stringify(peakAnalysisSpectrumReadFromState(state))
      ],
      JSON.stringify([selectedMode.freq, input.selectedStart, input.provenance]),
      () => peakAnalysisRingdownFitCalculate(state, selectedMode, input, api, adaptive)
    );
  }
  function peakAnalysisRingdownFitCalculate(state, selectedMode, input, api, adaptive) {
    try {
      if (adaptive) return peakAnalysisAdaptiveDataBuild(state, selectedMode, input, api);
      return {
        result: api.analyzeModeRingdown({
          buffer: input.buffer,
          sampleRate: input.provenance.sampleRate,
          targetFrequencyHz: selectedMode.freq,
          spectrum: peakAnalysisSpectrumReadFromState(state),
          modeBandwidthHz: input.provenance.bandwidthHz,
          smoothWindowMs: PEAK_RINGDOWN_SMOOTH_MS,
          attackSkipMs: PEAK_RINGDOWN_ATTACK_SKIP_MS,
          fitFloorDb: PEAK_RINGDOWN_FIT_FLOOR_DB
        }),
        provenance: input.provenance
      };
    } catch {
      return null;
    }
  }
  function peakAnalysisAdaptiveDataBuild(state, selectedMode, input, api) {
    if (!api.transformComplex || !api.fitDampedSinusoid) return null;
    const result = analyzeObservedRingdown({
      buffer: input.buffer,
      wave: input.wave,
      sampleRate: input.provenance.sampleRate,
      targetFrequencyHz: selectedMode.freq,
      spectralWidthHz: input.provenance.bandwidthHz,
      neighborFrequencies: peakAnalysisNeighborFrequenciesRead(state, selectedMode.freq),
      taps: state.tapSegments || [],
      selectedStart: input.selectedStart,
      onsetSec: input.onsetSec
    }, api);
    return { result, provenance: input.provenance };
  }
  function peakAnalysisRingdownInputBuild(state, selectedMode, adaptive = false) {
    const input = peakAnalysisRingdownWindowBuild(state, selectedMode, adaptive);
    if (!input) return null;
    const buffer = Float32Array.from({ length: input.provenance.sampleCount }, (_, index) => Number(input.wave[input.startSample + index]) || 0);
    return { ...input, buffer };
  }
  function peakAnalysisRingdownWindowBuild(state, selectedMode, adaptive) {
    if (!Number.isFinite(selectedMode?.freq)) return null;
    const wave = peakAnalysisWaveReadFromState(state);
    const sampleRate = Number(state.currentWave?.sampleRate);
    if (!wave?.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return null;
    const tap = peakAnalysisTapWindowResolve(state, sampleRate);
    const expectedWindowMs = adaptive ? PEAK_RINGDOWN_MAX_WINDOW_MS : peakAnalysisRingdownExpectedWindowMsResolve(selectedMode);
    const sampleWindow = peakAnalysisRingdownSampleWindowBuild(wave, sampleRate, tap?.start ?? 0, tap?.nextStart ?? null, expectedWindowMs);
    if (!sampleWindow.sampleCount) return null;
    return {
      startSample: sampleWindow.start,
      wave,
      selectedStart: tap?.start ?? 0,
      onsetSec: Math.min((tap?.start ?? 0) / sampleRate, PEAK_RINGDOWN_PRE_ONSET_MS / 1e3),
      provenance: {
        tapCount: Array.isArray(state.tapSegments) ? state.tapSegments.length : 0,
        tapIndex: tap?.index ?? null,
        windowMs: sampleWindow.windowMs,
        expectedWindowMs,
        limit: sampleWindow.limit,
        preOnsetMs: PEAK_RINGDOWN_PRE_ONSET_MS,
        sampleRate,
        sampleCount: sampleWindow.sampleCount,
        bandwidthHz: peakAnalysisWidthHzResolveFromMode(selectedMode)
      }
    };
  }
  function peakAnalysisCandidatesBuild(spectrum, modeCards, estimateQ = null) {
    const points = peakAnalysisSpectrumPointsBuild(spectrum);
    if (!points.length) return peakAnalysisModeCandidatesBuild(modeCards, []);
    const detected = peakAnalysisDetectedCandidatesBuild(points, modeCards, estimateQ);
    const resolved = peakAnalysisNearbyCandidatesConsolidate(detected);
    return peakAnalysisModeCandidatesBuild(modeCards, resolved).sort((left, right) => (left.freq || 0) - (right.freq || 0));
  }
  function peakAnalysisNeighborFrequenciesRead(state, targetFrequencyHz) {
    const spectrum = peakAnalysisSpectrumReadFromState(state);
    const frequencies = peakAnalysisCandidatesBuild(spectrum, []).map((candidate) => candidate.freq);
    const nearest = [...frequencies].sort((left, right) => Math.abs(left - targetFrequencyHz) - Math.abs(right - targetFrequencyHz))[0];
    const binWidth = Math.abs(Number(spectrum?.freqs?.[1]) - Number(spectrum?.freqs?.[0])) || 0.5;
    return frequencies.filter((frequency) => frequency !== nearest || Math.abs(frequency - targetFrequencyHz) > binWidth);
  }
  function peakAnalysisSpectrumPointsBuild(spectrum) {
    const freqs = Array.isArray(spectrum?.freqs) ? spectrum.freqs : [];
    const dbs = peakAnalysisDbsResolveFromSpectrum(spectrum);
    if (freqs.length !== dbs.length) return [];
    return freqs.reduce((rows, freq, index) => {
      const db = dbs[index];
      if (!Number.isFinite(freq) || !Number.isFinite(db)) return rows;
      if (freq < 0 || freq > PEAK_ANALYSIS_FULL_RESPONSE_MAX_HZ) return rows;
      rows.push({ freq, db });
      return rows;
    }, []);
  }
  function peakAnalysisDetectedCandidatesBuild(points, modeCards, estimateQ) {
    const freqs = points.map((point) => point.freq);
    const dbs = points.map((point) => point.db);
    return points.reduce((candidates, point, index) => {
      if (!peakAnalysisLocalPeakIsDetected(points, index)) return candidates;
      const mode = peakAnalysisModeNearFrequencyResolve(modeCards, point.freq);
      candidates.push({
        key: mode?.key || `spectrum-peak-${index}`,
        kind: mode?.kind || "custom",
        label: mode?.label || resonanceLocalizedMessages.peakAnalysisCandidateLabel,
        freq: mode?.freq ?? peakAnalysisDetectedFrequencyResolve(freqs, dbs, index),
        note: mode?.note || null,
        cents: mode?.cents || null,
        q: mode?.qEvidence ? mode.q : mode?.q ?? estimateQ?.(freqs, dbs, point) ?? null,
        ...mode?.qEvidence ? { qEvidence: mode.qEvidence } : {},
        wolfRisk: mode?.wolfRisk || null,
        db: point.db
      });
      return candidates;
    }, []);
  }
  function peakAnalysisDetectedFrequencyResolve(freqs, dbs, index) {
    if (!resonanceParabolicPeakRefineEnabled()) return freqs[index];
    return refineParabolicPeak(freqs, dbs, index)?.freq ?? freqs[index];
  }
  function peakAnalysisNearbyCandidatesConsolidate(candidates) {
    return [...candidates].sort((left, right) => (left.freq || 0) - (right.freq || 0)).reduce((resolved, candidate) => {
      const previous = resolved[resolved.length - 1];
      const previousWidthHz = peakAnalysisWidthHzResolveFromMode(previous);
      const candidateWidthHz = peakAnalysisWidthHzResolveFromMode(candidate);
      const samePeak = Number.isFinite(previousWidthHz) && Number.isFinite(candidateWidthHz) && candidate.freq - previous?.freq <= Math.min(previousWidthHz, candidateWidthHz) / 2;
      if (!previous || !samePeak) {
        resolved.push(candidate);
        return resolved;
      }
      if (candidate.db > previous.db) resolved[resolved.length - 1] = candidate;
      return resolved;
    }, []);
  }
  function peakAnalysisLocalPeakIsDetected(points, index) {
    if (index <= 0 || index >= points.length - 1) return false;
    const point = points[index];
    if (!(point.db > points[index - 1].db && point.db > points[index + 1].db)) return false;
    return peakAnalysisLocalProminenceDbResolve(points, index) >= PEAK_ANALYSIS_CANDIDATE_PROMINENCE_DB;
  }
  function peakAnalysisLocalProminenceDbResolve(points, index) {
    const start = Math.max(0, index - PEAK_ANALYSIS_CANDIDATE_NEIGHBOR_COUNT);
    const end = Math.min(points.length - 1, index + PEAK_ANALYSIS_CANDIDATE_NEIGHBOR_COUNT);
    const neighbors = points.slice(start, end + 1).filter((_point, neighborIndex) => neighborIndex !== index - start).map((point) => point.db).sort((left, right) => left - right);
    if (!neighbors.length) return 0;
    const middle = Math.floor(neighbors.length / 2);
    const baseline = neighbors.length % 2 ? neighbors[middle] : (neighbors[middle - 1] + neighbors[middle]) / 2;
    return points[index].db - baseline;
  }
  function peakAnalysisModeCandidatesBuild(modeCards, candidates) {
    return modeCards.reduce((rows, mode) => {
      if (!Number.isFinite(mode.freq) || rows.some((candidate) => candidate.key === mode.key)) return rows;
      rows.push({
        ...mode,
        kind: mode.kind || "built-in",
        freq: mode.freq,
        q: mode.q ?? null,
        db: 0
      });
      return rows;
    }, [...candidates]);
  }
  function peakAnalysisModeNearFrequencyResolve(modeCards, frequencyHz) {
    return modeCards.find((mode) => Number.isFinite(mode.freq) && Math.abs(mode.freq - frequencyHz) <= PEAK_ANALYSIS_CANDIDATE_MODE_MATCH_HZ) || null;
  }
  function peakAnalysisDbsResolveFromSpectrum(spectrum) {
    if (Array.isArray(spectrum?.dbs)) return spectrum.dbs;
    const mags = Array.isArray(spectrum?.mags) ? spectrum.mags : [];
    return mags.map((magnitude) => 20 * Math.log10(Math.max(Number(magnitude) || 0, 1e-12)));
  }
  function peakAnalysisWaveReadFromState(state) {
    const wave = state.currentWave?.wave || state.currentWave?.samples;
    return wave?.length ? wave : null;
  }
  function peakAnalysisTapWindowResolve(state, sampleRate) {
    const taps = Array.isArray(state.tapSegments) ? state.tapSegments : [];
    const selectedIndex = peakAnalysisSelectedTapIndexResolve(state, taps, sampleRate);
    const eligibleIndexes = selectedIndex === null ? taps.map((_tap, index) => index) : [selectedIndex];
    for (const index of eligibleIndexes) {
      const tap = peakAnalysisTapWindowBuild(taps[index], index, sampleRate);
      if (!tap) continue;
      const nextTap = peakAnalysisTapWindowBuild(taps[index + 1], index + 1, sampleRate);
      return { ...tap, nextStart: nextTap?.start ?? null };
    }
    return null;
  }
  function peakAnalysisSelectedTapIndexResolve(state, taps, sampleRate) {
    const selectedIndex = Number(state.peakAnalysisSelectedTapIndex);
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= taps.length) return null;
    return peakAnalysisTapWindowBuild(taps[selectedIndex], selectedIndex, sampleRate) ? selectedIndex : null;
  }
  function peakAnalysisTapWindowBuild(tap, index, sampleRate) {
    const start = Number(tap?.start);
    if (Number.isFinite(start) && start >= 0) return { start, index };
    const startMs = Number(tap?.startMs);
    if (Number.isFinite(startMs) && startMs >= 0) return { start: Math.round(startMs / 1e3 * sampleRate), index };
    return null;
  }
  function peakAnalysisRingdownExpectedWindowMsResolve(selectedMode) {
    if (!Number.isFinite(selectedMode?.freq) || !Number.isFinite(selectedMode?.q) || selectedMode?.q <= 0) {
      return PEAK_RINGDOWN_DEFAULT_WINDOW_MS;
    }
    const tauSec = selectedMode?.q / (Math.PI * selectedMode?.freq);
    const floorDecaySec = tauSec * Math.log(10) * (PEAK_RINGDOWN_FIT_FLOOR_DB / 20);
    const captureMs = PEAK_RINGDOWN_PRE_ONSET_MS + PEAK_RINGDOWN_ATTACK_SKIP_MS + floorDecaySec * 1e3;
    return Math.min(PEAK_RINGDOWN_MAX_WINDOW_MS, Math.max(PEAK_RINGDOWN_MIN_WINDOW_MS, Math.round(captureMs)));
  }
  function peakAnalysisRingdownSampleWindowBuild(wave, sampleRate, tapStartSample, nextTapStartSample, windowMs) {
    const preOnsetSamples = Math.round(PEAK_RINGDOWN_PRE_ONSET_MS / 1e3 * sampleRate);
    const nextTapGuardSamples = Math.round(PEAK_RINGDOWN_NEXT_TAP_GUARD_MS / 1e3 * sampleRate);
    const windowSamples = Math.round(windowMs / 1e3 * sampleRate);
    const start = Math.max(0, Math.round(tapStartSample) - preOnsetSamples);
    const expectedEnd = start + windowSamples;
    const nextTapEnd = Number.isFinite(nextTapStartSample) ? Math.max(start, Math.round(nextTapStartSample) - nextTapGuardSamples) : Infinity;
    const end = Math.min(wave.length, expectedEnd, nextTapEnd);
    const sampleCount = Math.max(0, end - start);
    const limit = end === expectedEnd ? "expected" : end === nextTapEnd ? "next_tap" : "recording_end";
    return { start, sampleCount, windowMs: Math.round(sampleCount / sampleRate * 1e3), limit };
  }
  function peakAnalysisRingdownApiResolve() {
    const scope = typeof window !== "undefined" ? window : globalThis;
    return scope.ModalRingdown || null;
  }

  // tools/resonance_reader/resonate_primary_range_auto.ts
  var TAP_CLUSTER_GAP_MS = 950;
  var TAP_CLUSTER_OUTLIER_MIN_RATIO = 0.6;
  var TAP_CLUSTER_OUTLIER_MAX_RATIO = 1.8;
  var FALLBACK_WINDOW_MIN_MS = 900;
  var FALLBACK_WINDOW_MAX_MS = 3e3;
  var FALLBACK_WINDOW_RATIO = 0.22;
  function primaryRangeAutoSelectFromState(slice, state) {
    if (state.viewRangeMs) return null;
    const taps = Array.isArray(state.tapSegments) ? state.tapSegments : [];
    if (!taps.length) return fallbackRangeOnLeftFromDuration(waveDurationMsResolve(state, slice));
    const ranges = taps.map((tap) => ({
      start: tap.start / slice.sampleRate * 1e3,
      end: tap.end / slice.sampleRate * 1e3
    })).filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start);
    const bestCluster = contiguousRangeClusterBestBuild(ranges, TAP_CLUSTER_GAP_MS, { preferCount: true });
    if (ranges.length > 1 && bestCluster?.ranges?.length === 1) return isolatedTapRangeSpanBuild(ranges);
    const normalizedRange = rangeClusterNormalizeByMedianDuration(bestCluster);
    return normalizedRange || fallbackRangeOnLeftFromDuration(waveDurationMsResolve(state, slice));
  }
  function isolatedTapRangeSpanBuild(ranges) {
    return { start: Math.min(...ranges.map((range) => range.start)), end: Math.max(...ranges.map((range) => range.end)) };
  }
  function waveDurationMsResolve(state, slice) {
    const fromSlice = Number(slice?.timeMs?.[slice.timeMs.length - 1]);
    if (Number.isFinite(fromSlice) && fromSlice > 0) return fromSlice;
    const fromCurrentWave = Number(state?.currentWave?.fullLengthMs);
    if (Number.isFinite(fromCurrentWave) && fromCurrentWave > 0) return fromCurrentWave;
    const fromState = Number(state?.endMs);
    if (Number.isFinite(fromState) && fromState > 0) return fromState;
    return 5e3;
  }
  function fallbackWindowMsResolve(durationMs) {
    const scaled = durationMs * FALLBACK_WINDOW_RATIO;
    return Math.max(FALLBACK_WINDOW_MIN_MS, Math.min(FALLBACK_WINDOW_MAX_MS, scaled));
  }
  function fallbackRangeOnLeftFromDuration(durationMs) {
    const windowMs = fallbackWindowMsResolve(durationMs);
    const end = Math.min(durationMs, windowMs);
    return { start: 0, end };
  }
  function contiguousRangeClusterBestBuild(ranges, gapMs, options = {}) {
    if (!ranges.length) return null;
    const sorted = ranges.slice().sort((left, right) => left.start - right.start || left.end - right.end);
    const clusters = contiguousRangeClustersBuildFromSortedRanges(sorted, gapMs);
    return clusters.reduce((best, cluster) => {
      if (!best) return cluster;
      if (options.preferCount) {
        const bestCount = best.ranges?.length ?? 0;
        const clusterCount = cluster.ranges?.length ?? 0;
        if (clusterCount > bestCount) return cluster;
        if (clusterCount < bestCount) return best;
      }
      const bestWidth = best.end - best.start;
      const currentWidth = cluster.end - cluster.start;
      if (currentWidth > bestWidth) return cluster;
      if (currentWidth === bestWidth && cluster.start < best.start) return cluster;
      return best;
    }, null);
  }
  function contiguousRangeClustersBuildFromSortedRanges(sortedRanges, gapMs) {
    const clusters = [];
    sortedRanges.forEach((range) => {
      const current = clusters[clusters.length - 1];
      if (!current || range.start - current.end > gapMs) {
        clusters.push({ ...range, ranges: [{ ...range }] });
        return;
      }
      current.end = Math.max(current.end, range.end);
      current.ranges.push({ ...range });
    });
    return clusters;
  }
  function rangeClusterNormalizeByMedianDuration(range) {
    if (!range?.ranges?.length) return range ? { start: range.start, end: range.end } : null;
    const durations = range.ranges.map((entry) => rangeDurationMs(entry)).filter((duration) => Number.isFinite(duration) && duration > 0).sort((left, right) => left - right);
    if (!durations.length) return { start: range.start, end: range.end };
    const median3 = durations[Math.floor(durations.length / 2)];
    const minDuration = median3 * TAP_CLUSTER_OUTLIER_MIN_RATIO;
    const maxDuration = median3 * TAP_CLUSTER_OUTLIER_MAX_RATIO;
    const normalized = range.ranges.filter((entry) => {
      const duration = rangeDurationMs(entry);
      return duration >= minDuration && duration <= maxDuration;
    });
    if (!normalized.length) return { start: range.start, end: range.end };
    return { start: normalized[0].start, end: normalized[normalized.length - 1].end };
  }
  function rangeDurationMs(range) {
    return range.end - range.start;
  }

  // tools/resonance_reader/resonate_save_title.ts
  function resonanceSaveTitleBuild(measureMode) {
    const normalized = measureModeNormalize(measureMode);
    if (normalized === "played_note") return resonanceLocalizedMessages.measureModePlayedNote;
    if (normalized === "peak_analysis") return resonanceLocalizedMessages.savePeakAnalysisTitle;
    return resonanceLocalizedMessages.saveTapTestTitleTemplate.replace(
      "{mode}",
      measureModeLabelBuild(measureMode)
    );
  }

  // tools/resonance_reader/resonate_transient_detection.ts
  function detectTaps(wave, sampleRate, opts = {}) {
    const windowMs = opts.windowMs ?? 10;
    const thresholdMult = opts.thresholdMult ?? 6;
    const minGapMs = opts.minGapMs ?? 80;
    const minLenMs = opts.minLenMs ?? 40;
    const windowSamples = Math.max(1, Math.round(windowMs / 1e3 * sampleRate));
    const smoothed = [];
    let acc = 0;
    for (let i2 = 0; i2 < wave.length; i2 += 1) {
      acc += Math.abs(wave[i2]);
      if (i2 >= windowSamples) acc -= Math.abs(wave[i2 - windowSamples]);
      smoothed.push(acc / windowSamples);
    }
    const base = median2(smoothed);
    const thresh = thresholdMult * base;
    const minGapSamples = Math.round(minGapMs / 1e3 * sampleRate);
    const minLenSamples = Math.round(minLenMs / 1e3 * sampleRate);
    const taps = [];
    let i = 0;
    while (i < smoothed.length) {
      if (smoothed[i] > thresh) {
        const start = i;
        while (i < smoothed.length && smoothed[i] > thresh / 2) i += 1;
        const end = i;
        if (end - start >= minLenSamples) {
          taps.push({ start, end });
          i = end + minGapSamples;
          continue;
        }
      }
      i += 1;
    }
    return taps;
  }
  function median2(arr) {
    if (!arr.length) return 0;
    const s = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  // tools/resonance_reader/resonate_spectrum_config.ts
  var FREQ_MIN = 50;
  var FREQ_AXIS_MAX = 500;
  var FFT_MAX_HZ = 2e3;
  var CELESTIAL_FREQ_MIN = 20;
  var CELESTIAL_FREQ_AXIS_MAX = 1e3;
  var CELESTIAL_FFT_MAX_HZ = 1e3;
  var STOCK_FREQ_MIN = 25;
  var STOCK_FREQ_AXIS_MAX = 200;
  var BRACE_STOCK_FREQ_MIN = 100;
  function spectrumViewRangeResolveFromMeasureMode(measureMode) {
    if (resonanceSpectrumDisplayRangeResolve() === "celestial") {
      return { freqMin: CELESTIAL_FREQ_MIN, freqAxisMax: CELESTIAL_FREQ_AXIS_MAX };
    }
    if (measureModeUsesBraceStockFrequencyRange(measureMode)) {
      return { freqMin: BRACE_STOCK_FREQ_MIN, freqAxisMax: FREQ_AXIS_MAX };
    }
    if (measureModeUsesPlateStockFrequencyRange(measureMode)) {
      return { freqMin: STOCK_FREQ_MIN, freqAxisMax: STOCK_FREQ_AXIS_MAX };
    }
    return { freqMin: FREQ_MIN, freqAxisMax: FREQ_AXIS_MAX };
  }
  function measureModeUsesPlateStockFrequencyRange(measureMode) {
    return measureMode === "plate_stock" || measureMode === "top";
  }
  function measureModeUsesBraceStockFrequencyRange(measureMode) {
    return measureMode === "back" || measureMode === "brace_stock";
  }
  function spectrumFftMaxHzResolve() {
    if (resonanceSpectrumDisplayRangeResolve() === "celestial") return CELESTIAL_FFT_MAX_HZ;
    return FFT_MAX_HZ;
  }

  // tools/resonance_reader/resonate_tap_spectra.ts
  var TAP_ANALYSIS_WINDOW_MS = 400;
  var TAP_PRE_ONSET_MS = 100;
  var TAP_CAPTURE_WINDOW_MS = 500;
  var TAP_CAPTURE_PRE_ROLL_MS = 200;
  var TAP_ONSET_NOISE_ESTIMATE_SAMPLES = 2048;
  var TAP_ONSET_THRESHOLD_MULTIPLIER = 10;
  var TAP_ONSET_MIN_THRESHOLD = 1e-3;
  var TAP_ONSET_BACKUP_SAMPLES = 32;
  async function averageTapSpectra(wave, sampleRate, taps, fft) {
    return aggregateTapSpectra(wave, sampleRate, taps, fft);
  }
  async function aggregateTapSpectra(wave, sampleRate, taps, fft) {
    if (!taps.length) return null;
    const windowMs = resonanceTapSliceWindowMsResolve(TAP_ANALYSIS_WINDOW_MS);
    const windowSamples = Math.round(windowMs / 1e3 * sampleRate);
    const preOnsetSamples = Math.round(TAP_PRE_ONSET_MS / 1e3 * sampleRate);
    const spectra = [];
    for (let t = 0; t < taps.length; t += 1) {
      const slice = tapWaveSliceExtract(wave, sampleRate, taps[t].start, preOnsetSamples, windowSamples);
      if (!slice.length) continue;
      spectra.push(tapSpectrumCalculate(slice, sampleRate, fft));
    }
    if (!spectra.length) return null;
    const specs = await Promise.all(spectra);
    const base = specs[0];
    const avgMags = tapSpectraAggregateMags(specs);
    return { freqs: base.freqs, mags: avgMags, dbs: window.FFTPlot.applyDb({ freqs: base.freqs, mags: avgMags }).dbs, tapsUsed: specs.length };
  }
  function tapSpectraAggregateMags(specs) {
    return tapSpectraAggregateMagsByPowerMean(specs);
  }
  function tapSpectraAggregateMagsByPowerMean(specs) {
    const width = specs[0]?.mags?.length || 0;
    return Array.from({ length: width }, (_, index) => tapSpectrumBinPowerMeanResolve(specs, index));
  }
  function tapSpectrumBinPowerMeanResolve(specs, index) {
    const powers = specs.map((spec) => Number(spec.mags[index])).filter((magnitude) => Number.isFinite(magnitude)).map((magnitude) => magnitude * magnitude);
    if (!powers.length) return 0;
    const totalPower = powers.reduce((total, power) => total + power, 0);
    return Math.sqrt(totalPower / powers.length);
  }
  function tapWaveSliceExtract(wave, sampleRate, tapStart, preOnsetSamples, windowSamples) {
    if (resonanceUseTapOnsetAlignmentResolve()) {
      return tapAlignedWaveSliceExtract(wave, sampleRate, tapStart, preOnsetSamples, windowSamples);
    }
    const sliceStart = Math.max(0, tapStart - preOnsetSamples);
    const sliceEnd = Math.min(wave.length, sliceStart + windowSamples);
    return wave.slice(sliceStart, sliceEnd);
  }
  function tapAlignedWaveSliceExtract(wave, sampleRate, tapStart, preOnsetSamples, windowSamples) {
    const capture = tapCaptureBufferBuild(wave, sampleRate, tapStart);
    if (capture.length < TAP_ONSET_NOISE_ESTIMATE_SAMPLES) {
      const sliceStart = Math.max(0, tapStart - preOnsetSamples);
      const sliceEnd = Math.min(wave.length, sliceStart + windowSamples);
      return wave.slice(sliceStart, sliceEnd);
    }
    return tapCaptureAlignToOnset(capture, preOnsetSamples, windowSamples);
  }
  function tapCaptureBufferBuild(wave, sampleRate, tapStart) {
    const captureSamples = Math.round(TAP_CAPTURE_WINDOW_MS / 1e3 * sampleRate);
    const preRollSamples = Math.round(TAP_CAPTURE_PRE_ROLL_MS / 1e3 * sampleRate);
    const captureStart = Math.max(0, tapStart - preRollSamples);
    const capture = new Float32Array(captureSamples);
    for (let index = 0; index < captureSamples; index += 1) {
      const sourceIndex = captureStart + index;
      if (sourceIndex >= wave.length) break;
      capture[index] = Number(wave[sourceIndex]);
    }
    return capture;
  }
  function tapCaptureAlignToOnset(capture, preOnsetSamples, windowSamples) {
    const onsetSample = tapOnsetSampleResolve(capture);
    if (onsetSample === null) return capture.slice(0, windowSamples);
    const extractStart = onsetSample - preOnsetSamples;
    return tapCaptureWindowExtract(capture, extractStart, windowSamples);
  }
  function tapOnsetSampleResolve(capture) {
    const threshold = tapOnsetThresholdResolve(capture);
    for (let index = 0; index < capture.length; index += 1) {
      if (Math.abs(capture[index]) > threshold) return Math.max(0, index - TAP_ONSET_BACKUP_SAMPLES);
    }
    return null;
  }
  function tapOnsetThresholdResolve(capture) {
    let totalSquares = 0;
    for (let index = 0; index < TAP_ONSET_NOISE_ESTIMATE_SAMPLES; index += 1) {
      totalSquares += capture[index] * capture[index];
    }
    const noiseRms = Math.sqrt(totalSquares / TAP_ONSET_NOISE_ESTIMATE_SAMPLES);
    return Math.max(noiseRms * TAP_ONSET_THRESHOLD_MULTIPLIER, TAP_ONSET_MIN_THRESHOLD);
  }
  function tapCaptureWindowExtract(capture, extractStart, windowSamples) {
    const result = new Float32Array(windowSamples);
    for (let index = 0; index < windowSamples; index += 1) {
      const sourceIndex = extractStart + index;
      if (sourceIndex < 0 || sourceIndex >= capture.length) continue;
      result[index] = capture[sourceIndex];
    }
    return result;
  }
  function tapSpectrumCalculate(slice, sampleRate, fft) {
    const minFftSamples = resonanceFftMinSamplesResolve();
    const fftWindow = resonanceFftWindowResolve();
    const input = tapFftInputBuild(slice, fftWindow, minFftSamples);
    return fft.magnitude(input.samples, sampleRate, {
      window: input.window,
      maxFreq: FFT_MAX_HZ,
      minFftSamples: input.minFftSamples
    });
  }
  function tapFftInputBuild(slice, fftWindow, minFftSamples) {
    if (!resonanceUsePaddedTapWindowResolve() || fftWindow === "rect") {
      return { samples: slice, window: fftWindow, minFftSamples };
    }
    const paddedSamples = tapWindowedPaddedSamplesBuild(slice, fftWindow, minFftSamples);
    return { samples: paddedSamples, window: "rect", minFftSamples: paddedSamples.length };
  }
  function tapWindowedPaddedSamplesBuild(slice, fftWindow, minFftSamples) {
    const paddedLength = tapFftPaddedLengthResolve(slice.length, minFftSamples);
    const padded = new Float64Array(paddedLength);
    for (let index = 0; index < slice.length; index += 1) {
      padded[index] = Number(slice[index]) * tapWindowCoefficientResolve(fftWindow, index, paddedLength);
    }
    return padded;
  }
  function tapFftPaddedLengthResolve(inputLength, minFftSamples) {
    const target = Math.max(1, inputLength, minFftSamples);
    return 1 << Math.ceil(Math.log2(target));
  }
  function tapWindowCoefficientResolve(windowType, index, length) {
    const fraction = index / (length - 1 || 1);
    if (windowType === "hann") return 0.5 * (1 - Math.cos(2 * Math.PI * fraction));
    return 0.54 - 0.46 * Math.cos(2 * Math.PI * fraction);
  }

  // tools/resonance_reader/resonate_signal_boundary.ts
  var signalBoundaryDefault = {
    detectTaps,
    averageTapSpectra
  };

  // tools/resonance_reader/resonate_spectrum_db_scale.ts
  function spectrumDbApply(spectrum, legacyApplyDb) {
    if (resonanceSpectrumDbScaleResolve() === "celestial-fixed") {
      return celestialSpectrumDbApply(spectrum);
    }
    return legacyApplyDb(spectrum);
  }
  function celestialSpectrumDbApply(spectrum) {
    const dbs = spectrum.mags.map((magnitude) => Math.max(20 * Math.log10(Math.max(magnitude, 1e-10)), -100));
    return {
      ...spectrum,
      dbs,
      maxDb: Math.max(...dbs, -100),
      floorDb: -100
    };
  }

  // tools/resonance_reader/resonate_spectrum_variants.ts
  var FFT_SMOOTH_GAUSSIAN_BINS = 8;
  function refreshSpectrumVariantsBuild(args) {
    const displayMags = spectrumMaybeSmooth(args.analysis, args.displaySpectrum.freqs, args.displaySpectrum.mags);
    return {
      rawSpectrum: spectrumDbApply(args.rawSpectrum, args.applyDb),
      displaySpectrum: spectrumDbApply({ freqs: args.displaySpectrum.freqs, mags: displayMags }, args.applyDb)
    };
  }
  function spectrumMaybeSmooth(analysis, freqsRaw, magsRaw) {
    const smoothingMode = resonanceSpectrumSmoothingModeResolve();
    if (smoothingMode === "off") return magsRaw;
    if (smoothingMode === "triangular-hz") {
      return analysis.smoothSpectrumFast(freqsRaw, magsRaw, resonanceSpectrumSmoothingHzResolve(1));
    }
    return analysis.smoothSpectrumGaussianBins(magsRaw, resonanceSpectrumSmoothingBinsResolve(FFT_SMOOTH_GAUSSIAN_BINS));
  }

  // tools/resonance_reader/resonate_mode_override_state.ts
  function modeOverrideStateGetOrInit(state) {
    return state.modePeakOverrides || (state.modePeakOverrides = {});
  }
  function modeOverrideStateApplyToModes(modes, freqs, dbs, overrides) {
    return modes.map((mode) => {
      const overrideHz = overrides[mode.mode];
      if (!Number.isFinite(overrideHz)) return mode;
      const idx = nearestSpectrumIndexFromFreq(freqs, overrideHz);
      if (!Number.isFinite(idx)) return mode;
      return {
        ...mode,
        peakFreq: freqs[idx],
        peakDb: dbs[idx],
        peakIdx: idx
      };
    });
  }
  function nearestSpectrumIndexFromFreq(freqs, targetHz) {
    if (!freqs.length || !Number.isFinite(targetHz)) return null;
    let bestIdx = 0;
    for (let i = 1; i < freqs.length; i += 1) {
      if (Math.abs(freqs[i] - targetHz) < Math.abs(freqs[bestIdx] - targetHz)) bestIdx = i;
    }
    return bestIdx;
  }

  // tools/resonance_reader/resonate_stage_detect.ts
  function stageDetectModesFromSpectrum(state, analysisBoundary, spectrum) {
    const profile = modeProfileResolveFromState(state);
    const detected = braceStockModesDetect(state, analysisBoundary, spectrum, profile.bands) ?? modesDetectWithProfile(analysisBoundary, spectrum, profile.bands);
    return modeOverrideStateApplyToModes(
      detected,
      spectrum.freqs,
      spectrum.dbs,
      modeOverrideStateGetOrInit(state)
    );
  }
  function braceStockModesDetect(state, analysisBoundary, spectrum, bands) {
    if (peakAnalysisSourceMeasureModeResolve(state) !== "brace_stock") return null;
    if (!analysisBoundary.analyzeModesWithBandsByQAndLevel || !analysisBoundary.estimateQFromDb) return null;
    return analysisBoundary.analyzeModesWithBandsByQAndLevel(
      spectrum,
      bands,
      analysisBoundary.estimateQFromDb
    );
  }
  function modesDetectWithProfile(analysisBoundary, spectrum, bands) {
    return analysisBoundary.analyzeModesWithBands ? analysisBoundary.analyzeModesWithBands(spectrum, bands) : analysisBoundary.analyzeModes(spectrum);
  }

  // tools/resonance_reader/resonate_custom_measurements.ts
  function customMeasurementsGetOrInit(state) {
    if (!Array.isArray(state.customMeasurements)) state.customMeasurements = [];
    return state.customMeasurements;
  }
  function customMeasurementCardsBuildFromState(state, args) {
    const customMeasurements = customMeasurementsGetOrInit(state);
    return customMeasurements.map((measurement) => customMeasurementCardBuild(measurement, args));
  }
  function customMeasurementCardBuild(measurement, args) {
    const peak = customMeasurementPeakResolveFromSpectrum(args?.spectrum, measurement.freqHz);
    const note = noteAndCentsFromFreq(measurement.freqHz);
    const q = customMeasurementQEstimateFromPeak(args, peak);
    return {
      kind: "custom",
      key: measurement.key,
      label: measurement.label,
      freq: measurement.freqHz,
      isPeak: peak.isPeak,
      note: note.note,
      cents: note.cents,
      q,
      wolfRisk: null,
      targetHz: null,
      deltaHz: null,
      peakOverrideHz: null
    };
  }
  function customMeasurementQEstimateFromPeak(args, peak) {
    if (!peak.isPeak || !Number.isFinite(peak.freq) || !Number.isFinite(peak.db)) return null;
    const estimateQ = args?.analysis?.estimateQFromDb;
    if (typeof estimateQ !== "function") return null;
    const freqs = Array.isArray(args?.spectrum?.freqs) ? args?.spectrum?.freqs : [];
    const dbs = Array.isArray(args?.spectrum?.dbs) ? args?.spectrum?.dbs : [];
    if (!freqs.length || !dbs.length) return null;
    return estimateQ(freqs, dbs, { freq: peak.freq, db: peak.db });
  }
  function customMeasurementPeakResolveFromSpectrum(spectrum, freqHz) {
    const point = customMeasurementSpectrumPointReadFromFrequency(spectrum, freqHz);
    if (!point || !Number.isFinite(point.idx) || !customMeasurementIndexIsLocalPeak(spectrum, point.idx)) {
      return { isPeak: false, freq: null, db: null };
    }
    return { isPeak: true, freq: point.freq, db: point.db };
  }
  function customMeasurementIndexIsLocalPeak(spectrum, index) {
    if (!spectrum?.dbs?.length) return false;
    if (index <= 0 || index >= spectrum.dbs.length - 1) return false;
    const center = Number(spectrum.dbs[index]);
    const left = Number(spectrum.dbs[index - 1]);
    const right = Number(spectrum.dbs[index + 1]);
    if (!Number.isFinite(center) || !Number.isFinite(left) || !Number.isFinite(right)) return false;
    return center >= left && center >= right;
  }
  function customMeasurementSpectrumPointReadFromFrequency(spectrum, freqHz) {
    if (!spectrum?.freqs?.length || !spectrum?.dbs?.length) return null;
    let bestIndex = 0;
    for (let index = 1; index < spectrum.freqs.length; index += 1) {
      const candidateDistance = Math.abs(spectrum.freqs[index] - freqHz);
      const bestDistance = Math.abs(spectrum.freqs[bestIndex] - freqHz);
      if (candidateDistance < bestDistance) bestIndex = index;
    }
    return {
      idx: bestIndex,
      freq: Number(spectrum.freqs[bestIndex]),
      db: Number(spectrum.dbs[bestIndex])
    };
  }

  // tools/resonance_reader/resonate_q_view_policy.ts
  function resolveQForViewModeCards(state, cards, fit) {
    if (stockQSettingsAreApplicable(state) && qSettingsResolve(state).method === "decay") return resolveQForModeCards(state, cards, fit);
    if (measureModeNormalize(state.measureMode) === "peak_analysis") return cards.map((card) => resolveSelectedTapCardQ(state, card, fit));
    return cards.map(restoreSpectralCardQ);
  }
  function resolveSelectedTapCardQ(state, card, fit) {
    const data = fit?.(state, card);
    const tapIndex = data?.provenance?.tapIndex;
    return { ...card, q: data?.pending ? null : data?.result.Q ?? null, qEvidence: {
      method: "decay",
      aggregation: "selected_tap",
      spectralQ: spectralQFromMode(card),
      taps: tapIndex == null ? [] : [{ tapIndex, q: data?.result.Q ?? null, flags: data?.result.flags ?? [] }],
      ...data?.pending ? { pending: true } : {}
    } };
  }
  function stockQSettingsAreApplicable(state) {
    return ["plate_stock", "brace_stock"].includes(measureModeNormalize(state.measureMode));
  }
  function restoreSpectralCardQ(card) {
    if (!card.qEvidence) return card;
    const { qEvidence, ...spectralCard } = card;
    return { ...spectralCard, q: qEvidence.spectralQ };
  }

  // tools/resonance_reader/resonate_stage_refresh_post.ts
  function stageRefreshPostApply(args) {
    const cards = stageRefreshCardsBuild({
      analysis: args.analysis,
      modeMeta: args.modeMeta,
      modesDetected: args.modesDetected,
      freqs: args.freqs,
      dbs: args.dbs,
      modeTargets: args.state.modeTargets || (args.state.modeTargets = {}),
      modeOverrides: args.state.modePeakOverrides || (args.state.modePeakOverrides = {})
    });
    const customCards = customMeasurementCardsBuildFromState(args.state, {
      spectrum: { freqs: args.freqs, dbs: args.dbs },
      analysis: args.analysis
    });
    args.state.lastModesDetected = args.modesDetected;
    args.state.lastModeCards = [...cards, ...customCards];
    args.state.lastModeCards = resolveQForViewModeCards(args.state, args.state.lastModeCards, args.measureDecayQ);
    stockLongAssignmentCapture(args.state);
  }
  function stageRefreshCardsBuild(args) {
    const labelFromModeKey = (modeKey) => modeKey.split("_").map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join(" ");
    const noteCache = /* @__PURE__ */ new Map();
    const qCache = /* @__PURE__ */ new Map();
    const getNote = (f) => {
      const key = Number.isFinite(f) ? f.toFixed(3) : "null";
      if (!noteCache.has(key)) noteCache.set(key, args.analysis.noteAndCentsFromFreq(f));
      return noteCache.get(key);
    };
    const getQ = (f, db) => {
      const key = `${Number.isFinite(f) ? f.toFixed(3) : "null"}|${Number.isFinite(db) ? db.toFixed(2) : "null"}`;
      if (!qCache.has(key) && Number.isFinite(f) && Number.isFinite(db)) {
        qCache.set(key, args.analysis.estimateQFromDb(args.freqs, args.dbs, { freq: f, db }));
      }
      return qCache.get(key) ?? null;
    };
    const getTarget = (key) => typeof args.modeTargets[key] === "number" && Number.isFinite(args.modeTargets[key]) ? args.modeTargets[key] : null;
    return args.modesDetected.map((m) => {
      const note = getNote(m.peakFreq);
      const q = getQ(m.peakFreq, m.peakDb);
      const centsAbs = Number.isFinite(note.cents) ? Math.abs(note.cents) : 999;
      const sev = Number.isFinite(m.prominenceDb) ? args.analysis.computeSeverity(m.prominenceDb, centsAbs) : null;
      const tgt = getTarget(m.mode);
      const deltaHz = Number.isFinite(m.peakFreq) && Number.isFinite(tgt) ? m.peakFreq - tgt : null;
      const overrideHz = Number.isFinite(args.modeOverrides[m.mode]) ? args.modeOverrides[m.mode] : null;
      return {
        kind: "built-in",
        key: m.mode,
        label: args.modeMeta[m.mode]?.label || labelFromModeKey(m.mode),
        freq: m.peakFreq,
        isPeak: Number.isFinite(m.peakFreq) && Number.isFinite(m.peakDb),
        note: note.note,
        cents: note.cents,
        q,
        wolfRisk: args.analysis.wolfRiskFromSeverity(sev),
        deltaHz,
        targetHz: tgt,
        peakOverrideHz: overrideHz
      };
    });
  }

  // tools/resonance_reader/resonate_stage_refresh_pre.ts
  async function stageRefreshPreRun(args) {
    const engine = args.fftFactory({});
    const taps = args.signal.detectTaps(args.wave, args.sampleRate);
    const fftOptions = {
      maxFreq: args.fftMaxHz,
      minFftSamples: resonanceFftMinSamplesResolve(),
      window: resonanceFftWindowResolve()
    };
    const directSpectrum = await engine.magnitude(args.wave, args.sampleRate, fftOptions);
    let spectrum = directSpectrum;
    if (tapAveragingAllowedForRefresh(args.allowTapAveraging) && taps.length && resonanceTapAveragingEnabled()) {
      const averaged = await args.signal.averageTapSpectra(args.wave, args.sampleRate, taps, engine);
      if (averaged?.freqs?.length) {
        spectrum = { freqs: averaged.freqs, mags: averaged.mags, dbs: averaged.dbs };
      }
    }
    return { directSpectrum, spectrum, taps };
  }
  function tapAveragingAllowedForRefresh(allowTapAveraging) {
    return allowTapAveraging !== false;
  }

  // tools/resonance_reader/resonate_subject_taxonomy.ts
  var SUBJECT_TYPE_OPTIONS = [
    { key: "GUITAR", label: resonanceLocalizedMessages.subjectGuitar, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "MATERIAL", label: resonanceLocalizedMessages.subjectMaterial, subtypes: [{ key: "PLATE_STOCK", label: resonanceLocalizedMessages.subjectPlateStock }, { key: "BRACE_STOCK", label: resonanceLocalizedMessages.subjectBraceStock }] },
    { key: "BLANK", label: resonanceLocalizedMessages.subjectBlank, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "PART", label: resonanceLocalizedMessages.subjectPart, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "PLATE", label: resonanceLocalizedMessages.subjectPlate, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "BRACE", label: resonanceLocalizedMessages.subjectBrace, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "ASSEMBLY", label: resonanceLocalizedMessages.subjectAssembly, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "INSTRUMENT", label: resonanceLocalizedMessages.subjectInstrument, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "SETUP_COMPONENT", label: resonanceLocalizedMessages.subjectSetupComponent, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "JIG", label: resonanceLocalizedMessages.subjectJig, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "FIXTURE", label: resonanceLocalizedMessages.subjectFixture, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "GENERIC", label: resonanceLocalizedMessages.subjectGeneric, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] }
  ];
  function resonanceSubjectDraftDefaultsFromMeasureMode(measureMode) {
    const normalized = measureModeNormalize(measureMode);
    if (normalized === "plate_stock") {
      return { typeKey: "MATERIAL", subtypeKey: "PLATE_STOCK" };
    }
    if (normalized === "brace_stock") {
      return { typeKey: "MATERIAL", subtypeKey: "BRACE_STOCK" };
    }
    return { typeKey: "GUITAR", subtypeKey: "" };
  }

  // tools/resonance_reader/resonance_reader_engine.ts
  var RESONANCE_RECORDING_MEASURE_MODES = ["guitar", "plate_stock", "brace_stock"];
  async function resonanceRecordingAnalyze(args) {
    const measureMode = measureModeNormalize(args.measureMode);
    const durationMs = args.wave.length / args.sampleRate * 1e3;
    const taps = signalBoundaryDefault.detectTaps(args.wave, args.sampleRate) || [];
    const analysedRangeMs = primaryRangeAutoSelectFromState(
      { sampleRate: args.sampleRate, timeMs: [(args.wave.length - 1) / args.sampleRate * 1e3] },
      { tapSegments: taps }
    ) ?? { start: 0, end: durationMs };
    const selected = args.sliceWaveRange({ wave: args.wave, sampleRate: args.sampleRate }, analysedRangeMs.start, analysedRangeMs.end);
    if (!selected) throw new Error("The recording has no samples to analyse.");
    const { spectrum } = await stageRefreshPreRun({
      wave: selected.wave,
      sampleRate: selected.sampleRate,
      fftMaxHz: spectrumFftMaxHzResolve(),
      signal: signalBoundaryDefault,
      fftFactory: args.fftFactory
    });
    const freqs = Array.from(spectrum.freqs || [], (value) => Number(value));
    const detectedOn = refreshSpectrumVariantsBuild({
      analysis: analysisBoundaryDefault,
      rawSpectrum: { freqs, mags: Array.from(spectrum.mags || [], (value) => Number(value)) },
      displaySpectrum: { freqs, mags: Array.from(spectrum.mags || [], (value) => Number(value)) },
      applyDb: args.applyDb
    }).displaySpectrum;
    const dbs = Array.from(detectedOn.dbs || detectedOn.mags || [], (value) => Number(value));
    const profile = modeProfileResolveFromMeasureMode(measureMode);
    const state = {
      measureMode,
      currentWave: { wave: args.wave, sampleRate: args.sampleRate, fullLengthMs: durationMs },
      tapSegments: taps,
      viewRangeMs: analysedRangeMs,
      qAnalysisWindowMs: analysedRangeMs,
      lastSpectrum: detectedOn
    };
    const detected = stageDetectModesFromSpectrum(state, analysisBoundaryDefault, { freqs, dbs });
    stageRefreshPostApply({
      state,
      analysis: analysisBoundaryDefault,
      modeMeta: profile.meta,
      modesDetected: detected,
      freqs,
      dbs,
      measureDecayQ: peakAnalysisRingdownDataBuild
    });
    const cardOf = (key) => state.lastModeCards.find((card) => card.key === key);
    return {
      measureMode,
      sampleRate: args.sampleRate,
      durationSeconds: args.wave.length / args.sampleRate,
      tapCount: taps.length,
      analysedRangeMs,
      // The spectrum the peaks were detected on, and the frequency range the page shows for this measure mode.
      spectrum: { freqs, dbs },
      spectrumViewRange: spectrumViewRangeResolveFromMeasureMode(measureMode),
      modes: detected.map((mode) => ({
        mode: mode.mode,
        label: profile.meta[mode.mode]?.label ?? mode.mode,
        band: profile.bands[mode.mode] ?? null,
        peakFreq: mode.peakFreq,
        peakDb: mode.peakDb,
        prominenceDb: mode.prominenceDb,
        note: cardOf(mode.mode)?.note ?? null,
        cents: cardOf(mode.mode)?.cents ?? null,
        q: cardOf(mode.mode)?.q ?? null,
        // How the page measured that Q: from each tap's decay for stock, from the peak's width otherwise.
        qMethod: cardOf(mode.mode)?.qEvidence?.method ?? "spectral",
        // Set when the band's highest point is only the side of a stronger peak outside the band.
        sideOfPeakHz: Number.isFinite(mode.peakFreq) ? peakSideOfStrongerPeakHz(freqs, dbs, mode.peakIdx) : null
      })),
      // The page's state for this recording, which its own save code writes from.
      pageState: state
    };
  }
  var PEAK_STANDS_CLEAR_DROP_DB = 3;
  function peakSideOfStrongerPeakHz(freqs, dbs, index) {
    for (const step of [-1, 1]) {
      for (let at = index + step; at >= 0 && at < dbs.length; at += step) {
        if (dbs[at] <= dbs[index] - PEAK_STANDS_CLEAR_DROP_DB) break;
        if (dbs[at] <= dbs[index]) continue;
        return freqs[peakTopIndexClimbFrom(freqs, dbs, at, step)];
      }
    }
    return null;
  }
  var PEAK_SIDE_RIPPLE_SPAN_HZ = 5;
  function peakTopIndexClimbFrom(freqs, dbs, from, step) {
    const averaged = smoothSpectrumFast(freqs, dbs, PEAK_SIDE_RIPPLE_SPAN_HZ);
    let at = from;
    while (at + step >= 0 && at + step < averaged.length && averaged[at + step] > averaged[at]) at += step;
    let top = at;
    for (let near = 0; near < dbs.length; near += 1) {
      if (Math.abs(freqs[near] - freqs[at]) <= PEAK_SIDE_RIPPLE_SPAN_HZ && dbs[near] > dbs[top]) top = near;
    }
    return top;
  }
  function resonanceRecordingSaveBuild(args) {
    const state = { ...args.analysis.pageState, recordingLabel: args.recordingLabel };
    return {
      stateJson: JSON.stringify(resonanceCaptureStateJsonBuild({
        toolVersion: args.toolVersion,
        savedAtIso: args.savedAtIso,
        recordingLabel: args.recordingLabel,
        state
      }), null, 2),
      wavBlob: resonanceCaptureWaveBlobBuild(state),
      title: resonanceSaveTitleBuild(args.analysis.measureMode),
      newSubjectDefaults: resonanceSubjectDraftDefaultsFromMeasureMode(args.analysis.measureMode)
    };
  }
  function resonanceRecordingFromSave(document2) {
    const state = {};
    if (!restoreResonanceSavedStateDocument(state, document2) || !state.currentWave?.wave) return null;
    return {
      wave: state.currentWave.wave,
      sampleRate: Number(state.currentWave.sampleRate),
      measureMode: String(state.measureMode || ""),
      recordingLabel: String(state.recordingLabel || ""),
      savedModes: (state.lastModeCards || []).filter((card) => Number.isFinite(card?.freq)).map((card) => ({ mode: String(card.key), label: String(card.label ?? card.key), peakFreq: Number(card.freq) }))
    };
  }
  return __toCommonJS(resonance_reader_engine_exports);
})();
