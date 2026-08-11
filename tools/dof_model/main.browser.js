"use strict";
(() => {
  // tools/dof_model/dof_display_format.ts
  function colorWithAlpha(color, alpha) {
    const hex = color.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      const r = parseInt(`${hex[0]}${hex[0]}`, 16);
      const g = parseInt(`${hex[1]}${hex[1]}`, 16);
      const b = parseInt(`${hex[2]}${hex[2]}`, 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const rgb = color.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
    if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
    const rgba = color.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*[\d.]+\s*\)$/i);
    if (rgba) return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${alpha})`;
    return color;
  }
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

  // tools/dof_model/dof_plot_data.ts
  function buildDofTrace(points, name, color, lineOptions = {}) {
    if (!Array.isArray(points) || points.length === 0) return null;
    return {
      x: points.map((point) => point.x),
      y: points.map((point) => point.y),
      mode: "lines",
      name,
      line: { color, ...lineOptions || {} },
      hovertemplate: `%{x:.1f} Hz \xB7 %{y:.1f} dB<extra>${name}</extra>`
    };
  }
  function overlayBucketFromWeight(weight, config) {
    if (weight > 0.66) {
      return { width: config.widths.thick, opacity: config.opacities.thick };
    }
    if (weight > 0.33) {
      return { width: config.widths.mid, opacity: config.opacities.mid };
    }
    return { width: config.widths.thin, opacity: config.opacities.thin };
  }
  function overlayWeightAtFrequency(frequency, config) {
    const { min, max, feather } = config;
    if (frequency >= min && frequency <= max) return 1;
    if (frequency >= min - feather && frequency < min) {
      return 1 - (min - frequency) / feather;
    }
    if (frequency > max && frequency <= max + feather) {
      return 1 - (frequency - max) / feather;
    }
    return 0;
  }
  function buildDofTargetOverlaySegments(points, config, sharedBuilder) {
    if (sharedBuilder) return sharedBuilder(points, config);
    const segments = [];
    let current = null;
    points.forEach((point) => {
      const frequency = point?.x;
      const level = point?.y;
      if (!Number.isFinite(frequency) || !Number.isFinite(level)) {
        current = null;
        return;
      }
      const weight = overlayWeightAtFrequency(frequency, config);
      if (weight <= 0) {
        current = null;
        return;
      }
      const bucket = overlayBucketFromWeight(weight, config);
      const sameBucket = current && current.width === bucket.width && current.opacity === bucket.opacity;
      if (!sameBucket) {
        current = { x: [], y: [], width: bucket.width, opacity: bucket.opacity };
        segments.push(current);
      }
      current.x.push(frequency);
      current.y.push(level);
    });
    return segments;
  }
  function buildDofTargetOverlayTraces(points, color, config, colorWithAlpha2, sharedBuilder) {
    const segments = buildDofTargetOverlaySegments(points, config, sharedBuilder);
    return segments.map((segment, index) => ({
      x: segment.x,
      y: segment.y,
      mode: "lines",
      name: "Target",
      legendgroup: "target",
      showlegend: index === 0,
      line: {
        color: colorWithAlpha2(color, segment.opacity),
        width: segment.width,
        dash: "dash"
      },
      hovertemplate: "%{x:.1f} Hz \xB7 %{y:.1f} dB<extra>Target</extra>"
    }));
  }
  function computeDofYRange(series, pad = 6, minX, maxX) {
    if (!Array.isArray(series) || !series.length) return null;
    let min = Infinity;
    let max = -Infinity;
    series.forEach((point) => {
      if (!Number.isFinite(point?.y)) return;
      if (Number.isFinite(minX) && Number.isFinite(maxX)) {
        if (!Number.isFinite(point?.x)) return;
        if (point.x < minX || point.x > maxX) return;
      }
      min = Math.min(min, point.y);
      max = Math.max(max, point.y);
    });
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    const padding = Math.max(2, pad);
    return [min - padding, max + padding];
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
  function buildDofFastTargetWarmParams(input) {
    const desired = {
      air: finiteTarget(input.targets, "air"),
      top: finiteTarget(input.targets, "top"),
      back: finiteTarget(input.targets, "back")
    };
    const warm = { ...input.baseParams };
    ["top", "back"].forEach((mode) => {
      const target = desired[mode];
      const baseline = input.peaks[mode];
      if (!Number.isFinite(target) || !Number.isFinite(baseline) || baseline <= 0) return;
      const ratio = target / baseline;
      const id = mode === "top" ? "stiffness_top" : "stiffness_back";
      warm[id] = input.clampToBounds(id, warm[id] * ratio * ratio);
    });
    if (Number.isFinite(desired.air) && Number.isFinite(input.peaks.air) && input.peaks.air > 0) {
      const ratio = desired.air / input.peaks.air;
      warm.volume_air = input.clampToBounds(
        "volume_air",
        warm.volume_air / (ratio * ratio)
      );
    }
    return warm;
  }

  // tools/dof_model/dof_task_cards.ts
  function buildDofTaskCards(documentRef, container, cardDefinitions) {
    cardDefinitions.forEach((card) => {
      container.appendChild(buildDofTaskCard(documentRef, card));
    });
  }
  function restoreDofFitTaskControls(documentRef, panel, controls, cardDefinitions) {
    if (!controls || !panel) return;
    cardDefinitions.forEach((card) => {
      card.fieldIds?.forEach((fieldId) => {
        appendDofTaskCardElement(
          controls,
          documentRef.getElementById(fieldId)?.closest(".dof-fit-field")
        );
      });
      card.actionIds?.forEach((actionId) => {
        appendDofTaskCardElement(controls, documentRef.getElementById(actionId));
      });
    });
    appendDofTaskCardElement(panel, documentRef.getElementById("fit_status"));
  }
  function restoreDofSolveTaskControls(documentRef, panel, actions, cardDefinitions) {
    if (!actions || !panel) return;
    cardDefinitions.forEach((card) => {
      card.optionIds?.forEach((optionId) => {
        appendDofTaskCardElement(
          panel,
          documentRef.getElementById(optionId)?.closest(".dof-guided-option")
        );
      });
      card.actionIds?.forEach((actionId) => {
        appendDofTaskCardElement(actions, documentRef.getElementById(actionId));
      });
      if (card.actionIds?.length) panel.appendChild(actions);
      card.panelIds?.forEach((panelId) => {
        appendDofTaskCardElement(panel, documentRef.getElementById(panelId));
      });
    });
  }
  function buildDofTaskCard(documentRef, card) {
    const cardElement = documentRef.createElement("div");
    cardElement.className = `mode-card mode-${card.key}`;
    const title = documentRef.createElement("div");
    title.className = "dof-card-title";
    title.innerHTML = buildDofTaskCardTitle(card);
    const body = documentRef.createElement("div");
    body.className = "task-card-fields";
    appendDofTaskCardCopy(documentRef, body, card.copy);
    appendDofTaskCardFields(documentRef, body, card.fieldIds);
    appendDofTaskCardOptions(documentRef, body, card.optionIds);
    appendDofTaskCardActions(documentRef, body, card.actionIds);
    appendDofTaskCardPanels(documentRef, body, card.panelIds);
    appendDofTaskCardStatus(documentRef, body, card.statusId);
    cardElement.append(title, body);
    return cardElement;
  }
  function buildDofTaskCardTitle(card) {
    return `<div class="mode-label">${card.label}<span class="mode-label-alias">${card.alias}</span></div><span class="badge">${card.badgeText}</span>`;
  }
  function appendDofTaskCardCopy(documentRef, body, copyText) {
    if (!copyText) return;
    const copy = documentRef.createElement("p");
    copy.className = "task-card-copy";
    copy.textContent = copyText;
    body.appendChild(copy);
  }
  function appendDofTaskCardFields(documentRef, body, fieldIds) {
    fieldIds?.forEach((fieldId) => {
      appendDofTaskCardElement(
        body,
        documentRef.getElementById(fieldId)?.closest(".dof-fit-field")
      );
    });
  }
  function appendDofTaskCardOptions(documentRef, body, optionIds) {
    optionIds?.forEach((optionId) => {
      appendDofTaskCardElement(
        body,
        documentRef.getElementById(optionId)?.closest(".dof-guided-option")
      );
    });
  }
  function appendDofTaskCardActions(documentRef, body, actionIds) {
    if (!actionIds?.length) return;
    const actions = documentRef.createElement("div");
    actions.className = "task-card-actions";
    actionIds.forEach((actionId) => {
      appendDofTaskCardElement(actions, documentRef.getElementById(actionId));
    });
    body.appendChild(actions);
  }
  function appendDofTaskCardPanels(documentRef, body, panelIds) {
    panelIds?.forEach((panelId) => {
      appendDofTaskCardElement(body, documentRef.getElementById(panelId));
    });
  }
  function appendDofTaskCardStatus(documentRef, body, statusId) {
    if (!statusId) return;
    appendDofTaskCardElement(body, documentRef.getElementById(statusId));
  }
  function appendDofTaskCardElement(parent, element) {
    if (element) parent.appendChild(element);
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

  // tools/dof_model/dof_series_sampling.ts
  function sampleDofSeriesAtFrequency(series, frequency) {
    if (!Array.isArray(series) || !series.length || !Number.isFinite(frequency)) {
      return null;
    }
    let lowerIndex = 0;
    while (lowerIndex + 1 < series.length && series[lowerIndex + 1].x < frequency) {
      lowerIndex += 1;
    }
    const lower = series[lowerIndex];
    const upper = series[Math.min(lowerIndex + 1, series.length - 1)];
    if (!Number.isFinite(lower?.x) || !Number.isFinite(lower?.y)) {
      return Number.isFinite(upper?.y) ? upper.y : null;
    }
    if (!Number.isFinite(upper?.x) || !Number.isFinite(upper?.y) || lower.x === upper.x) {
      return lower.y;
    }
    const fraction = (frequency - lower.x) / (upper.x - lower.x);
    return lower.y + fraction * (upper.y - lower.y);
  }

  // tools/dof_model/dof_plot_pointer.ts
  function readDofPlotAxes(plotElement) {
    const layout = plotElement._fullLayout;
    const xaxis = layout?.xaxis;
    const yaxis = layout?.yaxis;
    if (!xaxis || !yaxis || typeof xaxis.l2p !== "function" || typeof yaxis.l2p !== "function") {
      return null;
    }
    return { xaxis, yaxis };
  }
  function readDofAxisRange(xaxis) {
    if (Array.isArray(xaxis?.range) && xaxis.range.length === 2) {
      return [
        Math.min(xaxis.range[0], xaxis.range[1]),
        Math.max(xaxis.range[0], xaxis.range[1])
      ];
    }
    return [50, 500];
  }
  function readDofPointerFrequency(event, plotElement) {
    const axes = readDofPlotAxes(plotElement);
    if (!axes || typeof axes.xaxis.p2l !== "function") return null;
    const rect = plotElement.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const plotX = localX - (axes.xaxis._offset || 0);
    const clampedPlotX = Math.max(
      0,
      Math.min(axes.xaxis._length || 0, plotX)
    );
    const frequency = axes.xaxis.p2l(clampedPlotX);
    if (!Number.isFinite(frequency)) return null;
    const [minimum, maximum] = readDofAxisRange(axes.xaxis);
    return Math.max(minimum, Math.min(maximum, frequency));
  }

  // tools/dof_model/dof_plot_resize.ts
  var DOF_PLOT_RESIZE_TOLERANCE_PX = 1;
  function readDofPlotContainerWidth(plotElement) {
    const width = plotElement?.getBoundingClientRect?.().width ?? plotElement?.clientWidth ?? null;
    return normalizeDofPlotWidth(width);
  }
  function readDofPlotGraphWidth(plotElement) {
    return normalizeDofPlotWidth(plotElement?._fullLayout?.width ?? null);
  }
  function dofPlotNeedsResize(plotElement) {
    const containerWidth = readDofPlotContainerWidth(plotElement);
    const graphWidth = readDofPlotGraphWidth(plotElement);
    if (containerWidth === null || graphWidth === null) return false;
    return Math.abs(containerWidth - graphWidth) > DOF_PLOT_RESIZE_TOLERANCE_PX;
  }
  function applyDofPlotResize(plotly, plotElement) {
    if (!dofPlotNeedsResize(plotElement)) return Promise.resolve(false);
    const width = readDofPlotContainerWidth(plotElement);
    const resize = plotly?.Plots?.resize;
    if (typeof resize === "function") {
      return Promise.resolve(resize(plotElement)).then(() => true);
    }
    if (typeof plotly?.relayout === "function") {
      return Promise.resolve(
        plotly.relayout(plotElement, { width })
      ).then(() => true);
    }
    return Promise.resolve(false);
  }
  function normalizeDofPlotWidth(width) {
    return typeof width === "number" && Number.isFinite(width) && width > 0 ? width : null;
  }

  // tools/dof_model/dof_trace_visibility.ts
  var DOF_TRACE_DEFAULT_VISIBLE = {
    Current: true,
    Target: true,
    Top: false,
    Air: false,
    Back: false,
    Sides: false
  };
  function isDofTraceName(value) {
    return typeof value === "string" && value in DOF_TRACE_DEFAULT_VISIBLE;
  }
  function readDofTraceVisibleValue(name, state) {
    const visible = state[name];
    const fallback = DOF_TRACE_DEFAULT_VISIBLE[name];
    return visible ?? fallback ? true : "legendonly";
  }
  function applyDofTraceVisibility(trace, name, state) {
    if (!trace) return;
    trace.visible = readDofTraceVisibleValue(name, state);
  }
  function syncDofTraceVisibilityStateFromPlot(plot, state) {
    const traces = plot.data;
    if (!Array.isArray(traces)) return;
    const nextState = {};
    traces.forEach((trace) => {
      const name = trace?.name;
      if (!isDofTraceName(name)) return;
      const isVisible = trace.visible === void 0 || trace.visible === true;
      nextState[name] = (nextState[name] ?? false) || isVisible;
    });
    Object.keys(nextState).forEach((name) => {
      if (!isDofTraceName(name)) return;
      state[name] = Boolean(nextState[name]);
    });
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

  // tools/dof_model/dof_mode_card_presentation.ts
  var DOF_NOTE_NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
  ];
  function readDofNotePresentation(frequency) {
    if (!Number.isFinite(frequency) || frequency <= 0) {
      return { name: "--", cents: "--", centsNumber: null };
    }
    const midi = 69 + 12 * Math.log2(frequency / 440);
    const nearest = Math.round(midi);
    const cents = Math.round((midi - nearest) * 100);
    const name = `${DOF_NOTE_NAMES[(nearest + 1200) % 12]}${Math.floor(nearest / 12) - 1}`;
    const centsText = `${cents >= 0 ? "+" : ""}${cents}c`;
    return { name, cents: centsText, centsNumber: cents };
  }
  function formatDofSigned(value, digits = 1) {
    if (!Number.isFinite(value)) return "--";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(digits)}`;
  }
  function readDofModeDisplayFrequency(mode, peaks, drag) {
    if (!drag.useWhatIf && drag.mode === mode && Number.isFinite(drag.frequency)) {
      return drag.frequency;
    }
    const frequency = peaks?.[mode];
    return Number.isFinite(frequency) ? frequency : null;
  }
  function buildDofModeCardPresentation(options) {
    const showWhatIf = options.showWhatIf ?? false;
    const baseFrequency = readDofModeDisplayFrequency(
      options.mode,
      options.basePeaks,
      options.drag
    );
    const baseNote = readDofNotePresentation(baseFrequency);
    if (!showWhatIf) {
      return {
        baseFrequencyText: Number.isFinite(baseFrequency) ? baseFrequency.toFixed(1) : "--",
        baseNote,
        showWhatIf: false,
        whatIfFrequencyText: "--",
        whatIfDeltaText: "",
        whatIfNote: readDofNotePresentation(null)
      };
    }
    const whatIfFrequency = options.whatIfPeaks?.[options.mode];
    const hasWhatIfFrequency = Number.isFinite(whatIfFrequency);
    const hasDelta = Number.isFinite(baseFrequency) && hasWhatIfFrequency;
    const delta = hasDelta ? whatIfFrequency - baseFrequency : null;
    return {
      baseFrequencyText: Number.isFinite(baseFrequency) ? baseFrequency.toFixed(1) : "--",
      baseNote,
      showWhatIf: true,
      whatIfFrequencyText: hasWhatIfFrequency ? `${whatIfFrequency.toFixed(1)} Hz` : "--",
      whatIfDeltaText: Number.isFinite(delta) ? `(${formatDofSigned(delta, 1)} Hz)` : "",
      whatIfNote: readDofNotePresentation(whatIfFrequency)
    };
  }
  function applyDofModeCardPresentation(elements, presentation) {
    elements.freqValue.textContent = presentation.baseFrequencyText;
    elements.noteName.textContent = presentation.baseNote.name;
    elements.noteCents.textContent = presentation.baseNote.cents;
    elements.noteCents.classList.toggle(
      "positive",
      typeof presentation.baseNote.centsNumber === "number" && presentation.baseNote.centsNumber > 0
    );
    elements.noteCents.classList.toggle(
      "negative",
      typeof presentation.baseNote.centsNumber === "number" && presentation.baseNote.centsNumber < 0
    );
    elements.whatIfRow.style.display = presentation.showWhatIf ? "" : "none";
    elements.whatIfNoteRow.style.display = presentation.showWhatIf ? "" : "none";
    elements.whatIfValue.textContent = presentation.whatIfFrequencyText;
    elements.whatIfDelta.textContent = presentation.whatIfDeltaText;
    elements.whatIfNoteName.textContent = presentation.whatIfNote.name;
    elements.whatIfNoteCents.textContent = presentation.whatIfNote.cents;
    elements.whatIfNoteCents.classList.toggle(
      "positive",
      typeof presentation.whatIfNote.centsNumber === "number" && presentation.whatIfNote.centsNumber > 0
    );
    elements.whatIfNoteCents.classList.toggle(
      "negative",
      typeof presentation.whatIfNote.centsNumber === "number" && presentation.whatIfNote.centsNumber < 0
    );
  }

  // tools/dof_model/dof_parameter_input_policy.ts
  function readDofParamsFromSearch(search, allowedKeys) {
    const raw = new URLSearchParams(search).get("params");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return null;
      }
      const values = parsed;
      const params = {};
      allowedKeys.forEach((key) => {
        const value = values[key];
        if (Number.isFinite(value)) params[key] = value;
      });
      return Object.keys(params).length > 0 ? params : null;
    } catch {
      return null;
    }
  }
  function dofDisplayValueToInternal(param, value) {
    if (!Number.isFinite(value)) return value;
    return param.startsWith("mass_") ? value / 1e3 : value;
  }
  function dofInternalValueToDisplay(param, value) {
    if (!Number.isFinite(value)) return value;
    return param.startsWith("mass_") ? value * 1e3 : value;
  }
  function isDofUncommittedDecimalInput(value) {
    return /^-?\d+\.$/.test(value.trim());
  }

  // tools/dof_model/main.ts
  var DEFAULT_PARAMS = {
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
  var CARD_DEFS = [
    {
      key: "air",
      label: "Air",
      alias: "T(1,1)1",
      degree: 1,
      color: "var(--purple)",
      badgeText: "DOF 1",
      fields: [
        { label: "Soundhole Area (m\xB2)", param: "area_hole", step: 1e-4, min: 3e-3, max: 0.01 },
        { label: "Cavity Volume (m\xB3)", param: "volume_air", step: 5e-4, min: 0.01, max: 0.025 },
        { label: "Moving Air Mass (g)", param: "mass_air", step: 0.01, min: 0.1, max: 2 },
        { label: "Air Damping R\u2090", param: "damping_air", step: 5e-4, min: 1e-3, max: 0.02 }
      ]
    },
    {
      key: "top",
      label: "Top",
      alias: "T(1,1)2",
      degree: 2,
      color: "var(--blue)",
      badgeText: "DOF 2",
      fields: [
        { label: "Mass m\u209C (g)", param: "mass_top", step: 0.1, min: 5, max: 120 },
        { label: "Stiffness k\u209C (N/m)", param: "stiffness_top", step: 100, min: 1e4, max: 15e4 },
        { label: "Damping R\u209C", param: "damping_top", step: 0.1, min: 0.5, max: 6 },
        { label: "Radiating Area A\u209C (m\xB2)", param: "area_top", step: 5e-4, min: 0.02, max: 0.06 }
      ]
    },
    {
      key: "back",
      label: "Back",
      alias: "T(1,1)3",
      degree: 3,
      color: "var(--green)",
      badgeText: "DOF 3",
      fields: [
        { label: "Mass m\u1D66 (g)", param: "mass_back", step: 0.5, min: 40, max: 220 },
        { label: "Stiffness k\u1D66 (N/m)", param: "stiffness_back", step: 200, min: 8e4, max: 4e5 },
        { label: "Damping R\u1D66", param: "damping_back", step: 0.1, min: 1, max: 15 },
        { label: "Radiating Area A\u1D66 (m\xB2)", param: "area_back", step: 5e-4, min: 0.02, max: 0.06 }
      ]
    },
    {
      key: "sides",
      label: "Sides",
      alias: "External",
      degree: 4,
      color: "var(--yellow)",
      badgeText: "DOF 4",
      fields: [
        { label: "Sides Mass (g)", param: "mass_sides", step: 5, min: 300, max: 1500 },
        { label: "Sides Stiffness (N/m)", param: "stiffness_sides", step: 500, min: 5e5, max: 3e6 },
        { label: "Sides Damping", param: "damping_sides", step: 0.1, min: 1, max: 30 },
        { label: "Sides Area (m\xB2)", param: "area_sides", step: 5e-4, min: 0.01, max: 0.06 }
      ]
    },
    {
      key: "environment",
      label: "Environment",
      alias: "Inputs",
      degree: 0,
      color: "var(--muted)",
      badgeText: "Always",
      fields: [
        { label: "Ambient Temp (\xB0C)", param: "ambient_temp", step: 0.5, min: -10, max: 40 },
        { label: "Altitude (m)", param: "altitude", step: 10, min: 0, max: 3e3 },
        { label: "Driving Force F (N)", param: "driving_force", step: 0.05, min: 0.05, max: 1 }
      ]
    }
  ];
  var FIT_TASK_CARD_DEFS = [
    {
      key: "air",
      label: "Air",
      alias: "Measured mode + body",
      badgeText: "Fit",
      copy: "Match the air resonance from the measured mode and the body inputs you already know.",
      fieldIds: ["fit_target_air", "fit_target_volume_air", "fit_target_area_hole_diam"]
    },
    {
      key: "top",
      label: "Top",
      alias: "Measured mode + plate",
      badgeText: "Fit",
      copy: "Anchor the top mode with the observed frequency and the effective top properties you trust.",
      fieldIds: ["fit_target_top", "fit_target_mass_top", "fit_target_stiffness_top"]
    },
    {
      key: "back",
      label: "Back",
      alias: "Measured mode + plate",
      badgeText: "Fit",
      copy: "Anchor the back mode with the observed frequency and the effective back properties you trust.",
      fieldIds: ["fit_target_back", "fit_target_mass_back", "fit_target_stiffness_back"]
    },
    {
      key: "environment",
      label: "Environment",
      alias: "Atmosphere + actions",
      badgeText: "Fit",
      copy: "Set the measurement altitude, run the fitter, and clear the inputs when you want to start over.",
      fieldIds: ["fit_altitude"],
      actionIds: ["btn_fit_guitar", "btn_fit_clear"],
      statusId: "fit_status"
    }
  ];
  var SOLVE_TASK_CARD_DEFS = [
    {
      key: "air",
      label: "Air",
      alias: "Target mode + body",
      badgeText: "Solve",
      copy: "Set the air goal first, then shape the body inputs that most directly move it.",
      fieldIds: ["fit_target_air", "fit_target_volume_air", "fit_target_area_hole_diam"]
    },
    {
      key: "top",
      label: "Top",
      alias: "Target mode + plate",
      badgeText: "Solve",
      copy: "Set the top target and the effective top properties that define the move you want.",
      fieldIds: ["fit_target_top", "fit_target_mass_top", "fit_target_stiffness_top"]
    },
    {
      key: "back",
      label: "Back",
      alias: "Target mode + plate",
      badgeText: "Solve",
      copy: "Set the back target and the effective back properties you want the solver to respect.",
      fieldIds: ["fit_target_back", "fit_target_mass_back", "fit_target_stiffness_back"]
    },
    {
      key: "environment",
      label: "Environment",
      alias: "Recipe actions",
      badgeText: "Solve",
      copy: "Constrain the recipe, solve the what-if, and review the suggested structural moves.",
      optionIds: ["fit_restrict_simple"],
      actionIds: ["btn_solve_targets", "btn_reset_whatif"],
      panelIds: ["whatif_summary"]
    }
  ];
  var TASK_MODE_COPY = {
    edit: {
      cardsTitle: "Current Model",
      cardsCopy: "Direct parameter editing for each degree of freedom."
    },
    fit: {
      cardsTitle: "Fit by System",
      cardsCopy: "Use measured modes and known inputs to infer the current model."
    },
    solve: {
      cardsTitle: "Solve by System",
      cardsCopy: "Set goals and constraints, then review the suggested moves."
    }
  };
  function cardDefsForTaskMode(taskMode) {
    if (taskMode === "edit") return CARD_DEFS;
    if (taskMode === "fit") return CARD_DEFS;
    return CARD_DEFS;
  }
  function fitTaskControlGridRead() {
    return fitPanelSection()?.querySelector(".dof-fit-controls");
  }
  function solveTaskActionsGroupRead() {
    return solvePanelSection()?.querySelector(".dof-guided-actions");
  }
  function solveTaskControlsRestoreHome() {
    restoreDofSolveTaskControls(
      document,
      solvePanelSection(),
      solveTaskActionsGroupRead(),
      SOLVE_TASK_CARD_DEFS
    );
  }
  var MODE_META = {
    air: { label: "Air", color: "var(--purple)" },
    top: { label: "Top", color: "var(--blue)" },
    back: { label: "Back", color: "var(--green)" }
  };
  var MODE_KEYS = ["air", "top", "back"];
  var TARGET_OVERLAY = {
    min: 85,
    max: 260,
    feather: 60,
    widths: { thin: 1, mid: 2, thick: 3 },
    opacities: { thin: 0.25, mid: 0.8, thick: 0.9 }
  };
  var FIT_BOUNDS = {
    area_hole: { min: 3e-3, max: 0.01 },
    volume_air: { min: 0.01, max: 0.025 },
    mass_top: { min: 5e-3, max: 0.12 },
    stiffness_top: { min: 1e4, max: 15e4 },
    stiffness_back: { min: 8e4, max: 4e5 }
  };
  var SOLVE_TWEAK_IDS = ["stiffness_top", "stiffness_back", "volume_air", "area_hole"];
  var currentParams = { ...DEFAULT_PARAMS };
  var currentOrder = 4;
  var currentTaskMode = "edit";
  var dofPerTabSession = dofPerTabSessionRead();
  var plotlyRef = null;
  var pendingRender = null;
  var lastResponse = null;
  var plotListenersBound = false;
  var plotResizeObserver = null;
  var thumbEls = {};
  var modeCardEls = {};
  var paramInputs = {};
  var paramSliders = {};
  var overlaySliders = {};
  var paramDeltaBars = {};
  var paramGlowDots = {};
  var paramWhatIfRows = {};
  var paramWhatIfValues = {};
  var paramWhatIfDeltas = {};
  var overlayLatched = /* @__PURE__ */ new Set();
  var lastWhatIfResponse = null;
  var dragState = {
    mode: null,
    freq: null,
    pointerId: null
  };
  var pendingDragSolve = null;
  var pendingDragMode = null;
  var pendingDragFreq = null;
  var dragLockedTargets = null;
  var dragUseWhatIf = false;
  var traceVisibilityState = { ...DOF_TRACE_DEFAULT_VISIBLE };
  var DOF_FIT_FIELD_IDS = [
    "fit_target_air",
    "fit_target_top",
    "fit_target_back",
    "fit_target_mass_top",
    "fit_target_stiffness_top",
    "fit_target_mass_back",
    "fit_target_stiffness_back",
    "fit_target_volume_air",
    "fit_target_area_hole_diam"
  ];
  function dofParamsFromLocation() {
    return readDofParamsFromSearch(
      window.location.search,
      Object.keys(DEFAULT_PARAMS)
    );
  }
  function getPlotly() {
    if (plotlyRef) return plotlyRef;
    const ref = window.Plotly;
    plotlyRef = ref || null;
    return plotlyRef;
  }
  function updateParam(param, value) {
    if (Number.isFinite(value)) {
      currentParams[param] = dofDisplayValueToInternal(param, value);
      scheduleRender();
    }
  }
  function updateParamFromCommittedInput(param, input, slider) {
    if (isDofUncommittedDecimalInput(input.value)) return;
    const value = parseFloat(input.value);
    if (Number.isFinite(value)) slider.value = String(value);
    updateParam(param, value);
  }
  function commitParamInput(param, input, slider) {
    const value = parseFloat(input.value);
    if (Number.isFinite(value)) {
      input.value = String(value);
      slider.value = String(value);
    }
    updateParam(param, value);
  }
  function tokenColor(token, fallbackToken = "--ink") {
    const styles = getComputedStyle(document.documentElement);
    return styles.getPropertyValue(token).trim() || styles.getPropertyValue(fallbackToken).trim() || "currentColor";
  }
  function plotThemeColors() {
    const blue = tokenColor("--blue");
    const green = tokenColor("--green");
    const purple = tokenColor("--purple");
    const yellow = tokenColor("--yellow");
    const orange = tokenColor("--orange");
    const ink = tokenColor("--ink");
    return {
      current: blue,
      top: blue,
      air: purple,
      back: green,
      sides: yellow,
      whatIf: colorWithAlpha(orange, 0.9),
      ink,
      grid: colorWithAlpha(ink, 0.08)
    };
  }
  function cssPercentValue(value) {
    return `${value}%`;
  }
  function cssPixelValue(value) {
    return `${value}px`;
  }
  function styleVariableWrite(element, name, value) {
    element.style.setProperty(name, value);
  }
  function stylePercentVariableWrite(element, name, value) {
    styleVariableWrite(element, name, cssPercentValue(value));
  }
  function stylePixelVariableWrite(element, name, value) {
    styleVariableWrite(element, name, cssPixelValue(value));
  }
  function sliderStackElementRead(slider) {
    return slider.parentElement;
  }
  function sliderPresentationSync(slider, start, end, baseFill, overlayFill) {
    const sliderStack = sliderStackElementRead(slider);
    if (!sliderStack) return;
    stylePercentVariableWrite(sliderStack, "--param-slider-fill-end", baseFill);
    stylePercentVariableWrite(sliderStack, "--param-overlay-start", start);
    stylePercentVariableWrite(sliderStack, "--param-overlay-end", end);
    stylePercentVariableWrite(sliderStack, "--param-overlay-width", Math.max(0, end - start));
    stylePercentVariableWrite(sliderStack, "--param-overlay-fill", overlayFill);
  }
  function buildCards() {
    const container = document.getElementById("dof_cards");
    if (!container) return;
    restoreDofFitTaskControls(
      document,
      fitPanelSection(),
      fitTaskControlGridRead(),
      FIT_TASK_CARD_DEFS
    );
    solveTaskControlsRestoreHome();
    container.innerHTML = "";
    if (currentTaskMode === "fit") {
      buildDofTaskCards(document, container, FIT_TASK_CARD_DEFS);
      return;
    }
    if (currentTaskMode === "solve") {
      buildDofTaskCards(document, container, SOLVE_TASK_CARD_DEFS);
      return;
    }
    cardDefsForTaskMode(currentTaskMode).forEach((card) => {
      const cardEl = document.createElement("div");
      cardEl.className = `mode-card mode-${card.key}`;
      cardEl.dataset.degree = String(card.degree);
      if (isModeKey(card.key)) cardEl.dataset.mode = card.key;
      const title = document.createElement("div");
      title.className = "dof-card-title";
      const badge = card.badgeText || `DOF ${card.degree}`;
      const aliasInline = card.alias ? `<span class="mode-label-alias">${card.alias}</span>` : "";
      title.innerHTML = `<div class="mode-label">${card.label}${aliasInline}</div><span class="badge" style="background:${card.color};">${badge}</span>`;
      cardEl.appendChild(title);
      if (isModeKey(card.key)) {
        const modeKey = card.key;
        const meta = document.createElement("div");
        meta.className = "mode-meta";
        const freqRow = document.createElement("div");
        freqRow.className = "mode-value-row";
        const freqValue = document.createElement("div");
        freqValue.className = "mode-value";
        freqValue.textContent = "--";
        const freqUnit = document.createElement("span");
        freqUnit.className = "mode-unit";
        freqUnit.textContent = "Hz";
        freqRow.append(freqValue, freqUnit);
        const noteRow = document.createElement("div");
        noteRow.className = "mode-note";
        const noteName = document.createElement("span");
        noteName.className = "mode-note-name";
        noteName.textContent = "--";
        const noteCents = document.createElement("span");
        noteCents.className = "mode-note-cents";
        noteCents.textContent = "--";
        noteRow.append(noteName, noteCents);
        const whatIfRow = document.createElement("div");
        whatIfRow.className = "mode-whatif-row";
        whatIfRow.style.display = "none";
        const whatIfLabel = document.createElement("span");
        whatIfLabel.className = "mode-whatif-label";
        whatIfLabel.textContent = "Target";
        const whatIfValue = document.createElement("span");
        whatIfValue.className = "mode-whatif-value";
        whatIfValue.textContent = "--";
        const whatIfDelta = document.createElement("span");
        whatIfDelta.className = "mode-whatif-delta";
        whatIfDelta.textContent = "";
        whatIfRow.append(whatIfLabel, whatIfValue, whatIfDelta);
        const whatIfNoteRow = document.createElement("div");
        whatIfNoteRow.className = "mode-whatif-note";
        whatIfNoteRow.style.display = "none";
        const whatIfNoteName = document.createElement("span");
        whatIfNoteName.className = "mode-whatif-note-name";
        whatIfNoteName.textContent = "--";
        const whatIfNoteCents = document.createElement("span");
        whatIfNoteCents.className = "mode-whatif-note-cents";
        whatIfNoteCents.textContent = "--";
        whatIfNoteRow.append(whatIfNoteName, whatIfNoteCents);
        meta.append(freqRow, noteRow, whatIfRow, whatIfNoteRow);
        cardEl.appendChild(meta);
        modeCardEls[modeKey] = {
          root: cardEl,
          freqValue,
          noteName,
          noteCents,
          whatIfRow,
          whatIfValue,
          whatIfDelta,
          whatIfNoteRow,
          whatIfNoteName,
          whatIfNoteCents
        };
      }
      const grid = document.createElement("div");
      grid.className = "param-grid";
      card.fields.forEach((field) => {
        const row = document.createElement("div");
        row.className = "param-row";
        const label = document.createElement("div");
        label.className = "param-label";
        label.textContent = field.label;
        const input = document.createElement("input");
        input.type = "number";
        input.className = "param-number";
        input.step = field.step != null ? String(field.step) : "any";
        if (field.min != null) input.min = String(field.min);
        if (field.max != null) input.max = String(field.max);
        input.value = String(dofInternalValueToDisplay(field.param, currentParams[field.param]));
        input.dataset.param = field.param;
        const slider = document.createElement("input");
        slider.type = "range";
        slider.className = "param-slider";
        if (field.min != null) slider.min = String(field.min);
        if (field.max != null) slider.max = String(field.max);
        slider.step = field.step != null ? String(field.step) : "any";
        slider.value = input.value;
        slider.dataset.param = field.param;
        input.addEventListener("input", () => {
          updateParamFromCommittedInput(field.param, input, slider);
          syncOverlayToBase(field.param);
          updateOverlayLatch(field.param);
        });
        input.addEventListener("change", () => {
          commitParamInput(field.param, input, slider);
          syncOverlayToBase(field.param);
          updateOverlayLatch(field.param);
        });
        slider.addEventListener("input", (event) => {
          const val = parseFloat(event.target.value);
          if (Number.isFinite(val)) input.value = String(val);
          updateParam(field.param, val);
          syncOverlayToBase(field.param);
          updateOverlayLatch(field.param);
        });
        const sliderWrap = document.createElement("div");
        sliderWrap.className = "param-slider-stack";
        sliderWrap.appendChild(slider);
        const overlay = document.createElement("input");
        overlay.type = "range";
        overlay.className = "param-slider param-slider-overlay";
        if (field.min != null) overlay.min = String(field.min);
        if (field.max != null) overlay.max = String(field.max);
        overlay.step = field.step != null ? String(field.step) : "any";
        overlay.value = input.value;
        overlay.dataset.param = field.param;
        overlay.addEventListener("input", () => {
          updateOverlayLatch(field.param);
          scheduleRender();
        });
        sliderWrap.appendChild(overlay);
        const deltaBar = document.createElement("div");
        deltaBar.className = "param-slider-delta";
        sliderWrap.appendChild(deltaBar);
        const glowDot = document.createElement("div");
        glowDot.className = "param-slider-glow";
        sliderWrap.appendChild(glowDot);
        const whatIfRow = document.createElement("div");
        whatIfRow.className = "param-whatif-row";
        const whatIfValue = document.createElement("span");
        whatIfValue.className = "param-whatif-value";
        whatIfValue.textContent = "--";
        const whatIfDelta = document.createElement("span");
        whatIfDelta.className = "param-whatif-delta";
        whatIfDelta.textContent = "";
        whatIfRow.append(whatIfValue, whatIfDelta);
        paramInputs[field.param] = input;
        paramSliders[field.param] = slider;
        overlaySliders[field.param] = overlay;
        paramDeltaBars[field.param] = deltaBar;
        paramGlowDots[field.param] = glowDot;
        paramWhatIfRows[field.param] = whatIfRow;
        paramWhatIfValues[field.param] = whatIfValue;
        paramWhatIfDeltas[field.param] = whatIfDelta;
        row.append(label, input, sliderWrap, whatIfRow);
        grid.appendChild(row);
      });
      cardEl.appendChild(grid);
      container.appendChild(cardEl);
    });
    applyCardVisibility();
  }
  function applyCardVisibility() {
    if (currentTaskMode !== "edit") return;
    const cards = document.querySelectorAll(".mode-card");
    cards.forEach((card) => {
      const degree = Number(card.dataset.degree || 4);
      card.classList.toggle("card-hidden", degree > currentOrder);
    });
  }
  function getActiveModes() {
    if (currentOrder <= 1) return ["air"];
    if (currentOrder === 2) return ["air", "top"];
    return ["air", "top", "back"];
  }
  function isModeKey(key) {
    return key === "air" || key === "top" || key === "back";
  }
  function isWhatIfEnabled() {
    const toggle = document.getElementById("toggle_overlay");
    return Boolean(toggle?.checked);
  }
  function hasActiveOverlays() {
    return overlayLatched.size > 0;
  }
  function syncOverlayToBase(param) {
    const overlay = overlaySliders[param];
    if (!overlay || overlayLatched.has(param)) return;
    const baseValue = dofInternalValueToDisplay(param, currentParams[param]);
    if (Number.isFinite(baseValue)) overlay.value = String(baseValue);
  }
  function updateOverlayLatch(param) {
    const slider = paramSliders[param];
    const overlay = overlaySliders[param];
    const deltaBar = paramDeltaBars[param];
    const glowDot = paramGlowDots[param];
    const whatIfRow = paramWhatIfRows[param];
    const whatIfValue = paramWhatIfValues[param];
    const whatIfDelta = paramWhatIfDeltas[param];
    if (!slider || !overlay) return;
    const baseValue = dofInternalValueToDisplay(param, currentParams[param]);
    const overlayValue = parseFloat(overlay.value);
    const presentation = buildDofOverlayPresentation({
      baseSlider: slider,
      overlaySlider: overlay,
      baseValue,
      overlayValue,
      showWhatIf: isWhatIfEnabled()
    });
    if (presentation.isActive) overlayLatched.add(param);
    else overlayLatched.delete(param);
    overlay.classList.toggle("overlay-active", presentation.isActive);
    sliderPresentationSync(
      slider,
      presentation.start,
      presentation.end,
      presentation.baseFill,
      presentation.overlayFill
    );
    if (deltaBar) {
      deltaBar.classList.toggle("active", presentation.deltaBarActive);
    }
    if (glowDot) {
      glowDot.classList.toggle("active", presentation.isActive);
    }
    if (whatIfRow && whatIfValue && whatIfDelta) {
      whatIfRow.classList.toggle("active", presentation.whatIfActive);
      whatIfValue.textContent = presentation.overlayValueText;
      whatIfDelta.textContent = presentation.delta == null ? "" : formatDofSigned(presentation.delta, presentation.deltaDigits);
    }
  }
  function refreshOverlayVisuals() {
    Object.keys(overlaySliders).forEach((key) => {
      updateOverlayLatch(key);
    });
  }
  function resetWhatIf() {
    overlayLatched.clear();
    Object.keys(overlaySliders).forEach((key) => {
      const param = key;
      const overlay = overlaySliders[param];
      if (!overlay) return;
      const baseValue = dofInternalValueToDisplay(param, currentParams[param]);
      if (Number.isFinite(baseValue)) overlay.value = String(baseValue);
      overlay.classList.remove("overlay-active");
    });
    refreshOverlayVisuals();
    lastWhatIfResponse = null;
    updateModeCards(lastResponse, null);
    whatIfSummarySet(null);
  }
  function resetWhatIfComparison() {
    const toggle = document.getElementById("toggle_overlay");
    if (!toggle?.checked) {
      resetWhatIf();
      return;
    }
    toggle.checked = false;
    toggle.dispatchEvent(new Event("change"));
  }
  function getWhatIfParams() {
    if (!isWhatIfEnabled() || !hasActiveOverlays()) return null;
    const out = { ...currentParams };
    overlayLatched.forEach((param) => {
      const overlay = overlaySliders[param];
      if (!overlay) return;
      const value = parseFloat(overlay.value);
      if (!Number.isFinite(value)) return;
      out[param] = dofDisplayValueToInternal(param, value);
    });
    return out;
  }
  function computeResponseForParams(raw) {
    return computeResponseSafe(adaptParamsToSolver(raw));
  }
  function getDragLockResponse(useWhatIf) {
    if (useWhatIf) {
      const whatParams = getWhatIfParams() || currentParams;
      return lastWhatIfResponse || computeResponseForParams(whatParams);
    }
    return lastResponse || computeResponseForParams(currentParams);
  }
  function updateModeCards(baseResponse = lastResponse, whatIfResponse = lastWhatIfResponse) {
    const basePeaks = baseResponse ? modelPeaksFromResponse(baseResponse) : null;
    const whatIfPeaks = whatIfResponse ? modelPeaksFromResponse(whatIfResponse) : null;
    MODE_KEYS.forEach((mode) => {
      const els = modeCardEls[mode];
      if (!els) return;
      const presentation = buildDofModeCardPresentation({
        mode,
        basePeaks,
        whatIfPeaks,
        drag: {
          mode: dragState.mode,
          frequency: dragState.freq,
          useWhatIf: dragUseWhatIf
        }
      });
      applyDofModeCardPresentation(els, presentation);
    });
  }
  function syncCardInputs() {
    Object.entries(paramInputs).forEach(([key, input]) => {
      const param = key;
      const next = dofInternalValueToDisplay(param, currentParams[param]);
      if (Number.isFinite(next)) {
        input.value = String(next);
        const slider = paramSliders[param];
        if (slider) slider.value = String(next);
      }
      syncOverlayToBase(param);
      updateOverlayLatch(param);
    });
    fitAltitudeControlSync();
  }
  function fitAltitudeControlSync() {
    const slider = document.getElementById("fit_altitude");
    const value = document.getElementById("fit_altitude_value");
    if (!slider || !value) return;
    const altitude = dofInternalValueToDisplay("altitude", currentParams.altitude);
    if (!Number.isFinite(altitude)) return;
    slider.value = String(altitude);
    value.textContent = `${Math.round(altitude)} m`;
  }
  function fitAltitudeControlBind() {
    const slider = document.getElementById("fit_altitude");
    if (!slider) return;
    fitAltitudeControlSync();
    slider.addEventListener("input", () => {
      const altitude = parseFloat(slider.value);
      if (!Number.isFinite(altitude)) return;
      updateParam("altitude", altitude);
      fitAltitudeControlSync();
    });
  }
  function setOrder(order) {
    currentOrder = order;
    currentParams.model_order = order;
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      const isActive = Number(btn.dataset.order) === order;
      btn.classList.toggle("tab-btn-active", isActive);
    });
    applyCardVisibility();
    scheduleRender();
  }
  function taskModeCopyRead(mode) {
    return TASK_MODE_COPY[mode];
  }
  function taskModeCopyApply(mode) {
    const copy = taskModeCopyRead(mode);
    const cardsTitle = document.getElementById("dof_cards_title");
    const cardsCopy = document.getElementById("dof_cards_copy");
    if (cardsTitle) cardsTitle.textContent = copy.cardsTitle;
    if (cardsCopy) cardsCopy.textContent = copy.cardsCopy;
  }
  function fitPanelSection() {
    return document.getElementById("dof_fit_panel");
  }
  function solvePanelSection() {
    return document.getElementById("dof_solve_panel");
  }
  function setTaskMode(mode) {
    currentTaskMode = mode;
    document.querySelectorAll(".task-tab-btn").forEach((btn) => {
      const isActive = String(btn.dataset.taskMode || "") === mode;
      btn.classList.toggle("task-tab-btn-active", isActive);
    });
    taskModeCopyApply(mode);
    buildCards();
  }
  function scheduleRender() {
    dofPerTabSessionPersist();
    if (pendingRender !== null) cancelAnimationFrame(pendingRender);
    pendingRender = requestAnimationFrame(() => {
      pendingRender = null;
      dofRenderExecute();
    });
  }
  function dofPipelineEnabledRead() {
    return Boolean(window.DofPipelineEnabled);
  }
  function dofPipelineEmitBuild() {
    return (event) => {
      console.info("[DOF Pipeline]", event.eventType, event.stageId || "-", event.payload || {});
    };
  }
  function dofPipelineRunnerRead() {
    return window.DofPipelineRunner;
  }
  function dofRenderExecute() {
    if (!dofPipelineEnabledRead()) {
      renderPlot();
      return;
    }
    const runner = dofPipelineRunnerRead();
    if (!runner?.run) {
      renderPlot();
      return;
    }
    void runner.run(
      { trigger: "render.schedule" },
      { useStageList: true, stages: ["refresh"] },
      dofPipelineEmitBuild()
    );
  }
  function sharedDofSolverAdapterRead() {
    const adapter = window.dof_solver_adapter;
    if (!adapter) return null;
    const adapt = adapter.adaptParamsToSolver;
    const compute = adapter.computeResponseSafe;
    if (typeof adapt !== "function" || typeof compute !== "function") return null;
    return { adaptParamsToSolver: adapt, computeResponseSafe: compute };
  }
  function computeResponseSafeLegacy(params) {
    return computeDofLegacyResponse(window, params);
  }
  function adaptParamsToSolverLegacy(raw) {
    return adaptDofLegacyParams(window, raw);
  }
  function computeResponseSafe(params) {
    const sharedAdapter = sharedDofSolverAdapterRead();
    if (sharedAdapter) return sharedAdapter.computeResponseSafe(params);
    return computeResponseSafeLegacy(params);
  }
  function adaptParamsToSolver(raw) {
    const sharedAdapter = sharedDofSolverAdapterRead();
    if (sharedAdapter) return sharedAdapter.adaptParamsToSolver(raw);
    return adaptParamsToSolverLegacy(raw);
  }
  function sharedSeriesSamplerRead() {
    const sampler = window.series_sampling;
    const sample = sampler?.seriesValueSampleAtFrequency;
    if (typeof sample !== "function") return null;
    return { seriesValueSampleAtFrequency: sample };
  }
  function clampToBounds(id, value) {
    const bounds = FIT_BOUNDS[id];
    if (!bounds || !Number.isFinite(value)) return value;
    return Math.max(bounds.min, Math.min(bounds.max, value));
  }
  function sampleSeriesAtFreq(series, freq) {
    const sharedSampler = sharedSeriesSamplerRead();
    if (sharedSampler) return sharedSampler.seriesValueSampleAtFrequency(series, freq);
    return sampleDofSeriesAtFrequency(series, freq);
  }
  function fit4DofFromTargets(targets, opts = {}) {
    return fitDofFromTargets(targets, opts, {
      defaultParams: DEFAULT_PARAMS,
      defaultTweakIds: SOLVE_TWEAK_IDS,
      clampToBounds,
      computeResponse: computeResponseSafe,
      adaptParams: adaptParamsToSolver,
      peaksFromResponse: modelPeaksFromResponse
    });
  }
  function targetOverlaySharedBuilderRead() {
    const shared = window.overlay_segments;
    const buildShared = shared?.overlaySegmentsBuildFromPoints;
    return typeof buildShared === "function" ? buildShared : void 0;
  }
  function buildTargetOverlayTraces(points, color) {
    return buildDofTargetOverlayTraces(
      points,
      color,
      TARGET_OVERLAY,
      colorWithAlpha,
      targetOverlaySharedBuilderRead()
    );
  }
  function ensureThumb(mode) {
    if (thumbEls[mode]) return thumbEls[mode];
    const overlay = document.getElementById("plot_overlay");
    if (!overlay) return null;
    const root = document.createElement("div");
    root.className = "dof-thumb";
    root.dataset.mode = mode;
    root.style.setProperty("--thumb-color", MODE_META[mode].color);
    const label = document.createElement("div");
    label.className = "dof-thumb-label";
    const stem = document.createElement("div");
    stem.className = "dof-thumb-stem";
    const halo = document.createElement("div");
    halo.className = "dof-thumb-halo";
    const dot = document.createElement("div");
    dot.className = "dof-thumb-dot";
    root.append(label, stem, halo, dot);
    root.addEventListener("pointerdown", handleThumbPointerDown);
    overlay.appendChild(root);
    const entry = { root, label, stem, dot, halo };
    thumbEls[mode] = entry;
    return entry;
  }
  function positionThumb(thumb, freq, db, axes) {
    if (!Number.isFinite(freq) || !Number.isFinite(db)) {
      thumb.root.classList.add("thumb-hidden");
      return;
    }
    const x = axes.xaxis.l2p(freq) + (axes.xaxis._offset || 0);
    const y = axes.yaxis.l2p(db) + (axes.yaxis._offset || 0);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      thumb.root.classList.add("thumb-hidden");
      return;
    }
    thumb.root.classList.remove("thumb-hidden");
    stylePixelVariableWrite(thumb.root, "--thumb-x", x);
    stylePixelVariableWrite(thumb.root, "--thumb-y", y);
  }
  function updateThumbs(response = lastResponse) {
    const plotEl = document.getElementById("plot_dof");
    const overlay = document.getElementById("plot_overlay");
    if (!plotEl || !overlay) return;
    const axes = readDofPlotAxes(plotEl);
    const activeResponse = isWhatIfEnabled() && lastWhatIfResponse?.total?.length ? lastWhatIfResponse : response;
    if (!axes || !activeResponse?.total?.length) {
      Object.values(thumbEls).forEach((thumb) => {
        if (thumb) thumb.root.classList.add("thumb-hidden");
      });
      updateModeCards(response, lastWhatIfResponse);
      return;
    }
    const peaks = modelPeaksFromResponse(activeResponse) || { air: null, top: null, back: null };
    const activeModes = getActiveModes();
    ["air", "top", "back"].forEach((mode) => {
      const thumb = ensureThumb(mode);
      if (!thumb) return;
      const isActive = activeModes.includes(mode);
      thumb.root.classList.toggle("thumb-hidden", !isActive);
      if (!isActive) return;
      let freq = dragState.mode === mode && Number.isFinite(dragState.freq) ? dragState.freq : peaks[mode];
      if (!Number.isFinite(freq)) {
        const band = DOF_MODE_BANDS[mode];
        freq = (band.low + band.high) / 2;
      }
      const db = sampleSeriesAtFreq(activeResponse.total, freq);
      positionThumb(thumb, freq, db, axes);
      thumb.label.innerHTML = `${MODE_META[mode].label}<br><span>${freq.toFixed(1)} Hz</span>`;
      thumb.root.classList.toggle("dragging", dragState.mode === mode);
    });
    updateModeCards(response, lastWhatIfResponse);
  }
  function applyWhatIfParams(raw) {
    if (!isWhatIfEnabled()) return;
    SOLVE_TWEAK_IDS.forEach((id) => {
      const overlay = overlaySliders[id];
      if (!overlay || !Number.isFinite(raw[id])) return;
      const displayValue = dofInternalValueToDisplay(id, raw[id]);
      if (!Number.isFinite(displayValue)) return;
      overlay.value = String(displayValue);
      updateOverlayLatch(id);
    });
    scheduleRender();
  }
  function solveTargets(targets, opts = {}) {
    const useWhatIf = Boolean(opts.useWhatIf && isWhatIfEnabled());
    const baseParams = useWhatIf ? getWhatIfParams() || currentParams : currentParams;
    const fit = fit4DofFromTargets(targets, {
      maxIter: 12,
      tweakIds: opts.tweakIds || Array.from(SOLVE_TWEAK_IDS),
      baseParams: { ...baseParams },
      factorAllowed: opts.factorAllowed
    });
    if (fit?.raw) {
      if (useWhatIf) {
        applyWhatIfParams(fit.raw);
      } else {
        currentParams = { ...currentParams, ...fit.raw };
        syncCardInputs();
        scheduleRender();
      }
    }
  }
  function fitTargetsFromInputs() {
    return buildDofFitInputTargets(readDofInputValue, dofDisplayValueToInternal);
  }
  function fitTargetsHaveAnyValue(targets) {
    return dofFitTargetsHaveAnyValue(targets);
  }
  function fitSolveTweakIdsFromTargets(targets) {
    return dofFitSolveTweakIdsFromTargets(targets);
  }
  function fitRecipeRestrictSimpleEnabled() {
    const toggle = document.getElementById("fit_restrict_simple");
    return Boolean(toggle?.checked);
  }
  function fitRecipeRestrictedTweakIds() {
    return readDofRestrictedTweakIds();
  }
  function fitRecipeIncreaseOnlyFactorAllowed(id, factor) {
    return dofFitIncreaseOnlyFactorAllowed(id, factor);
  }
  function fitStatusSet(message) {
    const status = document.getElementById("fit_status");
    if (!status) return;
    status.textContent = message;
  }
  function whatIfSummarySet(lines) {
    const panel = document.getElementById("whatif_summary");
    if (!panel) return;
    const body = panel.querySelector(".delta-summary__body");
    if (!body) return;
    if (!lines || !lines.length) {
      body.textContent = "Run Solve Targets to see suggested adjustments.";
      return;
    }
    body.innerHTML = `<ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul>`;
  }
  function whatIfToggleEnsureEnabled() {
    const toggle = document.getElementById("toggle_overlay");
    if (!toggle) return false;
    if (toggle.checked) return true;
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change"));
    return true;
  }
  function whatIfSummaryRefreshFromCurrentRecipe() {
    const recipeParams = getWhatIfParams();
    const lines = window.buildWhatIfRecipeSummaryLines?.(
      currentParams,
      recipeParams
    ) ?? null;
    whatIfSummarySet(lines);
  }
  function solveRecipeTargetsFromFitInputs() {
    const targets = fitTargetsFromInputs();
    const hasTarget = fitTargetsHaveAnyValue(targets);
    if (!hasTarget) {
      fitStatusSet("Enter at least one target frequency.");
      return;
    }
    if (!whatIfToggleEnsureEnabled()) {
      fitStatusSet("Compare mode is unavailable.");
      return;
    }
    const restrictSimple = fitRecipeRestrictSimpleEnabled();
    solveTargets(targets, {
      useWhatIf: true,
      tweakIds: restrictSimple ? fitRecipeRestrictedTweakIds() : fitSolveTweakIdsFromTargets(targets),
      factorAllowed: restrictSimple ? fitRecipeIncreaseOnlyFactorAllowed : void 0
    });
    whatIfSummaryRefreshFromCurrentRecipe();
    fitStatusSet("Solve Targets applied as a What-If recipe.");
  }
  function bindSolveRecipeActions() {
    const solveButton = document.getElementById("btn_solve_targets");
    const resetButton = document.getElementById("btn_reset_whatif");
    if (!solveButton || !resetButton) return;
    solveButton.addEventListener("click", () => {
      solveRecipeTargetsFromFitInputs();
    });
    resetButton.addEventListener("click", () => {
      resetWhatIfComparison();
      fitStatusSet("What-If comparison reset.");
    });
  }
  function bindFitMyGuitarActions() {
    const fitButton = document.getElementById("btn_fit_guitar");
    const clearButton = document.getElementById("btn_fit_clear");
    if (!fitButton || !clearButton) return;
    fitButton.addEventListener("click", () => {
      const targets = fitTargetsFromInputs();
      const hasTarget = fitTargetsHaveAnyValue(targets);
      if (!hasTarget) {
        fitStatusSet("Enter at least one target frequency.");
        return;
      }
      solveTargets(targets, {
        useWhatIf: isWhatIfEnabled(),
        tweakIds: fitSolveTweakIdsFromTargets(targets)
      });
      fitStatusSet("Fit applied.");
    });
    clearButton.addEventListener("click", () => {
      [
        "fit_target_air",
        "fit_target_top",
        "fit_target_back",
        "fit_target_mass_top",
        "fit_target_stiffness_top",
        "fit_target_mass_back",
        "fit_target_stiffness_back",
        "fit_target_volume_air",
        "fit_target_area_hole_diam"
      ].forEach((elementId) => {
        const input = document.getElementById(elementId);
        if (!input) return;
        input.value = "";
      });
      fitStatusSet("");
    });
  }
  function solveTargetsFast(targets, opts = {}) {
    const useWhatIf = Boolean(opts.useWhatIf && isWhatIfEnabled());
    const baseParams = useWhatIf ? getWhatIfParams() || currentParams : currentParams;
    const response = useWhatIf ? lastWhatIfResponse || computeResponseForParams(baseParams) : lastResponse;
    const peaks = response ? modelPeaksFromResponse(response) : null;
    if (!peaks) {
      const fit = fit4DofFromTargets(targets, {
        maxIter: 2,
        tweakIds: Array.from(SOLVE_TWEAK_IDS),
        baseParams: { ...baseParams }
      });
      if (fit?.raw) {
        if (useWhatIf) applyWhatIfParams(fit.raw);
        else {
          currentParams = { ...currentParams, ...fit.raw };
          scheduleRender();
        }
      }
      return;
    }
    const warm = buildDofFastTargetWarmParams({
      baseParams,
      targets,
      peaks,
      clampToBounds
    });
    if (useWhatIf) applyWhatIfParams(warm);
    else {
      currentParams = { ...currentParams, ...warm };
      scheduleRender();
    }
  }
  function scheduleDragSolve(mode, freq) {
    pendingDragMode = mode;
    pendingDragFreq = freq;
    if (pendingDragSolve !== null) return;
    pendingDragSolve = requestAnimationFrame(() => {
      pendingDragSolve = null;
      if (pendingDragMode && Number.isFinite(pendingDragFreq)) {
        const locked = dragLockedTargets || { air: null, top: null, back: null };
        const targets = { ...locked, [pendingDragMode]: pendingDragFreq };
        solveTargetsFast(targets, { useWhatIf: dragUseWhatIf });
      }
    });
  }
  function handleThumbPointerDown(event) {
    const target = event.currentTarget;
    const mode = target?.dataset?.mode;
    if (!mode) return;
    const plotEl = document.getElementById("plot_dof");
    if (!plotEl) return;
    event.preventDefault();
    dragUseWhatIf = isWhatIfEnabled();
    const lockResponse = getDragLockResponse(dragUseWhatIf);
    dragLockedTargets = lockResponse ? modelPeaksFromResponse(lockResponse) : { air: null, top: null, back: null };
    dragState.mode = mode;
    dragState.pointerId = event.pointerId;
    const freq = readDofPointerFrequency(event, plotEl);
    if (Number.isFinite(freq)) dragState.freq = freq;
    target.setPointerCapture?.(event.pointerId);
    updateThumbs();
  }
  function handleThumbPointerMove(event) {
    if (!dragState.mode || dragState.pointerId !== event.pointerId) return;
    const plotEl = document.getElementById("plot_dof");
    if (!plotEl) return;
    const freq = readDofPointerFrequency(event, plotEl);
    if (!Number.isFinite(freq)) return;
    dragState.freq = freq;
    updateThumbs();
    scheduleDragSolve(dragState.mode, dragState.freq);
  }
  function handleThumbPointerUp(event) {
    if (!dragState.mode || dragState.pointerId !== event.pointerId) return;
    const mode = dragState.mode;
    const freq = dragState.freq;
    dragState.mode = null;
    dragState.freq = null;
    dragState.pointerId = null;
    pendingDragMode = null;
    pendingDragFreq = null;
    if (pendingDragSolve !== null) {
      cancelAnimationFrame(pendingDragSolve);
      pendingDragSolve = null;
    }
    updateThumbs();
    if (Number.isFinite(freq)) {
      const locked = dragLockedTargets || { air: null, top: null, back: null };
      const targets = { ...locked, [mode]: freq };
      solveTargets(targets, { useWhatIf: dragUseWhatIf });
    }
    dragLockedTargets = null;
    dragUseWhatIf = false;
  }
  function bindPlotInteractions(plotEl) {
    if (plotListenersBound || typeof plotEl.on !== "function") return;
    plotListenersBound = true;
    plotEl.on("plotly_relayout", () => updateThumbs());
    plotEl.on("plotly_restyle", () => syncDofTraceVisibilityStateFromPlot(plotEl, traceVisibilityState));
    plotEl.on("plotly_legendclick", () => {
      requestAnimationFrame(() => syncDofTraceVisibilityStateFromPlot(plotEl, traceVisibilityState));
    });
    bindPlotResizeSync(plotEl);
    window.addEventListener("pointermove", handleThumbPointerMove);
    window.addEventListener("pointerup", handleThumbPointerUp);
    window.addEventListener("pointercancel", handleThumbPointerUp);
  }
  function readCurrentDofSaveSnapshot() {
    return {
      params: { ...currentParams },
      modelOrder: currentOrder,
      taskMode: currentTaskMode,
      overlayEnabled: isWhatIfEnabled(),
      fitInputs: readCurrentDofFitInputs(),
      solveOptions: readCurrentDofSolveOptions()
    };
  }
  function dofPerTabSessionRead() {
    return window.PerTabToolSession?.perTabToolSessionCreate ? window.PerTabToolSession.perTabToolSessionCreate({ toolId: "dof_model", version: 1 }) : null;
  }
  function dofPerTabSessionPersist() {
    dofPerTabSession?.write(readCurrentDofSaveSnapshot());
  }
  function dofPerTabSessionSnapshotRead() {
    return dofPerTabSession?.read() || null;
  }
  function readCurrentDofFitInputs() {
    return Object.fromEntries(
      DOF_FIT_FIELD_IDS.map((id) => [id, readDofInputValue(id)])
    );
  }
  function readCurrentDofSolveOptions() {
    return {
      fit_restrict_simple: Boolean(document.getElementById("fit_restrict_simple")?.checked)
    };
  }
  function readDofInputValue(id) {
    return String(document.getElementById(id)?.value || "");
  }
  function writeDofInputValue(id, value) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = String(value || "");
  }
  function applyLoadedDofSnapshot(snapshot) {
    const plan = window.DofSaveSnapshot.buildDofSnapshotApplyPlan(snapshot, {
      params: DEFAULT_PARAMS,
      modelOrder: 4
    });
    currentParams = { ...plan.params };
    DOF_FIT_FIELD_IDS.forEach((id) => writeDofInputValue(id, plan.fitInputs?.[id]));
    const solveToggle = document.getElementById("fit_restrict_simple");
    if (solveToggle) solveToggle.checked = Boolean(plan.solveOptions?.fit_restrict_simple);
    const overlayToggle = document.getElementById("toggle_overlay");
    if (overlayToggle) {
      overlayToggle.checked = Boolean(plan.overlayEnabled);
      overlayToggle.dispatchEvent(new Event("change"));
    }
    syncCardInputs();
    setTaskMode(plan.taskMode);
    setOrder(plan.modelOrder);
    fitStatusSet("");
    whatIfSummarySet(null);
    scheduleRender();
  }
  async function loadResults() {
    const loadFileInput = document.getElementById("load_model_file");
    const file = loadFileInput?.files?.[0];
    if (!file) return;
    try {
      const snapshot = await window.DofSaveSurface.readDofSavePackageFile(file);
      applyLoadedDofSnapshot(snapshot);
      fitStatusSet("Loaded JSON package.");
    } catch (_error) {
      fitStatusSet("Unable to load JSON package.");
    } finally {
      if (loadFileInput) loadFileInput.value = "";
    }
  }
  async function saveResults() {
    await readDofSaveRunner().runDofSaveAction({
      readSnapshot: readCurrentDofSaveSnapshot,
      setStatus: fitStatusSet
    });
  }
  function readDofSaveRunner() {
    if (window.DofSaveTarget?.dofSaveRunnerCreate) {
      return window.DofSaveTarget.dofSaveRunnerCreate();
    }
    return {
      readDofSaveSurface() {
        return Promise.resolve({
          mode: "offline",
          label: "Download JSON",
          hint: ""
        });
      },
      runDofSaveAction(request) {
        const savePackage = window.DofSaveSurface.buildDofSavePackage(
          request.readSnapshot()
        );
        window.DofSaveSurface.downloadDofSavePackage(window, savePackage);
        request.setStatus("JSON package downloaded.");
        return Promise.resolve(true);
      }
    };
  }
  function readDofNotebookRestoreApi() {
    return window.DofNotebookRestore?.restoreDofNotebookEventIntoUi ? window.DofNotebookRestore : null;
  }
  async function applyDofSaveSurface() {
    const saveButton = document.getElementById("save_model");
    const saveSurface = await readDofSaveRunner().readDofSaveSurface();
    if (!saveButton) return;
    saveButton.textContent = saveSurface.label || "Download JSON";
    saveButton.title = saveSurface.hint || "";
  }
  async function initializeDofSaveSurface() {
    if (await restoreNotebookEventIntoUi()) return;
    await applyDofSaveSurface();
  }
  async function restoreNotebookEventIntoUi() {
    const restoreApi = readDofNotebookRestoreApi();
    if (!restoreApi) return false;
    const restored = await restoreApi.restoreDofNotebookEventIntoUi({
      runtime: window,
      applySnapshot(snapshot) {
        applyLoadedDofSnapshot(snapshot);
      }
    });
    if (restored) {
      fitStatusSet("Notebook event restored.");
    }
    return restored;
  }
  function bindPlotResizeSync(plotEl) {
    const sync = () => syncPlotWidthToContainer(plotEl);
    window.addEventListener("resize", sync);
    const plotShell = plotEl.closest(".plot-shell");
    if (typeof ResizeObserver !== "function" || plotResizeObserver) return;
    plotResizeObserver = new ResizeObserver(() => sync());
    plotResizeObserver.observe(plotShell || plotEl);
  }
  function syncPlotWidthToContainer(plotEl) {
    Promise.resolve(applyDofPlotResize(getPlotly(), plotEl)).finally(() => updateThumbs());
  }
  function renderPlot() {
    const plotEl = document.getElementById("plot_dof");
    if (!plotEl) return;
    const solverParams = adaptParamsToSolver(currentParams);
    const response = computeResponseSafe(solverParams);
    lastResponse = response;
    const whatIfParams = getWhatIfParams();
    const whatIfResponse = whatIfParams ? computeResponseSafe(adaptParamsToSolver(whatIfParams)) : null;
    lastWhatIfResponse = whatIfResponse;
    updateModeCards(response, whatIfResponse);
    if (!response || !Array.isArray(response.total)) {
      plotEl.innerHTML = `<div class="muted small">Model response unavailable.</div>`;
      updateThumbs(null);
      return;
    }
    const colors = plotThemeColors();
    const traces = [];
    const totalTrace = buildDofTrace(response.total, "Current", colors.current, { width: 3 });
    applyDofTraceVisibility(totalTrace, "Current", traceVisibilityState);
    if (totalTrace) traces.push(totalTrace);
    if (whatIfResponse?.total?.length) {
      const targetTraces = buildTargetOverlayTraces(whatIfResponse.total, colors.whatIf);
      targetTraces.forEach((trace) => {
        applyDofTraceVisibility(trace, "Target", traceVisibilityState);
        traces.push(trace);
      });
    }
    const topTrace = buildDofTrace(response.top, "Top", colors.top, { width: 1.5, dash: "dot" });
    const airTrace = buildDofTrace(response.air, "Air", colors.air, { width: 1.5, dash: "dot" });
    const backTrace = buildDofTrace(response.back, "Back", colors.back, { width: 1.5, dash: "dot" });
    const sidesTrace = buildDofTrace(response.sides, "Sides", colors.sides, { width: 1, dash: "dot" });
    applyDofTraceVisibility(topTrace, "Top", traceVisibilityState);
    applyDofTraceVisibility(airTrace, "Air", traceVisibilityState);
    applyDofTraceVisibility(backTrace, "Back", traceVisibilityState);
    applyDofTraceVisibility(sidesTrace, "Sides", traceVisibilityState);
    [topTrace, airTrace, backTrace, sidesTrace].forEach((t) => {
      if (t) traces.push(t);
    });
    const xRange = [50, 300];
    const layout = {
      margin: { l: 40, r: 20, t: 20, b: 50 },
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      font: { color: colors.ink },
      xaxis: {
        title: "Frequency (Hz)",
        range: xRange,
        gridcolor: colors.grid,
        zeroline: false
      },
      yaxis: {
        title: "Level (dB)",
        gridcolor: colors.grid,
        autorange: false,
        zeroline: false
      },
      showlegend: true
    };
    const yRange = computeDofYRange(response.total, 6, xRange[0], xRange[1]);
    if (yRange) layout.yaxis = { ...layout.yaxis, range: yRange };
    const plotly = getPlotly();
    if (!plotly) return;
    plotly.react(plotEl, traces, layout, { displayModeBar: true, displaylogo: false }).then(() => {
      syncDofTraceVisibilityStateFromPlot(plotEl, traceVisibilityState);
      bindPlotInteractions(plotEl);
      updateThumbs(response);
    }).catch((err) => {
      console.error("Plotly render failed", err);
    });
  }
  function bindTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const order = Number(btn.dataset.order || "4");
        setOrder(order);
      });
    });
  }
  function bindTaskModeTabs() {
    document.querySelectorAll(".task-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = String(btn.dataset.taskMode || "edit");
        setTaskMode(mode);
      });
    });
  }
  function dofPipelineRunnerExpose() {
    const sharedRunner = window.dof_pipeline_runner?.dofPipelineRunnerRun;
    window.DofPipelineRunner = {
      run: (input, config, emit) => {
        if (typeof sharedRunner === "function") {
          return sharedRunner(input || {}, config || {}, emit, {
            refresh: async () => {
              renderPlot();
            }
          });
        }
        return dofPipelineFallbackRun(input || {}, config || {}, emit);
      }
    };
  }
  function dofPipelineFallbackRun(input, config, emit) {
    const runId = `dof_fallback_${Date.now()}`;
    dofPipelineFallbackStartedEmit(emit, runId, input, config);
    dofPipelineFallbackRefreshStartedEmit(emit, runId);
    renderPlot();
    dofPipelineFallbackRefreshCompletedEmit(emit, runId);
    dofPipelineFallbackCompletedEmit(emit, runId, input?.trigger || null);
    return Promise.resolve();
  }
  function dofPipelineFallbackStartedEmit(emit, runId, input, config) {
    emit?.({
      eventType: "pipeline.started",
      stageId: void 0,
      payload: { input, config },
      runId
    });
  }
  function dofPipelineFallbackRefreshStartedEmit(emit, runId) {
    emit?.({
      eventType: "stage.started",
      stageId: "refresh",
      payload: { stage: "refresh" },
      runId
    });
  }
  function dofPipelineFallbackRefreshCompletedEmit(emit, runId) {
    emit?.({
      eventType: "stage.completed",
      stageId: "refresh",
      payload: { stage: "refresh" },
      runId
    });
  }
  function dofPipelineFallbackCompletedEmit(emit, runId, trigger) {
    emit?.({
      eventType: "pipeline.completed",
      stageId: void 0,
      payload: { summary: { trigger } },
      runId
    });
  }
  function init() {
    const saveButton = document.getElementById("save_model");
    const loadButton = document.getElementById("load_model");
    const loadFileInput = document.getElementById("load_model_file");
    const perTabSnapshot = dofPerTabSessionSnapshotRead();
    const fromUrl = dofParamsFromLocation();
    bindTabs();
    bindTaskModeTabs();
    bindFitMyGuitarActions();
    fitAltitudeControlBind();
    bindSolveRecipeActions();
    if (saveButton) saveButton.addEventListener("click", () => void saveResults());
    if (loadButton && loadFileInput) loadButton.addEventListener("click", () => loadFileInput.click());
    if (loadFileInput) loadFileInput.addEventListener("change", loadResults);
    setTaskMode(currentTaskMode);
    setOrder(currentOrder);
    if (perTabSnapshot) applyLoadedDofSnapshot(perTabSnapshot);
    if (fromUrl) {
      currentParams = { ...currentParams, ...fromUrl };
      if (Number.isFinite(fromUrl.model_order)) currentOrder = fromUrl.model_order;
      syncCardInputs();
      setOrder(currentOrder);
    }
    void initializeDofSaveSurface();
    dofPipelineRunnerExpose();
    scheduleRender();
    const overlayToggle = document.getElementById("toggle_overlay");
    if (overlayToggle) {
      overlayToggle.addEventListener("change", () => {
        document.body.classList.toggle("whatif-mode", overlayToggle.checked);
        if (!overlayToggle.checked) resetWhatIf();
        refreshOverlayVisuals();
        scheduleRender();
      });
      document.body.classList.toggle("whatif-mode", overlayToggle.checked);
      refreshOverlayVisuals();
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
