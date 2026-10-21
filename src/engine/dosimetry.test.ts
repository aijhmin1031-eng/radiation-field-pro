import { test } from "node:test";
import assert from "node:assert/strict";
import { airKerma, hvl1, homogeneityCoefficient, effectiveEnergy } from "./dosimetry.ts";
import { gammaSpectrum, xraySpectrum, filterSpectrum } from "./spectrum.ts";
import { linearMu } from "./attenuation.ts";

test("monoenergetic HVL1 equals ln2 / mu", () => {
  const cs = gammaSpectrum("Cs-137");
  const expected = Math.LN2 / linearMu("Pb", 661.657);
  const got = hvl1(cs, "Pb");
  assert.ok(Math.abs(got - expected) / expected < 0.005, `${got} vs ${expected}`);
});

test("monoenergetic homogeneity coefficient is 1", () => {
  const cs = gammaSpectrum("Cs-137");
  assert.ok(Math.abs(homogeneityCoefficient(cs, "Pb") - 1) < 0.01);
});

test("air kerma positive and reduced by filtration", () => {
  const s = xraySpectrum(100);
  const k0 = airKerma(s);
  assert.ok(k0 > 0);
  assert.ok(airKerma(filterSpectrum(s, [{ material: "Cu", thicknessMm: 2 }])) < k0);
});

test("effective energy of a mono beam is its line energy", () => {
  const cs = gammaSpectrum("Cs-137");
  const eff = effectiveEnergy(cs, "Pb");
  assert.ok(Math.abs(eff - 661.657) / 661.657 < 0.03, `${eff}`);
});
