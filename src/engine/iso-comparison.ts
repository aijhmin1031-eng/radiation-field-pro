// ISO 4037-1:2019 reference-field comparison.
//
// Characterises a computed or measured photon field (HVL1, HVL2, homogeneity coefficient, mean and
// effective energy) and compares it against the tabulated ISO 4037-1:2019 continuous-X reference
// qualities (L / N / W / H series): find the best-matching quality, and report the deviation of
// each characteristic from a chosen reference quality against a tolerance band.
//
// Reference values are the 2.5 m focal-spot-distance column (d2_5) where present, which is the
// column the engine's air-path model is validated against. Data: src/data/iso4037-1_2019_reference.json.
import ref from "../data/iso4037-1_2019_reference.json";
import type { Spectrum } from "./spectrum";
import { hvl1, hvl2, homogeneityCoefficient, effectiveEnergy } from "./dosimetry";
import { meanEnergy } from "./spectrum";

export type IsoSeries = "L" | "N" | "W" | "H";

export interface IsoQuality {
  name: string;
  series: IsoSeries;
  kVp: number;
  meanEnergyKeV: number | null;
  resolutionPct: number | null;
  hvlMaterial: string; // "Al" or "Cu"
  hvl1Mm: number | null; // 2.5 m column
  hvl2Mm: number | null;
  homogeneityCoefficient: number | null; // hvl1 / hvl2
  inherent: string;
  add: Record<string, number>;
}

/** Default comparison band (percent) for the realisation check. ISO 4037-1:2019 expects a realised
 *  reference field to reproduce the tabulated HVL; the acceptable band depends on the laboratory's
 *  measurement budget, so it is configurable and defaults to a conventional +/-5%. */
export const DEFAULT_TOLERANCE_PCT = 5;

const RAW = (ref as any).qualities as Record<IsoSeries, any[]>;

function toQuality(series: IsoSeries, q: any): IsoQuality {
  const hvl1Mm = q.hvl1?.d2_5 ?? q.hvl1?.d1_0 ?? null;
  const hvl2Mm = q.hvl2?.d2_5 ?? q.hvl2?.d1_0 ?? null;
  const hc = hvl1Mm != null && hvl2Mm != null && hvl2Mm > 0 ? hvl1Mm / hvl2Mm : null;
  return {
    name: q.name,
    series,
    kVp: q.kVp,
    meanEnergyKeV: q.mean_energy ?? null,
    resolutionPct: q.resolution ?? null,
    hvlMaterial: q.hvl1?.m ?? q.hvl2?.m ?? "Al",
    hvl1Mm,
    hvl2Mm,
    homogeneityCoefficient: hc,
    inherent: q.inherent,
    add: q.add ?? {},
  };
}

/** All ISO 4037-1:2019 reference qualities, optionally restricted to one or more series. */
export function isoQualities(series?: IsoSeries | IsoSeries[]): IsoQuality[] {
  const want = series == null ? (["L", "N", "W", "H"] as IsoSeries[]) : Array.isArray(series) ? series : [series];
  return want.flatMap((s) => (RAW[s] ?? []).map((q) => toQuality(s, q)));
}

/** Look up a single reference quality by name (e.g. "N-80"). */
export function isoQuality(name: string): IsoQuality | undefined {
  return isoQualities().find((q) => q.name === name);
}

export interface FieldCharacteristics {
  material: string;
  hvl1Mm: number;
  hvl2Mm: number;
  homogeneityCoefficient: number;
  meanEnergyKeV: number;
  effectiveEnergyKeV: number;
}

/** Characterise a field in the given HVL material (default Cu — the ISO material above ~50 keV). */
export function characterizeField(spec: Spectrum, material = "Cu"): FieldCharacteristics {
  return {
    material,
    hvl1Mm: hvl1(spec, material),
    hvl2Mm: hvl2(spec, material),
    homogeneityCoefficient: homogeneityCoefficient(spec, material),
    meanEnergyKeV: meanEnergy(spec),
    effectiveEnergyKeV: effectiveEnergy(spec, material),
  };
}

export interface QualityMatch {
  quality: IsoQuality;
  measuredHvl1Mm: number;
  hvl1DeviationPct: number;
  meanEnergyDeviationPct: number | null;
}

/** Best-matching ISO quality, chosen by smallest absolute HVL1 deviation evaluated in each
 *  candidate quality's own HVL material. Optionally restrict the search to given series. */
export function matchQuality(spec: Spectrum, opts: { series?: IsoSeries | IsoSeries[] } = {}): QualityMatch {
  const candidates = isoQualities(opts.series).filter((q) => q.hvl1Mm != null);
  if (candidates.length === 0) throw new Error("no ISO qualities available to match");
  const fieldMean = meanEnergy(spec);
  let best: QualityMatch | null = null;
  for (const q of candidates) {
    const measured = hvl1(spec, q.hvlMaterial);
    const dev = ((measured - (q.hvl1Mm as number)) / (q.hvl1Mm as number)) * 100;
    const meanDev = q.meanEnergyKeV ? ((fieldMean - q.meanEnergyKeV) / q.meanEnergyKeV) * 100 : null;
    if (best === null || Math.abs(dev) < Math.abs(best.hvl1DeviationPct)) {
      best = { quality: q, measuredHvl1Mm: measured, hvl1DeviationPct: dev, meanEnergyDeviationPct: meanDev };
    }
  }
  return best as QualityMatch;
}

export interface ComparisonRow {
  characteristic: "HVL1" | "HVL2" | "homogeneity coefficient" | "mean energy";
  unit: string;
  reference: number | null;
  measured: number;
  deviationPct: number | null;
  withinTolerance: boolean | null; // null when no reference value is tabulated
}

export interface Comparison {
  quality: string;
  series: IsoSeries;
  tolerancePct: number;
  material: string;
  rows: ComparisonRow[];
  pass: boolean; // every row with a reference value is within tolerance
}

/** Compare a field against a named ISO quality, characteristic by characteristic, flagging each
 *  against the tolerance band. HVL is evaluated in the quality's own ISO material. */
export function compareToQuality(spec: Spectrum, qualityName: string, tolerancePct = DEFAULT_TOLERANCE_PCT): Comparison {
  const q = isoQuality(qualityName);
  if (!q) throw new Error(`unknown ISO quality ${qualityName}`);
  const material = q.hvlMaterial;
  const field = characterizeField(spec, material);

  const row = (
    characteristic: ComparisonRow["characteristic"],
    unit: string,
    reference: number | null,
    measured: number,
  ): ComparisonRow => {
    const deviationPct = reference != null && reference !== 0 ? ((measured - reference) / reference) * 100 : null;
    const withinTolerance = deviationPct == null ? null : Math.abs(deviationPct) <= tolerancePct;
    return { characteristic, unit, reference, measured, deviationPct, withinTolerance };
  };

  const rows: ComparisonRow[] = [
    row("HVL1", `mm ${material}`, q.hvl1Mm, field.hvl1Mm),
    row("HVL2", `mm ${material}`, q.hvl2Mm, field.hvl2Mm),
    row("homogeneity coefficient", "", q.homogeneityCoefficient, field.homogeneityCoefficient),
    row("mean energy", "keV", q.meanEnergyKeV, field.meanEnergyKeV),
  ];

  const pass = rows.every((r) => r.withinTolerance !== false);
  return { quality: q.name, series: q.series, tolerancePct, material, rows, pass };
}
