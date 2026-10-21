// Mass/linear attenuation coefficients with log-log interpolation.
// Data: src/data/attenuation.json (SpekPy/NIST). JSON imported without an assertion (prod convention).
import data from "../data/attenuation.json";

interface Mat {
  density: number;
  mu_over_rho: number[];
  muen_over_rho?: number[];
}

const E: number[] = data.energyKeV;
const MATS = data.materials as Record<string, Mat>;
export const ENERGY_MIN = E[0];
export const ENERGY_MAX = E[E.length - 1];

const clampE = (e: number) => Math.min(ENERGY_MAX, Math.max(ENERGY_MIN, e));

/** Bracketing grid indices + log-energy fraction for energy e (keV). */
function bracket(e: number): [number, number, number] {
  const kv = clampE(e);
  const last = E.length - 1;
  if (kv <= E[0]) return [0, 0, 0];
  if (kv >= E[last]) return [last, last, 0];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (E[m] <= kv) lo = m;
    else hi = m;
  }
  const t = (Math.log(kv) - Math.log(E[lo])) / (Math.log(E[hi]) - Math.log(E[lo]));
  return [lo, hi, t];
}

/** Log-log interpolation of a per-energy array (falls back to linear at non-positive values). */
function interp(arr: number[], e: number): number {
  const [lo, hi, t] = bracket(e);
  if (lo === hi) return arr[lo];
  const a = arr[lo];
  const b = arr[hi];
  if (a <= 0 || b <= 0) return a + (b - a) * t;
  return Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);
}

/** Mass attenuation coefficient mu/rho [cm^2/g] at energy e [keV]. */
export function muOverRho(material: string, e: number): number {
  return interp(MATS[material].mu_over_rho, e);
}

/** Linear attenuation coefficient [1/mm] (mu/rho * density, converted cm^-1 -> mm^-1). */
export function linearMu(material: string, e: number): number {
  return (muOverRho(material, e) * MATS[material].density) / 10;
}

/** Air mass energy-absorption coefficient mu_en/rho [cm^2/g] at energy e [keV] (for air kerma). */
export function airMuenOverRho(e: number): number {
  return interp(MATS["Air"].muen_over_rho!, e);
}

export const materialNames = () => Object.keys(MATS);
