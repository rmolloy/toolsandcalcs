import { RESONANCE_TONELAB_DEFAULTS } from "./resonate_debug_flags.js";

type SettingsDeps = {
  state: Record<string, any>;
  runResonatePipeline: (trigger: string) => Promise<void>;
  setStatus: (text: string) => void;
};

type DebugPatch = Record<string, string | number | boolean | null>;

const SETTINGS_IDS = {
  dialog: "settings_dialog",
  trigger: "btn_settings",
  audioInput: "settings_audio_input",
  audioRefresh: "settings_audio_refresh",
  profile: "settings_fft_profile",
  scope: "settings_fft_scope",
  window: "settings_fft_window",
  resolution: "settings_fft_resolution",
  smoothing: "settings_fft_smoothing",
  averaging: "settings_fft_averaging",
  displayRange: "settings_fft_display_range",
  dbScale: "settings_fft_db_scale",
  yAxis: "settings_fft_y_axis",
  xScale: "settings_fft_x_scale",
  xMin: "settings_fft_x_min",
  xMax: "settings_fft_x_max",
  yMin: "settings_fft_y_min",
  yMax: "settings_fft_y_max",
  smoothingBins: "settings_fft_smoothing_bins",
  smoothingHz: "settings_fft_smoothing_hz",
  lineWidth: "settings_fft_line_width",
  tapSliceWindowMs: "settings_fft_tap_slice_window_ms",
  energyBandWidthHz: "settings_fft_energy_band_width_hz",
  tapAveraging: "settings_fft_tap_averaging",
  peakHold: "settings_fft_peak_hold",
  peakRefine: "settings_fft_peak_refine",
  polymaxValidation: "settings_fft_polymax_validation",
  reset: "settings_fft_reset",
  done: "settings_done",
};

export function settingsDebugPatchBuild(name: string, value: string): DebugPatch {
  if (name === SETTINGS_IDS.profile) return settingsProfilePatchBuild(value);
  if (name === SETTINGS_IDS.scope) return { fftInputScope: value || null };
  if (name === SETTINGS_IDS.window) return { fftWindow: value || null };
  if (name === SETTINGS_IDS.resolution) return { fftResolution: value || null };
  if (name === SETTINGS_IDS.smoothing) return settingsSmoothingPatchBuild(value);
  if (name === SETTINGS_IDS.averaging) return { spectrumAveragingMode: value || "off" };
  if (name === SETTINGS_IDS.displayRange) return { spectrumDisplayRange: value || null };
  if (name === SETTINGS_IDS.dbScale) return { spectrumDbScale: value || null };
  if (name === SETTINGS_IDS.yAxis) return { spectrumYAxisMode: value || null };
  if (name === SETTINGS_IDS.xScale) return { spectrumXAxisScale: value || null };
  if (name === SETTINGS_IDS.xMin) return settingsPositiveNumberPatchBuild("spectrumXAxisMin", value);
  if (name === SETTINGS_IDS.xMax) return settingsPositiveNumberPatchBuild("spectrumXAxisMax", value);
  if (name === SETTINGS_IDS.yMin) return settingsFiniteNumberPatchBuild("spectrumYAxisMin", value);
  if (name === SETTINGS_IDS.yMax) return settingsFiniteNumberPatchBuild("spectrumYAxisMax", value);
  if (name === SETTINGS_IDS.smoothingBins) return settingsNumberPatchBuild("spectrumSmoothingBins", value);
  if (name === SETTINGS_IDS.smoothingHz) return settingsNumberPatchBuild("spectrumSmoothingHz", value);
  if (name === SETTINGS_IDS.lineWidth) return settingsNumberPatchBuild("spectrumLineWidth", value);
  if (name === SETTINGS_IDS.tapSliceWindowMs) return settingsNumberPatchBuild("tapSliceWindowMs", value);
  if (name === SETTINGS_IDS.energyBandWidthHz) return settingsNumberPatchBuild("energyBandWidthHz", value);
  return {};
}

export function settingsBooleanPatchBuild(name: string, checked: boolean): DebugPatch {
  if (name === SETTINGS_IDS.tapAveraging) return { useTapAveraging: checked };
  if (name === SETTINGS_IDS.peakHold) return { usePeakHold: checked };
  if (name === SETTINGS_IDS.peakRefine) return { useParabolicPeakRefine: checked };
  if (name === SETTINGS_IDS.polymaxValidation) return { usePolymaxValidation: checked };
  return {};
}

export function settingsNumberPatchBuild(name: string, value: string): DebugPatch {
  return settingsPositiveNumberPatchBuild(name, value);
}

export function settingsPositiveNumberPatchBuild(name: string, value: string): DebugPatch {
  return { [name]: settingsPositiveNumberValueParse(value) };
}

export function settingsFiniteNumberPatchBuild(name: string, value: string): DebugPatch {
  return { [name]: settingsFiniteNumberValueParse(value) };
}

export function settingsSmoothingPatchBuild(value: string): DebugPatch {
  if (value === "off") {
    return {
      useSpectrumSmoothing: false,
      spectrumSmoothingMode: null,
    };
  }

  return {
    useSpectrumSmoothing: true,
    spectrumSmoothingMode: value || null,
  };
}

export function settingsProfilePatchBuild(value: string): DebugPatch {
  if (value === "custom") return {};
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
    useSpectrumSmoothing: true,
    usePeakHold: RESONANCE_TONELAB_DEFAULTS.usePeakHold,
  };
}

export function settingsModalBind(deps: SettingsDeps) {
  const dialog = settingsDialogElementGet();
  const trigger = buttonElementGet(SETTINGS_IDS.trigger);
  if (!dialog || !trigger) return;

  trigger.addEventListener("click", () => {
    settingsControlsSyncFromRuntime();
    void settingsAudioInputsRefresh();
    settingsDialogOpen(dialog);
  });

  buttonElementGet(SETTINGS_IDS.audioRefresh)?.addEventListener("click", () => {
    void settingsAudioInputsRefresh();
  });

  buttonElementGet(SETTINGS_IDS.reset)?.addEventListener("click", () => {
    settingsDebugApiGet()?.reset?.();
    settingsControlsSyncFromRuntime();
    settingsPipelineRefresh(deps);
  });

  buttonElementGet(SETTINGS_IDS.done)?.addEventListener("click", () => {
    settingsPipelineRefresh(deps);
  });

  settingsFftSelectsGet().forEach((select) => {
    select.addEventListener("change", () => {
      settingsDebugApiGet()?.set?.(settingsDebugPatchBuild(select.id, select.value));
      settingsControlsSyncFromRuntime();
      settingsPipelineRefresh(deps);
    });
  });

  settingsFftNumberInputsGet().forEach((input) => {
    input.addEventListener("change", () => {
      settingsDebugApiGet()?.set?.(settingsDebugPatchBuild(input.id, input.value));
      settingsControlsSyncFromRuntime();
      settingsPipelineRefresh(deps);
    });
  });

  settingsFftToggleInputsGet().forEach((input) => {
    input.addEventListener("change", () => {
      settingsDebugApiGet()?.set?.(settingsBooleanPatchBuild(input.id, input.checked));
      settingsControlsSyncFromRuntime();
      settingsPipelineRefresh(deps);
    });
  });

  selectElementGet(SETTINGS_IDS.audioInput)?.addEventListener("change", (event) => {
    const select = event.currentTarget as HTMLSelectElement;
    settingsAudioInputDeviceIdWrite(select.value);
  });
}

function settingsDialogOpen(dialog: HTMLDialogElement) {
  if (dialog.open) return;
  dialog.showModal();
}

function settingsPipelineRefresh(deps: SettingsDeps) {
  if (!deps.state.currentWave) {
    deps.setStatus("FFT settings updated.");
    return;
  }

  deps.runResonatePipeline("settings")
    .then(() => deps.setStatus("FFT settings updated."))
    .catch((error) => {
      console.warn("[Resonance Reader] settings refresh failed", error);
      deps.setStatus("FFT settings updated. Refresh failed.");
    });
}

function settingsControlsSyncFromRuntime() {
  const flags = settingsDebugApiGet()?.show?.() || {};
  selectValueWrite(SETTINGS_IDS.profile, settingsProfileValueRead(flags));
  selectValueWrite(SETTINGS_IDS.scope, flags.fftInputScope || "");
  selectValueWrite(SETTINGS_IDS.window, flags.fftWindow || "");
  selectValueWrite(SETTINGS_IDS.resolution, flags.fftResolution || "");
  selectValueWrite(SETTINGS_IDS.smoothing, settingsSmoothingValueRead(flags));
  selectValueWrite(SETTINGS_IDS.averaging, flags.spectrumAveragingMode || "off");
  selectValueWrite(SETTINGS_IDS.displayRange, flags.spectrumDisplayRange || "");
  selectValueWrite(SETTINGS_IDS.dbScale, flags.spectrumDbScale || "");
  selectValueWrite(SETTINGS_IDS.yAxis, flags.spectrumYAxisMode || "");
  selectValueWrite(SETTINGS_IDS.xScale, flags.spectrumXAxisScale || "");
  numberValueWrite(SETTINGS_IDS.xMin, flags.spectrumXAxisMin);
  numberValueWrite(SETTINGS_IDS.xMax, flags.spectrumXAxisMax);
  numberValueWrite(SETTINGS_IDS.yMin, flags.spectrumYAxisMin);
  numberValueWrite(SETTINGS_IDS.yMax, flags.spectrumYAxisMax);
  numberValueWrite(SETTINGS_IDS.smoothingBins, flags.spectrumSmoothingBins);
  numberValueWrite(SETTINGS_IDS.smoothingHz, flags.spectrumSmoothingHz);
  numberValueWrite(SETTINGS_IDS.lineWidth, flags.spectrumLineWidth);
  numberValueWrite(SETTINGS_IDS.tapSliceWindowMs, flags.tapSliceWindowMs);
  numberValueWrite(SETTINGS_IDS.energyBandWidthHz, flags.energyBandWidthHz);
  toggleCheckedWrite(SETTINGS_IDS.tapAveraging, Boolean(flags.useTapAveraging));
  toggleCheckedWrite(SETTINGS_IDS.peakHold, Boolean(flags.usePeakHold));
  toggleCheckedWrite(SETTINGS_IDS.peakRefine, flags.useParabolicPeakRefine !== false);
  toggleCheckedWrite(SETTINGS_IDS.polymaxValidation, Boolean(flags.usePolymaxValidation));
}

export function settingsProfileValueRead(flags: Record<string, any>) {
  if (settingsCustomProfileRequired(flags)) return "custom";
  return flags.fftProfile === "celestial" ? "celestial" : "tonelab";
}

function settingsCustomProfileRequired(flags: Record<string, any>) {
  return Boolean(
    flags.fftInputScope
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
    || flags.useSpectrumSmoothing === false
    || flags.useTapAveraging !== false
    || settingsBooleanDiffersFromDefault(flags.usePeakHold, RESONANCE_TONELAB_DEFAULTS.usePeakHold)
    || flags.useParabolicPeakRefine === false
    || flags.usePolymaxValidation !== false
  );
}

function settingsNumberDiffersFromDefault(value: unknown, defaultValue: number | null) {
  if (!Number.isFinite(value)) return false;
  return Number(value) !== defaultValue;
}

function settingsBooleanDiffersFromDefault(value: unknown, defaultValue: boolean) {
  if (typeof value !== "boolean") return false;
  return value !== defaultValue;
}

function settingsSmoothingValueRead(flags: Record<string, any>) {
  if (flags.useSpectrumSmoothing === false) return "off";
  return flags.spectrumSmoothingMode || "gaussian-bins";
}

async function settingsAudioInputsRefresh() {
  const select = selectElementGet(SETTINGS_IDS.audioInput);
  if (!select) return;
  settingsAudioInputOptionsRender(select, [], settingsAudioInputDeviceIdRead());
  const devices = await settingsAudioInputDevicesRead();
  settingsAudioInputOptionsRender(select, devices, settingsAudioInputDeviceIdRead());
}

async function settingsAudioInputDevicesRead(): Promise<MediaDeviceInfo[]> {
  const audio = settingsAudioApiGet();
  if (typeof audio?.listAudioInputDevices !== "function") return [];

  try {
    return await audio.listAudioInputDevices();
  } catch (error) {
    console.warn("[Resonance Reader] audio input list failed", error);
    return [];
  }
}

function settingsAudioInputOptionsRender(
  select: HTMLSelectElement,
  devices: MediaDeviceInfo[],
  selectedDeviceId: string | null,
) {
  select.innerHTML = "";
  select.appendChild(settingsOptionBuild("", "Default microphone", !selectedDeviceId));
  devices.forEach((device, index) => {
    select.appendChild(settingsOptionBuild(
      device.deviceId,
      settingsAudioDeviceLabelRead(device, index),
      device.deviceId === selectedDeviceId,
    ));
  });
}

function settingsAudioDeviceLabelRead(device: MediaDeviceInfo, index: number) {
  return device.label || `Microphone ${index + 1}`;
}

function settingsOptionBuild(value: string, label: string, selected: boolean) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = selected;
  return option;
}

function settingsAudioInputDeviceIdRead(): string | null {
  const audio = settingsAudioApiGet();
  if (typeof audio?.getAudioInputDeviceId !== "function") return null;
  return audio.getAudioInputDeviceId();
}

function settingsAudioInputDeviceIdWrite(value: string) {
  settingsAudioApiGet()?.setAudioInputDeviceId?.(value || null);
}

function settingsFftSelectsGet() {
  return [
    SETTINGS_IDS.profile,
    SETTINGS_IDS.scope,
    SETTINGS_IDS.window,
    SETTINGS_IDS.resolution,
    SETTINGS_IDS.smoothing,
    SETTINGS_IDS.averaging,
    SETTINGS_IDS.displayRange,
    SETTINGS_IDS.dbScale,
    SETTINGS_IDS.yAxis,
    SETTINGS_IDS.xScale,
  ].map(selectElementGet).filter(Boolean) as HTMLSelectElement[];
}

function settingsFftNumberInputsGet() {
  return [
    SETTINGS_IDS.xMin,
    SETTINGS_IDS.xMax,
    SETTINGS_IDS.yMin,
    SETTINGS_IDS.yMax,
    SETTINGS_IDS.smoothingBins,
    SETTINGS_IDS.smoothingHz,
    SETTINGS_IDS.lineWidth,
    SETTINGS_IDS.tapSliceWindowMs,
    SETTINGS_IDS.energyBandWidthHz,
  ].map(inputElementGet).filter(Boolean) as HTMLInputElement[];
}

function settingsFftToggleInputsGet() {
  return [
    SETTINGS_IDS.tapAveraging,
    SETTINGS_IDS.peakHold,
    SETTINGS_IDS.peakRefine,
    SETTINGS_IDS.polymaxValidation,
  ].map(inputElementGet).filter(Boolean) as HTMLInputElement[];
}

function selectValueWrite(id: string, value: string) {
  const select = selectElementGet(id);
  if (!select) return;
  select.value = value;
}

function numberValueWrite(id: string, value: number | null | undefined) {
  const input = inputElementGet(id);
  if (!input) return;
  input.value = Number.isFinite(value) ? String(value) : "";
}

function toggleCheckedWrite(id: string, checked: boolean) {
  const input = inputElementGet(id);
  if (!input) return;
  input.checked = checked;
}

function settingsPositiveNumberValueParse(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function settingsFiniteNumberValueParse(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function settingsDebugApiGet() {
  return (window as any).ResonanceDebug;
}

function settingsAudioApiGet() {
  return (window as any).FFTAudio;
}

function settingsDialogElementGet() {
  return document.getElementById(SETTINGS_IDS.dialog) as HTMLDialogElement | null;
}

function buttonElementGet(id: string) {
  return document.getElementById(id) as HTMLButtonElement | null;
}

function selectElementGet(id: string) {
  return document.getElementById(id) as HTMLSelectElement | null;
}

function inputElementGet(id: string) {
  return document.getElementById(id) as HTMLInputElement | null;
}
