import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isoQualities,
  isoQuality,
  characterizeField,
  matchQuality,
  compareToQuality,
  DEFAULT_TOLERANCE_PCT,
} from "./iso-comparison.ts";
import { xraySpectrum, filterSpectrum, type Filter } from "./spectrum.ts";

// Rebuild an ISO reference beam from the quality definition (same recipe as the HVL validation).
const inh = (s: string): Filter => {
  const [v, , m] = s.split(" ");
  return { material: m, thicknessMm: parseFloat(v) };
};
function beam(name: string) {
  const q = isoQuality(name);
  if (!q) throw new Error(name);
  const filters: Filter[] = [
    inh(q.inherent),
    ...Object.entries(q.add).map(([m, t]) => ({ material: m, thicknessMm: t as number })),
    { material: "Air", thicknessMm: 2500 },
  ];
  return filterSpectrum(xraySpectrum(q.kVp), filters);
}

test("isoQualities returns all four series with normalised fields", () => {
  const all = isoQualities();
  assert.ok(all.length >= 40, `${all.length}`);
  for (const q of all) {
    assert.ok(["L", "N", "W", "H"].includes(q.series));
    assert.ok(q.kVp > 0);
    assert.ok(q.hvlMaterial === "Al" || q.hvlMaterial === "Cu");
    if (q.hvl1Mm != null && q.hvl2Mm != null) {
      // homogeneity coefficient = HVL1/HVL2 <= 1
      assert.ok(q.homogeneityCoefficient! > 0 && q.homogeneityCoefficient! <= 1.0001, `${q.name} hc`);
    }
  }
  // series filter
  assert.ok(isoQualities("N").every((q) => q.series === "N"));
  assert.ok(isoQualities(["L", "H"]).every((q) => q.series === "L" || q.series === "H"));
});

test("isoQuality looks up by name", () => {
  const q = isoQuality("N-80");
  assert.ok(q);
  assert.equal(q!.kVp, 80);
  assert.equal(q!.hvlMaterial, "Cu");
  assert.equal(q!.hvl1Mm, 0.58);
});

test("characterizeField reports HVL1 <= HVL2 and a homogeneity coefficient <= 1", () => {
  const c = characterizeField(beam("N-80"), "Cu");
  assert.ok(c.hvl1Mm > 0 && c.hvl2Mm >= c.hvl1Mm, `${c.hvl1Mm} ${c.hvl2Mm}`);
  assert.ok(c.homogeneityCoefficient > 0 && c.homogeneityCoefficient <= 1.0001);
  assert.ok(c.meanEnergyKeV > 0 && c.effectiveEnergyKeV > 0);
});

test("a modelled N-80 field best-matches the N-80 reference quality", () => {
  const m = matchQuality(beam("N-80"), { series: "N" });
  assert.equal(m.quality.name, "N-80");
  assert.ok(Math.abs(m.hvl1DeviationPct) < 4, `${m.hvl1DeviationPct}`);
});

test("matchQuality over all series still lands on the N-80 neighbourhood", () => {
  const m = matchQuality(beam("N-80"));
  // HVL1 of N-80 (0.58 mm Cu) is distinctive; the closest quality should be N-80 or an adjacent N.
  assert.ok(m.quality.name.startsWith("N-"), m.quality.name);
  assert.ok(Math.abs(m.hvl1DeviationPct) < 6, `${m.hvl1DeviationPct}`);
});

test("compareToQuality: a modelled reference beam passes against its own quality", () => {
  for (const name of ["N-60", "N-100", "N-200", "W-80", "H-100"]) {
    const cmp = compareToQuality(beam(name), name);
    const hvl1Row = cmp.rows.find((r) => r.characteristic === "HVL1")!;
    assert.ok(Math.abs(hvl1Row.deviationPct!) <= DEFAULT_TOLERANCE_PCT, `${name} HVL1 dev ${hvl1Row.deviationPct}`);
    assert.equal(cmp.material, isoQuality(name)!.hvlMaterial);
  }
});

test("compareToQuality: a clearly harder beam fails the softer reference on HVL1", () => {
  // Compare a hard 250 kVp beam against the soft N-30 quality -> large positive HVL1 deviation.
  const hard = filterSpectrum(xraySpectrum(250), [
    { material: "Al", thicknessMm: 4 },
    { material: "Sn", thicknessMm: 2 },
    { material: "Pb", thicknessMm: 3 },
    { material: "Air", thicknessMm: 2500 },
  ]);
  const cmp = compareToQuality(hard, "N-30");
  assert.equal(cmp.pass, false);
  const hvl1Row = cmp.rows.find((r) => r.characteristic === "HVL1")!;
  assert.ok(hvl1Row.withinTolerance === false && hvl1Row.deviationPct! > DEFAULT_TOLERANCE_PCT);
});

test("compareToQuality: tolerance band is configurable and rows carry units", () => {
  const cmp = compareToQuality(beam("N-100"), "N-100", 1);
  assert.equal(cmp.tolerancePct, 1);
  const hvl1Row = cmp.rows.find((r) => r.characteristic === "HVL1")!;
  assert.equal(hvl1Row.unit, "mm Cu");
  // null reference (e.g. no tabulated value) would yield withinTolerance null; N-100 has all values.
  assert.ok(cmp.rows.every((r) => r.reference != null));
});

test("unknown quality names throw", () => {
  assert.throws(() => compareToQuality(beam("N-80"), "X-999"));
});
