// Beam-quality and dosimetry quantities derived from a spectrum: air kerma, half-value layers,
// homogeneity coefficient, effective energy. Narrow-beam (no buildup), ideal geometry.
import type { Spectrum } from "./spectrum";
import { filterSpectrum } from "./spectrum";
import { airMuenOverRho, linearMu } from "./attenuation";

/** Relative air kerma = sum of energy fluence * air mass energy-absorption coefficient. */
export function airKerma(spec: Spectrum): number {
  let k = 0;
  for (let i = 0; i < spec.energy.length; i++) {
    k += spec.fluence[i] * spec.energy[i] * airMuenOverRho(spec.energy[i]);
  }
  return k;
}

/** Thickness [mm] of `material` that reduces the air kerma to `fraction` of the unfiltered value. */
export function attenuationThickness(spec: Spectrum, material: string, fraction: number): number {
  const target = fraction * airKerma(spec);
  const excess = (t: number) => airKerma(filterSpectrum(spec, [{ material, thicknessMm: t }])) - target;
  let lo = 0;
  let hi = 1;
  while (excess(hi) > 0 && hi < 1e4) hi *= 2;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (excess(m) > 0) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/** First half-value layer [mm of `material`]. */
export function hvl1(spec: Spectrum, material: string): number {
  return attenuationThickness(spec, material, 0.5);
}

/** Second half-value layer [mm]: extra thickness beyond HVL1 to reach quarter kerma. */
export function hvl2(spec: Spectrum, material: string): number {
  return attenuationThickness(spec, material, 0.25) - attenuationThickness(spec, material, 0.5);
}

/** Homogeneity coefficient = HVL1 / HVL2 (1 for a monoenergetic beam). */
export function homogeneityCoefficient(spec: Spectrum, material: string): number {
  const h1 = attenuationThickness(spec, material, 0.5);
  const h2 = attenuationThickness(spec, material, 0.25) - h1;
  return h1 / h2;
}

/** Effective energy [keV]: the monoenergetic photon energy whose linear attenuation in
 *  `material` matches ln2/HVL1. Inverts the (locally monotonic) attenuation curve. */
export function effectiveEnergy(spec: Spectrum, material: string): number {
  const muLin = Math.LN2 / hvl1(spec, material); // 1/mm
  let lo = 1;
  let hi = 1400;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (linearMu(material, m) > muLin) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
