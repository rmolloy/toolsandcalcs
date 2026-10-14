type ModeKey = string;

export function emitModeOverrideRequested(modeKey: ModeKey, requestedFreqHz: number) {
  const bus = (window as any).ResonatePipelineBus;
  if (typeof bus?.emit !== "function") return;
  void bus.emit("mode.override.requested", {
    modeKey,
    requestedFreqHz,
    source: "label-drag",
  });
}

export function emitModeOverrideResetRequested(modeKey: ModeKey) {
  const bus = (window as any).ResonatePipelineBus;
  if (typeof bus?.emit !== "function") return;
  void bus.emit("mode.override.reset.requested", {
    modeKey,
    source: "card-reset",
  });
}
