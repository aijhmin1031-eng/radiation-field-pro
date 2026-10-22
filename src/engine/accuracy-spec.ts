// 엔진 정확도 사양(Accuracy Specification).
//
// radiation-field-pro 엔진이 ISO 4037 기준장을 어느 정도 정확도로 재현하는지를, 측정 가능한
// 근거로부터 집계해 "에너지 밴드별 정확도 봉투(envelope)"로 제시한다. 두 축으로 검증한다.
//
//  (1) 연속 X선(ISO 4037-1:2019) : 50개 L/N/W/H 선질의 모델 HVL1 vs 표값 상대편차를
//      저/중/고 에너지 밴드로 나누어 집계.
//  (2) 방사성핵종 감마(ISO 4037-3:2019) : Cs-137, Co-60의 스펙트럼 평균 변환계수
//      (Hp(10), H*(10), H'(0.07))를 ISO 권고값과 대조.
//
// 이 모듈이 리포트의 단일 출처이며, 검증 테스트가 아래 SPEC 봉투를 강제하므로 사양이 조용히
// 어긋날 수 없다.
import ref from "../data/iso4037-1_2019_reference.json";
import { xraySpectrum, filterSpectrum, gammaSpectrum, type Filter, type Spectrum } from "./spectrum";
import { hvl1 } from "./dosimetry";
import { meanConversionCoefficient, type OperationalQuantity } from "./operational-dose";

/** 에너지 밴드 정의(평균에너지 keV 기준). */
export interface EnergyBand {
  key: "low" | "mid" | "high";
  label: string;
  minKeV: number;
  maxKeV: number; // 상한 미포함
  /** 이 밴드에서 보증하는 HVL1 상대편차 봉투(%). */
  hvl1TolerancePct: number;
}

export const ENERGY_BANDS: EnergyBand[] = [
  { key: "low", label: "저에너지", minKeV: 0, maxKeV: 40, hvl1TolerancePct: 4 },
  { key: "mid", label: "중에너지", minKeV: 40, maxKeV: 150, hvl1TolerancePct: 2 },
  { key: "high", label: "고에너지", minKeV: 150, maxKeV: Infinity, hvl1TolerancePct: 2 },
];

/** 감마 변환계수 교차검증의 허용오차(ISO 권고값 대비, %). */
export const GAMMA_CONVERSION_TOLERANCE_PCT = 2;

const inh = (s: string): Filter => {
  const [v, , m] = s.split(" ");
  return { material: m, thicknessMm: parseFloat(v) };
};

/** ISO 4037-1 선질 정의로부터 기준 빔(고유여과 + 부가여과 + 2.5 m 공기)을 복원. */
function beam(q: any): Spectrum {
  const filters: Filter[] = [
    inh(q.inherent),
    ...Object.entries(q.add).map(([m, t]) => ({ material: m, thicknessMm: t as number })),
    { material: "Air", thicknessMm: 2500 },
  ];
  return filterSpectrum(xraySpectrum(q.kVp), filters);
}

export interface HvlDeviation {
  name: string;
  series: "L" | "N" | "W" | "H";
  meanEnergyKeV: number;
  material: string;
  isoHvl1Mm: number;
  modelHvl1Mm: number;
  deviationPct: number;
}

/** 50개 L/N/W/H 선질의 HVL1 모델값 vs ISO 4037-1 표값 상대편차(2.5 m 열). */
export function hvlDeviations(): HvlDeviation[] {
  const Q = (ref as any).qualities as Record<string, any[]>;
  const out: HvlDeviation[] = [];
  for (const series of ["L", "N", "W", "H"] as const) {
    for (const q of Q[series]) {
      if (!q.hvl1?.d2_5) continue;
      const model = hvl1(beam(q), q.hvl1.m);
      out.push({
        name: q.name,
        series,
        meanEnergyKeV: q.mean_energy,
        material: q.hvl1.m,
        isoHvl1Mm: q.hvl1.d2_5,
        modelHvl1Mm: model,
        deviationPct: ((model - q.hvl1.d2_5) / q.hvl1.d2_5) * 100,
      });
    }
  }
  return out;
}

export interface BandAccuracy {
  band: EnergyBand;
  n: number;
  maxAbsDeviationPct: number;
  meanAbsDeviationPct: number;
  worst: { name: string; deviationPct: number } | null;
  withinSpec: boolean;
}

/** 밴드별 HVL1 정확도 집계. */
export function hvlAccuracyByBand(devs: HvlDeviation[] = hvlDeviations()): BandAccuracy[] {
  return ENERGY_BANDS.map((band) => {
    const inBand = devs.filter((d) => d.meanEnergyKeV >= band.minKeV && d.meanEnergyKeV < band.maxKeV);
    if (inBand.length === 0) {
      return { band, n: 0, maxAbsDeviationPct: 0, meanAbsDeviationPct: 0, worst: null, withinSpec: true };
    }
    let worst = inBand[0];
    let sum = 0;
    for (const d of inBand) {
      sum += Math.abs(d.deviationPct);
      if (Math.abs(d.deviationPct) > Math.abs(worst.deviationPct)) worst = d;
    }
    const maxAbs = Math.abs(worst.deviationPct);
    return {
      band,
      n: inBand.length,
      maxAbsDeviationPct: maxAbs,
      meanAbsDeviationPct: sum / inBand.length,
      worst: { name: worst.name, deviationPct: worst.deviationPct },
      withinSpec: maxAbs <= band.hvl1TolerancePct,
    };
  });
}

/** ISO 4037-3:2019 권고 방사성핵종 변환계수(Sv/Gy) — 교차검증 기준값. */
export const ISO_RECOMMENDED_GAMMA: Record<string, Partial<Record<OperationalQuantity, number>>> = {
  "Cs-137": { "Hp(10)": 1.21, "H*(10)": 1.2, "H'(0.07)": 1.21 },
  "Co-60": { "Hp(10)": 1.15, "H*(10)": 1.16, "H'(0.07)": 1.15 },
};

export interface GammaCrossCheckRow {
  nuclide: string;
  quantity: OperationalQuantity;
  isoRecommended: number;
  modelMean: number;
  deviationPct: number;
  withinSpec: boolean;
}

/** 감마 스펙트럼 평균 변환계수를 ISO 권고값과 대조(0° 입사). */
export function gammaConversionCrossCheck(): GammaCrossCheckRow[] {
  const rows: GammaCrossCheckRow[] = [];
  for (const [nuclide, targets] of Object.entries(ISO_RECOMMENDED_GAMMA)) {
    const spec = gammaSpectrum(nuclide);
    for (const [q, iso] of Object.entries(targets) as [OperationalQuantity, number][]) {
      const model = meanConversionCoefficient(spec, q, 0);
      const dev = ((model - iso) / iso) * 100;
      rows.push({
        nuclide,
        quantity: q,
        isoRecommended: iso,
        modelMean: model,
        deviationPct: dev,
        withinSpec: Math.abs(dev) <= GAMMA_CONVERSION_TOLERANCE_PCT,
      });
    }
  }
  return rows;
}

export interface AccuracyReport {
  standard: string;
  generatedNote: string;
  hvlDeviations: HvlDeviation[];
  bands: BandAccuracy[];
  gamma: GammaCrossCheckRow[];
  allWithinSpec: boolean;
}

/** 전체 정확도 리포트(구조화 데이터). */
export function buildAccuracyReport(): AccuracyReport {
  const devs = hvlDeviations();
  const bands = hvlAccuracyByBand(devs);
  const gamma = gammaConversionCrossCheck();
  const allWithinSpec = bands.every((b) => b.withinSpec) && gamma.every((g) => g.withinSpec);
  return {
    standard: "ISO 4037-1:2019 / ISO 4037-3:2019",
    generatedNote:
      "본 리포트는 엔진 코드로부터 자동 생성되며, src/validation/accuracy-spec.test.ts 가 봉투를 강제한다.",
    hvlDeviations: devs,
    bands,
    gamma,
    allWithinSpec,
  };
}

const f = (x: number, n = 2) => x.toFixed(n);
const sign = (x: number, n = 2) => `${x >= 0 ? "+" : ""}${x.toFixed(n)}`;

/** 리포트를 한글 마크다운 문서로 렌더링(커밋 산출물). */
export function formatAccuracyReportMarkdown(rep: AccuracyReport): string {
  const L: string[] = [];
  L.push(`# 엔진 정확도 사양 — ${rep.standard}`);
  L.push("");
  L.push("radiation-field-pro 계산 엔진이 ISO 4037 기준 방사선장을 재현하는 정확도의 **검증된 봉투**다.");
  L.push("모든 수치는 엔진 코드로부터 자동 생성된다(수기 입력 아님). " + rep.generatedNote);
  L.push("");
  L.push(`**종합 판정: ${rep.allWithinSpec ? "✅ 전 항목 사양 충족" : "❌ 사양 미충족 항목 있음"}**`);
  L.push("");
  L.push("## 1. 연속 X선 HVL1 정확도 (ISO 4037-1:2019, 50개 선질)");
  L.push("");
  L.push("기준 빔(고유여과 + 부가여과 + 2.5 m 공기)으로부터 모델이 계산한 제1 반가층(HVL1)을 표값과 대조한 상대편차.");
  L.push("");
  L.push("| 밴드 | 평균에너지 | 선질 수 | 평균 편차(절대값) | 최대 편차(절대값) | 최악 선질 | 보증 봉투 | 판정 |");
  L.push("|---|---|---|---|---|---|---|---|");
  for (const b of rep.bands) {
    const range =
      b.band.maxKeV === Infinity ? `≥ ${b.band.minKeV} keV` : `${b.band.minKeV}–${b.band.maxKeV} keV`;
    const worst = b.worst ? `${b.worst.name} (${sign(b.worst.deviationPct)}%)` : "—";
    L.push(
      `| ${b.band.label} | ${range} | ${b.n} | ${f(b.meanAbsDeviationPct)}% | ${f(b.maxAbsDeviationPct)}% | ${worst} | ≤ ${b.band.hvl1TolerancePct}% | ${b.withinSpec ? "✅" : "❌"} |`,
    );
  }
  L.push("");
  L.push("## 2. 방사성핵종 감마 변환계수 교차검증 (ISO 4037-3:2019)");
  L.push("");
  L.push(
    `스펙트럼 평균(공기커마 가중) 변환계수(0° 입사, Sv/Gy)를 ISO 권고값과 대조. 보증 봉투 ≤ ${GAMMA_CONVERSION_TOLERANCE_PCT}%.`,
  );
  L.push("");
  L.push("| 핵종 | 양 | ISO 권고 | 모델 | 편차 | 판정 |");
  L.push("|---|---|---|---|---|---|");
  for (const g of rep.gamma) {
    L.push(
      `| ${g.nuclide} | ${g.quantity} | ${f(g.isoRecommended, 3)} | ${f(g.modelMean, 3)} | ${sign(g.deviationPct)}% | ${g.withinSpec ? "✅" : "❌"} |`,
    );
  }
  L.push("");
  L.push("## 3. 선질별 HVL1 편차 전체 목록");
  L.push("");
  L.push("| 선질 | 시리즈 | 평균E (keV) | 재료 | ISO HVL1 | 모델 HVL1 | 편차 |");
  L.push("|---|---|---|---|---|---|---|");
  for (const d of rep.hvlDeviations) {
    L.push(
      `| ${d.name} | ${d.series} | ${d.meanEnergyKeV} | ${d.material} | ${f(d.isoHvl1Mm, 3)} | ${f(d.modelHvl1Mm, 3)} | ${sign(d.deviationPct)}% |`,
    );
  }
  L.push("");
  return L.join("\n");
}
