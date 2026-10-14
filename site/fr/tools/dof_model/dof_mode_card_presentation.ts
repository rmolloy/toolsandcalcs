export type DofModeKey = "air" | "top" | "back";

export type DofModePeaks = Record<DofModeKey, number | null>;

export type DofModeDragSelection = {
  mode: DofModeKey | null;
  frequency: number | null;
  useWhatIf: boolean;
};

export type DofNotePresentation = {
  name: string;
  cents: string;
  centsNumber: number | null;
};

export type DofModeCardPresentation = {
  baseFrequencyText: string;
  baseNote: DofNotePresentation;
  showWhatIf: boolean;
  whatIfFrequencyText: string;
  whatIfDeltaText: string;
  whatIfNote: DofNotePresentation;
};

export type DofModeCardElements = {
  freqValue: HTMLElement;
  noteName: HTMLElement;
  noteCents: HTMLElement;
  whatIfRow: HTMLElement;
  whatIfValue: HTMLElement;
  whatIfDelta: HTMLElement;
  whatIfNoteRow: HTMLElement;
  whatIfNoteName: HTMLElement;
  whatIfNoteCents: HTMLElement;
};

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

export function readDofNotePresentation(
  frequency: number | null | undefined,
): DofNotePresentation {
  if (!Number.isFinite(frequency) || (frequency as number) <= 0) {
    return { name: "--", cents: "--", centsNumber: null };
  }

  const midi = 69 + 12 * Math.log2((frequency as number) / 440);
  const nearest = Math.round(midi);
  const cents = Math.round((midi - nearest) * 100);
  const name = `${DOF_NOTE_NAMES[(nearest + 1200) % 12]}${Math.floor(nearest / 12) - 1}`;
  const centsText = `${cents >= 0 ? "+" : ""}${cents}c`;
  return { name, cents: centsText, centsNumber: cents };
}

export function formatDofSigned(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "--";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

export function readDofModeDisplayFrequency(
  mode: DofModeKey,
  peaks: DofModePeaks | null,
  drag: DofModeDragSelection,
) {
  if (!drag.useWhatIf && drag.mode === mode && Number.isFinite(drag.frequency)) {
    return drag.frequency as number;
  }
  const frequency = peaks?.[mode];
  return Number.isFinite(frequency) ? frequency as number : null;
}

export function buildDofModeCardPresentation(options: {
  mode: DofModeKey;
  basePeaks: DofModePeaks | null;
  whatIfPeaks: DofModePeaks | null;
  drag: DofModeDragSelection;
  showWhatIf?: boolean;
}): DofModeCardPresentation {
  const showWhatIf = options.showWhatIf ?? false;
  const baseFrequency = readDofModeDisplayFrequency(
    options.mode,
    options.basePeaks,
    options.drag,
  );
  const baseNote = readDofNotePresentation(baseFrequency);

  if (!showWhatIf) {
    return {
      baseFrequencyText: Number.isFinite(baseFrequency)
        ? (baseFrequency as number).toFixed(1)
        : "--",
      baseNote,
      showWhatIf: false,
      whatIfFrequencyText: "--",
      whatIfDeltaText: "",
      whatIfNote: readDofNotePresentation(null),
    };
  }

  const whatIfFrequency = options.whatIfPeaks?.[options.mode];
  const hasWhatIfFrequency = Number.isFinite(whatIfFrequency);
  const hasDelta = Number.isFinite(baseFrequency) && hasWhatIfFrequency;
  const delta = hasDelta
    ? (whatIfFrequency as number) - (baseFrequency as number)
    : null;

  return {
    baseFrequencyText: Number.isFinite(baseFrequency)
      ? (baseFrequency as number).toFixed(1)
      : "--",
    baseNote,
    showWhatIf: true,
    whatIfFrequencyText: hasWhatIfFrequency
      ? `${(whatIfFrequency as number).toFixed(1)} Hz`
      : "--",
    whatIfDeltaText: Number.isFinite(delta)
      ? `(${formatDofSigned(delta as number, 1)} Hz)`
      : "",
    whatIfNote: readDofNotePresentation(whatIfFrequency),
  };
}

export function applyDofModeCardPresentation(
  elements: DofModeCardElements,
  presentation: DofModeCardPresentation,
) {
  elements.freqValue.textContent = presentation.baseFrequencyText;
  elements.noteName.textContent = presentation.baseNote.name;
  elements.noteCents.textContent = presentation.baseNote.cents;
  elements.noteCents.classList.toggle(
    "positive",
    typeof presentation.baseNote.centsNumber === "number"
      && presentation.baseNote.centsNumber > 0,
  );
  elements.noteCents.classList.toggle(
    "negative",
    typeof presentation.baseNote.centsNumber === "number"
      && presentation.baseNote.centsNumber < 0,
  );

  elements.whatIfRow.style.display = presentation.showWhatIf ? "" : "none";
  elements.whatIfNoteRow.style.display = presentation.showWhatIf ? "" : "none";
  elements.whatIfValue.textContent = presentation.whatIfFrequencyText;
  elements.whatIfDelta.textContent = presentation.whatIfDeltaText;
  elements.whatIfNoteName.textContent = presentation.whatIfNote.name;
  elements.whatIfNoteCents.textContent = presentation.whatIfNote.cents;
  elements.whatIfNoteCents.classList.toggle(
    "positive",
    typeof presentation.whatIfNote.centsNumber === "number"
      && presentation.whatIfNote.centsNumber > 0,
  );
  elements.whatIfNoteCents.classList.toggle(
    "negative",
    typeof presentation.whatIfNote.centsNumber === "number"
      && presentation.whatIfNote.centsNumber < 0,
  );
}
