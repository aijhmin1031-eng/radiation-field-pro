// Validates the full pipeline (tungsten emission -> ISO filtration -> HVL) against the
// ISO 4037-1:2019 reference HVL1 values, across all four continuous-X series.
import { test } from "node:test";
import assert from "node:assert/strict";
import iso from "../data/iso4037-1_2019_reference.json" with { type: "json" };
import { xraySpectrum, filterSpectrum } from "../engine/spectrum.ts";
import { hvl1 } from "../engine/dosimetry.ts";

const inh = (s: string) => {
  const [v, , m] = s.split(" ");
  return { material: m, thicknessMm: parseFloat(v) };
};

function beam(q: any) {
  const filters = [
    inh(q.inherent),
    ...Object.entries(q.add).map(([m, t]: any) => ({ material: m, thicknessMm: t as number })),
    { material: "Air", thicknessMm: 2500 },
  ];
  return filterSpectrum(xraySpectrum(q.kVp), filters);
}

const Q = (iso as any).qualities;
const all = ["L", "N", "W", "H"].flatMap((s) => Q[s]).filter((q: any) => q.hvl1.d2_5);

for (const q of all) {
  test(`${q.name} HVL1 within 4% of ISO 4037-1:2019`, () => {
    const h1 = hvl1(beam(q), q.hvl1.m);
    const rel = Math.abs(h1 - q.hvl1.d2_5) / q.hvl1.d2_5;
    assert.ok(rel <= 0.04, `${q.name}: ${h1.toFixed(3)} ${q.hvl1.m} vs ISO ${q.hvl1.d2_5} (${(rel * 100).toFixed(1)}%)`);
  });
}
