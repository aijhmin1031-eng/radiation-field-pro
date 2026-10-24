// 공기밀도 보정 (ISO 4037-4:2019 Annex A).
//
// 개방형(벤트형) 전리함의 공동 내 공기 질량은 공기밀도에 비례하므로, 판독값은 밀도에 따라
// 달라진다. 교정은 기준조건(20 °C, 101.325 kPa, 65 % RH)에서 이루어지므로, 다른 조건에서의
// 측정값은 밀도 보정인자 k_ρ = ρ0 / ρ(T, P, h) 를 곱해 기준조건으로 환산한다.
//
// 습윤 공기 밀도는 이상기체 혼합 모델로 계산한다(ISO 4037-4 Annex A / CIPM 근사):
//   ρ = [ P·M_d - p_v·(M_d - M_w) ] / (R·T)
//   p_v = h · p_sat(T),  p_sat: Magnus(Alduchov-Eskridge) 포화수증기압.
// 이 모델은 기준조건에서 ρ0 ≈ 1.197 kg/m³ (표준 기준 공기밀도)를 재현한다.

const R = 8.314462618; // J/(mol·K)
const M_DRY = 0.0289652; // kg/mol (건조공기)
const M_WATER = 0.018015268; // kg/mol (물)
const T_ZERO_C = 273.15; // K

export interface AirConditions {
  tempC: number; // °C
  pressureKPa: number; // kPa
  relHumidity?: number; // 0..1 (기본 0.65 = 기준)
}

/** 기준조건(ISO 4037-4). */
export const REFERENCE_CONDITIONS: Required<AirConditions> = {
  tempC: 20,
  pressureKPa: 101.325,
  relHumidity: 0.65,
};

/** 포화수증기압 p_sat(T) [Pa] — Magnus(Alduchov-Eskridge, 1996). */
export function saturationVaporPressure(tempC: number): number {
  return 610.94 * Math.exp((17.625 * tempC) / (tempC + 243.04));
}

/** 습윤 공기 밀도 ρ(T, P, h) [kg/m³]. relHumidity 기본 = 기준(0.65). */
export function airDensity(tempC: number, pressureKPa: number, relHumidity = REFERENCE_CONDITIONS.relHumidity): number {
  if (relHumidity < 0 || relHumidity > 1) throw new Error(`relative humidity must be 0..1 (got ${relHumidity})`);
  const T = tempC + T_ZERO_C;
  if (T <= 0) throw new Error(`temperature below absolute zero (${tempC} °C)`);
  const P = pressureKPa * 1000; // Pa
  const pv = relHumidity * saturationVaporPressure(tempC); // 수증기 분압 Pa
  return (P * M_DRY - pv * (M_DRY - M_WATER)) / (R * T);
}

/** 기준 공기밀도 ρ0 [kg/m³] (기준조건에서 모델로 계산 — 약 1.197). */
export const REFERENCE_AIR_DENSITY = airDensity(
  REFERENCE_CONDITIONS.tempC,
  REFERENCE_CONDITIONS.pressureKPa,
  REFERENCE_CONDITIONS.relHumidity,
);

/** 밀도 보정인자 k_ρ = ρ0 / ρ(T, P, h). 측정 공기밀도가 기준보다 낮으면(고온·저압) > 1. */
export function densityCorrectionFactor(
  tempC: number,
  pressureKPa: number,
  relHumidity = REFERENCE_CONDITIONS.relHumidity,
): number {
  return REFERENCE_AIR_DENSITY / airDensity(tempC, pressureKPa, relHumidity);
}

/** 벤트형 전리함 판독값(공기커마 또는 커마율)을 기준조건으로 환산: reading × k_ρ. */
export function applyDensityCorrection(reading: number, conditions: AirConditions): number {
  return reading * densityCorrectionFactor(conditions.tempC, conditions.pressureKPa, conditions.relHumidity);
}

/** 온도·압력만의 보정인자 k_TP = (T/T0)·(P0/P) (건조/습도 무시, 전통적 벤트형 보정). */
export function temperaturePressureFactor(
  tempC: number,
  pressureKPa: number,
  refTempC = REFERENCE_CONDITIONS.tempC,
  refPressureKPa = REFERENCE_CONDITIONS.pressureKPa,
): number {
  const T = tempC + T_ZERO_C;
  const T0 = refTempC + T_ZERO_C;
  return (T / T0) * (refPressureKPa / pressureKPa);
}
