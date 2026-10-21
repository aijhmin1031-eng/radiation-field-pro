// Operational dose quantities from ISO 4037-3:2019 conversion coefficients.
//
// For a given spectrum the operational quantity H is obtained by weighting the monoenergetic
// conversion coefficient h_K(E, alpha) [Sv/Gy] by the air-kerma spectrum (not the raw fluence):
//
//   Hbar/Ka = sum_E [ phi(E)*E*(muen/rho)_air(E) * h_K(E, alpha) ] / sum_E [ phi(E)*E*(muen/rho)_air(E) ]
//
// i.e. the spectrum-averaged conversion coefficient is the air-kerma-weighted mean of h_K, and
// H = Ka * (Hbar/Ka). This is the rigorous spectrum-averaged method (ISO 4037-3:2019, 4.1.2),
// not a single evaluation at the mean energy.
//
// Angle alpha (deg) is carried through for the angle-dependent quantities; H*(10) is isotropic
// (ambient dose equivalent) and ignores alpha. Data: src/data/iso4037-3_conversion.json.
import data from "../data/iso4037-3_conversion.json";
import type { Spectrum } from "./spectrum";
import { airMuenOverRho } from "./attenuation";

export type OperationalQuantity = "H'(0.07)" | "H*(10)" | "Hp(10)";

interface QTable {
  angleDependent: boolean;
  phantom: string | null;
  anglesDeg: number[];
  energyKeV: number[];
  h: number[][]; // [energyIndex][angleIndex]
}

const TABLES = data.quantities as Record<string, QTable>;

export function operationalQuantities(): OperationalQuantity[] {
  return Object.keys(TABLES) as OperationalQuantity[];
}

function table(quantity: OperationalQuantity): QTable {
  const t = TABLES[quantity];
  if (!t) throw new Error(`unknown operational quantity ${quantity}`);
  return t;
}

/** Interpolate one angle column over energy (log-log, falling back to linear across non-positive
 *  endpoints), clamping to the tabulated energy range. */
function interpEnergy(energyKeV: number[], col: number[], e: number): number {
  const last = energyKeV.length - 1;
  const kv = Math.min(energyKeV[last], Math.max(energyKeV[0], e));
  if (kv <= energyKeV[0]) return col[0];
  if (kv >= energyKeV[last]) return col[last];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (energyKeV[m] <= kv) lo = m;
    else hi = m;
  }
  const a = col[lo];
  const b = col[hi];
  const t = (Math.log(kv) - Math.log(energyKeV[lo])) / (Math.log(energyKeV[hi]) - Math.log(energyKeV[lo]));
  if (a <= 0 || b <= 0) return a + (b - a) * t;
  return Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);
}

/** Linear interpolation over the tabulated angles, clamping to the tabulated angular range. */
function interpAngle(anglesDeg: number[], perAngle: number[], alphaDeg: number): number {
  const last = anglesDeg.length - 1;
  if (last === 0) return perAngle[0];
  const a = Math.min(anglesDeg[last], Math.max(anglesDeg[0], alphaDeg));
  if (a <= anglesDeg[0]) return perAngle[0];
  if (a >= anglesDeg[last]) return perAngle[last];
  let lo = 0;
  while (anglesDeg[lo + 1] < a) lo++;
  const hi = lo + 1;
  const t = (a - anglesDeg[lo]) / (anglesDeg[hi] - anglesDeg[lo]);
  return perAngle[lo] + (perAngle[hi] - perAngle[lo]) * t;
}

/** Monoenergetic conversion coefficient h_K [Sv/Gy] at photon energy E (keV) and angle alpha (deg).
 *  For angle-independent quantities (H*(10)) alpha is ignored. */
export function conversionCoefficient(quantity: OperationalQuantity, energyKeV: number, alphaDeg = 0): number {
  const t = table(quantity);
  // Value of each tabulated angle column at this energy, then interpolate over angle.
  const perAngle = t.anglesDeg.map((_, ai) => interpEnergy(t.energyKeV, t.h.map((row) => row[ai]), energyKeV));
  if (!t.angleDependent) return perAngle[0];
  return interpAngle(t.anglesDeg, perAngle, alphaDeg);
}

/** Air-kerma-weighted mean conversion coefficient Hbar/Ka [Sv/Gy] for the spectrum. This is the
 *  spectrum-averaged h_K: it is absolute (independent of the fluence normalisation). */
export function meanConversionCoefficient(spec: Spectrum, quantity: OperationalQuantity, alphaDeg = 0): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < spec.energy.length; i++) {
    const e = spec.energy[i];
    const kContribution = spec.fluence[i] * e * airMuenOverRho(e);
    num += kContribution * conversionCoefficient(quantity, e, alphaDeg);
    den += kContribution;
  }
  return den > 0 ? num / den : 0;
}

/** Operational dose = air kerma * spectrum-averaged conversion coefficient.
 *  If `airKermaValue` (Gy) is given the result is in Sv; otherwise it is in the same relative units
 *  as the engine's relative air kerma (useful for ratios and comparisons). */
export function operationalDose(
  spec: Spectrum,
  quantity: OperationalQuantity,
  alphaDeg = 0,
  airKermaValue?: number,
): number {
  const hbar = meanConversionCoefficient(spec, quantity, alphaDeg);
  if (airKermaValue !== undefined) return airKermaValue * hbar;
  let ka = 0;
  for (let i = 0; i < spec.energy.length; i++) {
    ka += spec.fluence[i] * spec.energy[i] * airMuenOverRho(spec.energy[i]);
  }
  return ka * hbar;
}
