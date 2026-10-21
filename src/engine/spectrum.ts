// Spectrum sources (X-ray tube, radionuclide gamma), filtration, and mean energy.
// A Spectrum is a generic list of (energy, fluence) samples — continuous bins or discrete lines —
// so every downstream computation (filtration, HVL, kerma) treats both source families the same.
import emission from "../data/xray-emission-W.json";
import { linearMu } from "./attenuation";

export interface Spectrum {
  energy: number[]; // keV
  fluence: number[]; // relative photon fluence, parallel to energy
}
export interface Filter {
  material: string;
  thicknessMm: number;
}

const GRID: number[] = emission.kvpGrid;
const FL = emission.fluence as Record<string, number[]>;
const EMAX = emission.energyMaxKeV;
const KVP_MIN = GRID[0];
const KVP_MAX = GRID[GRID.length - 1];

/** Tungsten tube total emission (brem + characteristic) leaving the anode, no filtration. */
export function xraySpectrum(kvp: number): Spectrum {
  const kv = Math.min(KVP_MAX, Math.max(KVP_MIN, kvp));
  const hi = GRID.findIndex((g) => g >= kv);
  let row: number[];
  if (hi <= 0) {
    row = FL[String(GRID[0])];
  } else {
    const lo = hi - 1;
    const t = (kv - GRID[lo]) / (GRID[hi] - GRID[lo]);
    const a = FL[String(GRID[lo])];
    const b = FL[String(GRID[hi])];
    row = a.map((av, i) => av + (b[i] - av) * t);
  }
  const top = Math.floor(kv);
  const energy: number[] = [];
  const fluence: number[] = [];
  for (let e = 0; e <= Math.min(EMAX, top); e++) {
    energy.push(e);
    fluence.push(Math.max(0, row[e]));
  }
  return { energy, fluence };
}

/** Radionuclide gamma lines [keV, emission probability]. Evaluated values (ENSDF/IAEA). */
const GAMMA: Record<string, [number, number][]> = {
  "Cs-137": [[661.657, 0.851]],
  "Co-60": [
    [1173.228, 0.9985],
    [1332.492, 0.9998],
  ],
};

export function gammaSpectrum(nuclide: string): Spectrum {
  const lines = GAMMA[nuclide];
  if (!lines) throw new Error(`unknown nuclide ${nuclide}`);
  return { energy: lines.map((l) => l[0]), fluence: lines.map((l) => l[1]) };
}

export function availableNuclides(): string[] {
  return Object.keys(GAMMA);
}

/** Apply added filtration: fluence(E) *= exp(-mu(E)*t) for each filter layer. */
export function filterSpectrum(spec: Spectrum, filters: Filter[]): Spectrum {
  const fluence = spec.fluence.map((f, i) => {
    let v = f;
    for (const flt of filters) {
      if (flt.thicknessMm > 0) v *= Math.exp(-linearMu(flt.material, spec.energy[i]) * flt.thicknessMm);
    }
    return v;
  });
  return { energy: spec.energy.slice(), fluence };
}

export function meanEnergy(spec: Spectrum): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < spec.energy.length; i++) {
    num += spec.energy[i] * spec.fluence[i];
    den += spec.fluence[i];
  }
  return den > 0 ? num / den : 0;
}
