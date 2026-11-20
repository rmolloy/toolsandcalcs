"use strict";
var DofModelEngine = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
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
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/dof_model/dof_model_engine.ts
  var dof_model_engine_exports = {};
  __export(dof_model_engine_exports, {
    DOF_DEFAULT_PARAMS: () => DOF_DEFAULT_PARAMS,
    DOF_FIT_BOUNDS: () => DOF_FIT_BOUNDS,
    DOF_SOLVE_TWEAK_IDS: () => DOF_SOLVE_TWEAK_IDS2,
    DOF_WHAT_IF_RECIPE_IDS: () => DOF_WHAT_IF_RECIPE_IDS,
    DOF_WHAT_IF_SLIDER_RANGES: () => DOF_WHAT_IF_SLIDER_RANGES,
    buildDofFitInputTargets: () => buildDofFitInputTargets,
    dofClampToBounds: () => dofClampToBounds,
    dofDisplayValueToInternal: () => dofDisplayValueToInternal,
    dofFitSolveTweakIdsFromTargets: () => dofFitSolveTweakIdsFromTargets,
    dofFitTargetsHaveAnyValue: () => dofFitTargetsHaveAnyValue,
    dofFitWithSolver: () => dofFitWithSolver,
    dofInternalValueToDisplay: () => dofInternalValueToDisplay,
    dofLegacySolver: () => dofLegacySolver,
    dofPeaksForParams: () => dofPeaksForParams,
    dofRecipeSummaryValues: () => dofRecipeSummaryValues,
    dofSaveSummaryBuild: () => dofSaveSummaryBuild,
    dofSolveRecipeOptions: () => dofSolveRecipeOptions,
    dofSolveRecipeTargets: () => dofSolveRecipeTargets,
    dofWhatIfParamsFromOverlayText: () => dofWhatIfParamsFromOverlayText,
    modelPeaksFromResponse: () => modelPeaksFromResponse,
    resolveDofLocalizedMessages: () => resolveDofLocalizedMessages
  });

  // tools/dof_model/dof_display_format.ts
  function sliderFillPercent(slider, value) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
    const normalized = (value - min) / (max - min);
    return Math.max(0, Math.min(100, normalized * 100));
  }
  function decimalPlacesFromStep(stepValue) {
    if (!Number.isFinite(stepValue) || stepValue <= 0) return 0;
    const text = stepValue.toString();
    const decimal = text.split(".")[1];
    return decimal ? decimal.length : 0;
  }
  function formatOverlayDisplayValue(value, stepValue) {
    if (!Number.isFinite(value)) return "--";
    const decimals = Math.min(4, decimalPlacesFromStep(stepValue));
    return value.toFixed(decimals);
  }
  function buildDofOverlayPresentation(options) {
    const step = parseFloat(options.overlaySlider.step || "0.0001");
    const epsilon = Math.max(1e-6, step * 0.5);
    const hasValues = Number.isFinite(options.baseValue) && Number.isFinite(options.overlayValue);
    const isActive = hasValues && Math.abs(options.overlayValue - options.baseValue) > epsilon;
    const baseFill = sliderFillPercent(options.baseSlider, options.baseValue);
    const overlayFill = sliderFillPercent(
      options.overlaySlider,
      options.overlayValue
    );
    const start = Math.min(baseFill, overlayFill);
    const end = Math.max(baseFill, overlayFill);
    return {
      isActive,
      baseFill,
      overlayFill,
      start,
      end,
      deltaBarActive: isActive && end > start,
      whatIfActive: options.showWhatIf && isActive,
      overlayValueText: formatOverlayDisplayValue(options.overlayValue, step),
      delta: isActive ? options.overlayValue - options.baseValue : null,
      deltaDigits: decimalPlacesFromStep(step)
    };
  }

  // tools/dof_model/dof_fit_input_policy.ts
  var DOF_FIT_MODE_KEYS = ["air", "top", "back"];
  var DOF_SOLVE_TWEAK_IDS = [
    "stiffness_top",
    "stiffness_back",
    "volume_air",
    "area_hole"
  ];
  var DOF_RESTRICTED_TWEAK_IDS = ["mass_top", "mass_back", "area_hole"];
  function readFiniteDofFitTarget(readInput, elementId) {
    const value = parseFloat(readInput(elementId));
    return Number.isFinite(value) ? value : null;
  }
  function buildDofFitInputTargets(readInput, displayToInternal) {
    const massTopDisplay = readFiniteDofFitTarget(readInput, "fit_target_mass_top");
    const massBackDisplay = readFiniteDofFitTarget(readInput, "fit_target_mass_back");
    const soundholeDiameter = readFiniteDofFitTarget(readInput, "fit_target_area_hole_diam");
    return {
      air: readFiniteDofFitTarget(readInput, "fit_target_air"),
      top: readFiniteDofFitTarget(readInput, "fit_target_top"),
      back: readFiniteDofFitTarget(readInput, "fit_target_back"),
      mass_top: Number.isFinite(massTopDisplay) ? displayToInternal("mass_top", massTopDisplay) : null,
      stiffness_top: readFiniteDofFitTarget(readInput, "fit_target_stiffness_top"),
      mass_back: Number.isFinite(massBackDisplay) ? displayToInternal("mass_back", massBackDisplay) : null,
      stiffness_back: readFiniteDofFitTarget(readInput, "fit_target_stiffness_back"),
      volume_air: readFiniteDofFitTarget(readInput, "fit_target_volume_air"),
      area_hole_diam: soundholeDiameter,
      area_hole: Number.isFinite(soundholeDiameter) ? Math.PI * Math.pow(soundholeDiameter / 1e3, 2) / 4 : null
    };
  }
  function dofFitTargetsHaveAnyValue(targets) {
    return DOF_FIT_MODE_KEYS.some((mode) => Number.isFinite(targets[mode])) || Number.isFinite(targets.mass_top) || Number.isFinite(targets.stiffness_top) || Number.isFinite(targets.mass_back) || Number.isFinite(targets.stiffness_back) || Number.isFinite(targets.volume_air) || Number.isFinite(targets.area_hole);
  }
  function dofFitSolveTweakIdsFromTargets(targets) {
    const tweakIds = Array.from(DOF_SOLVE_TWEAK_IDS);
    if (Number.isFinite(targets.mass_top)) tweakIds.push("mass_top");
    if (Number.isFinite(targets.mass_back)) tweakIds.push("mass_back");
    return tweakIds;
  }
  function readDofRestrictedTweakIds() {
    return Array.from(DOF_RESTRICTED_TWEAK_IDS);
  }
  function dofFitIncreaseOnlyFactorAllowed(id, factor) {
    if (!DOF_RESTRICTED_TWEAK_IDS.includes(id)) {
      return false;
    }
    return factor >= 1;
  }

  // tools/dof_model/dof_legacy_solver.ts
  function computeDofLegacyResponse(runtime, params) {
    try {
      const computeResponse = runtime.computeResponse || runtime.ModelCore?.computeResponse;
      return typeof computeResponse === "function" ? computeResponse(params) : null;
    } catch (error) {
      console.warn("computeResponse failed", error);
      return null;
    }
  }
  function adaptDofLegacyParams(runtime, raw) {
    const params = { ...raw };
    const deriveAtmosphere = runtime.Atmosphere?.deriveAtmosphere;
    if (typeof deriveAtmosphere !== "function") return params;
    const altitude = finiteDofValueOr(params.altitude, 0);
    const temperature = finiteDofValueOr(params.ambient_temp, 20);
    const atmosphere = deriveAtmosphere(altitude, temperature);
    params.air_density = atmosphere.rho;
    params.speed_of_sound = atmosphere.c;
    params.air_pressure = atmosphere.pressure;
    params.air_temp_k = atmosphere.tempK;
    params._atm = atmosphere;
    const movingAirMass = finiteDofValueOrNull(params.mass_air);
    if (movingAirMass !== null) {
      const referenceDensity = runtime.Atmosphere?.REFERENCE_RHO ?? 1.205;
      params.mass_air = movingAirMass * (atmosphere.rho / referenceDensity);
    }
    return params;
  }
  function finiteDofValueOr(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }
  function finiteDofValueOrNull(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  // tools/dof_model/dof_parameter_input_policy.ts
  function dofDisplayValueToInternal(param, value) {
    if (!Number.isFinite(value)) return value;
    return param.startsWith("mass_") ? value / 1e3 : value;
  }
  function dofInternalValueToDisplay(param, value) {
    if (!Number.isFinite(value)) return value;
    return param.startsWith("mass_") ? value * 1e3 : value;
  }

  // tools/dof_model/dof_peak_detection.ts
  var DOF_MODE_BANDS = {
    air: { low: 75, high: 115 },
    top: { low: 150, high: 205 },
    back: { low: 210, high: 260 }
  };
  function peakFreqInBand(series, band) {
    let bestX = null;
    let bestY = -Infinity;
    for (let i = 0; i < series.length; i += 1) {
      const point = series[i];
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
      if (point.x < band.low || point.x > band.high) continue;
      if (point.y > bestY) {
        bestY = point.y;
        bestX = point.x;
      }
    }
    return bestX;
  }
  function median(values) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  function refineParabolicPeak(xs, ys, idx) {
    if (idx <= 0 || idx >= ys.length - 1) return null;
    const a = ys[idx - 1];
    const b = ys[idx];
    const c = ys[idx + 1];
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return null;
    const bw = xs.length > 1 ? Math.abs(xs[1] - xs[0]) : null;
    if (!bw || !Number.isFinite(bw) || bw <= 0) return null;
    const denom = a - 2 * b + c;
    if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return null;
    const delta = 0.5 * (a - c) / denom;
    if (!Number.isFinite(delta)) return null;
    const clamped = Math.max(-1, Math.min(1, delta));
    const freq = xs[idx] + clamped * bw;
    const y = b - (a - c) * clamped / 4;
    return { freq, y, delta: clamped };
  }
  function collectLocalPeaks(series, band) {
    if (!Array.isArray(series) || series.length < 3) return [];
    const xs = series.map((point) => point?.x);
    const ys = series.map((point) => point?.y);
    const peaks = [];
    for (let i = 1; i < series.length - 1; i += 1) {
      const y = ys[i];
      const yPrevious = ys[i - 1];
      const yNext = ys[i + 1];
      if (!Number.isFinite(y) || !Number.isFinite(yPrevious) || !Number.isFinite(yNext)) continue;
      if (!(y > yPrevious && y > yNext)) continue;
      const x = xs[i];
      if (!Number.isFinite(x)) continue;
      if (band && (x < band.low || x > band.high)) continue;
      const start = Math.max(0, i - 6);
      const end = Math.min(ys.length - 1, i + 6);
      const neighbors = [];
      for (let j = start; j <= end; j += 1) {
        if (j === i) continue;
        const value = ys[j];
        if (Number.isFinite(value)) neighbors.push(value);
      }
      const baseline = neighbors.length ? median(neighbors) : y;
      const prominence = y - baseline;
      const refined = refineParabolicPeak(xs, ys, i);
      peaks.push({
        idx: i,
        freq: refined?.freq ?? x,
        db: refined?.y ?? y,
        prominence
      });
    }
    return peaks;
  }
  function pickDominantPeak(series, band) {
    const peaks = collectLocalPeaks(series, band);
    if (!peaks.length) return null;
    peaks.sort((a, b) => b.prominence - a.prominence);
    return peaks[0];
  }
  function assignPeaksToModes(totalPeaks, targets) {
    const modes = ["air", "top", "back"];
    const assigned = { air: null, top: null, back: null };
    if (!totalPeaks.length) return assigned;
    if (totalPeaks.length >= modes.length) {
      const permutations = [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0]
      ];
      let best = permutations[0];
      let bestCost = Infinity;
      permutations.forEach((permutation) => {
        let cost = 0;
        modes.forEach((mode, index) => {
          const target = targets[mode];
          const peak = totalPeaks[permutation[index]];
          if (!Number.isFinite(target)) {
            cost += 1e6;
            return;
          }
          cost += Math.abs(peak.freq - target);
        });
        if (cost < bestCost) {
          bestCost = cost;
          best = permutation;
        }
      });
      modes.forEach((mode, index) => {
        assigned[mode] = totalPeaks[best[index]]?.freq ?? null;
      });
      return assigned;
    }
    const remaining = totalPeaks.slice();
    modes.forEach((mode) => {
      if (!remaining.length) return;
      const target = targets[mode];
      let bestIndex = 0;
      let bestDistance = Infinity;
      for (let i = 0; i < remaining.length; i += 1) {
        const distance = Number.isFinite(target) ? Math.abs(remaining[i].freq - target) : 0;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
      const chosen = remaining.splice(bestIndex, 1)[0];
      assigned[mode] = chosen?.freq ?? null;
    });
    return assigned;
  }
  function modelPeaksFromResponse(response) {
    const total = response?.total;
    if (!Array.isArray(total) || !total.length) return null;
    const totalPeaks = collectLocalPeaks(total).sort((a, b) => b.prominence - a.prominence).slice(0, 3);
    if (!totalPeaks.length) {
      return {
        air: peakFreqInBand(total, DOF_MODE_BANDS.air),
        top: peakFreqInBand(total, DOF_MODE_BANDS.top),
        back: peakFreqInBand(total, DOF_MODE_BANDS.back)
      };
    }
    const bandCenter = (mode) => (DOF_MODE_BANDS[mode].low + DOF_MODE_BANDS[mode].high) / 2;
    const componentPeaks = {
      air: pickDominantPeak(response?.air || [], DOF_MODE_BANDS.air),
      top: pickDominantPeak(response?.top || [], DOF_MODE_BANDS.top),
      back: pickDominantPeak(response?.back || [], DOF_MODE_BANDS.back)
    };
    const targets = {
      air: componentPeaks.air?.freq ?? bandCenter("air"),
      top: componentPeaks.top?.freq ?? bandCenter("top"),
      back: componentPeaks.back?.freq ?? bandCenter("back")
    };
    return assignPeaksToModes(totalPeaks, targets);
  }

  // tools/dof_model/dof_localized_messages.ts
  var ENGLISH_DOF_MESSAGES = Object.freeze({
    airDampingLabel: "Air Damping R\u2090",
    airLabel: "Air",
    altitudeLabel: "Altitude (m)",
    alwaysBadge: "Always",
    ambientTemperatureLabel: "Ambient Temp (\xB0C)",
    backDampingLabel: "Damping R\u1D66",
    backLabel: "Back",
    backMassLabel: "Mass m\u1D66 (g)",
    backRadiatingAreaLabel: "Radiating Area A\u1D66 (m\xB2)",
    backStiffnessLabel: "Stiffness k\u1D66 (N/m)",
    cavityVolumeLabel: "Cavity Volume (m\xB3)",
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
    saveSummaryAirModeLabel: "Air T(1,1)\u2081",
    saveSummaryBackModeLabel: "Back T(1,1)\u2083",
    saveSummaryFittedModelValueTemplate: "{order}-DOF \xB7 fitted to targets",
    saveSummaryModelLabel: "Model",
    saveSummaryModeledProvenance: "modeled",
    saveSummaryTopModeLabel: "Top T(1,1)\u2082",
    saveDownloadLabel: "Save",
    saveDownloadHint: "Notebook saving is not available here. Download the model instead.",
    saveSavedToNotebookTemplate: "Saved to {notebookName}.",
    sidesAreaLabel: "Sides Area (m\xB2)",
    sidesDampingLabel: "Sides Damping",
    sidesLabel: "Sides",
    sidesMassLabel: "Sides Mass (g)",
    sidesStiffnessLabel: "Sides Stiffness (N/m)",
    simpleSourceAmplitudeLabel: "Amplitude (m\xB2/kg)",
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
    soundholeAreaLabel: "Soundhole Area (m\xB2)",
    statusCompareUnavailable: "Compare mode is unavailable.",
    statusComparisonReset: "What-If comparison reset.",
    statusEnterTargetFrequency: "Enter at least one target frequency.",
    statusFitApplied: "Fit applied.",
    statusNotebookEventRestored: "Notebook event restored.",
    statusPackageLoaded: "Loaded JSON package.",
    statusPackageLoadFailed: "Unable to load JSON package.",
    statusPackageDownloaded: "JSON package downloaded.",
    statusSolveApplied: "Solve Targets applied as a What-If recipe.",
    topDampingLabel: "Damping R\u209C",
    topLabel: "Top",
    topMassLabel: "Mass m\u209C (g)",
    topRadiatingAreaLabel: "Radiating Area A\u209C (m\xB2)",
    topStiffnessLabel: "Stiffness k\u209C (N/m)",
    whatIfEmptyMessage: "Run Solve Targets to see suggested adjustments.",
    whatIfDecreaseTemplate: "Decrease {field} by {amount} {unit}",
    whatIfBackPlateMassLabel: "back plate mass",
    whatIfBackPlateStiffnessLabel: "back plate stiffness",
    whatIfCavityVolumeLabel: "cavity volume",
    whatIfIncreaseTemplate: "Increase {field} by {amount} {unit}",
    whatIfSoundholeAreaDeltaTemplate: " ({sign}{area} m\xB2)",
    whatIfSoundholeDiameterLabel: "soundhole diameter",
    whatIfTargetLabel: "Target",
    whatIfTopPlateMassLabel: "top plate mass",
    whatIfTopPlateStiffnessLabel: "top plate stiffness"
  });
  function resolveDofLocalizedMessages(candidate) {
    return Object.freeze({
      ...ENGLISH_DOF_MESSAGES,
      ...nonEmptyMessagesRead(candidate)
    });
  }
  function nonEmptyMessagesRead(candidate) {
    if (!candidate) return {};
    return Object.fromEntries(
      Object.entries(candidate).filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    );
  }

  // tools/dof_model/dof_save_summary.ts
  var MODE_ROWS = [
    { key: "air", label: "Air T(1,1)\u2081", messageKey: "airModeLabel" },
    { key: "top", label: "Top T(1,1)\u2082", messageKey: "topModeLabel" },
    { key: "back", label: "Back T(1,1)\u2083", messageKey: "backModeLabel" }
  ];
  function dofSaveSummaryBuild(args) {
    return [
      modelRow(args.modelOrder, args.taskMode, args.messages),
      ...peakRows(args.peaks, args.messages)
    ];
  }
  function modelRow(modelOrder, taskMode, messages) {
    const order = Number.isFinite(Number(modelOrder)) && Number(modelOrder) > 0 ? Number(modelOrder) : 4;
    return {
      label: messageValueRead(messages?.modelLabel, "Model"),
      value: modelValueRead(order, taskMode, messages)
    };
  }
  function messageValueRead(candidate, fallback) {
    return typeof candidate === "string" && candidate.trim() ? candidate : fallback;
  }
  function modelValueRead(order, taskMode, messages) {
    if (String(taskMode || "") !== "fit") return `${order}-DOF`;
    return messageValueRead(
      messages?.fittedModelValueTemplate,
      "{order}-DOF \xB7 fitted to targets"
    ).replace("{order}", String(order));
  }
  function peakRows(peaks, messages) {
    if (!peaks) return [];
    return MODE_ROWS.filter((row) => Number.isFinite(Number(peaks[row.key])) && Number(peaks[row.key]) > 0).map((row) => ({
      label: peakRowLabelRead(row, messages),
      value: `${Number(peaks[row.key]).toFixed(1)} Hz`,
      provenance: messageValueRead(messages?.modeledProvenance, "modeled")
    }));
  }
  function peakRowLabelRead(row, messages) {
    if (!row.messageKey) return row.label;
    return messageValueRead(messages?.[row.messageKey], row.label);
  }

  // tools/dof_model/dof_target_fit.ts
  function finiteTarget(targets, key) {
    const value = targets[key];
    return Number.isFinite(value) ? value : null;
  }
  function desiredFitTargetsFrom(targets) {
    return {
      air: finiteTarget(targets, "air"),
      top: finiteTarget(targets, "top"),
      back: finiteTarget(targets, "back"),
      mass_top: finiteTarget(targets, "mass_top"),
      stiffness_top: finiteTarget(targets, "stiffness_top"),
      mass_back: finiteTarget(targets, "mass_back"),
      stiffness_back: finiteTarget(targets, "stiffness_back"),
      volume_air: finiteTarget(targets, "volume_air"),
      area_hole: finiteTarget(targets, "area_hole")
    };
  }
  function hasDesiredFitTarget(desired) {
    return Object.values(desired).some(Boolean);
  }
  function peaksForParams(params, dependencies) {
    const response = dependencies.computeResponse(dependencies.adaptParams(params));
    return response ? dependencies.peaksFromResponse(response) : null;
  }
  function warmStructuralFrequencyTargets(warm, desired, baselinePeaks, tweakIds, clamp) {
    if (!tweakIds.includes("stiffness_top") && !tweakIds.includes("stiffness_back")) return;
    ["top", "back"].forEach((mode) => {
      const target = desired[mode];
      const baseline = baselinePeaks?.[mode];
      if (!Number.isFinite(target) || !Number.isFinite(baseline) || baseline <= 0) return;
      const ratio = target / baseline;
      const id = mode === "top" ? "stiffness_top" : "stiffness_back";
      if (tweakIds.includes(id)) warm[id] = clamp(id, warm[id] * ratio * ratio);
    });
  }
  function warmAirFrequencyTarget(warm, desired, baselinePeaks, tweakIds, clamp) {
    if (!tweakIds.includes("volume_air")) return;
    if (!Number.isFinite(desired.air) || !Number.isFinite(baselinePeaks?.air) || baselinePeaks.air <= 0) return;
    const ratio = desired.air / baselinePeaks.air;
    warm.volume_air = clamp("volume_air", warm.volume_air / (ratio * ratio));
  }
  function warmDirectTarget(warm, desired, tweakIds, id, clamp) {
    if (!tweakIds.includes(id) || !Number.isFinite(desired[id])) return;
    warm[id] = clamp(id, desired[id]);
  }
  function warmFitParamsFrom(baseParams, desired, baselinePeaks, tweakIds, clamp) {
    const warm = { ...baseParams };
    warmStructuralFrequencyTargets(warm, desired, baselinePeaks, tweakIds, clamp);
    warmAirFrequencyTarget(warm, desired, baselinePeaks, tweakIds, clamp);
    warmDirectTarget(warm, desired, tweakIds, "mass_top", clamp);
    warmDirectTarget(warm, desired, tweakIds, "stiffness_top", clamp);
    warmDirectTarget(warm, desired, tweakIds, "mass_back", clamp);
    warmDirectTarget(warm, desired, tweakIds, "stiffness_back", clamp);
    warmDirectTarget(warm, desired, tweakIds, "volume_air", clamp);
    warmDirectTarget(warm, desired, tweakIds, "area_hole", clamp);
    return warm;
  }
  function normalizedSquaredDifference(actual, target) {
    const difference = (actual - target) / target;
    return difference * difference;
  }
  function addModeTargetCosts(cost, desired, peaks) {
    ["air", "top", "back"].forEach((mode) => {
      const target = desired[mode];
      const predicted = peaks[mode];
      if (!Number.isFinite(target) || !Number.isFinite(predicted) || !target) return;
      cost += normalizedSquaredDifference(predicted, target);
    });
    return cost;
  }
  function addDirectTargetCost(cost, desired, params, id) {
    const target = desired[id];
    const actual = params[id];
    if (!Number.isFinite(target) || !Number.isFinite(actual) || target <= 0) return cost;
    return cost + normalizedSquaredDifference(actual, target);
  }
  function evaluateFitCandidate(params, desired, dependencies) {
    const peaks = peaksForParams(params, dependencies);
    if (!peaks) return { cost: Infinity, peaks: null };
    let cost = addModeTargetCosts(0, desired, peaks);
    cost = addDirectTargetCost(cost, desired, params, "mass_top");
    cost = addDirectTargetCost(cost, desired, params, "stiffness_top");
    cost = addDirectTargetCost(cost, desired, params, "mass_back");
    cost = addDirectTargetCost(cost, desired, params, "stiffness_back");
    cost = addDirectTargetCost(cost, desired, params, "volume_air");
    cost = addDirectTargetCost(cost, desired, params, "area_hole");
    return { cost, peaks };
  }
  function initialFitStep(id) {
    if (id.startsWith("stiffness_")) return 0.2;
    if (id === "area_hole") return 0.12;
    return 0.15;
  }
  function coordinateSearch(warm, desired, tweakIds, maxIter, factorAllowed, dependencies) {
    let best = { ...warm };
    let bestEvaluation = evaluateFitCandidate(best, desired, dependencies);
    const steps = Object.fromEntries(tweakIds.map((id) => [id, initialFitStep(id)]));
    for (let iteration = 0; iteration < maxIter; iteration += 1) {
      let improved = false;
      for (const id of tweakIds) {
        const baseValue = best[id];
        if (!Number.isFinite(baseValue)) continue;
        const delta = steps[id];
        const tryFactor = (factor) => {
          if (factorAllowed && !factorAllowed(id, factor)) return null;
          const value = dependencies.clampToBounds(id, baseValue * factor);
          const candidate = { ...best, [id]: value };
          return { candidate, evaluation: evaluateFitCandidate(candidate, desired, dependencies) };
        };
        const plus = tryFactor(1 + delta);
        const minus = tryFactor(1 - delta);
        let next = null;
        if (plus && plus.evaluation.cost < bestEvaluation.cost) next = plus;
        if (minus && minus.evaluation.cost < (next?.evaluation.cost ?? bestEvaluation.cost)) next = minus;
        if (next) {
          best = next.candidate;
          bestEvaluation = next.evaluation;
          improved = true;
        }
      }
      tweakIds.forEach((id) => {
        steps[id] *= improved ? 0.85 : 0.65;
      });
      if (Object.values(steps).every((step) => step < 0.02)) break;
    }
    return { raw: best, evaluation: bestEvaluation };
  }
  function fitDofFromTargets(targets, options, dependencies) {
    const desired = desiredFitTargetsFrom(targets);
    if (!hasDesiredFitTarget(desired)) return null;
    const baseParams = options.baseParams || dependencies.defaultParams;
    const tweakIds = options.tweakIds || Array.from(dependencies.defaultTweakIds);
    const maxIter = options.maxIter ?? 12;
    const baselinePeaks = peaksForParams(baseParams, dependencies);
    const warm = warmFitParamsFrom(
      baseParams,
      desired,
      baselinePeaks,
      tweakIds,
      dependencies.clampToBounds
    );
    return coordinateSearch(
      warm,
      desired,
      tweakIds.slice(),
      maxIter,
      options.factorAllowed,
      dependencies
    );
  }

  // tools/dof_model/dof_model_engine.ts
  var DOF_DEFAULT_PARAMS = {
    model_order: 4,
    ambient_temp: 20,
    altitude: 0,
    driving_force: 0.4,
    area_hole: 55e-4,
    // Masses are in kg in the solver core.
    // UI shows grams, but we convert g -> kg on input.
    mass_air: 5e-4,
    volume_air: 0.0141,
    damping_air: 5e-3,
    mass_top: 0.043,
    stiffness_top: 42700,
    damping_top: 1.5,
    area_top: 0.039,
    mass_back: 0.094,
    stiffness_back: 13e4,
    damping_back: 7,
    area_back: 0.04,
    mass_sides: 0.8,
    stiffness_sides: 14e5,
    damping_sides: 10,
    area_sides: 0.025
  };
  var DOF_FIT_BOUNDS = {
    area_hole: { min: 3e-3, max: 0.01 },
    volume_air: { min: 0.01, max: 0.025 },
    mass_top: { min: 5e-3, max: 0.12 },
    stiffness_top: { min: 1e4, max: 15e4 },
    stiffness_back: { min: 8e4, max: 4e5 }
  };
  var DOF_SOLVE_TWEAK_IDS2 = ["stiffness_top", "stiffness_back", "volume_air", "area_hole"];
  var DOF_WHAT_IF_RECIPE_IDS = [...DOF_SOLVE_TWEAK_IDS2, "mass_top", "mass_back"];
  var DOF_WHAT_IF_SLIDER_RANGES = {
    area_hole: { step: 1e-4, min: 3e-3, max: 0.01 },
    volume_air: { step: 5e-4, min: 0.01, max: 0.025 },
    stiffness_top: { step: 100, min: 1e4, max: 15e4 },
    stiffness_back: { step: 200, min: 8e4, max: 4e5 },
    mass_top: { step: 0.1, min: 5, max: 120 },
    mass_back: { step: 0.5, min: 40, max: 220 }
  };
  function dofClampToBounds(id, value) {
    const bounds = DOF_FIT_BOUNDS[id];
    if (!bounds || !Number.isFinite(value)) return value;
    return Math.max(bounds.min, Math.min(bounds.max, value));
  }
  function dofLegacySolver(runtime) {
    return {
      computeResponse: (params) => computeDofLegacyResponse(runtime, params),
      adaptParams: (raw) => adaptDofLegacyParams(runtime, raw)
    };
  }
  function dofPeaksForParams(solver, raw) {
    const response = solver.computeResponse(solver.adaptParams(raw));
    return response ? modelPeaksFromResponse(response) : null;
  }
  function dofFitWithSolver(solver, targets, options = {}) {
    return fitDofFromTargets(targets, options, {
      defaultParams: DOF_DEFAULT_PARAMS,
      defaultTweakIds: DOF_SOLVE_TWEAK_IDS2,
      clampToBounds: dofClampToBounds,
      computeResponse: solver.computeResponse,
      adaptParams: solver.adaptParams,
      peaksFromResponse: modelPeaksFromResponse
    });
  }
  function dofSolveRecipeOptions(targets, restrictSimple) {
    return {
      tweakIds: restrictSimple ? readDofRestrictedTweakIds() : dofFitSolveTweakIdsFromTargets(targets),
      factorAllowed: restrictSimple ? dofFitIncreaseOnlyFactorAllowed : void 0
    };
  }
  function dofSolveRecipeTargets(targets, modelPeaks) {
    const held = { ...targets };
    ["air", "top", "back"].forEach((mode) => {
      if (Number.isFinite(targets[mode])) return;
      const peak = modelPeaks?.[mode];
      if (Number.isFinite(peak)) held[mode] = peak;
    });
    return held;
  }
  function dofWhatIfParamsFromOverlayText(base, overlayText) {
    const out = { ...base };
    let moved = false;
    DOF_WHAT_IF_RECIPE_IDS.forEach((id) => {
      const range = DOF_WHAT_IF_SLIDER_RANGES[id];
      const slider = { min: String(range.min), max: String(range.max), step: String(range.step) };
      const overlayValue = parseFloat(String(overlayText[id] ?? ""));
      const presentation = buildDofOverlayPresentation({
        baseSlider: slider,
        overlaySlider: slider,
        baseValue: dofInternalValueToDisplay(id, base[id]),
        overlayValue,
        showWhatIf: true
      });
      if (!presentation.isActive) return;
      out[id] = dofDisplayValueToInternal(id, overlayValue);
      moved = true;
    });
    return moved ? out : null;
  }
  function dofRecipeSummaryValues(raw) {
    if (!raw) return null;
    return {
      ...raw,
      mass_top: dofInternalValueToDisplay("mass_top", raw.mass_top),
      mass_back: dofInternalValueToDisplay("mass_back", raw.mass_back)
    };
  }
  return __toCommonJS(dof_model_engine_exports);
})();
