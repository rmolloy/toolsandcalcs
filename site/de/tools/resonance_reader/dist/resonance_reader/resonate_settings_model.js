import { RESONANCE_TONELAB_DEFAULTS } from "./resonate_debug_flags.js?rev=90c36258c883";
import { SETTINGS_IDS } from "./resonate_settings_ids.js?rev=90c36258c883";
export function settingsDebugPatchBuild(name, value) {
    if (name === SETTINGS_IDS.profile)
        return settingsProfilePatchBuild(value);
    if (name === SETTINGS_IDS.scope)
        return { fftInputScope: value || null };
    if (name === SETTINGS_IDS.window)
        return { fftWindow: value || null };
    if (name === SETTINGS_IDS.resolution)
        return { fftResolution: value || null };
    if (name === SETTINGS_IDS.smoothing)
        return settingsSmoothingPatchBuild(value);
    if (name === SETTINGS_IDS.averaging)
        return { spectrumAveragingMode: value || "off" };
    if (name === SETTINGS_IDS.displayRange)
        return { spectrumDisplayRange: value || null };
    if (name === SETTINGS_IDS.dbScale)
        return { spectrumDbScale: value || null };
    if (name === SETTINGS_IDS.yAxis)
        return { spectrumYAxisMode: value || null };
    if (name === SETTINGS_IDS.xScale)
        return { spectrumXAxisScale: value || null };
    if (name === SETTINGS_IDS.xMin)
        return settingsPositiveNumberPatchBuild("spectrumXAxisMin", value);
    if (name === SETTINGS_IDS.xMax)
        return settingsPositiveNumberPatchBuild("spectrumXAxisMax", value);
    if (name === SETTINGS_IDS.yMin)
        return settingsFiniteNumberPatchBuild("spectrumYAxisMin", value);
    if (name === SETTINGS_IDS.yMax)
        return settingsFiniteNumberPatchBuild("spectrumYAxisMax", value);
    if (name === SETTINGS_IDS.smoothingBins)
        return settingsNumberPatchBuild("spectrumSmoothingBins", value);
    if (name === SETTINGS_IDS.smoothingHz)
        return settingsNumberPatchBuild("spectrumSmoothingHz", value);
    if (name === SETTINGS_IDS.lineWidth)
        return settingsNumberPatchBuild("spectrumLineWidth", value);
    if (name === SETTINGS_IDS.tapSliceWindowMs)
        return settingsNumberPatchBuild("tapSliceWindowMs", value);
    if (name === SETTINGS_IDS.energyBandWidthHz)
        return settingsNumberPatchBuild("energyBandWidthHz", value);
    return {};
}
export function settingsBooleanPatchBuild(name, checked) {
    if (name === SETTINGS_IDS.tapAveraging)
        return { useTapAveraging: checked };
    if (name === SETTINGS_IDS.peakHold)
        return { usePeakHold: checked };
    if (name === SETTINGS_IDS.peakRefine)
        return { useParabolicPeakRefine: checked };
    if (name === SETTINGS_IDS.polymaxValidation)
        return { usePolymaxValidation: checked };
    return {};
}
export function settingsNumberPatchBuild(name, value) {
    return settingsPositiveNumberPatchBuild(name, value);
}
export function settingsPositiveNumberPatchBuild(name, value) {
    return { [name]: settingsPositiveNumberValueParse(value) };
}
export function settingsFiniteNumberPatchBuild(name, value) {
    return { [name]: settingsFiniteNumberValueParse(value) };
}
export function settingsSmoothingPatchBuild(value) {
    if (value === "off") {
        return {
            useSpectrumSmoothing: false,
            spectrumSmoothingMode: null,
        };
    }
    return {
        useSpectrumSmoothing: value === "celestial" ? true : RESONANCE_TONELAB_DEFAULTS.useSpectrumSmoothing,
        spectrumSmoothingMode: value || null,
    };
}
export function settingsProfilePatchBuild(value) {
    if (value === "custom")
        return {};
    return {
        fftProfile: value === "celestial" ? "celestial" : "tonelab",
        fftInputScope: null,
        fftWindow: null,
        fftResolution: null,
        spectrumSmoothingMode: null,
        spectrumAveragingMode: null,
        spectrumDisplayRange: null,
        spectrumDbScale: null,
        spectrumYAxisMode: null,
        spectrumXAxisScale: null,
        spectrumXAxisMin: null,
        spectrumXAxisMax: null,
        spectrumYAxisMin: null,
        spectrumYAxisMax: null,
        useSpectrumSmoothing: value === "celestial" ? true : RESONANCE_TONELAB_DEFAULTS.useSpectrumSmoothing,
        usePeakHold: RESONANCE_TONELAB_DEFAULTS.usePeakHold,
    };
}
export function settingsProfileValueRead(flags) {
    if (settingsCustomProfileRequired(flags))
        return "custom";
    return flags.fftProfile === "celestial" ? "celestial" : "tonelab";
}
export function settingsSmoothingValueRead(flags) {
    if (flags.useSpectrumSmoothing === false)
        return "off";
    return flags.spectrumSmoothingMode || "gaussian-bins";
}
function settingsCustomProfileRequired(flags) {
    return Boolean(flags.fftInputScope
        || flags.fftWindow
        || flags.fftResolution
        || flags.spectrumSmoothingMode
        || (flags.spectrumAveragingMode && flags.spectrumAveragingMode !== "off")
        || flags.spectrumDisplayRange
        || flags.spectrumDbScale
        || flags.spectrumYAxisMode
        || flags.spectrumXAxisScale
        || settingsNumberDiffersFromDefault(flags.spectrumXAxisMin, RESONANCE_TONELAB_DEFAULTS.spectrumXAxisMin)
        || Number.isFinite(flags.spectrumXAxisMax)
        || Number.isFinite(flags.spectrumYAxisMin)
        || Number.isFinite(flags.spectrumYAxisMax)
        || flags.spectrumSmoothingHz
        || settingsNumberDiffersFromDefault(flags.spectrumSmoothingBins, RESONANCE_TONELAB_DEFAULTS.spectrumSmoothingBins)
        || settingsNumberDiffersFromDefault(flags.spectrumLineWidth, RESONANCE_TONELAB_DEFAULTS.spectrumLineWidth)
        || settingsNumberDiffersFromDefault(flags.tapSliceWindowMs, RESONANCE_TONELAB_DEFAULTS.tapSliceWindowMs)
        || flags.energyBandWidthHz
        || settingsBooleanDiffersFromDefault(flags.useSpectrumSmoothing, RESONANCE_TONELAB_DEFAULTS.useSpectrumSmoothing)
        || settingsBooleanDiffersFromDefault(flags.useTapAveraging, RESONANCE_TONELAB_DEFAULTS.useTapAveraging)
        || settingsBooleanDiffersFromDefault(flags.usePeakHold, RESONANCE_TONELAB_DEFAULTS.usePeakHold)
        || flags.useParabolicPeakRefine === false
        || flags.usePolymaxValidation !== false);
}
function settingsNumberDiffersFromDefault(value, defaultValue) {
    if (!Number.isFinite(value))
        return false;
    return Number(value) !== defaultValue;
}
function settingsBooleanDiffersFromDefault(value, defaultValue) {
    if (typeof value !== "boolean")
        return false;
    return value !== defaultValue;
}
function settingsPositiveNumberValueParse(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed)
        return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return null;
    return parsed;
}
function settingsFiniteNumberValueParse(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed)
        return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed))
        return null;
    return parsed;
}
