// 계산 어댑터: 워크벤치 입력 상태 → 엔진 호출 → 화면용 출력.
// UI는 이 모듈만 호출한다(엔진을 직접 부르지 않음). 순수 함수라 node:test 로 검증한다.
//
// 두 단계로 나뉜다(docs/ui-design.md "갱신 방식"):
//  - computeFast : 스펙트럼·특성·운영선량·감마·판독 보정 — 입력마다 동기 계산(<10 ms)
//  - computeIso  : ISO 자동매칭 + 비교표 (≈80 ms) — UI가 useDeferredValue 로 분리
import type { Spectrum } from "../engine/spectrum";
import { xraySpectrum, gammaSpectrum, filterSpectrum, meanEnergy } from "../engine/spectrum";
import { airKerma, hvl1, hvl2, homogeneityCoefficient, effectiveEnergy } from "../engine/dosimetry";
import { meanConversionCoefficient } from "../engine/operational-dose";
import {
  isoQualities,
  isoQuality,
  matchQuality,
  compareToQuality,
  type Comparison,
  type IsoQuality,
} from "../engine/iso-comparison";
import { activityAt, daysBetween, airKermaRate } from "../engine/decay";
import { densityCorrectionFactor } from "../engine/air-density";

export type SourceKind = "xray" | "Cs-137" | "Co-60";
export type HvlMaterial = "auto" | "Al" | "Cu" | "Pb";
export const FILTER_MATERIALS = ["Be", "Al", "Cu", "Sn", "Ta", "W", "Pb"] as const;

export interface FilterRow {
  material: string;
  thicknessMm: number;
}
export interface XrayInput {
  kvp: number;
  filters: FilterRow[]; // 첫 행 = 고유여과
  airMm: number;
}
export interface GammaInput {
  activity: number;
  activityUnit: "MBq" | "GBq";
  referenceDate: string; // yyyy-mm-dd
  evalDate: string;
  distanceM: number;
}
export interface AirReadingInput {
  reading: number;
  tempC: number;
  pressureKPa: number;
  relHumidityPct: number;
}
export interface WorkbenchInput {
  source: SourceKind;
  xray: XrayInput;
  gamma: GammaInput;
  alphaDeg: number;
  hvlMaterial: HvlMaterial;
  isoQuality: "auto" | string;
  tolerancePct: number;
  airReading: AirReadingInput;
}

export const KVP_MIN = 10;
export const KVP_MAX = 400;
export const ALPHA_MAX = 75;

const inh = (s: string): FilterRow => {
  const [v, , m] = s.split(" ");
  return { material: m, thicknessMm: parseFloat(v) };
};

/** ISO 선질 프리셋 → X선 입력(관전압·고유여과·부가여과·공기 2.5 m). */
export function presetFromIso(name: string): XrayInput {
  const q = isoQuality(name);
  if (!q) throw new Error(`unknown ISO quality ${name}`);
  return {
    kvp: q.kVp,
    filters: [inh(q.inherent), ...Object.entries(q.add).map(([material, t]) => ({ material, thicknessMm: t }))],
    airMm: 2500,
  };
}

export function isoPresetNames(): { name: string; series: string }[] {
  return isoQualities().map((q) => ({ name: q.name, series: q.series }));
}

const today = () => new Date().toISOString().slice(0, 10);

export const DEFAULT_INPUT: WorkbenchInput = {
  source: "xray",
  xray: presetFromIso("N-80"),
  gamma: { activity: 1, activityUnit: "GBq", referenceDate: today(), evalDate: today(), distanceM: 1 },
  alphaDeg: 0,
  hvlMaterial: "auto",
  isoQuality: "auto",
  tolerancePct: 5,
  airReading: { reading: 1, tempC: 20, pressureKPa: 101.325, relHumidityPct: 65 },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function buildSpectrum(input: WorkbenchInput): Spectrum {
  if (input.source === "xray") {
    const filters = [
      ...input.xray.filters.filter((f) => f.thicknessMm > 0),
      { material: "Air", thicknessMm: Math.max(0, input.xray.airMm) },
    ];
    return filterSpectrum(xraySpectrum(clamp(input.xray.kvp, KVP_MIN, KVP_MAX)), filters);
  }
  return gammaSpectrum(input.source);
}

/** auto 재질의 잠정값: 감마 Pb, X선은 ISO 관례(저관전압 Al, 그 외 Cu). ISO 매칭이 오면 그 재질로 바뀐다. */
export function provisionalMaterial(input: WorkbenchInput): "Al" | "Cu" | "Pb" {
  if (input.hvlMaterial !== "auto") return input.hvlMaterial;
  if (input.source !== "xray") return "Pb";
  return input.xray.kvp < 50 ? "Al" : "Cu";
}

export interface Characteristics {
  material: string;
  meanEnergyKeV: number;
  effectiveEnergyKeV: number;
  hvl1Mm: number;
  hvl2Mm: number;
  homogeneity: number;
}
export interface OperationalDose {
  alphaDeg: number;
  hp10: number; // Sv/Gy
  hStar10: number;
  hPrime007: number;
}
export interface GammaOutput {
  nuclide: string;
  activityNowBq: number;
  elapsedDays: number;
  airKermaRateUGyPerH: number;
}
export interface AirReadingOutput {
  factor: number;
  corrected: number;
}
export interface FastOutput {
  spectrum: Spectrum;
  characteristics: Characteristics;
  kermaTransmission: number; // 여과 후/전 공기커마 비 (감마 1)
  operational: OperationalDose;
  gamma: GammaOutput | null;
  airReading: AirReadingOutput;
}

export function characterize(spec: Spectrum, material: string): Characteristics {
  return {
    material,
    meanEnergyKeV: meanEnergy(spec),
    effectiveEnergyKeV: effectiveEnergy(spec, material),
    hvl1Mm: hvl1(spec, material),
    hvl2Mm: hvl2(spec, material),
    homogeneity: homogeneityCoefficient(spec, material),
  };
}

/** 부가여과 커마 투과율: 전체 여과 후 공기커마 / 고유여과(첫 행)+공기만 통과한 공기커마.
 *  관 출구 스펙트럼은 10 keV 이하 연성분이 커마를 지배해 기준으로 무의미하므로 고유여과를 기준으로 삼는다. 감마는 1. */
export function kermaTransmission(input: WorkbenchInput): number {
  if (input.source !== "xray") return 1;
  const inherent = input.xray.filters.slice(0, 1);
  const baseline = buildSpectrum({ ...input, xray: { ...input.xray, filters: inherent } });
  const k0 = airKerma(baseline);
  return k0 > 0 ? airKerma(buildSpectrum(input)) / k0 : 0;
}

export function computeFast(input: WorkbenchInput, material = provisionalMaterial(input)): FastOutput {
  const spectrum = buildSpectrum(input);
  const alpha = clamp(input.alphaDeg, 0, ALPHA_MAX);
  const operational: OperationalDose = {
    alphaDeg: alpha,
    hp10: meanConversionCoefficient(spectrum, "Hp(10)", alpha),
    hStar10: meanConversionCoefficient(spectrum, "H*(10)", alpha),
    hPrime007: meanConversionCoefficient(spectrum, "H'(0.07)", alpha),
  };
  let gamma: GammaOutput | null = null;
  if (input.source !== "xray") {
    const g = input.gamma;
    const a0 = g.activity * (g.activityUnit === "GBq" ? 1e9 : 1e6);
    const elapsed = daysBetween(g.referenceDate, g.evalDate);
    const aNow = activityAt(a0, input.source, elapsed);
    const d = Math.max(1e-6, g.distanceM);
    gamma = {
      nuclide: input.source,
      activityNowBq: aNow,
      elapsedDays: elapsed,
      airKermaRateUGyPerH: airKermaRate(input.source, aNow, d) * 1e6 * 3600,
    };
  }
  const r = input.airReading;
  const factor = densityCorrectionFactor(r.tempC, r.pressureKPa, clamp(r.relHumidityPct, 0, 100) / 100);
  return {
    spectrum,
    characteristics: characterize(spectrum, material),
    kermaTransmission: kermaTransmission(input),
    operational,
    gamma,
    airReading: { factor, corrected: r.reading * factor },
  };
}

export interface IsoOutput {
  applicable: boolean; // X선만
  matched: IsoQuality | null;
  matchHvl1DeviationPct: number | null;
  selected: string | null; // 비교에 쓴 선질명
  comparison: Comparison | null;
  characteristics: Characteristics | null; // 비교 재질로 계산한 특성(auto 재질일 때 화면이 이것을 쓴다)
}

const NOT_APPLICABLE: IsoOutput = {
  applicable: false,
  matched: null,
  matchHvl1DeviationPct: null,
  selected: null,
  comparison: null,
  characteristics: null,
};

/** ISO 자동매칭 + 비교(느린 경로). spectrum 은 computeFast 결과를 재사용한다. */
export function computeIso(input: WorkbenchInput, spectrum: Spectrum): IsoOutput {
  if (input.source !== "xray") return NOT_APPLICABLE;
  const m = matchQuality(spectrum);
  const selected = input.isoQuality === "auto" ? m.quality.name : input.isoQuality;
  const comparison = compareToQuality(spectrum, selected, input.tolerancePct);
  const material = input.hvlMaterial === "auto" ? comparison.material : input.hvlMaterial;
  return {
    applicable: true,
    matched: m.quality,
    matchHvl1DeviationPct: m.hvl1DeviationPct,
    selected,
    comparison,
    characteristics: characterize(spectrum, material),
  };
}

// ---- 표기 ----
/** 고정 유효숫자 표기(끝자리 0 유지 — 계측기 판독창처럼 자릿수가 흔들리지 않게). */
export function fmt(v: number, sig = 4): string {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e6 || a < 1e-3) return v.toExponential(sig - 1);
  if (a >= 10 ** sig) return Math.round(v).toString();
  return v.toPrecision(sig);
}
export function fmtDev(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)} %`;
}
