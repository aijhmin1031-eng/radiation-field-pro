// 방사성핵종 붕괴와 점선원 공기커마율.
//
// 붕괴: A(t) = A0 · exp(-λt),  λ = ln2 / T½.
// 공기커마율(점선원, 역제곱, 공기 감쇠·산란 무시):
//   K̇ = (A / (4π d²)) · Σ_i p_i · E_i[J] · (μen/ρ)_air(E_i)[m²/kg]      [Gy/s]
// 여기서 p_i는 선당 방출확률, E_i는 선 에너지, (μen/ρ)_air 는 공기 질량에너지흡수계수.
// 공기커마율 상수 Γ = K̇·d²/A 는 핵종만의 상수로, 문헌값과 대조해 선 데이터·μen/ρ·단위환산 전체
// 사슬을 검증한다.
import { gammaSpectrum } from "./spectrum";
import { airMuenOverRho } from "./attenuation";

const KEV_TO_J = 1.602176634e-16; // 1 keV in J
const CM2_PER_G_TO_M2_PER_KG = 0.1;
const DAY_S = 86400;
const YEAR_DAYS = 365.25;

/** 핵종 반감기 [일] (평가값). */
export const NUCLIDE_HALF_LIFE_DAYS: Record<string, number> = {
  "Cs-137": 30.08 * YEAR_DAYS, // 30.08 y
  "Co-60": 5.2711 * YEAR_DAYS, // 5.2711 y
};

function halfLifeOf(nuclide: string): number {
  const t = NUCLIDE_HALF_LIFE_DAYS[nuclide];
  if (t === undefined) throw new Error(`unknown nuclide ${nuclide}`);
  return t;
}

/** 붕괴상수 λ [1/일]. */
export function decayConstant(halfLifeDays: number): number {
  if (!(halfLifeDays > 0)) throw new Error(`half-life must be > 0 (got ${halfLifeDays})`);
  return Math.LN2 / halfLifeDays;
}

/** 붕괴인자 exp(-λt). elapsedDays < 0 이면 기준일 이전으로의 역산(> 1). */
export function decayFactor(halfLifeDays: number, elapsedDays: number): number {
  return Math.exp(-decayConstant(halfLifeDays) * elapsedDays);
}

/** 두 날짜 사이의 경과일(소수 포함). 문자열은 ISO 8601. */
export function daysBetween(fromDate: Date | string, toDate: Date | string): number {
  const a = typeof fromDate === "string" ? new Date(fromDate) : fromDate;
  const b = typeof toDate === "string" ? new Date(toDate) : toDate;
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) throw new Error("invalid date");
  return (b.getTime() - a.getTime()) / (DAY_S * 1000);
}

/** 기준일 활동도 A0로부터 경과일 후 활동도. nuclide는 핵종명 또는 반감기[일]. */
export function activityAt(activity0Bq: number, nuclide: string | number, elapsedDays: number): number {
  const t = typeof nuclide === "number" ? nuclide : halfLifeOf(nuclide);
  return activity0Bq * decayFactor(t, elapsedDays);
}

/** 공기커마율 상수 Γ [Gy·m²/(Bq·s)] — 점선원, 선 데이터와 μen/ρ 로부터. */
export function airKermaRateConstant(nuclide: string): number {
  const spec = gammaSpectrum(nuclide);
  let sum = 0;
  for (let i = 0; i < spec.energy.length; i++) {
    const e = spec.energy[i];
    sum += spec.fluence[i] * e * KEV_TO_J * airMuenOverRho(e) * CM2_PER_G_TO_M2_PER_KG;
  }
  return sum / (4 * Math.PI);
}

/** Γ 를 관례 단위 μGy·m²/(MBq·h) 로 환산. */
export function airKermaRateConstantConventional(nuclide: string): number {
  // Gy·m²/(Bq·s) → μGy·m²/(MBq·h): ×1e6 (μGy) ×1e6 (MBq) ×3600 (h)
  return airKermaRateConstant(nuclide) * 1e6 * 1e6 * 3600;
}

/** 점선원 공기커마율 [Gy/s] at distance d [m] for activity A [Bq]. */
export function airKermaRate(nuclide: string, activityBq: number, distanceM: number): number {
  if (!(distanceM > 0)) throw new Error(`distance must be > 0 (got ${distanceM})`);
  return (airKermaRateConstant(nuclide) * activityBq) / (distanceM * distanceM);
}

/** 기준일 활동도로부터 붕괴를 반영한 특정 일자의 공기커마율 [Gy/s]. */
export function airKermaRateAt(
  nuclide: string,
  activity0Bq: number,
  referenceDate: Date | string,
  atDate: Date | string,
  distanceM: number,
): number {
  const a = activityAt(activity0Bq, nuclide, daysBetween(referenceDate, atDate));
  return airKermaRate(nuclide, a, distanceM);
}
