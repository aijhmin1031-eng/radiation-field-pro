import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coverageFactor95,
  typeAUncertainty,
  combineRelative,
  formatExpanded,
} from "./uncertainty.ts";

test("coverageFactor95 matches the Student-t table at key degrees of freedom", () => {
  assert.ok(Math.abs(coverageFactor95(1) - 12.706) < 1e-3);
  assert.ok(Math.abs(coverageFactor95(2) - 4.303) < 1e-3);
  assert.ok(Math.abs(coverageFactor95(9) - 2.262) < 1e-3); // N=10
  assert.ok(Math.abs(coverageFactor95(29) - 2.045) < 1e-3); // N=30
  assert.ok(Math.abs(coverageFactor95(Infinity) - 1.95996) < 1e-4);
});

test("coverageFactor95 interpolates monotonically toward the normal limit", () => {
  // between tabulated 30 (2.042) and 40 (2.021)
  const k35 = coverageFactor95(35);
  assert.ok(k35 < 2.042 && k35 > 2.021, `${k35}`);
  // beyond the table it decreases toward 1.95996 but never below it
  const k500 = coverageFactor95(500);
  assert.ok(k500 < 1.972 && k500 > 1.95996, `${k500}`);
  // monotone non-increasing in nu
  let prev = coverageFactor95(1);
  for (const nu of [2, 3, 5, 10, 20, 50, 100, 300, 1000, Infinity]) {
    const k = coverageFactor95(nu);
    assert.ok(k <= prev + 1e-9, `k(${nu})=${k} > prev ${prev}`);
    prev = k;
  }
});

test("coverageFactor95 rejects nu < 1", () => {
  assert.throws(() => coverageFactor95(0.5));
});

test("typeAUncertainty: textbook sample", () => {
  // readings with mean 10, known spread
  const r = typeAUncertainty([10, 12, 8, 11, 9]); // n=5, mean=10
  assert.equal(r.n, 5);
  assert.ok(Math.abs(r.mean - 10) < 1e-9);
  // s = sqrt( ((0)+(4)+(4)+(1)+(1))/4 ) = sqrt(10/4)= sqrt(2.5)=1.5811
  assert.ok(Math.abs(r.standardDeviation - 1.5811388) < 1e-5, `${r.standardDeviation}`);
  // u = s/sqrt(5) = 0.70711
  assert.ok(Math.abs(r.standardUncertainty - 0.7071068) < 1e-5, `${r.standardUncertainty}`);
  assert.equal(r.degreesOfFreedom, 4);
  assert.ok(Math.abs(r.coverageFactor - 2.776) < 1e-3);
  // U = 2.776 * 0.70711 = 1.9629
  assert.ok(Math.abs(r.expandedUncertainty - 1.962843) < 1e-3, `${r.expandedUncertainty}`);
  assert.ok(Math.abs(r.lower - (10 - r.expandedUncertainty)) < 1e-12);
  assert.ok(Math.abs(r.upper - (10 + r.expandedUncertainty)) < 1e-12);
  assert.equal(r.confidenceLevel, 0.95);
});

test("typeAUncertainty: identical readings give zero uncertainty", () => {
  const r = typeAUncertainty([5, 5, 5, 5]);
  assert.equal(r.standardDeviation, 0);
  assert.equal(r.expandedUncertainty, 0);
  assert.equal(r.mean, 5);
});

test("typeAUncertainty: small N widens the interval (k grows)", () => {
  const spread = [9, 11];
  const r2 = typeAUncertainty(spread); // n=2, nu=1, k=12.706
  assert.equal(r2.degreesOfFreedom, 1);
  assert.ok(Math.abs(r2.coverageFactor - 12.706) < 1e-3);
  const r10 = typeAUncertainty([9, 11, 10, 10, 9, 11, 10, 10, 9, 11]);
  assert.ok(r10.coverageFactor < r2.coverageFactor);
});

test("typeAUncertainty: needs at least two readings", () => {
  assert.throws(() => typeAUncertainty([42]));
});

test("typeAUncertainty: relative uncertainties are u/|mean| and U/|mean|", () => {
  const r = typeAUncertainty([100, 102, 98, 101, 99]);
  assert.ok(Math.abs(r.relativeStandardUncertainty - r.standardUncertainty / 100) < 1e-12);
  assert.ok(Math.abs(r.relativeExpandedUncertainty - r.expandedUncertainty / 100) < 1e-12);
});

test("combineRelative: quadrature sum of relative components", () => {
  // 3% (large sample) and 4% (exact) -> 5%
  const c = combineRelative(200, [
    { label: "repeatability", relativeStandardUncertainty: 0.03, degreesOfFreedom: Infinity },
    { label: "calibration", relativeStandardUncertainty: 0.04 },
  ]);
  assert.ok(Math.abs(c.combinedRelativeStandardUncertainty - 0.05) < 1e-9);
  assert.ok(Math.abs(c.combinedStandardUncertainty - 10) < 1e-9); // 0.05 * 200
  // both infinite dof -> k = normal 1.95996
  assert.ok(Math.abs(c.coverageFactor - 1.95996) < 1e-4);
  assert.ok(Math.abs(c.expandedUncertainty - 1.95996 * 10) < 1e-3);
});

test("combineRelative: Welch-Satterthwaite lowers effective dof with a dominant finite-dof term", () => {
  const c = combineRelative(1, [
    { label: "typeA n=3", relativeStandardUncertainty: 0.1, degreesOfFreedom: 2 },
    { label: "typeB exact", relativeStandardUncertainty: 0.01, degreesOfFreedom: Infinity },
  ]);
  // dominated by the finite-dof term -> nu_eff close to 2, k well above the normal value
  assert.ok(c.effectiveDegreesOfFreedom < 3 && c.effectiveDegreesOfFreedom >= 2, `${c.effectiveDegreesOfFreedom}`);
  assert.ok(c.coverageFactor > 3.5, `${c.coverageFactor}`);
});

test("combineRelative: feeding a Type A result's relative uncertainty is consistent", () => {
  const a = typeAUncertainty([50, 52, 48, 51, 49]);
  const c = combineRelative(a.mean, [
    { label: "repeatability", relativeStandardUncertainty: a.relativeStandardUncertainty, degreesOfFreedom: a.degreesOfFreedom },
  ]);
  // single component -> combined equals that component, and k matches t(nu)
  assert.ok(Math.abs(c.combinedRelativeStandardUncertainty - a.relativeStandardUncertainty) < 1e-12);
  assert.ok(Math.abs(c.coverageFactor - a.coverageFactor) < 1e-9);
  assert.ok(Math.abs(c.expandedUncertainty - a.expandedUncertainty) < 1e-9);
});

test("formatExpanded renders value, U and k", () => {
  const s = formatExpanded(1.23456, 0.0123, 2.26);
  assert.match(s, /1\.235 ± 0\.012 \(k = 2\.26, ~95 %\)/);
});
