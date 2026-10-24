import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NUCLIDE_HALF_LIFE_DAYS,
  decayConstant,
  decayFactor,
  daysBetween,
  activityAt,
  airKermaRateConstant,
  airKermaRateConstantConventional,
  airKermaRate,
  airKermaRateAt,
} from "./decay.ts";

test("붕괴인자: 반감기에서 0.5, 두 반감기에서 0.25, 역산(음수 경과)은 > 1", () => {
  const t = NUCLIDE_HALF_LIFE_DAYS["Cs-137"];
  assert.ok(Math.abs(decayFactor(t, t) - 0.5) < 1e-12);
  assert.ok(Math.abs(decayFactor(t, 2 * t) - 0.25) < 1e-12);
  assert.ok(decayFactor(t, -t) > 1);
  assert.equal(decayFactor(t, 0), 1);
});

test("붕괴상수 λ = ln2/T½, 비양수 반감기는 예외", () => {
  assert.ok(Math.abs(decayConstant(10) - Math.LN2 / 10) < 1e-15);
  assert.throws(() => decayConstant(0));
});

test("daysBetween: ISO 날짜, 소수 일, 잘못된 날짜 예외", () => {
  assert.equal(daysBetween("2026-01-01", "2026-01-11"), 10);
  assert.ok(Math.abs(daysBetween("2026-01-01T00:00:00Z", "2026-01-01T12:00:00Z") - 0.5) < 1e-12);
  assert.throws(() => daysBetween("not-a-date", "2026-01-01"));
});

test("activityAt: 핵종명 또는 반감기[일]로 호출, Co-60 5.2711년 후 절반", () => {
  const t = NUCLIDE_HALF_LIFE_DAYS["Co-60"];
  assert.ok(Math.abs(activityAt(1000, "Co-60", t) - 500) < 1e-9);
  assert.ok(Math.abs(activityAt(1000, t, t) - 500) < 1e-9);
  assert.throws(() => activityAt(1, "Xx-1", 1));
});

test("공기커마율 상수 Γ가 문헌값과 4 % 이내 (Cs-137 0.0771, Co-60 0.3085 μGy·m²/(MBq·h))", () => {
  // 선 데이터 + μen/ρ + 단위환산 사슬 전체를 문헌 Γ로 검증한다.
  // Cs-137 내장 스펙트럼은 661.657 keV 선만 포함(Ba K X선 미포함)하므로 약간 낮게 나온다.
  const cs = airKermaRateConstantConventional("Cs-137");
  const co = airKermaRateConstantConventional("Co-60");
  assert.ok(Math.abs(cs - 0.0771) / 0.0771 < 0.04, `Cs-137 Γ=${cs}`);
  assert.ok(Math.abs(co - 0.3085) / 0.3085 < 0.04, `Co-60 Γ=${co}`);
});

test("단위 환산: 관례 단위 Γ = SI Γ × 3.6e15", () => {
  const si = airKermaRateConstant("Cs-137");
  assert.ok(Math.abs(airKermaRateConstantConventional("Cs-137") - si * 3.6e15) / (si * 3.6e15) < 1e-12);
});

test("공기커마율: 활동도에 선형, 거리에 역제곱, 거리 0 이하는 예외", () => {
  const k1 = airKermaRate("Co-60", 1e9, 1);
  assert.ok(Math.abs(airKermaRate("Co-60", 2e9, 1) - 2 * k1) < 1e-20);
  assert.ok(Math.abs(airKermaRate("Co-60", 1e9, 2) - k1 / 4) < 1e-20);
  assert.throws(() => airKermaRate("Co-60", 1e9, 0));
});

test("airKermaRateAt: 기준일에서 한 반감기 뒤면 커마율도 절반", () => {
  const t = NUCLIDE_HALF_LIFE_DAYS["Cs-137"];
  const ref = new Date("2020-01-01T00:00:00Z");
  const later = new Date(ref.getTime() + t * 86400 * 1000);
  const k0 = airKermaRateAt("Cs-137", 1e9, ref, ref, 1);
  const k1 = airKermaRateAt("Cs-137", 1e9, ref, later, 1);
  assert.ok(Math.abs(k1 / k0 - 0.5) < 1e-9, `${k1 / k0}`);
});

test("1 GBq Cs-137, 1 m 공기커마율은 μGy/h 규모 (약 77 μGy/h)", () => {
  const gyPerS = airKermaRate("Cs-137", 1e9, 1);
  const uGyPerH = gyPerS * 1e6 * 3600;
  assert.ok(uGyPerH > 70 && uGyPerH < 80, `${uGyPerH}`);
});
