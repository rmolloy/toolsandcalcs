/* --------------------- Utilities & constants --------------------- */
const $ = id => document.getElementById(id);
const c = 340;       // m/s
const rho = 1.205;   // kg/m^3
const pref = 50;     // reference pressure (Kirby)
const mic_r = 1.0;   // microphone distance (m)

function fmt(v) { if (Math.abs(v) >= 1) return v.toFixed(2); if (Math.abs(v) >= 0.01) return v.toFixed(4); return v.toPrecision(5); }
function sweep(f1 = 0, f2 = 500, step = 0.1) { const out = []; for (let f = f1; f <= f2 + 1e-9; f += step) out.push(+f.toFixed(4)); return out; }

/* --------------------- Complex arithmetic --------------------- */
const C = (re, im = 0) => ({ re, im });
const add = (a, b) => C(a.re + b.re, a.im + b.im);
const sub = (a, b) => C(a.re - b.re, a.im - b.im);
const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const scl = (a, s) => C(a.re * s, a.im * s);
const inv = a => { const d = a.re * a.re + a.im * a.im || 1e-30; return C(a.re / d, -a.im / d); };
const div = (a, b) => mul(a, inv(b));
const abs = a => Math.hypot(a.re, a.im);

/* determinants */
function det2(a11, a12, a21, a22) { return sub(mul(a11, a22), mul(a12, a21)); }
function det3(a11, a12, a13, a21, a22, a23, a31, a32, a33) {
  const t1 = mul(a11, sub(mul(a22, a33), mul(a23, a32)));
  const t2 = mul(a12, sub(mul(a21, a33), mul(a23, a31)));
  const t3 = mul(a13, sub(mul(a21, a32), mul(a22, a31)));
  return add(sub(t1, t2), t3);
}

/* shared helpers */
function scalePressure(y, area, om) { const scale = (om * om * rho) / (4 * Math.PI * mic_r); return scl(y, area * scale); }
function kappaFrom(p) { return (c * c) * rho / p.volume_air; }

/* --------------------- 1DOF, 2DOF, 3DOF, 4DOF solvers --------------------- */
/* 1DOF: Helmholtz-only (air mass + cavity spring). Force applied to air. */
function computeResponse1DOF(p) {
  const kappa = kappaFrom(p);
  const oma = Math.sqrt((kappa * p.area_hole * p.area_hole) / p.mass_air);
  const freqs = sweep(0, 500, 0.1);

  const total = [], top = [], back = [], air = [], sides = [];
  const F = p.driving_force;

  for (const f of freqs) {
    const om = 2 * Math.PI * f;
    const Da = C(p.mass_air * (oma * oma - om * om), p.damping_air * om);
    const ya = div(C(F, 0), Da);       // F on air coordinate
    const p_air = scalePressure(ya, p.area_hole, om);
    const p_tot = p_air;

    const dB_tot = 20 * Math.log10((abs(p_tot) / pref) || 1e-30);
    const dB_air = 20 * Math.log10((abs(p_air) / pref) || 1e-30);

    total.push({ x: f, y: dB_tot });
    air.push({ x: f, y: dB_air });
    top.push({ x: f, y: -140 }); back.push({ x: f, y: -140 }); sides.push({ x: f, y: -140 });
  }
  return { total, top, back, air, sides };
}

/* 2DOF: Top + Air (force on Top). */
function computeResponse2DOF(p) {
  const kappa = kappaFrom(p);
  const omt = Math.sqrt((p.stiffness_top + kappa * p.area_top * p.area_top) / p.mass_top);
  const oma = Math.sqrt((kappa * p.area_hole * p.area_hole) / p.mass_air);
  const alpha_t = kappa * p.area_hole * p.area_top;

  const freqs = sweep(0, 500, 0.1);
  const total = [], top = [], back = [], air = [], sides = [];
  const F = p.driving_force;

  for (const f of freqs) {
    const om = 2 * Math.PI * f;
    const Dt = C(p.mass_top * (omt * omt - om * om), p.damping_top * om);
    const Da = C(p.mass_air * (oma * oma - om * om), p.damping_air * om);
    const A = det2(Dt, C(-alpha_t, 0), C(-alpha_t, 0), Da);      // Δ
    const yt = div(mul(Da, C(F, 0)), A);                        // (Da*F)/Δ
    const ya = div(mul(C(alpha_t, 0), C(F, 0)), A);              // (α_t*F)/Δ

    const p_top = scalePressure(yt, p.area_top, 2 * Math.PI * f);
    const p_air = scalePressure(ya, p.area_hole, 2 * Math.PI * f);
    const p_tot = add(p_top, p_air);

    total.push({ x: f, y: 20 * Math.log10((abs(p_tot) / pref) || 1e-30) });
    top.push({ x: f, y: 20 * Math.log10((abs(p_top) / pref) || 1e-30) });
    air.push({ x: f, y: 20 * Math.log10((abs(p_air) / pref) || 1e-30) });
    back.push({ x: f, y: -140 });
    sides.push({ x: f, y: -140 });
  }
  return { total, top, back, air, sides };
}

/* 3DOF: Top + Back + Air (force on Top). */
function computeResponse3DOF(p) {
  const kappa = kappaFrom(p);
  const omt = Math.sqrt((p.stiffness_top + kappa * p.area_top * p.area_top) / p.mass_top);
  const omb = Math.sqrt((p.stiffness_back + kappa * p.area_back * p.area_back) / p.mass_back);
  const oma = Math.sqrt((kappa * p.area_hole * p.area_hole) / p.mass_air);

  const alpha_t = kappa * p.area_hole * p.area_top;
  const alpha_b = kappa * p.area_hole * p.area_back;

  const freqs = sweep(0, 500, 0.1);
  const total = [], top = [], back = [], air = [], sides = [];
  const F = p.driving_force;

  for (const f of freqs) {
    const om = 2 * Math.PI * f;
    const Dt = C(p.mass_top * (omt * omt - om * om), p.damping_top * om);
    const Db = C(p.mass_back * (omb * omb - om * om), p.damping_back * om);
    const Da = C(p.mass_air * (oma * oma - om * om), p.damping_air * om);

    // M = [[Dt,   0, -αt],
    //      [ 0,  Db, -αb],
    //      [-αt,-αb,  Da]]
    const Δ = det3(
      Dt, C(0, 0), C(-alpha_t, 0),
      C(0, 0), Db, C(-alpha_b, 0),
      C(-alpha_t, 0), C(-alpha_b, 0), Da
    );

    // b = [F, 0, 0]^T
    const Δt = det3(
      C(F, 0), C(0, 0), C(-alpha_t, 0),
      C(0, 0), Db, C(-alpha_b, 0),
      C(0, 0), C(-alpha_b, 0), Da
    );
    const Δb = det3(
      Dt, C(F, 0), C(-alpha_t, 0),
      C(0, 0), C(0, 0), C(-alpha_b, 0),
      C(-alpha_t, 0), C(0, 0), Da
    );
    const Δa = det3(
      Dt, C(0, 0), C(F, 0),
      C(0, 0), Db, C(0, 0),
      C(-alpha_t, 0), C(-alpha_b, 0), C(0, 0)
    );

    const yt = div(Δt, Δ);
    const yb = div(Δb, Δ);
    const ya = div(Δa, Δ);

    const omc = 2 * Math.PI * f;
    const p_top = scalePressure(yt, p.area_top, omc);
    const p_back = scalePressure(yb, p.area_back, omc);
    const p_air = scalePressure(ya, p.area_hole, omc);
    const p_tot = add(add(p_top, p_back), p_air);

    total.push({ x: f, y: 20 * Math.log10((abs(p_tot) / pref) || 1e-30) });
    top.push({ x: f, y: 20 * Math.log10((abs(p_top) / pref) || 1e-30) });
    back.push({ x: f, y: 20 * Math.log10((abs(p_back) / pref) || 1e-30) });
    air.push({ x: f, y: 20 * Math.log10((abs(p_air) / pref) || 1e-30) });
    sides.push({ x: f, y: -140 });
  }
  return { total, top, back, air, sides };
}

/* 4DOF: Determinant-expanded Kirby/Gore–Gilet (unchanged math) */
function computeResponse4DOF(p) {
  const kappa = kappaFrom(p);

  const omt = Math.sqrt((p.stiffness_top + kappa * p.area_top * p.area_top) / p.mass_top);
  const oms = Math.sqrt((p.stiffness_back + p.stiffness_top) / p.mass_sides);
  const omb = Math.sqrt((p.stiffness_back + kappa * p.area_back * p.area_back) / p.mass_back);
  const oma = Math.sqrt((kappa * p.area_hole * p.area_hole) / p.mass_air);

  const alphat = kappa * p.area_hole * p.area_top;
  const alphab = kappa * p.area_hole * p.area_back;
  const alphbt = kappa * p.area_back * p.area_top;

  const freqs = sweep(0, 500, 0.1);

  const F = p.driving_force;
  const total = [], top = [], back = [], air = [], sides = [];

  for (const f of freqs) {
    const om = 2 * Math.PI * f;

    const Dt = C(p.mass_top * (omt * omt - om * om), p.damping_top * om);
    const Ds = C(p.mass_sides * (oms * oms - om * om), p.damping_sides * om);
    const Db = C(p.mass_back * (omb * omb - om * om), p.damping_back * om);
    const Da = C(p.mass_air * (oma * oma - om * om), p.damping_air * om);

    const Kt = p.stiffness_top, Kb = p.stiffness_back;

    const DtDs = mul(Dt, Ds), DsDb = mul(Ds, Db), DbDa = mul(Db, Da);
    const DtDsDb = mul(DtDs, Db);
    const DtDsDbDa = mul(DtDsDb, Da);

    const term1 = DtDsDbDa;
    const term2 = scl(Da, -2 * alphbt * Kt * Kb);
    const term3 = scl(Ds, 2 * alphbt * alphab * alphat);
    const term4 = C(2 * alphat * alphab * Kt * Kb, 0);
    const term5 = scl(sub(DtDs, C(Kt * Kt, 0)), -(alphab * alphab));
    const term6 = scl(sub(DsDb, C(Kb * Kb, 0)), -(alphat * alphat));
    const term7 = scl(mul(Ds, Da), -(alphbt * alphbt));
    const term8 = scl(mul(Dt, Da), -(Kb * Kb));
    const term9 = scl(mul(Db, Da), -(Kt * Kt));

    let Dbar = term1;
    [term2, term3, term4, term5, term6, term7, term8, term9].forEach(t => { Dbar = add(Dbar, t); });

    const term_t1 = mul(mul(Ds, Db), Da);
    const term_t2 = scl(Ds, -(alphab * alphab));
    const term_t3 = scl(Da, -(Kb * Kb));
    const yt = scl(div(add(add(term_t1, term_t2), term_t3), Dbar), F);

    const term_s1 = scl(mul(Db, Da), Kt);
    const term_s2 = C(-Kt * (alphab * alphab), 0);
    const term_s3 = scl(Da, alphbt * Kb);
    const term_s4 = C(-alphat * alphab * Kb, 0);
    const ys = scl(div(add(add(add(term_s1, term_s2), term_s3), term_s4), Dbar), F);

    const term_b1 = scl(Da, -Kt * Kb);
    const term_b2 = scl(mul(Da, Ds), -alphbt);
    const term_b3 = scl(Ds, alphab * alphat);
    const yb = scl(div(add(add(term_b1, term_b2), term_b3), Dbar), F);

    const term_a1 = C(Kt * Kb * alphab, 0);
    const term_a2 = scl(Ds, alphbt * alphab);
    const term_a3 = scl(mul(Ds, Db), -alphat);
    const term_a4 = C(alphat * (Kb * Kb), 0);
    const ya = scl(div(add(add(add(term_a1, term_a2), term_a3), term_a4), Dbar), F);

    const p_top = scalePressure(yt, p.area_top, om);
    const p_sides = scalePressure(ys, p.area_sides, om);
    const p_back = scalePressure(yb, p.area_back, om);
    const p_air = scalePressure(ya, p.area_hole, om);
    const p_tot = add(add(add(p_top, p_sides), p_back), p_air);

    const dB_tot = 20 * Math.log10((abs(p_tot) / pref) || 1e-30);
    const dB_top = 20 * Math.log10((abs(p_top) / pref) || 1e-30);
    const dB_back = 20 * Math.log10((abs(p_back) / pref) || 1e-30);
    const dB_air = 20 * Math.log10((abs(p_air) / pref) || 1e-30);
    const dB_sides = 20 * Math.log10((abs(p_sides) / pref) || 1e-30);

    total.push({ x: f, y: dB_tot });
    top.push({ x: f, y: dB_top });
    back.push({ x: f, y: dB_back });
    air.push({ x: f, y: dB_air });
    sides.push({ x: f, y: dB_sides });
  }
  return { total, top, back, air, sides };
}

/* wrapper */
function computeResponse(p) {
  switch (p.model_order) {
    case 1: return computeResponse1DOF(p);
    case 2: return computeResponse2DOF(p);
    case 3: return computeResponse3DOF(p);
    default: return computeResponse4DOF(p);
  }
}


