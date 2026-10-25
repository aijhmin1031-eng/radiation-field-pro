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
import { parseSpectrumText, type ParseOptions } from "../engine/spectrum-import";
import { typeAUncertainty, combineRelative, type TypeAResult, type CombinedResult } from "../engine/uncertainty";
import { airMuenOverRho } from "../engine/attenuation";

export type SourceKind = "xray" | "Cs-137" | "Co-60" | "import";
export const isGamma = (s: SourceKind) => s === "Cs-137" || s === "Co-60";

/** 불러온 측정 스펙트럼(상태에 저장). */
export interface ImportedSpectrum {
  name: string;
  energy: number[];
  fluence: number[];
}
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
/** 반복측정 입력(GUM Type A) + Type B 성분. */
export interface TypeBComponent {
  label: string;
  relPct: number; // 상대 표준불확도 %
}
export interface ReadingsInput {
  values: number[]; // 반복 판독값
  applyAirCorrection: boolean; // 각 판독값에 k_ρ 적용
  typeB: TypeBComponent[];
}
export interface WorkbenchInput {
  source: SourceKind;
  imported: ImportedSpectrum | null;
  xray: XrayInput;
  gamma: GammaInput;
  alphaDeg: number;
  hvlMaterial: HvlMaterial;
  isoQuality: "auto" | string;
  tolerancePct: number;
  airReading: AirReadingInput;
  readings: ReadingsInput;
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

/** 로컬 날짜 yyyy-mm-dd (toISOString은 UTC라 한국 00~09시에 어제가 됨). */
const today = () => new Date().toLocaleDateString("sv-SE");

/** 합성 불확도 표의 Type A 성분 이름(화면에서는 i18n 사전의 typeALabel 로 바꿔 보인다). */
export const TYPE_A_LABEL = "Repeatability (Type A)";

export const DEFAULT_INPUT: WorkbenchInput = {
  source: "xray",
  imported: null,
  xray: presetFromIso("N-80"),
  gamma: { activity: 1, activityUnit: "GBq", referenceDate: today(), evalDate: today(), distanceM: 1 },
  alphaDeg: 0,
  hvlMaterial: "auto",
  isoQuality: "auto",
  tolerancePct: 5,
  airReading: { reading: 1, tempC: 20, pressureKPa: 101.325, relHumidityPct: 65 },
  readings: { values: [], applyAirCorrection: true, typeB: [{ label: "Calibration certificate (reference chamber)", relPct: 1.0 }] },
};

/** 공백·쉼표·줄바꿈으로 구분된 숫자 목록 파싱(비숫자는 무시). */
export function parseReadings(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .map((t) => Number(t))
    .filter((v) => Number.isFinite(v));
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function buildSpectrum(input: WorkbenchInput): Spectrum {
  if (input.source === "xray") {
    const filters = [
      ...input.xray.filters.filter((f) => f.thicknessMm > 0),
      { material: "Air", thicknessMm: Math.max(0, input.xray.airMm) },
    ];
    return filterSpectrum(xraySpectrum(clamp(input.xray.kvp, KVP_MIN, KVP_MAX)), filters);
  }
  if (input.source === "import") {
    // 불러온 스펙트럼이 없으면 화면이 죽지 않게 X선 설정으로 대체한다(UI가 안내 문구를 띄움).
    if (!input.imported || input.imported.energy.length === 0) return buildSpectrum({ ...input, source: "xray" });
    return { energy: input.imported.energy.slice(), fluence: input.imported.fluence.slice() };
  }
  return gammaSpectrum(input.source);
}

/** 텍스트(CSV/TSV/공백) → 불러온 스펙트럼. 파싱 오류는 예외로 올라온다. */
export function parseImportedSpectrum(text: string, name: string, opts: ParseOptions = {}): ImportedSpectrum {
  const s = parseSpectrumText(text, opts);
  return { name, energy: s.energy, fluence: s.fluence };
}

/** auto 재질의 잠정값: 감마 Pb, X선은 ISO 관례(저관전압 Al, 그 외 Cu). ISO 매칭이 오면 그 재질로 바뀐다. */
export function provisionalMaterial(input: WorkbenchInput): "Al" | "Cu" | "Pb" {
  if (input.hvlMaterial !== "auto") return input.hvlMaterial;
  if (isGamma(input.source)) return "Pb";
  if (input.source === "import" && input.imported) {
    const e = meanEnergy(buildSpectrum(input));
    return e > 400 ? "Pb" : e >= 50 ? "Cu" : "Al";
  }
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
export interface UncertaintyOutput {
  n: number;
  corrected: number[]; // 보정 적용 후 판독값
  typeA: TypeAResult | null; // n >= 2
  combined: CombinedResult | null; // Type A + Type B 합성
}
export interface FastOutput {
  spectrum: Spectrum;
  kermaWeights: number[]; // 표본별 공기커마 기여 φ·E·(μen/ρ)_air (상대, 차트 오버레이용)
  characteristics: Characteristics;
  kermaTransmission: number; // 여과 후/전 공기커마 비 (감마 1)
  operational: OperationalDose;
  gamma: GammaOutput | null;
  airReading: AirReadingOutput;
  uncertainty: UncertaintyOutput;
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
  if (isGamma(input.source)) {
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
  // GUM: 반복 판독(보정 후) → Type A → Type B와 제곱합 합성(Welch-Satterthwaite)
  const rd = input.readings;
  const corrected = rd.values.map((v) => (rd.applyAirCorrection ? v * factor : v));
  let typeA: TypeAResult | null = null;
  let combined: CombinedResult | null = null;
  if (corrected.length >= 2) {
    typeA = typeAUncertainty(corrected);
    combined = combineRelative(typeA.mean, [
      { label: TYPE_A_LABEL, relativeStandardUncertainty: typeA.relativeStandardUncertainty || 0, degreesOfFreedom: typeA.degreesOfFreedom },
      ...rd.typeB.filter((b) => b.relPct > 0).map((b) => ({ label: b.label, relativeStandardUncertainty: b.relPct / 100 })),
    ]);
  }
  return {
    uncertainty: { n: corrected.length, corrected, typeA, combined },
    spectrum,
    kermaWeights: spectrum.energy.map((e, i) => spectrum.fluence[i] * e * airMuenOverRho(e)),
    characteristics: characterize(spectrum, material),
    kermaTransmission: kermaTransmission(input),
    operational,
    gamma,
    airReading: { factor, corrected: r.reading * factor },
  };
}

/** ISO 4037-1 §5 핵종 기준장 공칭값(평균 광자에너지, keV). */
export const RADIONUCLIDE_REFERENCE: Record<string, { quality: string; nominalMeanKeV: number }> = {
  "Cs-137": { quality: "S-Cs", nominalMeanKeV: 661.6 },
  "Co-60": { quality: "S-Co", nominalMeanKeV: 1252.9 },
};
export interface RadionuclideCheck {
  quality: string;
  nominalMeanKeV: number;
  modelMeanKeV: number;
  deviationPct: number;
}
/** ISO 비교 해당 없음 사유 코드(화면 문구는 i18n 사전). */
export type IsoReason = "radionuclide" | "no-import" | "above-400-kev";

export interface IsoOutput {
  applicable: boolean; // X선·(400 keV 이하) 불러온 스펙트럼
  reason: IsoReason | null; // 해당 없음 사유(화면 문구는 i18n 사전)
  radionuclide: RadionuclideCheck | null; // 핵종이면 공칭 평균에너지 대조
  matched: IsoQuality | null;
  matchHvl1DeviationPct: number | null;
  selected: string | null; // 비교에 쓴 선질명
  comparison: Comparison | null;
  characteristics: Characteristics | null; // 비교 재질로 계산한 특성(auto 재질일 때 화면이 이것을 쓴다)
}

const NOT_APPLICABLE: IsoOutput = {
  applicable: false,
  reason: null,
  radionuclide: null,
  matched: null,
  matchHvl1DeviationPct: null,
  selected: null,
  comparison: null,
  characteristics: null,
};

/** ISO 자동매칭 + 비교(느린 경로). spectrum 은 computeFast 결과를 재사용한다. */
export function computeIso(input: WorkbenchInput, spectrum: Spectrum): IsoOutput {
  // ISO 4037-1 연속 X선 표는 X선과 (400 keV 이하) 불러온 스펙트럼에만 적용한다.
  if (isGamma(input.source)) {
    const ref = RADIONUCLIDE_REFERENCE[input.source];
    const modelMeanKeV = meanEnergy(spectrum);
    return {
      ...NOT_APPLICABLE,
      reason: "radionuclide",
      radionuclide: { quality: ref.quality, nominalMeanKeV: ref.nominalMeanKeV, modelMeanKeV, deviationPct: ((modelMeanKeV - ref.nominalMeanKeV) / ref.nominalMeanKeV) * 100 },
    };
  }
  if (input.source === "import" && !input.imported) return { ...NOT_APPLICABLE, reason: "no-import" };
  if (input.source === "import" && Math.max(...spectrum.energy) > 400) return { ...NOT_APPLICABLE, reason: "above-400-kev" };
  const m = matchQuality(spectrum);
  const selected = input.isoQuality === "auto" ? m.quality.name : input.isoQuality;
  const comparison = compareToQuality(spectrum, selected, input.tolerancePct);
  const material = input.hvlMaterial === "auto" ? comparison.material : input.hvlMaterial;
  return {
    applicable: true,
    reason: null,
    radionuclide: null,
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

// ---- 세션 저장/불러오기 ----
export const SESSION_FORMAT = "radiation-field-pro/session";
export const SESSION_VERSION = 1;

/** 저장본·딥링크·세션 파일에서 온 부분 입력을 기본값과 병합(구조 변경에 견딤). */
export function mergeInput(saved: Partial<WorkbenchInput> | null | undefined): WorkbenchInput {
  if (!saved || typeof saved !== "object") return DEFAULT_INPUT;
  return {
    ...DEFAULT_INPUT,
    ...saved,
    imported: saved.imported ?? null,
    xray: { ...DEFAULT_INPUT.xray, ...(saved.xray ?? {}) },
    gamma: { ...DEFAULT_INPUT.gamma, ...(saved.gamma ?? {}) },
    airReading: { ...DEFAULT_INPUT.airReading, ...(saved.airReading ?? {}) },
    readings: { ...DEFAULT_INPUT.readings, ...(saved.readings ?? {}) },
  };
}

export function serializeSession(input: WorkbenchInput): string {
  return JSON.stringify({ format: SESSION_FORMAT, version: SESSION_VERSION, savedAt: new Date().toISOString(), input }, null, 2);
}

/** 세션 파일 오류. 화면 문구는 code 로 i18n 사전에서 고른다. */
export class SessionError extends Error {
  constructor(readonly code: "not-session" | "unknown-source") {
    super(code);
    this.name = "SessionError";
  }
}

/** 세션 파일 텍스트 → 입력. 형식이 다르면 예외. */
export function deserializeSession(text: string): WorkbenchInput {
  const obj = JSON.parse(text) as { format?: string; version?: number; input?: Partial<WorkbenchInput> };
  if (obj.format !== SESSION_FORMAT || !obj.input || typeof obj.input !== "object") {
    throw new SessionError("not-session");
  }
  const input = mergeInput(obj.input);
  if (!["xray", "Cs-137", "Co-60", "import"].includes(input.source)) throw new SessionError("unknown-source");
  return input;
}
