import { test } from "node:test";
import assert from "node:assert/strict";
import {
  conversionCoefficient,
  meanConversionCoefficient,
  operationalDose,
  operationalQuantities,
} from "./operational-dose.ts";
import { xraySpectrum, gammaSpectrum, filterSpectrum } from "./spectrum.ts";
import type { Spectrum } from "./spectrum.ts";
import iso from "../data/iso4037-3_conversion.json" with { type: "json" };

const QS = iso.quantities as Record<
  string,
  { angleDependent: boolean; anglesDeg: number[]; energyKeV: number[]; h: number[][] }
>;

test("data integrity: table shapes and strictly ascending energy grids", () => {
  for (const [name, q] of Object.entries(QS)) {
    assert.equal(q.h.length, q.energyKeV.length, `${name}: row count`);
    for (let i = 0; i < q.h.length; i++) {
      assert.equal(q.h[i].length, q.anglesDeg.length, `${name}: row ${i} width`);
    }
    for (let i = 1; i < q.energyKeV.length; i++) {
      assert.ok(q.energyKeV[i] > q.energyKeV[i - 1], `${name}: energy ascending at ${i}`);
    }
    for (let i = 1; i < q.anglesDeg.length; i++) {
      assert.ok(q.anglesDeg[i] > q.anglesDeg[i - 1], `${name}: angle ascending at ${i}`);
    }
  }
});

test("three quantities exposed", () => {
  assert.deepEqual(operationalQuantities().sort(), ["H'(0.07)", "H*(10)", "Hp(10)"]);
});

test("conversionCoefficient returns tabulated value at grid points", () => {
  // H*(10): 60 keV -> 1.74, 1 MeV -> 1.17
  assert.ok(Math.abs(conversionCoefficient("H*(10)", 60) - 1.74) < 1e-9);
  assert.ok(Math.abs(conversionCoefficient("H*(10)", 1000) - 1.17) < 1e-9);
  // H'(0.07): 60 keV, 0 deg -> 1.59 ; 662 keV, 90 deg -> 1.07
  assert.ok(Math.abs(conversionCoefficient("H'(0.07)", 60, 0) - 1.59) < 1e-9);
  assert.ok(Math.abs(conversionCoefficient("H'(0.07)", 662, 90) - 1.07) < 1e-9);
  // Hp(10): 80 keV, 0 deg -> 1.90 ; 80 keV, 75 deg -> 1.13
  assert.ok(Math.abs(conversionCoefficient("Hp(10)", 80, 0) - 1.9) < 1e-9);
  assert.ok(Math.abs(conversionCoefficient("Hp(10)", 80, 75) - 1.13) < 1e-9);
});

test("H*(10) is angle-independent", () => {
  assert.equal(conversionCoefficient("H*(10)", 100, 0), conversionCoefficient("H*(10)", 100, 60));
});

test("angle interpolation is monotone between grid angles and clamps beyond range", () => {
  const a0 = conversionCoefficient("Hp(10)", 80, 0); // 1.90
  const a45 = conversionCoefficient("Hp(10)", 80, 45); // 1.75
  const a60 = conversionCoefficient("Hp(10)", 80, 60); // 1.54
  assert.ok(a0 > a45 && a45 > a60, `${a0} ${a45} ${a60}`);
  // midpoint 0..15 deg is between the two grid values
  const mid = conversionCoefficient("Hp(10)", 80, 7.5);
  assert.ok(mid < a0 && mid > conversionCoefficient("Hp(10)", 80, 15));
  // clamp: beyond 75 deg returns the 75 deg value (Hp(10) slab is only defined to 75 deg)
  assert.equal(conversionCoefficient("Hp(10)", 80, 90), conversionCoefficient("Hp(10)", 80, 75));
});

test("energy interpolation handles the steep low-energy H*(10) decade range", () => {
  // Between 10 keV (0.008) and 11 keV (0.0331): log-log interpolation stays within the bracket.
  const v = conversionCoefficient("H*(10)", 10.5);
  assert.ok(v > 0.008 && v < 0.0331, `${v}`);
});

test("spectrum-averaged coefficient of a single-bin spectrum equals the point value", () => {
  const mono: Spectrum = { energy: [60], fluence: [1] };
  for (const q of operationalQuantities()) {
    const hbar = meanConversionCoefficient(mono, q, 0);
    const point = conversionCoefficient(q, 60, 0);
    assert.ok(Math.abs(hbar - point) < 1e-9, `${q}: ${hbar} vs ${point}`);
  }
});

test("Cs-137 H'(0.07) averaged coefficient is ~1.20 Sv/Gy (662 keV line)", () => {
  const hbar = meanConversionCoefficient(gammaSpectrum("Cs-137"), "H'(0.07)", 0);
  assert.ok(Math.abs(hbar - 1.2) / 1.2 < 0.005, `${hbar}`);
});

test("operationalDose scales linearly with supplied air kerma", () => {
  const s = xraySpectrum(100);
  const d1 = operationalDose(s, "Hp(10)", 0, 1);
  const d2 = operationalDose(s, "Hp(10)", 0, 2);
  assert.ok(Math.abs(d2 - 2 * d1) < 1e-9);
  // and equals airKerma(relative) * hbar when no kerma supplied
  const rel = operationalDose(s, "Hp(10)", 0);
  assert.ok(rel > 0);
});

test("filtration hardens the beam and raises Hp(10)/Ka into the physical band", () => {
  const raw = xraySpectrum(100); // raw tube emission: soft component drags the average far down
  const rawHbar = meanConversionCoefficient(raw, "Hp(10)", 0);
  const filtered = filterSpectrum(raw, [
    { material: "Al", thicknessMm: 4 },
    { material: "Cu", thicknessMm: 1 },
  ]);
  const hbar = meanConversionCoefficient(filtered, "Hp(10)", 0);
  assert.ok(hbar > rawHbar, `filtration should raise hbar: ${hbar} vs ${rawHbar}`);
  // ~69 keV effective beam -> Hp(10)/Ka near the 1.7-1.9 Sv/Gy plateau
  assert.ok(hbar > 1.5 && hbar < 1.95, `${hbar}`);
});

test("gamma averaged coefficients reproduce ISO recommended radionuclide values (~1%)", () => {
  // Spectrum-averaging the monoenergetic tables at the line energies reproduces the DIN-sourced
  // recommended values in ISO 4037-3:2019 (Tables 6/19/51) to ~1%.
  const cs = gammaSpectrum("Cs-137");
  assert.ok(Math.abs(meanConversionCoefficient(cs, "Hp(10)", 0) - 1.21) < 0.02, "Cs Hp(10)");
  assert.ok(Math.abs(meanConversionCoefficient(cs, "H*(10)", 0) - 1.2) < 0.02, "Cs H*(10)");
  assert.ok(Math.abs(meanConversionCoefficient(cs, "H'(0.07)", 0) - 1.2) < 0.02, "Cs H'(0.07)");
  const co = gammaSpectrum("Co-60");
  assert.ok(Math.abs(meanConversionCoefficient(co, "Hp(10)", 0) - 1.15) < 0.02, "Co Hp(10)");
  assert.ok(Math.abs(meanConversionCoefficient(co, "H*(10)", 0) - 1.16) < 0.02, "Co H*(10)");
});
