export function emitModeOverrideRequested(modeKey, requestedFreqHz) {
    const bus = window.ResonatePipelineBus;
    if (typeof bus?.emit !== "function")
        return;
    void bus.emit("mode.override.requested", {
        modeKey,
        requestedFreqHz,
        source: "label-drag",
    });
}
export function emitModeOverrideResetRequested(modeKey) {
    const bus = window.ResonatePipelineBus;
    if (typeof bus?.emit !== "function")
        return;
    void bus.emit("mode.override.reset.requested", {
        modeKey,
        source: "card-reset",
    });
}
