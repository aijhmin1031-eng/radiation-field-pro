import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_INPUT,
  presetFromIso,
  isoPresetNames,
  buildSpectrum,
  provisionalMaterial,
  computeFast,
  computeIso,
  fmt,
  fmtDev,
  type WorkbenchInput,
} from "./compute.ts";

const withInput = (patch: Partial<WorkbenchInput>): WorkbenchInput => ({ ...DEFAULT_INPUT, ...patch });

test("기본 입력은 N-80 프리셋(80 kV, 4 mm Al 고유 + 2 mm Cu, 공기 2500 mm)", () => {
  assert.equal(DEFAULT_INPUT.source, "xray");
  assert.equal(DEFAULT_INPUT.xray.kvp, 80);
  assert.deepEqual(DEFAULT_INPUT.xray.filters, [
    { material: "Al", thicknessMm: 4 },
    { material: "Cu", thicknessMm: 2 },
  ]);
  assert.equal(DEFAULT_INPUT.xray.airMm, 2500);
  assert.equal(DEFAULT_INPUT.alphaDeg, 0);
});

test("프리셋 목록은 50개, 미지 선질은 예외", () => {
  assert.equal(isoPresetNames().length, 50);
  assert.equal(presetFromIso("N-10").filters[0].material, "Be");
  assert.throws(() => presetFromIso("X-1"));
});

test("computeFast(N-80): 특성·운영선량이 물리적 범위이고 ISO 표값 근처", () => {
  const out = computeFast(DEFAULT_INPUT);
  const c = out.characteristics;
  assert.equal(c.material, "Cu");
  assert.ok(Math.abs(c.hvl1Mm - 0.58) / 0.58 < 0.04, `${c.hvl1Mm}`);
  assert.ok(Math.abs(c.meanEnergyKeV - 65.2) / 65.2 < 0.03, `${c.meanEnergyKeV}`);
  assert.ok(c.hvl2Mm >= c.hvl1Mm && c.homogeneity <= 1.0001);
  assert.ok(out.operational.hp10 > 1.5 && out.operational.hp10 < 2.0);
  assert.ok(out.operational.hStar10 > 1.4 && out.operational.hStar10 < 1.9);
  assert.equal(out.gamma, null);
  assert.ok(Math.abs(out.airReading.factor - 1) < 1e-9); // 기준조건
});

test("입사각은 0–75°로 묶이고 Hp(10)은 각도가 커지면 감소", () => {
  const a0 = computeFast(withInput({ alphaDeg: 0 })).operational.hp10;
  const a60 = computeFast(withInput({ alphaDeg: 60 })).operational.hp10;
  const a99 = computeFast(withInput({ alphaDeg: 99 })).operational;
  assert.ok(a60 < a0);
  assert.equal(a99.alphaDeg, 75);
});

test("관전압은 10–400 kV로 묶이고 두께 0 여과는 무시된다", () => {
  const hi = computeFast(withInput({ xray: { kvp: 9999, filters: [], airMm: 0 } }));
  assert.equal(hi.spectrum.energy[hi.spectrum.energy.length - 1], 400);
  const a = buildSpectrum(withInput({ xray: { kvp: 80, filters: [{ material: "Pb", thicknessMm: 0 }], airMm: 0 } }));
  const b = buildSpectrum(withInput({ xray: { kvp: 80, filters: [], airMm: 0 } }));
  assert.deepEqual(a.fluence, b.fluence);
});

test("auto 재질 잠정값: 감마 Pb, 저관전압 Al, 그 외 Cu; 수동 지정 우선", () => {
  assert.equal(provisionalMaterial(withInput({ source: "Cs-137" })), "Pb");
  assert.equal(provisionalMaterial(withInput({ xray: { kvp: 30, filters: [], airMm: 0 } })), "Al");
  assert.equal(provisionalMaterial(DEFAULT_INPUT), "Cu");
  assert.equal(provisionalMaterial(withInput({ hvlMaterial: "Al" })), "Al");
});

test("감마(Cs-137 1 GBq, 1 m, 같은 날): 커마율 ≈ 77 μGy/h, 한 반감기 뒤 절반", () => {
  const g = {
    activity: 1,
    activityUnit: "GBq" as const,
    referenceDate: "2026-01-01",
    evalDate: "2026-01-01",
    distanceM: 1,
  };
  const out = computeFast(withInput({ source: "Cs-137", gamma: g }));
  assert.ok(
    out.gamma && out.gamma.airKermaRateUGyPerH > 70 && out.gamma.airKermaRateUGyPerH < 80,
    `${out.gamma?.airKermaRateUGyPerH}`,
  );
  assert.equal(out.characteristics.material, "Pb");
  const later = computeFast(withInput({ source: "Cs-137", gamma: { ...g, evalDate: "2056-01-30" } })); // ≈30.08 y
  assert.ok(Math.abs(later.gamma!.activityNowBq / out.gamma!.activityNowBq - 0.5) < 0.01);
});

test("커마 투과율: N-80 은 0~1 사이, 여과 없으면 1, 감마는 1", () => {
  const n80 = computeFast(DEFAULT_INPUT).kermaTransmission;
  assert.ok(n80 > 0 && n80 < 1, `${n80}`);
  const bare = computeFast(withInput({ xray: { kvp: 80, filters: [], airMm: 0 } })).kermaTransmission;
  assert.ok(Math.abs(bare - 1) < 1e-12);
  assert.equal(computeFast(withInput({ source: "Co-60" })).kermaTransmission, 1);
});

test("판독값 보정: 고온·저압이면 k_ρ > 1 이고 보정값 = 판독값 × k_ρ", () => {
  const out = computeFast(withInput({ airReading: { reading: 2, tempC: 30, pressureKPa: 95, relHumidityPct: 50 } }));
  assert.ok(out.airReading.factor > 1);
  assert.ok(Math.abs(out.airReading.corrected - 2 * out.airReading.factor) < 1e-12);
});

test("computeIso(N-80): 자동매칭 N-80, 비교표 통과, auto 재질 특성은 비교 재질(Cu)", () => {
  const fast = computeFast(DEFAULT_INPUT);
  const iso = computeIso(DEFAULT_INPUT, fast.spectrum);
  assert.equal(iso.applicable, true);
  assert.equal(iso.matched?.name, "N-80");
  assert.equal(iso.selected, "N-80");
  assert.equal(iso.comparison?.pass, true);
  assert.equal(iso.characteristics?.material, "Cu");
});

test("computeIso: 수동 선질 지정과 허용밴드 반영, 감마는 해당 없음", () => {
  const fast = computeFast(DEFAULT_INPUT);
  const iso = computeIso(withInput({ isoQuality: "N-30", tolerancePct: 1 }), fast.spectrum);
  assert.equal(iso.selected, "N-30");
  assert.equal(iso.comparison?.tolerancePct, 1);
  assert.equal(iso.comparison?.pass, false);
  const g = computeIso(withInput({ source: "Co-60" }), buildSpectrum(withInput({ source: "Co-60" })));
  assert.equal(g.applicable, false);
  assert.equal(g.comparison, null);
});

test("표기: 유효숫자 4자리, 편차 부호 포함 소수 2자리", () => {
  assert.equal(fmt(0.57534), "0.5753");
  assert.equal(fmt(65.2345), "65.23");
  assert.equal(fmt(1234.56), "1235");
  assert.equal(fmt(0), "0");
  assert.equal(fmt(NaN), "—");
  assert.equal(fmtDev(-0.8), "-0.80 %");
  assert.equal(fmtDev(1.234), "+1.23 %");
  assert.equal(fmtDev(null), "—");
});
