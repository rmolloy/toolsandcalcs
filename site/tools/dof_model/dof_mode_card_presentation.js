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
    exports.readDofNotePresentation = readDofNotePresentation;
    exports.formatDofSigned = formatDofSigned;
    exports.readDofModeDisplayFrequency = readDofModeDisplayFrequency;
    exports.buildDofModeCardPresentation = buildDofModeCardPresentation;
    exports.applyDofModeCardPresentation = applyDofModeCardPresentation;
    const DOF_NOTE_NAMES = [
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
        "B",
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
        if (!Number.isFinite(value))
            return "--";
        const sign = value >= 0 ? "+" : "";
        return `${sign}${value.toFixed(digits)}`;
    }
    function readDofModeDisplayFrequency(mode, peaks, drag) {
        if (!drag.useWhatIf && drag.mode === mode && Number.isFinite(drag.frequency)) {
            return drag.frequency;
        }
        const frequency = peaks === null || peaks === void 0 ? void 0 : peaks[mode];
        return Number.isFinite(frequency) ? frequency : null;
    }
    function buildDofModeCardPresentation(options) {
        var _a, _b;
        const showWhatIf = (_a = options.showWhatIf) !== null && _a !== void 0 ? _a : false;
        const baseFrequency = readDofModeDisplayFrequency(options.mode, options.basePeaks, options.drag);
        const baseNote = readDofNotePresentation(baseFrequency);
        if (!showWhatIf) {
            return {
                baseFrequencyText: Number.isFinite(baseFrequency)
                    ? baseFrequency.toFixed(1)
                    : "--",
                baseNote,
                showWhatIf: false,
                whatIfFrequencyText: "--",
                whatIfDeltaText: "",
                whatIfNote: readDofNotePresentation(null),
            };
        }
        const whatIfFrequency = (_b = options.whatIfPeaks) === null || _b === void 0 ? void 0 : _b[options.mode];
        const hasWhatIfFrequency = Number.isFinite(whatIfFrequency);
        const hasDelta = Number.isFinite(baseFrequency) && hasWhatIfFrequency;
        const delta = hasDelta
            ? whatIfFrequency - baseFrequency
            : null;
        return {
            baseFrequencyText: Number.isFinite(baseFrequency)
                ? baseFrequency.toFixed(1)
                : "--",
            baseNote,
            showWhatIf: true,
            whatIfFrequencyText: hasWhatIfFrequency
                ? `${whatIfFrequency.toFixed(1)} Hz`
                : "--",
            whatIfDeltaText: Number.isFinite(delta)
                ? `(${formatDofSigned(delta, 1)} Hz)`
                : "",
            whatIfNote: readDofNotePresentation(whatIfFrequency),
        };
    }
    function applyDofModeCardPresentation(elements, presentation) {
        elements.freqValue.textContent = presentation.baseFrequencyText;
        elements.noteName.textContent = presentation.baseNote.name;
        elements.noteCents.textContent = presentation.baseNote.cents;
        elements.noteCents.classList.toggle("positive", typeof presentation.baseNote.centsNumber === "number"
            && presentation.baseNote.centsNumber > 0);
        elements.noteCents.classList.toggle("negative", typeof presentation.baseNote.centsNumber === "number"
            && presentation.baseNote.centsNumber < 0);
        elements.whatIfRow.style.display = presentation.showWhatIf ? "" : "none";
        elements.whatIfNoteRow.style.display = presentation.showWhatIf ? "" : "none";
        elements.whatIfValue.textContent = presentation.whatIfFrequencyText;
        elements.whatIfDelta.textContent = presentation.whatIfDeltaText;
        elements.whatIfNoteName.textContent = presentation.whatIfNote.name;
        elements.whatIfNoteCents.textContent = presentation.whatIfNote.cents;
        elements.whatIfNoteCents.classList.toggle("positive", typeof presentation.whatIfNote.centsNumber === "number"
            && presentation.whatIfNote.centsNumber > 0);
        elements.whatIfNoteCents.classList.toggle("negative", typeof presentation.whatIfNote.centsNumber === "number"
            && presentation.whatIfNote.centsNumber < 0);
    }
});
