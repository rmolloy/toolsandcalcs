"use strict";
/*
© 2026 Rick Molloy. All rights reserved.
*/
// The String Tension Matcher's math: a string's tension from its mass per length, scale length and pitch
// (T = 4·μ·L²·f²), and, for a player who likes how a set feels, the gauge in a maker's line that comes
// closest to each string's tension at a new tuning or scale length. Strings are listed first string first.
// The Guitar Lab connector panel loads this one source; a page and the offline package can load it too.
(function stringTensionMatcherEnginePublish() {
    const METERS_PER_INCH = 0.0254;
    const KILOGRAMS_PER_POUND = 0.45359237;
    const NEWTONS_PER_POUND_FORCE = 4.4482216152605;
    const NEWTONS_PER_KILOGRAM_FORCE = 9.80665;
    const A4_MIDI_NOTE = 69;
    const A4_FREQUENCY_HZ = 440;
    // Two gauges closer than this are the same gauge, as the tension catalog's own lookup treats them.
    const GAUGE_TOLERANCE_IN = 0.00002;
    // The Guitar Setup Calculator's estimate for a steel string of unknown make.
    const ESTIMATE_DENSITY_KG_PER_CUBIC_METER = 7850;
    const ESTIMATE_WOUND_FILL_FACTOR = 0.72;
    const SEMITONE_BY_LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    // Six-string tunings, first string first.
    const TUNINGS = Object.freeze({
        standard: ["E4", "B3", "G3", "D3", "A2", "E2"],
        eb_standard: ["D#4", "A#3", "F#3", "C#3", "G#2", "D#2"],
        d_standard: ["D4", "A3", "F3", "C3", "G2", "D2"],
        c_standard: ["C4", "G3", "D#3", "A#2", "F2", "C2"],
        drop_d: ["E4", "B3", "G3", "D3", "A2", "D2"],
        drop_c_sharp: ["D#4", "A#3", "F#3", "C#3", "G#2", "C#2"],
        drop_c: ["D4", "A3", "F3", "C3", "G2", "C2"],
        drop_b: ["C#4", "G#3", "E3", "B2", "F#2", "B1"],
        dadgad: ["D4", "A3", "G3", "D3", "A2", "D2"],
        open_g: ["D4", "B3", "G3", "D3", "G2", "D2"],
        open_d: ["D4", "A3", "F#3", "D3", "A2", "D2"],
        open_e: ["E4", "B3", "G#3", "E3", "B2", "E2"],
    });
    // "E2", "F#3", "Bb1": a letter, an optional sharp or flat, and the octave, with C4 as middle C.
    function midiNoteFromName(name) {
        const match = /^([A-Ga-g])([#♯b♭]?)(-?\d)$/.exec(String(name).trim());
        if (!match)
            throw new RangeError(`"${name}" is not a note such as E2, F#3 or Bb1.`);
        const accidental = match[2] === "" ? 0 : (match[2] === "#" || match[2] === "♯" ? 1 : -1);
        return (Number(match[3]) + 1) * 12 + SEMITONE_BY_LETTER[match[1].toUpperCase()] + accidental;
    }
    function noteNameFromMidi(midiNote) {
        return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
    }
    function frequencyHzFromMidi(midiNote) {
        return A4_FREQUENCY_HZ * Math.pow(2, (midiNote - A4_MIDI_NOTE) / 12);
    }
    function unitMassKgPerMeterFromLbPerIn(unitWeightLbPerIn) {
        return unitWeightLbPerIn * KILOGRAMS_PER_POUND / METERS_PER_INCH;
    }
    function unitMassEstimateKgPerMeter(gaugeIn, construction) {
        const radiusM = gaugeIn * METERS_PER_INCH / 2;
        return ESTIMATE_DENSITY_KG_PER_CUBIC_METER * Math.PI * radiusM * radiusM * (construction === "wound" ? ESTIMATE_WOUND_FILL_FACTOR : 1);
    }
    function stringTensionN(unitMassKgPerMeter, scaleLengthM, frequencyHz) {
        return 4 * unitMassKgPerMeter * scaleLengthM * scaleLengthM * frequencyHz * frequencyHz;
    }
    function tuningNotes(tuning) {
        if (!TUNINGS[tuning])
            throw new RangeError(`"${tuning}" is not a tuning this tool knows.`);
        return [...TUNINGS[tuning]];
    }
    function familyGaugeFind(family, gaugeIn, construction) {
        var _a;
        return (_a = family.gauges.find((gauge) => gauge.construction === construction && Math.abs(gauge.gaugeIn - gaugeIn) <= GAUGE_TOLERANCE_IN)) !== null && _a !== void 0 ? _a : null;
    }
    // The gauge of this construction whose tension at the pitch and scale is closest; the lighter one on a tie.
    function closestGaugeForTension(family, construction, scaleLengthM, frequencyHz, tensionN) {
        const candidates = family.gauges.filter((gauge) => gauge.construction === construction).sort((a, b) => a.gaugeIn - b.gaugeIn);
        if (candidates.length === 0)
            throw new RangeError(`${family.label} has no ${construction} strings.`);
        const tensions = candidates.map((gauge) => stringTensionN(unitMassKgPerMeterFromLbPerIn(gauge.unitWeightLbPerIn), scaleLengthM, frequencyHz));
        let best = 0;
        tensions.forEach((candidate, index) => {
            if (Math.abs(candidate - tensionN) < Math.abs(tensions[best] - tensionN))
                best = index;
        });
        return { gauge: candidates[best], tensionN: tensions[best], atRangeEnd: best === 0 || best === candidates.length - 1 };
    }
    function currentStringMass(string, family, stringNumber) {
        if (string.unitWeightLbPerIn !== undefined) {
            return { unitMassKgPerMeter: unitMassKgPerMeterFromLbPerIn(string.unitWeightLbPerIn), massSource: "set" };
        }
        if (family === null) {
            return { unitMassKgPerMeter: unitMassEstimateKgPerMeter(string.gaugeIn, string.construction), massSource: "estimate" };
        }
        const gauge = familyGaugeFind(family, string.gaugeIn, string.construction);
        if (!gauge)
            throw new RangeError(`String ${stringNumber}: ${family.label} has no ${string.construction} ${gaugeLabel(string.gaugeIn)}.`);
        return { unitMassKgPerMeter: unitMassKgPerMeterFromLbPerIn(gauge.unitWeightLbPerIn), massSource: "family" };
    }
    function stringSetMatch(request) {
        const rows = request.strings.map((string, index) => {
            const mass = currentStringMass(string, request.currentFamily, index + 1);
            const targetFrequencyHz = frequencyHzFromMidi(midiNoteFromName(string.targetNote));
            const currentTensionN = stringTensionN(mass.unitMassKgPerMeter, request.currentScaleLengthM, frequencyHzFromMidi(midiNoteFromName(string.note)));
            const match = closestGaugeForTension(request.targetFamily, string.construction, request.targetScaleLengthM, targetFrequencyHz, currentTensionN);
            return {
                stringNumber: index + 1,
                currentNote: noteNameFromMidi(midiNoteFromName(string.note)),
                currentGaugeIn: string.gaugeIn,
                currentConstruction: string.construction,
                currentTensionN,
                massSource: mass.massSource,
                targetNote: noteNameFromMidi(midiNoteFromName(string.targetNote)),
                keptTensionN: stringTensionN(mass.unitMassKgPerMeter, request.targetScaleLengthM, targetFrequencyHz),
                matchedGaugeIn: match.gauge.gaugeIn,
                matchedConstruction: match.gauge.construction,
                matchedTensionN: match.tensionN,
                differenceN: match.tensionN - currentTensionN,
                differenceFraction: (match.tensionN - currentTensionN) / currentTensionN,
                gaugeChanged: Math.abs(match.gauge.gaugeIn - string.gaugeIn) > GAUGE_TOLERANCE_IN,
                atRangeEnd: match.atRangeEnd,
            };
        });
        const total = (pick) => rows.reduce((sum, row) => sum + pick(row), 0);
        return {
            rows,
            currentTotalN: total((row) => row.currentTensionN),
            keptTotalN: total((row) => row.keptTensionN),
            matchedTotalN: total((row) => row.matchedTensionN),
        };
    }
    // A gauge as it is printed on a pack: .010, .0095, .046.
    function gaugeLabel(gaugeIn) {
        const thousandths = Number((gaugeIn * 1000).toFixed(1));
        const digits = Number.isInteger(thousandths) ? String(thousandths).padStart(3, "0") : String(Math.round(thousandths * 10)).padStart(4, "0");
        return `.${digits}`;
    }
    function poundsForceFromNewtons(newtons) {
        return newtons / NEWTONS_PER_POUND_FORCE;
    }
    function kilogramsForceFromNewtons(newtons) {
        return newtons / NEWTONS_PER_KILOGRAM_FORCE;
    }
    const StringTensionMatcherEngine = {
        METERS_PER_INCH,
        TUNINGS,
        midiNoteFromName,
        noteNameFromMidi,
        frequencyHzFromMidi,
        unitMassKgPerMeterFromLbPerIn,
        unitMassEstimateKgPerMeter,
        stringTensionN,
        tuningNotes,
        familyGaugeFind,
        closestGaugeForTension,
        stringSetMatch,
        gaugeLabel,
        poundsForceFromNewtons,
        kilogramsForceFromNewtons,
    };
    (typeof window !== "undefined" ? window : globalThis).StringTensionMatcherEngine = StringTensionMatcherEngine;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = StringTensionMatcherEngine;
    }
})();
