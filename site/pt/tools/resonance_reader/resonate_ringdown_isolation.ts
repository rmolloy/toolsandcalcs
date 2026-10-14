export type ComplexTransform = (real: Float64Array, imag: Float64Array, inverse?: boolean) => void;
export type IsolationBand = { widthHz: number; settlingSec: number; overlap: boolean };

export function selectIsolationBand(frequencyHz: number, spectralWidthHz: number | null, neighbors: number[]): IsolationBand {
  const width = Number.isFinite(spectralWidthHz) && (spectralWidthHz as number) > 0 ? spectralWidthHz as number : 0;
  const distances = neighbors.filter((f) => Number.isFinite(f) && f > 0 && Math.abs(f - frequencyHz) > 0.5)
    .map((f) => Math.abs(f - frequencyHz));
  const clearance = Math.min(...distances);
  const widthHz = Math.min(Math.max(12, frequencyHz * 0.56, width * 4), frequencyHz * 1.5, clearance * 1.3);
  return { widthHz, settlingSec: Math.max(0.015, Math.min(0.3, 2 / widthHz)), overlap: widthHz < Math.max(8, width * 4) };
}

export function isolateAnalyticMode(
  samples: ArrayLike<number>, sampleRate: number, frequencyHz: number, widthHz: number, transform: ComplexTransform,
) {
  if (!(sampleRate > 0 && frequencyHz > 0 && frequencyHz < sampleRate / 2 && widthHz > 0)) throw new Error("Invalid ring-down isolation band");
  if (!samples.length) return { response: new Float64Array(), envelope: new Float64Array() };
  const padding = Math.ceil(sampleRate * Math.max(0.5, Math.min(2, 6 / widthHz)));
  const length = 2 ** Math.ceil(Math.log2(samples.length + 2 * padding));
  const real = new Float64Array(length);
  const imaginary = new Float64Array(length);
  const mean = Array.from(samples).reduce((sum, value) => sum + value, 0) / samples.length;
  for (let i = 0; i < samples.length; i += 1) real[i + padding] = samples[i] - mean;
  transform(real, imaginary);
  applyAnalyticPassband(real, imaginary, sampleRate, frequencyHz, widthHz);
  transform(real, imaginary, true);
  const response = real.slice(padding, padding + samples.length);
  const amplitude = response.map((value, i) => Math.hypot(value, imaginary[i + padding]));
  return { response, envelope: smoothOneCycle(amplitude, Math.max(1, Math.round(sampleRate / frequencyHz))) };
}

function applyAnalyticPassband(real: Float64Array, imaginary: Float64Array, sampleRate: number, frequencyHz: number, widthHz: number) {
  for (let bin = 0; bin < real.length; bin += 1) {
    const distance = (bin * sampleRate / real.length - frequencyHz) / (widthHz / 2);
    const gain = bin > 0 && bin < real.length / 2 ? 2 / (1 + distance ** 8) : 0;
    real[bin] *= gain;
    imaginary[bin] *= gain;
  }
}

function smoothOneCycle(amplitude: Float64Array, width: number) {
  const prefix = new Float64Array(amplitude.length + 1);
  amplitude.forEach((value, i) => { prefix[i + 1] = prefix[i] + value; });
  return amplitude.map((_, i) => {
    const start = Math.max(0, i - Math.floor(width / 2));
    const end = Math.min(amplitude.length, i + Math.ceil(width / 2));
    return (prefix[end] - prefix[start]) / (end - start);
  });
}
