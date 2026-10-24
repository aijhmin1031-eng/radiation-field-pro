import { test } from "node:test";
import assert from "node:assert/strict";
import {
  saturationVaporPressure,
  airDensity,
  REFERENCE_AIR_DENSITY,
  REFERENCE_CONDITIONS,
  densityCorrectionFactor,
  applyDensityCorrection,
  temperaturePressureFactor,
} from "./air-density.ts";

test("포화수증기압: 20 °C에서 약 2.34 kPa", () => {
  const p = saturationVaporPressure(20);
  assert.ok(Math.abs(p - 2339) / 2339 < 0.01, `${p}`); // 문헌 2339 Pa
});

test("기준 공기밀도 ρ0 ≈ 1.197 kg/m³ (ISO 4037-4 기준조건)", () => {
  assert.ok(Math.abs(REFERENCE_AIR_DENSITY - 1.197) < 0.002, `${REFERENCE_AIR_DENSITY}`);
});

test("건조공기(RH 0) 20 °C, 101.325 kPa ≈ 1.204 kg/m³", () => {
  const rho = airDensity(20, 101.325, 0);
  assert.ok(Math.abs(rho - 1.2041) < 0.002, `${rho}`);
  // 습윤 공기는 건조공기보다 가볍다
  assert.ok(airDensity(20, 101.325, 0.65) < rho);
});

test("보정인자는 기준조건에서 정확히 1", () => {
  const k = densityCorrectionFactor(
    REFERENCE_CONDITIONS.tempC,
    REFERENCE_CONDITIONS.pressureKPa,
    REFERENCE_CONDITIONS.relHumidity,
  );
  assert.ok(Math.abs(k - 1) < 1e-12, `${k}`);
});

test("고온·저압(밀도 ↓)이면 k_ρ > 1, 저온·고압이면 k_ρ < 1", () => {
  assert.ok(densityCorrectionFactor(30, 101.325) > 1);
  assert.ok(densityCorrectionFactor(20, 95) > 1);
  assert.ok(densityCorrectionFactor(10, 101.325) < 1);
  assert.ok(densityCorrectionFactor(20, 105) < 1);
});

test("applyDensityCorrection는 판독값에 선형", () => {
  const c = { tempC: 25, pressureKPa: 99.5 };
  const k = densityCorrectionFactor(25, 99.5);
  assert.ok(Math.abs(applyDensityCorrection(2, c) - 2 * k) < 1e-12);
  assert.ok(Math.abs(applyDensityCorrection(10, c) - 10 * k) < 1e-12);
});

test("전통적 k_TP: 기준에서 1, 건조공기 밀도비와 정확히 일치, 습윤 보정과는 1 % 이내", () => {
  assert.ok(Math.abs(temperaturePressureFactor(20, 101.325) - 1) < 1e-12);
  for (const [T, P] of [
    [25, 100],
    [15, 102],
    [30, 95],
  ]) {
    const kTP = temperaturePressureFactor(T, P);
    // 정확한 항등식: 건조공기 밀도비 ρ_dry(T0,P0)/ρ_dry(T,P) = (T/T0)(P0/P)
    const dryRatio = airDensity(20, 101.325, 0) / airDensity(T, P, 0);
    assert.ok(Math.abs(kTP - dryRatio) < 1e-12, `dry identity T=${T} P=${P}: ${kTP} vs ${dryRatio}`);
    // 습윤 모델(65 % RH 고정)은 수증기 때문에 k_TP와 1 % 미만으로 갈린다(고온에서 커짐)
    const kRho = densityCorrectionFactor(T, P, 0.65);
    assert.ok(Math.abs(kTP - kRho) / kRho < 0.01, `T=${T} P=${P}: ${kTP} vs ${kRho}`);
  }
});

test("잘못된 입력은 예외", () => {
  assert.throws(() => airDensity(20, 101.325, 1.5));
  assert.throws(() => airDensity(-300, 101.325));
});
