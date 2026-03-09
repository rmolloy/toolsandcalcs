export type PolymaxCandidate = {
  freqHz: number;
  zeta: number;
  orderCount: number;
  stability: number;
};

type PolymaxOpts = {
  minOrder?: number;
  maxOrder?: number;
  orderStep?: number;
  freqMin?: number;
  freqMax?: number;
  stableMinOrders?: number;
  stableFreqTolHz?: number;
};

type Complex = { re: number; im: number };

export function polymaxStableCandidatesFromWave(
  wave: Float32Array | number[],
  sampleRate: number,
  opts: PolymaxOpts = {},
): PolymaxCandidate[] {
  const { candidates, orderSweepCount } = polymaxCandidateResolutionFromWave(wave, sampleRate, opts);
  const stableMinOrders = Math.max(2, Math.round(opts.stableMinOrders ?? Math.ceil(orderSweepCount * 0.5)));
  return candidates.filter((candidate) => candidate.orderCount >= stableMinOrders);
}

export function polymaxCandidateClustersFromWave(
  wave: Float32Array | number[],
  sampleRate: number,
  opts: PolymaxOpts = {},
): PolymaxCandidate[] {
  return polymaxCandidateResolutionFromWave(wave, sampleRate, opts).candidates;
}

function polymaxCandidateResolutionFromWave(
  wave: Float32Array | number[],
  sampleRate: number,
  opts: PolymaxOpts,
): { candidates: PolymaxCandidate[]; orderSweepCount: number } {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    return { candidates: [], orderSweepCount: 0 };
  }
  const arr = Array.from(wave as ArrayLike<number>, (v) => Number(v)).filter((v) => Number.isFinite(v));
  if (arr.length < 256) return { candidates: [] as PolymaxCandidate[], orderSweepCount: 0 };

  const centered = signalCenter(arr);
  const minOrder = Math.max(6, Math.round(opts.minOrder ?? 10));
  const maxOrder = Math.max(minOrder + 2, Math.round(opts.maxOrder ?? 46));
  const orderStep = Math.max(1, Math.round(opts.orderStep ?? 4));
  const freqMin = Math.max(10, Number(opts.freqMin ?? 40));
  const freqMax = Math.max(freqMin + 20, Number(opts.freqMax ?? 1200));
  const stableFreqTolHz = Math.max(0.5, Number(opts.stableFreqTolHz ?? 2.5));

  const orders: number[] = [];
  for (let order = minOrder; order <= maxOrder; order += orderStep) orders.push(order);
  const perOrder = orders.map((order) => {
    const coeffs = lpcAutocorrelation(centered, order);
    if (!coeffs) return { order, poles: [] as Array<{ freqHz: number; zeta: number }> };
    return { order, poles: polesFromLpc(coeffs, sampleRate, freqMin, freqMax) };
  });

  const clusters: Array<{ freqHz: number; zeta: number; orders: Set<number> }> = [];
  for (const run of perOrder) {
    for (const pole of run.poles) {
      let bestIdx = -1;
      let bestDelta = Infinity;
      for (let i = 0; i < clusters.length; i += 1) {
        const delta = Math.abs(clusters[i].freqHz - pole.freqHz);
        if (delta < bestDelta && delta <= stableFreqTolHz) {
          bestIdx = i;
          bestDelta = delta;
        }
      }
      if (bestIdx < 0) {
        clusters.push({ freqHz: pole.freqHz, zeta: pole.zeta, orders: new Set([run.order]) });
        continue;
      }
      const c = clusters[bestIdx];
      const count = c.orders.size;
      c.freqHz = (c.freqHz * count + pole.freqHz) / (count + 1);
      c.zeta = (c.zeta * count + pole.zeta) / (count + 1);
      c.orders.add(run.order);
    }
  }

  return {
    orderSweepCount: orders.length,
    candidates: clusters
      .map((cluster) => ({
        freqHz: cluster.freqHz,
        zeta: cluster.zeta,
        orderCount: cluster.orders.size,
        stability: cluster.orders.size / Math.max(1, orders.length),
      }))
      .sort((a, b) => a.freqHz - b.freqHz),
  };
}

function signalCenter(data: number[]) {
  if (!data.length) return data;
  const mean = data.reduce((acc, v) => acc + v, 0) / data.length;
  return data.map((v) => v - mean);
}

function lpcAutocorrelation(data: number[], order: number): number[] | null {
  if (data.length <= order + 2) return null;
  const r = new Array(order + 1).fill(0);
  for (let lag = 0; lag <= order; lag += 1) {
    let sum = 0;
    for (let i = lag; i < data.length; i += 1) sum += data[i] * data[i - lag];
    r[lag] = sum;
  }
  if (!Number.isFinite(r[0]) || r[0] <= 1e-12) return null;

  const a = new Array(order + 1).fill(0);
  const prev = new Array(order + 1).fill(0);
  a[0] = 1;
  let err = r[0];

  for (let i = 1; i <= order; i += 1) {
    let acc = 0;
    for (let j = 1; j < i; j += 1) acc += a[j] * r[i - j];
    const k = -(r[i] + acc) / Math.max(err, 1e-12);
    prev.splice(0, prev.length, ...a);
    for (let j = 1; j < i; j += 1) a[j] = prev[j] + k * prev[i - j];
    a[i] = k;
    err *= (1 - k * k);
    if (!Number.isFinite(err) || err <= 1e-12) return null;
  }
  return a;
}

function polesFromLpc(coeffs: number[], sampleRate: number, freqMin: number, freqMax: number) {
  const roots = polynomialRootsDurandKerner(coeffs);
  const poles: Array<{ freqHz: number; zeta: number }> = [];
  for (const root of roots) {
    const mag = Math.hypot(root.re, root.im);
    if (!Number.isFinite(mag) || mag <= 0 || mag >= 1) continue;
    const theta = Math.atan2(root.im, root.re);
    const freqHz = Math.abs(theta) * sampleRate / (2 * Math.PI);
    if (!Number.isFinite(freqHz) || freqHz < freqMin || freqHz > freqMax) continue;
    const sigma = Math.log(mag) * sampleRate;
    const zeta = Math.max(0, Math.min(0.25, -sigma / (2 * Math.PI * Math.max(freqHz, 1))));
    if (!Number.isFinite(zeta) || zeta <= 0 || zeta > 0.2) continue;
    poles.push({ freqHz, zeta });
  }
  // Deduplicate near-conjugate frequency duplicates.
  poles.sort((a, b) => a.freqHz - b.freqHz);
  const out: Array<{ freqHz: number; zeta: number }> = [];
  for (const pole of poles) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.freqHz - pole.freqHz) < 0.75) continue;
    out.push(pole);
  }
  return out;
}

function polynomialRootsDurandKerner(coeffs: number[]): Complex[] {
  const n = coeffs.length - 1;
  if (n < 1) return [];
  const monic = coeffs.map((c) => c / coeffs[0]);
  let roots: Complex[] = [];
  const baseR = 0.6;
  for (let i = 0; i < n; i += 1) {
    const angle = (2 * Math.PI * i) / n;
    roots.push({ re: baseR * Math.cos(angle), im: baseR * Math.sin(angle) });
  }

  for (let iter = 0; iter < 60; iter += 1) {
    let maxDelta = 0;
    roots = roots.map((root, i) => {
      const p = evalPoly(monic, root);
      let denom = { re: 1, im: 0 };
      for (let j = 0; j < roots.length; j += 1) {
        if (i === j) continue;
        denom = cmul(denom, csub(root, roots[j]));
      }
      const step = cdiv(p, denom);
      const next = csub(root, step);
      maxDelta = Math.max(maxDelta, Math.hypot(step.re, step.im));
      return next;
    });
    if (maxDelta < 1e-8) break;
  }
  return roots;
}

function evalPoly(coeffs: number[], x: Complex): Complex {
  let y: Complex = { re: coeffs[0], im: 0 };
  for (let i = 1; i < coeffs.length; i += 1) y = cadd(cmul(y, x), { re: coeffs[i], im: 0 });
  return y;
}

function cadd(a: Complex, b: Complex): Complex { return { re: a.re + b.re, im: a.im + b.im }; }
function csub(a: Complex, b: Complex): Complex { return { re: a.re - b.re, im: a.im - b.im }; }
function cmul(a: Complex, b: Complex): Complex { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
function cdiv(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im || 1e-12;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
