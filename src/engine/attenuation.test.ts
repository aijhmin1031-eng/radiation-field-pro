import { test } from "node:test";
import assert from "node:assert/strict";
import { muOverRho, linearMu, airMuenOverRho, ENERGY_MIN, ENERGY_MAX } from "./attenuation.ts";

test("mu/rho matches NIST at grid points", () => {
  assert.ok(Math.abs(muOverRho("Al", 100) - 0.1708) / 0.1708 < 0.01, `Al ${muOverRho("Al", 100)}`);
  assert.ok(Math.abs(muOverRho("Water", 100) - 0.1710) / 0.1710 < 0.01, `Water ${muOverRho("Water", 100)}`);
});

test("log-log interpolation stays between neighbours", () => {
  const a = muOverRho("Cu", 100);
  const b = muOverRho("Cu", 101);
  const mid = muOverRho("Cu", 100.5);
  assert.ok(mid <= Math.max(a, b) + 1e-9 && mid >= Math.min(a, b) - 1e-9, `${a} ${mid} ${b}`);
});

test("linearMu is mu/rho * density / 10 (per mm)", () => {
  const expected = (muOverRho("Al", 100) * 2.699) / 10;
  assert.ok(Math.abs(linearMu("Al", 100) - expected) < 1e-6);
});

test("air mu_en/rho for kerma", () => {
  assert.ok(Math.abs(airMuenOverRho(100) - 0.02316) / 0.02316 < 0.01, `${airMuenOverRho(100)}`);
});

test("out-of-range energy clamps, never NaN", () => {
  assert.ok(Number.isFinite(muOverRho("Al", 0.1)));
  assert.ok(Number.isFinite(muOverRho("Al", 9999)));
  assert.equal(ENERGY_MIN, 1);
  assert.equal(ENERGY_MAX, 1400);
});
