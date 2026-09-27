export type DecayWindow = {
  startSec: number;
  endSec: number;
  tau: number | null;
  dropDb: number;
  cycles: number;
  endReason: "noise_floor" | "relative_floor" | "recording_end";
  rejection: "insufficient_decay" | "non_decaying" | null;
};

export function selectDecayWindow(args: {
  envelope: ArrayLike<number>;
  sampleRate: number;
  frequencyHz: number;
  noiseAmplitude: number | null;
  settlingSec: number;
  onsetSec: number;
}): DecayWindow {
  const { envelope, sampleRate, frequencyHz } = args;
  if (!(sampleRate > 0 && frequencyHz > 0) || !envelope.length) return emptyWindow();
  const frames = envelopeFrames(envelope, sampleRate);
  if (!frames.length || !frames.every(Number.isFinite)) return emptyWindow();
  const peakIndex = frames.indexOf(Math.max(...frames));
  const earliest = Math.max(peakIndex * 0.01 + 2 / frequencyHz, args.onsetSec + args.settlingSec);
  const start = firstBelow(frames, Math.ceil(earliest / 0.01), frames[peakIndex] * 10 ** (-5 / 20), 1);
  const measuredNoise = Number.isFinite(args.noiseAmplitude) && (args.noiseAmplitude as number) > 0;
  const floor = measuredNoise ? (args.noiseAmplitude as number) * 10 ** (10 / 20) : frames[peakIndex] * 10 ** (-26 / 20);
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
    tau: rejection ? null : tau, dropDb: Number.isFinite(dropDb) ? dropDb : 0, cycles,
    endReason: crossing === frames.length ? "recording_end" : measuredNoise ? "noise_floor" : "relative_floor",
    rejection,
  };
}

function envelopeFrames(envelope: ArrayLike<number>, sampleRate: number) {
  const width = Math.max(1, Math.round(sampleRate * 0.01));
  const frames: number[] = [];
  for (let start = 0; start + width <= envelope.length; start += width) {
    let total = 0;
    for (let i = start; i < start + width; i += 1) total += envelope[i];
    frames.push(total / width);
  }
  return frames;
}

function firstBelow(frames: number[], start: number, threshold: number, hold: number) {
  for (let i = start; i + hold <= frames.length; i += 1) {
    if (frames.slice(i, i + hold).every((value) => value <= threshold)) return i;
  }
  return frames.length;
}

function decayTimeConstant(amplitudes: number[]) {
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

function emptyWindow(): DecayWindow {
  return { startSec: 0, endSec: 0, tau: null, dropDb: 0, cycles: 0, endReason: "recording_end", rejection: "insufficient_decay" };
}
