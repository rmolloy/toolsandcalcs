/* eslint-disable no-restricted-globals */

(function () {
function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function linearRegression(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n === 0) return null;
  let sumX = 0; let sumY = 0; let sumXY = 0; let sumXX = 0; let sumYY = 0;
  for (let i = 0; i < n; i += 1) {
    const x = xs[i];
    const y = ys[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  const denom = sumXX - n * meanX * meanX;
  if (Math.abs(denom) < 1e-12) return null;
  const slope = (sumXY - n * meanX * meanY) / denom;
  const intercept = meanY - slope * meanX;
  const ssTot = sumYY - n * meanY * meanY;
  const ssRes = ys.reduce((acc, y, i) => {
    const diff = y - (slope * xs[i] + intercept);
    return acc + diff * diff;
  }, 0);
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return { slope, intercept, r2 };
}

function estimateDeltaF(detEnv: number[], dt: number, minHz = 0.5): number {
  const n = detEnv.length;
  if (n < 8) return 0;
  const maxHz = 12;
  const step = 0.01;
  let bestF = 0;
  let bestMag = -Infinity;
  for (let f = minHz; f <= maxHz; f += step) {
    let re = 0; let im = 0;
    const w = 2 * Math.PI * f;
    for (let i = 0; i < n; i += 1) {
      const t = i * dt;
      const ang = w * t;
      re += detEnv[i] * Math.cos(ang);
      im -= detEnv[i] * Math.sin(ang);
    }
    const mag = Math.sqrt(re * re + im * im);
    if (mag > bestMag) {
      bestMag = mag;
      bestF = f;
    }
  }
  return bestF;
}

function smoothSeries(arr: number[], win: number): number[] {
  const n = arr.length;
  const out = new Array(n).fill(0);
  let acc = 0;
  for (let i = 0; i < n; i += 1) {
    acc += arr[i];
    if (i >= win) acc -= arr[i - win];
    out[i] = acc / Math.min(i + 1, win);
  }
  return out;
}

interface FitOpts {
  attackSkipMs?: number;
  maxAnalysisMs?: number;
}

interface FitResult {
  deltaF: number;
  wobbleDepth: number;
  alpha: number;
  r2: number;
  residualVar: number;
  wolfScore: number;
  category: "None" | "Mild" | "Moderate" | "Strong" | "Severe";
}

function fitTwoMode(envelope: number[], dt: number, opts: FitOpts = {}): FitResult {
  if (!envelope?.length) throw new Error("Empty envelope");
  const attackSkipMs = opts.attackSkipMs ?? 100;
  const maxAnalysisMs = opts.maxAnalysisMs ?? 2000;
  const attackSkip = Math.min(envelope.length, Math.round((attackSkipMs / 1000) / dt));
  let env = envelope.slice(attackSkip);
  if (maxAnalysisMs) {
    const maxSamples = Math.max(8, Math.round((maxAnalysisMs / 1000) / dt));
    env = env.slice(0, maxSamples);
  }

  // Trim trailing low-energy tail (wobble dies out).
  const peak = env.reduce((m, v) => Math.max(m, v), 0);
  const thresh = peak * 0.05; // ~ -26 dB
  let lastIdx = env.length - 1;
  for (let i = env.length - 1; i >= 0; i -= 1) {
    if (env[i] >= thresh) { lastIdx = i; break; }
  }
  env = env.slice(0, Math.max(lastIdx + 1, 16));

  let tArr = env.map((_, i) => (i * dt));
  const reg = linearRegression(tArr, env.map((v) => Math.log(Math.max(v, 1e-12))));
  const alpha = reg?.slope ? -Math.min(reg.slope, 0) : 0;
  const A0 = reg ? Math.exp(reg.intercept) : Math.max(env[0] || 1, 1e-6);
  let detrended = env.map((v, i) => (v * Math.exp(alpha * tArr[i])) / A0);

  // Trim wobble window to where modulation still exists.
  const peakDet = detrended.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const wobbleThresh = peakDet * 0.05;
  let wobbleEnd = detrended.length - 1;
  for (let i = detrended.length - 1; i >= 0; i -= 1) {
    if (Math.abs(detrended[i]) >= wobbleThresh) { wobbleEnd = i; break; }
  }
  wobbleEnd = Math.max(wobbleEnd, 15);
  detrended = detrended.slice(0, wobbleEnd + 1);
  tArr = tArr.slice(0, wobbleEnd + 1);
  env = env.slice(0, wobbleEnd + 1);

  const meanDet = detrended.reduce((a, b) => a + b, 0) / Math.max(1, detrended.length);
  const varDet = detrended.reduce((acc, v) => acc + (v - meanDet) * (v - meanDet), 0) / Math.max(1, detrended.length);
  if (varDet < 1e-7 || !Number.isFinite(varDet)) {
    return {
      deltaF: 0,
      wobbleDepth: 0,
      alpha,
      r2: 0,
      residualVar: varDet || 0,
      wolfScore: 0,
      category: "None",
    };
  }

  const n = detrended.length;
  // Front-weight the wobble region to emphasize early beats.
  const hann = detrended.map((v, i) => v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (Math.max(1, n - 1)))));
  const expWeight = detrended.map((v, i) => {
    const t = i / Math.max(1, n - 1);
    const wExp = Math.exp(-3 * t); // strong front taper
    return hann[i] * wExp;
  });
  const windowSec = n * dt;
  const dynamicMinHz = windowSec <= 1.5 && peakDet > 0.01 ? 1.5 : 0.5;
  // Residual-based beat estimate: remove slow trend, then sweep 2–8 Hz.
  const smoothWin = Math.max(3, Math.round(0.05 / dt)); // ~50 ms
  const slowTrend = smoothSeries(detrended, smoothWin);
  const residual = detrended.map((v, i) => v - slowTrend[i]);
  const resMean = residual.reduce((a, b) => a + b, 0) / Math.max(1, residual.length);
  const residualCentered = residual.map((v) => v - resMean);
  const resVar = residualCentered.reduce((acc, v) => acc + v * v, 0) / Math.max(1, residualCentered.length);
  const resWeight = residualCentered.map((v, i) => {
    const t = i / Math.max(1, n - 1);
    const wExp = Math.exp(-3 * t);
    const hannW = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (Math.max(1, n - 1)));
    return v * wExp * hannW;
  });
  const deltaFResidual = resVar > 1e-7 ? estimateDeltaF(resWeight, dt, 2) : 0;
  const deltaFEnv = estimateDeltaF(expWeight, dt, dynamicMinHz);
  const deltaF = deltaFResidual > 0 ? deltaFResidual : deltaFEnv;
  const w = 2 * Math.PI * deltaF;
  let sumCC = 0; let sumSS = 0; let sumCS = 0; let sumYC = 0; let sumYS = 0;
  for (let i = 0; i < detrended.length; i += 1) {
    const t = tArr[i];
    const c = Math.cos(w * t);
    const s = Math.sin(w * t);
    const y = detrended[i];
    sumCC += c * c;
    sumSS += s * s;
    sumCS += c * s;
    sumYC += y * c;
    sumYS += y * s;
  }
  const det = (sumCC * sumSS) - (sumCS * sumCS) || 1e-9;
  const A = ((sumYC * sumSS) - (sumYS * sumCS)) / det;
  const B = ((sumYS * sumCC) - (sumYC * sumCS)) / det;
  const amplitude = Math.sqrt(A * A + B * B);
  const phi = Math.atan2(-B, A);
  const r = Math.max(0, amplitude);

  const fitted = env.map((_, i) => {
    const t = tArr[i];
    return A0 * Math.exp(-alpha * t) * (1 + r * Math.cos(w * t + phi));
  });
  const maxEnv = env.reduce((m, v) => Math.max(m, v), 1e-9);
  const envNorm = env.map((v) => v / maxEnv);
  const fitNorm = fitted.map((v) => v / maxEnv);
  const meanY = envNorm.reduce((a, b) => a + b, 0) / envNorm.length;
  let ssTot = 0; let ssRes = 0;
  for (let i = 0; i < envNorm.length; i += 1) {
    const diffTot = envNorm[i] - meanY;
    const diffRes = envNorm[i] - fitNorm[i];
    ssTot += diffTot * diffTot;
    ssRes += diffRes * diffRes;
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const residualVar = ssRes / Math.max(1, envNorm.length);

  const wobbleScore = clamp01(r / 0.4);
  const beatScore = clamp01(deltaF / 4);
  const quality = r2;
  const wolfScore = wobbleScore * beatScore * quality;
  let category: FitResult["category"] = "Severe";
  if (wolfScore < 0.10) category = "None";
  else if (wolfScore < 0.25) category = "Mild";
  else if (wolfScore < 0.45) category = "Moderate";
  else if (wolfScore < 0.70) category = "Strong";

  return { deltaF, wobbleDepth: r, alpha, r2, residualVar, wolfScore, category };
}

if (typeof self !== "undefined" && typeof self.onmessage !== "undefined") {
  self.onmessage = (event: MessageEvent) => {
    const { data } = event;
    if (!data || data.type !== "ANALYZE_NOTE") return;
    try {
      const { id, envelope, dt, attackSkipMs, maxAnalysisMs } = data;
      if (!envelope || !dt) throw new Error("Missing envelope or dt");
      try {
        // Debug: log incoming note slice.
        console.log("wolf worker note", id, "len", envelope.length, "dt", dt, "preview", envelope.slice(0, 8));
      } catch {
        /* ignore */
      }
      const result = fitTwoMode(envelope, dt, { attackSkipMs, maxAnalysisMs });
      self.postMessage({ type: "NOTE_RESULT", id, result });
    } catch (err: any) {
      self.postMessage({ type: "NOTE_ERROR", id: data?.id, message: err?.message || String(err) });
    }
  };
}

// Export for Node/test usage.
if (typeof module !== "undefined") {
  // eslint-disable-next-line no-undef
  (module as any).exports = { fitTwoMode };
}

})();
