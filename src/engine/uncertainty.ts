// Measurement uncertainty per the GUM (JCGM 100:2008, Guide to the Expression of Uncertainty in
// Measurement).
//
// Type A evaluation (GUM 4.2) from a series of repeated readings:
//   mean            x̄    = (1/n) Σ xᵢ                                   (4.2.1)
//   exp. std dev    s    = sqrt( Σ (xᵢ - x̄)² / (n-1) )                  (4.2.2)
//   std uncertainty u(x̄) = s / sqrt(n)        (standard uncertainty of the mean)   (4.2.3)
//   degrees of freedom   ν = n - 1
//   coverage factor k = t_{0.975, ν}   (Student-t, two-sided 95 %)      (G.3)
//   expanded uncertainty U = k · u(x̄),  reported as  x̄ ± U  (k, ~95 %) (6.2)
//
// Combination of relative standard uncertainty components (GUM 5.1.2, for a product/quotient
// model) is the root-sum-square of the relative components, with the Welch-Satterthwaite effective
// degrees of freedom (GUM G.4) so the combined expanded uncertainty also uses a Student-t factor.

/** Student-t 97.5 % quantile t_{0.975, ν} for ν = 1..30, then selected larger ν; ν → ∞ gives the
 *  normal value 1.95996. Two-sided 95 % coverage factor. */
const T_975: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262,
  10: 2.228, 11: 2.201, 12: 2.179, 13: 2.16, 14: 2.145, 15: 2.131, 16: 2.12, 17: 2.11, 18: 2.101,
  19: 2.093, 20: 2.086, 21: 2.08, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.06, 26: 2.056, 27: 2.052,
  28: 2.048, 29: 2.045, 30: 2.042, 40: 2.021, 50: 2.009, 60: 2.0, 80: 1.99, 100: 1.984,
  120: 1.98, 200: 1.972,
};
const T_INF = 1.95996;

/** Student-t two-sided 95 % coverage factor k = t_{0.975, ν} for real ν >= 1. Exact at tabulated ν,
 *  reciprocal-ν linear interpolation between them (smooth and monotone toward the normal limit). */
export function coverageFactor95(nu: number): number {
  if (!Number.isFinite(nu)) return T_INF;
  if (nu < 1) throw new Error(`degrees of freedom must be >= 1 (got ${nu})`);
  if (T_975[nu] !== undefined) return T_975[nu];
  const keys = Object.keys(T_975)
    .map(Number)
    .sort((a, b) => a - b);
  if (nu < keys[0]) return T_975[keys[0]];
  if (nu > keys[keys.length - 1]) {
    // interpolate in 1/ν between the largest tabulated ν and the normal limit (1/ν → 0)
    const last = keys[keys.length - 1];
    const t = (1 / nu - 0) / (1 / last - 0);
    return T_INF + (T_975[last] - T_INF) * t;
  }
  let lo = keys[0];
  let hi = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (keys[i] <= nu && nu <= keys[i + 1]) {
      lo = keys[i];
      hi = keys[i + 1];
      break;
    }
  }
  const frac = (1 / nu - 1 / lo) / (1 / hi - 1 / lo);
  return T_975[lo] + (T_975[hi] - T_975[lo]) * frac;
}

export interface TypeAResult {
  n: number;
  mean: number;
  standardDeviation: number; // experimental standard deviation s (of a single reading)
  standardUncertainty: number; // u(x̄) = s / sqrt(n)
  relativeStandardUncertainty: number; // u(x̄) / |x̄|  (NaN if mean is 0)
  degreesOfFreedom: number; // ν = n - 1
  coverageFactor: number; // k = t_{0.975, ν}
  expandedUncertainty: number; // U = k · u(x̄)
  relativeExpandedUncertainty: number; // U / |x̄|
  confidenceLevel: number; // 0.95
  lower: number; // x̄ - U
  upper: number; // x̄ + U
}

/** Type A evaluation of a sample of repeated readings (GUM 4.2). Requires n >= 2. */
export function typeAUncertainty(readings: number[]): TypeAResult {
  const n = readings.length;
  if (n < 2) throw new Error(`Type A evaluation needs at least 2 readings (got ${n})`);
  const mean = readings.reduce((a, b) => a + b, 0) / n;
  const ss = readings.reduce((a, b) => a + (b - mean) * (b - mean), 0);
  const variance = ss / (n - 1);
  const s = Math.sqrt(variance);
  const u = s / Math.sqrt(n);
  const nu = n - 1;
  const k = coverageFactor95(nu);
  const U = k * u;
  const absMean = Math.abs(mean);
  return {
    n,
    mean,
    standardDeviation: s,
    standardUncertainty: u,
    relativeStandardUncertainty: absMean > 0 ? u / absMean : NaN,
    degreesOfFreedom: nu,
    coverageFactor: k,
    expandedUncertainty: U,
    relativeExpandedUncertainty: absMean > 0 ? U / absMean : NaN,
    confidenceLevel: 0.95,
    lower: mean - U,
    upper: mean + U,
  };
}

/** One standard-uncertainty component for combination (GUM 5): a relative standard uncertainty with
 *  its degrees of freedom (Infinity for a component known exactly / from a large sample). */
export interface UncertaintyComponent {
  label: string;
  relativeStandardUncertainty: number; // u_i(y)/|y| contribution (sensitivity already folded in)
  degreesOfFreedom?: number; // default Infinity
}

export interface CombinedResult {
  value: number;
  combinedRelativeStandardUncertainty: number; // u_c(y)/|y| = sqrt(Σ (u_i/|y|)²)
  combinedStandardUncertainty: number; // u_c(y)
  effectiveDegreesOfFreedom: number; // Welch-Satterthwaite ν_eff
  coverageFactor: number; // k = t_{0.975, ν_eff}
  expandedUncertainty: number; // U = k · u_c(y)
  relativeExpandedUncertainty: number;
  confidenceLevel: number;
  lower: number;
  upper: number;
  components: { label: string; relativeStandardUncertainty: number; degreesOfFreedom: number }[];
}

/** Combine relative standard-uncertainty components in quadrature (GUM 5.1.2, product/quotient
 *  model) about a measured `value`, with Welch-Satterthwaite effective degrees of freedom (G.4). */
export function combineRelative(value: number, components: UncertaintyComponent[]): CombinedResult {
  const comps = components.map((c) => ({
    label: c.label,
    relativeStandardUncertainty: c.relativeStandardUncertainty,
    degreesOfFreedom: c.degreesOfFreedom ?? Infinity,
  }));
  const urc = Math.sqrt(comps.reduce((a, c) => a + c.relativeStandardUncertainty ** 2, 0));
  // Welch-Satterthwaite: ν_eff = u_c⁴ / Σ (u_i⁴ / ν_i)
  let denom = 0;
  for (const c of comps) {
    if (Number.isFinite(c.degreesOfFreedom)) denom += c.relativeStandardUncertainty ** 4 / c.degreesOfFreedom;
  }
  const nuEff = denom > 0 ? urc ** 4 / denom : Infinity;
  const k = coverageFactor95(nuEff);
  const uc = urc * Math.abs(value);
  const U = k * uc;
  const absV = Math.abs(value);
  return {
    value,
    combinedRelativeStandardUncertainty: urc,
    combinedStandardUncertainty: uc,
    effectiveDegreesOfFreedom: nuEff,
    coverageFactor: k,
    expandedUncertainty: U,
    relativeExpandedUncertainty: absV > 0 ? U / absV : NaN,
    confidenceLevel: 0.95,
    lower: value - U,
    upper: value + U,
    components: comps,
  };
}

/** Format a value with its expanded uncertainty, e.g. "1.234 ± 0.012 (k = 2.26, ~95 %)". */
export function formatExpanded(value: number, expandedUncertainty: number, k: number, sig = 4): string {
  return `${value.toPrecision(sig)} ± ${expandedUncertainty.toPrecision(2)} (k = ${k.toFixed(2)}, ~95 %)`;
}
