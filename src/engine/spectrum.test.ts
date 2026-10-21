import { test } from "node:test";
import assert from "node:assert/strict";
import { xraySpectrum, gammaSpectrum, filterSpectrum, meanEnergy, type Spectrum } from "./spectrum.ts";
import { linearMu } from "./attenuation.ts";

test("Cs-137 is a single 662 keV line", () => {
  const s = gammaSpectrum("Cs-137");
  assert.equal(s.energy.length, 1);
  assert.ok(Math.abs(s.energy[0] - 661.657) < 0.01);
  assert.ok(Math.abs(meanEnergy(s) - 661.657) < 0.01);
});

test("Co-60 mean energy ~1252.9 keV", () => {
  const s = gammaSpectrum("Co-60");
  assert.equal(s.energy.length, 2);
  assert.ok(Math.abs(meanEnergy(s) - 1252.9) < 1.0, `${meanEnergy(s)}`);
});

test("X-ray 100 kVp shows the tungsten K characteristic peak", () => {
  const s = xraySpectrum(100);
  const f = (e: number) => s.fluence[s.energy.indexOf(e)];
  assert.ok(f(59) > 2 * f(55), `peak ${f(59)} vs continuum ${f(55)}`);
  assert.equal(s.energy[s.energy.length - 1], 100);
});

test("filtration hardens the beam and lowers total fluence", () => {
  const raw = xraySpectrum(100);
  const filt = filterSpectrum(raw, [{ material: "Cu", thicknessMm: 2 }]);
  const sum = (s: Spectrum) => s.fluence.reduce((a, b) => a + b, 0);
  assert.ok(sum(filt) < sum(raw));
  assert.ok(meanEnergy(filt) > meanEnergy(raw));
});

test("gamma filtration follows exp(-mu t)", () => {
  const cs = gammaSpectrum("Cs-137");
  const t = 10; // mm Pb
  const filt = filterSpectrum(cs, [{ material: "Pb", thicknessMm: t }]);
  const expected = cs.fluence[0] * Math.exp(-linearMu("Pb", 661.657) * t);
  assert.ok(Math.abs(filt.fluence[0] - expected) < 1e-9);
});
