// 화면 문자열 사전(en/ko). ★ 2026-10-26 사용자 지시: 영어 기본·한국어 선택(기존 한글 UI 결정 대체).
//  - 엔진·계산·숫자 포맷은 건드리지 않는다. 여기에는 화면에 보이는 말만 둔다.
//  - 영어 용어는 ISO 4037·ICRU 표기를 따른다(HVL1/HVL2, homogeneity coefficient h, air kerma Ka, Hp(10,α) …).
//  - ko 는 en 과 키·인자 형태가 같아야 한다(타입으로 강제, i18n.test.ts 가 다시 확인).
import { useSyncExternalStore } from "react";

export type Lang = "en" | "ko";
export const LANGS: readonly Lang[] = ["en", "ko"];
const LANG_KEY = "rfp.lang.v1";

const en = {
  // 머리글·도구 막대
  skip: "Skip to main content",
  sub: "Reference X-ray and gamma field characterisation and dose workbench",
  intro: "Spectrum, half-value layers, ISO 4037 beam-quality matching, operational dose conversion and uncertainty — all computed in this browser.",
  langAria: "Language",
  toolbarAria: "Session",
  calc: "Calculate",
  calcDirty: "Calculate — inputs changed",
  calcDot: "Calculate •",
  autoRunning: "Auto-calculating",
  autoMode: "Auto-calculate",
  save: "Save session",
  load: "Load session",
  print: "Print report",
  reset: "Reset",
  saved: "Session file saved.",
  loaded: (name: string) => `Session loaded: ${name}`,
  loadFailed: (msg: string) => `Load failed: ${msg}`,
  errNotSession: "This is not a Radiation Field Pro session file.",
  errUnknownSource: "Unknown source type.",
  resetConfirm: "Reset every input to the defaults (N-80)? Inputs you have not saved will be lost.",
  resetDone: "Inputs reset to the defaults.",
  viewAria: "View",
  tabInput: "Input",
  tabResult: "Results",
  // 인쇄 리포트
  printTitle: "Reference X-ray and gamma field characterisation report",
  printed: "Printed",
  dateLocale: "en-GB",
  printInputs: "Input conditions",
  rowSource: "Source",
  xraySummary: (kvp: number, filters: string, airMm: number) => `X-ray tube W 20° · ${kvp} kV · filtration ${filters} · air ${airMm} mm`,
  importSummary: (name: string) => `Imported spectrum ${name}`,
  noneParen: "(none)",
  gammaSummary: (src: string, act: number, unit: string, ref: string, ev: string, d: number) =>
    `${src} · ${act} ${unit} (reference ${ref}) · evaluated ${ev} · ${d} m`,
  rowGeom: "Angle of incidence α / HVL material / ISO comparison",
  auto: "auto",
  rowAir: "Readout correction conditions",
  airRef: "(reference 20 °C · 101.325 kPa · 65 %)",
  rowReadings: "Repeat readings",
  none: "none",
  // 결과 영역
  pending: "Inputs have changed. The results below are still for the previous inputs —",
  calcDone: (n: number) => `Calculation #${n} done — the ▲▼ marks in each readout show the change from the previous calculation.`,
  spectrum: "Spectrum",
  specXray: (kvp: number) => `W anode 20° · ${kvp} kV · after filtration`,
  specImported: (name: string, n: number) => `Imported spectrum · ${name} · ${n} points`,
  specNoImport: "No imported spectrum — showing the X-ray settings",
  specGamma: (nuc: string) => `${nuc} line spectrum`,
  footA: "All calculations run in this browser; inputs are never sent to a server. Accuracy ranges are given in the ",
  footLink: "accuracy specification",
  footB: ". Values for a real reference field are fixed by that facility's own measurements.",
  // 입력 01 선원
  p01: "Source",
  segAria: "Source type",
  srcXray: "X-ray tube",
  srcImport: "Import",
  isoQuality: "ISO beam quality",
  presetPh: "Load a preset…",
  series: (s: string) => `${s} series`,
  kvp: "Tube voltage",
  kvpAria: "Tube voltage kV",
  air: "Air path",
  tagInherent: "Inherent",
  tagAdded: (i: number) => `Added ${i}`,
  filterMatAria: "Filter material",
  filterThickAria: "Filter thickness mm",
  removeFilter: "Remove filter layer",
  addFilter: "+ Filter layer",
  activity: "Activity",
  activityUnitAria: "Activity unit",
  refDate: "Reference date",
  evalDate: "Evaluation date",
  distance: "Distance",
  // 입력 02 기하·평가
  p02: "Geometry and evaluation",
  alpha: "Angle of incidence α",
  hvlMat: "HVL material",
  hvlAuto: "Auto (ISO-matched material)",
  isoTarget: "ISO comparison",
  autoMatch: "Auto-match",
  tolerance: "Tolerance band",
  // 입력 03 판독값 보정
  p03: "Readout correction (ISO 4037-4)",
  reading: "Reading",
  temp: "Temperature",
  pressure: "Pressure",
  rh: "Relative humidity",
  airHint: "Converted to the reference conditions 20 °C · 101.325 kPa · 65 % RH.",
  // 입력 04 반복측정 불확도
  p04: "Repeatability uncertainty (GUM Type A)",
  readings: "Repeat readings",
  readingsPh: "1.482 1.495 1.471 …  (separate with spaces, commas or new lines)",
  densityCorr: "Density correction",
  applyKrho: "Apply k_ρ (panel 03 conditions) to each reading",
  typeBNameAria: "Type B component name",
  relStdAria: "Relative standard uncertainty %",
  removeComp: "Remove component",
  newTypeB: "Type B component",
  addTypeB: "+ Type B component (relative standard uncertainty)",
  gumHint: "Type A: u = s/√n, k = t₀.₉₇₅,ₙ₋₁ (95 %). Combined with Type B in quadrature; effective degrees of freedom ν_eff by Welch–Satterthwaite.",
  // 스펙트럼 불러오기
  pasted: "Pasted",
  file: "File",
  energyUnit: "Energy unit",
  perKeV: "Values are per keV",
  paste: "Paste",
  pastePh: "energy, fluence\n20, 1.2e3\n30, 4.5e3\n…",
  applySpectrum: "Apply spectrum",
  importFailed: (err: string) => `Import failed: ${err} — check the column order (energy, fluence), the unit and the separator.`,
  applied: "Applied:",
  points: "points",
  importHint: "Without an imported spectrum the X-ray settings are shown. CSV, TSV or whitespace-separated; headers and # comments are allowed.",
  // 출력 A 선질 특성
  noChange: "No change",
  vsPrev: "Change from the previous calculation",
  pA: "Beam-quality characteristics",
  settling: "Settling HVL material…",
  meanE: "Mean energy Ē",
  effE: "Effective energy E_eff",
  homog: "Homogeneity coefficient h = HVL1/HVL2",
  transm: "Air-kerma transmission of added filtration (relative to inherent)",
  // 출력 B 운영선량
  pB: "Operational dose conversion coefficients (ISO 4037-3, spectrum-averaged)",
  slab: "ICRU slab phantom",
  isotropic: "Isotropic",
  activityOn: (nuc: string) => `${nuc} activity on the evaluation date`,
  elapsed: (d: string) => `${d} d elapsed`,
  kermaRate: "Air kerma rate (point source)",
  invSq: "Inverse square; air attenuation ignored",
  krho: "Readout correction k_ρ",
  corrected: (v: string) => `Corrected value ${v}`,
  // 출력 C ISO 비교
  pC: "ISO 4037-1 reference-field comparison",
  matching: "Matching…",
  nominalMean: (nom: string, model: string, dev: string) => `Nominal mean energy ${nom} keV · model ${model} keV (${dev})`,
  reasonDefault: "Not covered by the ISO 4037-1 continuous X-ray tables.",
  reasonRadionuclide: "Radionuclide reference fields are outside the continuous X-ray tables (HVL, homogeneity); they are checked against the nominal mean energy of ISO 4037-1 §5.",
  reasonNoImport: "No spectrum has been imported.",
  reasonAbove400: "The maximum energy is above 400 keV, outside the range of the ISO 4037-1 continuous X-ray tables.",
  inBand: "Within band",
  outBand: "Outside band",
  autoMatched: (name: string, dev: string) => `Auto-matched ${name} (HVL1 ${dev})`,
  thChar: "Characteristic",
  thIso: "ISO value",
  thCalc: "Calculated",
  thDev: "Deviation",
  thVerdict: "Verdict",
  rowHomog: "Homogeneity coefficient",
  rowMean: "Mean energy",
  noRef: "No table value",
  // 출력 D 불확도
  pD: "Measurement uncertainty (GUM, 95 %)",
  uNeed: "Enter two or more readings (input panel 04) to get the Type A evaluation and the combined uncertainty.",
  meanN: (n: number) => `Mean x̄ (n = ${n})`,
  typeAU: (k: string, nu: number) => `Type A expanded uncertainty U (k = ${k}, ν = ${nu})`,
  relative: (p: string) => `Relative ${p} %`,
  combinedU: (k: string, nu: string) => `Combined expanded uncertainty U_c (k = ${k}, ν_eff = ${nu})`,
  reportFmt: "Reported result",
  approx95: (k: string) => `(k = ${k}, about 95 %)`,
  thComp: "Component",
  thRelStd: "Relative standard uncertainty",
  thDof: "Degrees of freedom",
  typeALabel: "Repeatability (Type A)",
  // 차트
  kermaTitle: "Overlay of the air-kerma contribution φ·E·(μen/ρ)",
  kermaBtn: "Kerma",
  chartAria: "Spectrum: relative fluence versus energy",
  axisE: "Energy keV",
  axisF: "Relative fluence",
  kermaLegend: "Kerma-weighted (relative)",
};

export type Key = keyof typeof en;
type Dict = { [K in Key]: (typeof en)[K] };

const ko: Dict = {
  skip: "본문으로 건너뛰기",
  sub: "기준 X선·감마장 특성화 및 선량 워크벤치",
  intro: "스펙트럼, 반가층, ISO 4037 선질 대조, 운영선량 변환, 불확도를 모두 이 브라우저 안에서 계산합니다.",
  langAria: "언어",
  toolbarAria: "세션",
  calc: "계산하기",
  calcDirty: "계산하기 — 조건 변경됨",
  calcDot: "계산하기 •",
  autoRunning: "자동 계산 중",
  autoMode: "자동 계산",
  save: "세션 저장",
  load: "세션 불러오기",
  print: "리포트 인쇄",
  reset: "초기화",
  saved: "세션 파일을 저장했습니다.",
  loaded: (name) => `세션을 불러왔습니다: ${name}`,
  loadFailed: (msg) => `불러오기 실패: ${msg}`,
  errNotSession: "Radiation Field Pro 세션 파일이 아닙니다.",
  errUnknownSource: "알 수 없는 선원 종류입니다.",
  resetConfirm: "모든 입력을 기본값(N-80)으로 되돌릴까요? 저장하지 않은 입력은 사라집니다.",
  resetDone: "기본값으로 되돌렸습니다.",
  viewAria: "화면",
  tabInput: "입력",
  tabResult: "결과",
  printTitle: "기준 X선·감마장 특성화 리포트",
  printed: "출력",
  dateLocale: "ko-KR",
  printInputs: "입력 조건",
  rowSource: "선원",
  xraySummary: (kvp, filters, airMm) => `X선관 W 20° · ${kvp} kV · 여과 ${filters} · 공기 ${airMm} mm`,
  importSummary: (name) => `불러온 스펙트럼 ${name}`,
  noneParen: "(없음)",
  gammaSummary: (src, act, unit, ref, ev, d) => `${src} · ${act} ${unit} (기준 ${ref}) · 평가 ${ev} · ${d} m`,
  rowGeom: "입사각 α / HVL 재질 / ISO 비교",
  auto: "자동",
  rowAir: "판독 보정 조건",
  airRef: "(기준 20 °C · 101.325 kPa · 65 %)",
  rowReadings: "반복측정",
  none: "없음",
  pending: "조건이 바뀌었습니다. 아래 결과는 이전 조건의 값입니다 —",
  calcDone: (n) => `계산 #${n} 완료 — 판독창의 ▲▼는 직전 계산 대비 변화량입니다.`,
  spectrum: "스펙트럼",
  specXray: (kvp) => `W 양극 20° · ${kvp} kV · 여과 후`,
  specImported: (name, n) => `불러온 스펙트럼 · ${name} · ${n} 점`,
  specNoImport: "불러온 스펙트럼 없음 — X선 설정으로 표시 중",
  specGamma: (nuc) => `${nuc} 선 스펙트럼`,
  footA: "계산은 모두 이 브라우저 안에서 이루어지며 입력값은 서버로 보내지 않습니다. 정확도 범위는 ",
  footLink: "정확도 사양",
  footB: "에 있습니다. 실제 기준장의 값은 그 시설의 측정으로 정합니다.",
  p01: "선원",
  segAria: "선원 종류",
  srcXray: "X선관",
  srcImport: "불러오기",
  isoQuality: "ISO 선질",
  presetPh: "프리셋 불러오기…",
  series: (s) => `${s} 시리즈`,
  kvp: "관전압",
  kvpAria: "관전압 kV",
  air: "공기 경로",
  tagInherent: "고유",
  tagAdded: (i) => `부가 ${i}`,
  filterMatAria: "여과 재질",
  filterThickAria: "여과 두께 mm",
  removeFilter: "여과층 삭제",
  addFilter: "+ 여과층",
  activity: "활동도",
  activityUnitAria: "활동도 단위",
  refDate: "교정 기준일",
  evalDate: "평가일",
  distance: "거리",
  p02: "기하·평가 조건",
  alpha: "입사각 α",
  hvlMat: "HVL 재질",
  hvlAuto: "자동 (ISO 매칭 재질)",
  isoTarget: "ISO 비교 대상",
  autoMatch: "자동 매칭",
  tolerance: "허용 밴드",
  p03: "판독값 보정 (ISO 4037-4)",
  reading: "판독값",
  temp: "온도",
  pressure: "기압",
  rh: "상대습도",
  airHint: "기준조건 20 °C · 101.325 kPa · 65 % RH 로 환산합니다.",
  p04: "반복측정 불확도 (GUM Type A)",
  readings: "판독값 목록",
  readingsPh: "1.482 1.495 1.471 …  (공백·쉼표·줄바꿈 구분)",
  densityCorr: "밀도 보정",
  applyKrho: "판독값마다 k_ρ(03 패널 조건) 적용",
  typeBNameAria: "Type B 성분 이름",
  relStdAria: "상대 표준불확도 %",
  removeComp: "성분 삭제",
  newTypeB: "Type B 성분",
  addTypeB: "+ Type B 성분 (상대 표준불확도)",
  gumHint: "Type A: u = s/√n, k = t₀.₉₇₅,ₙ₋₁ (95 %). Type B와 제곱합 합성, Welch–Satterthwaite ν_eff.",
  pasted: "붙여넣기",
  file: "파일",
  energyUnit: "에너지 단위",
  perKeV: "값이 /keV 밀도",
  paste: "붙여넣기",
  pastePh: "에너지, 플루언스\n20, 1.2e3\n30, 4.5e3\n…",
  applySpectrum: "스펙트럼 적용",
  importFailed: (err) => `불러오기 실패: ${err} — 열 순서(에너지, 플루언스)·단위·구분자를 확인하세요.`,
  applied: "적용됨:",
  points: "점",
  importHint: "불러온 스펙트럼이 없으면 X선 설정으로 표시합니다. CSV/TSV/공백 구분, 헤더·#주석 허용.",
  noChange: "변화 없음",
  vsPrev: "직전 계산 대비",
  pA: "선질 특성",
  settling: "재질 확정 중…",
  meanE: "평균 에너지 Ē",
  effE: "유효 에너지 E_eff",
  homog: "균질도 h = HVL1/HVL2",
  transm: "부가여과 커마 투과율 (고유여과 기준)",
  pB: "운영선량 변환계수 (ISO 4037-3, 스펙트럼 평균)",
  slab: "ICRU 슬랩 팬텀",
  isotropic: "등방",
  activityOn: (nuc) => `${nuc} 평가일 활동도`,
  elapsed: (d) => `경과 ${d} 일`,
  kermaRate: "공기커마율 (점선원)",
  invSq: "역제곱·공기감쇠 무시",
  krho: "판독 보정 k_ρ",
  corrected: (v) => `보정값 ${v}`,
  pC: "ISO 4037-1 기준장 비교",
  matching: "매칭 중…",
  nominalMean: (nom, model, dev) => `공칭 평균에너지 ${nom} keV · 모델 ${model} keV (${dev})`,
  reasonDefault: "ISO 4037-1 연속 X선 표의 대상이 아닙니다.",
  reasonRadionuclide: "핵종 기준장은 연속 X선 표(HVL·균질도) 대상이 아니며, ISO 4037-1 §5 공칭 평균에너지로 대조합니다.",
  reasonNoImport: "불러온 스펙트럼이 없습니다.",
  reasonAbove400: "최대 에너지가 400 keV를 넘어 ISO 4037-1 연속 X선 표 범위 밖입니다.",
  inBand: "밴드 내",
  outBand: "밴드 이탈",
  autoMatched: (name, dev) => `자동 매칭 ${name} (HVL1 ${dev})`,
  thChar: "특성",
  thIso: "ISO 표값",
  thCalc: "계산값",
  thDev: "편차",
  thVerdict: "판정",
  rowHomog: "균질도",
  rowMean: "평균 에너지",
  noRef: "표값 없음",
  pD: "측정 불확도 (GUM, 95 %)",
  uNeed: "판독값을 2개 이상 입력하면 Type A 평가와 합성 불확도를 계산합니다. (입력 패널 04)",
  meanN: (n) => `평균 x̄ (n = ${n})`,
  typeAU: (k, nu) => `Type A 확장불확도 U (k = ${k}, ν = ${nu})`,
  relative: (p) => `상대 ${p} %`,
  combinedU: (k, nu) => `합성 확장불확도 U_c (k = ${k}, ν_eff = ${nu})`,
  reportFmt: "보고 형식",
  approx95: (k) => `(k = ${k}, 약 95 %)`,
  thComp: "성분",
  thRelStd: "상대 표준불확도",
  thDof: "자유도",
  typeALabel: "반복성 (Type A)",
  kermaTitle: "공기커마 기여 φ·E·(μen/ρ) 오버레이",
  kermaBtn: "커마",
  chartAria: "스펙트럼: 상대 플루언스 대 에너지",
  axisE: "에너지 keV",
  axisF: "상대 플루언스",
  kermaLegend: "커마 가중 (상대)",
};

export const DICTS: Record<Lang, Dict> = { en, ko };

type Args<K extends Key> = (typeof en)[K] extends (...a: infer A) => string ? A : [];
export type T = <K extends Key>(key: K, ...args: Args<K>) => string;

export function makeT(lang: Lang): T {
  const d = DICTS[lang];
  return (key, ...args) => {
    const v = d[key] as string | ((...a: unknown[]) => string);
    return typeof v === "function" ? v(...args) : v;
  };
}
const T_BY_LANG: Record<Lang, T> = { en: makeT("en"), ko: makeT("ko") };

// ---- 현재 언어: localStorage 보존, <html lang> 동기화 ----
function readLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === "ko" ? "ko" : "en";
  } catch {
    return "en";
  }
}
let current: Lang = typeof window === "undefined" ? "en" : readLang();
if (typeof document !== "undefined") document.documentElement.lang = current;
const subs = new Set<() => void>();

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* 저장 불가 환경은 무시 */
  }
  document.documentElement.lang = lang;
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

/** 현재 언어와 번역 함수. 언어가 바뀌면 이 훅을 쓰는 컴포넌트가 다시 그려진다. */
export function useI18n(): { lang: Lang; t: T } {
  const lang = useSyncExternalStore(subscribe, () => current, () => "en" as Lang);
  return { lang, t: T_BY_LANG[lang] };
}
