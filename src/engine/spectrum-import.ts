// 측정 스펙트럼 불러오기.
//
// 외부에서 얻은 스펙트럼(스펙트로미터 측정값, MC 계산값 등)을 엔진 공통형 Spectrum으로 변환한다.
// 변환된 스펙트럼은 여과·공기커마·HVL·운영선량·ISO 비교 등 모든 하류 계산에 그대로 쓰인다.
//
// 입력 규약:
//  - (에너지, 플루언스) 쌍의 목록. 에너지 단위는 keV/MeV/eV 중 지정(기본 keV) → keV로 환산.
//  - 플루언스는 기본적으로 "각 표본(빈)의 총 광자수"로 해석한다. 에너지당 밀도(/keV)로 주어진
//    경우 fluenceIsDensity=true 로 지정하면 이웃 간격으로 빈 폭을 추정해 곱한다(비균일 빈 대응).
//  - 에너지는 양의 유한값·중복 없음, 플루언스는 비음 유한값이어야 한다. 에너지 오름차순으로 정렬한다.
import type { Spectrum } from "./spectrum";

export type EnergyUnit = "keV" | "MeV" | "eV";

export interface ImportOptions {
  energyUnit?: EnergyUnit; // 기본 keV
  fluenceIsDensity?: boolean; // true: 값이 /keV 밀도 → 빈 폭을 곱해 빈 총량으로 환산
  normalize?: boolean; // true: Σfluence = 1 로 정규화
}

export interface ParseOptions extends ImportOptions {
  delimiter?: string | RegExp; // 기본: 쉼표/세미콜론/탭/공백 자동
  energyColumn?: number; // 기본 0
  fluenceColumn?: number; // 기본 1
  skipHeader?: boolean | "auto"; // 기본 auto: 첫 줄이 숫자가 아니면 건너뜀
}

const UNIT_TO_KEV: Record<EnergyUnit, number> = { keV: 1, MeV: 1000, eV: 0.001 };

/** (에너지, 플루언스) 쌍 목록 → Spectrum. */
export function importSpectrum(rows: ReadonlyArray<readonly [number, number]>, opts: ImportOptions = {}): Spectrum {
  const unit = opts.energyUnit ?? "keV";
  const scale = UNIT_TO_KEV[unit];
  if (scale === undefined) throw new Error(`unknown energy unit ${unit}`);
  if (rows.length === 0) throw new Error("spectrum import: no rows");

  const pairs = rows.map(([e, f], i) => {
    if (!Number.isFinite(e) || !Number.isFinite(f)) throw new Error(`spectrum import: non-finite value at row ${i}`);
    const keV = e * scale;
    if (keV <= 0) throw new Error(`spectrum import: energy must be > 0 at row ${i} (got ${e} ${unit})`);
    if (f < 0) throw new Error(`spectrum import: fluence must be >= 0 at row ${i} (got ${f})`);
    return [keV, f] as [number, number];
  });
  pairs.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < pairs.length; i++) {
    if (pairs[i][0] === pairs[i - 1][0]) throw new Error(`spectrum import: duplicate energy ${pairs[i][0]} keV`);
  }

  const energy = pairs.map((p) => p[0]);
  let fluence = pairs.map((p) => p[1]);

  if (opts.fluenceIsDensity) {
    // 빈 폭 추정: 내부는 이웃 중점 간격, 양 끝은 한쪽 간격. 표본이 1개면 폭 1 keV.
    const n = energy.length;
    fluence = fluence.map((f, i) => {
      let width: number;
      if (n === 1) width = 1;
      else if (i === 0) width = energy[1] - energy[0];
      else if (i === n - 1) width = energy[n - 1] - energy[n - 2];
      else width = (energy[i + 1] - energy[i - 1]) / 2;
      return f * width;
    });
  }

  if (opts.normalize) {
    const total = fluence.reduce((a, b) => a + b, 0);
    if (total > 0) fluence = fluence.map((f) => f / total);
  }

  return { energy, fluence };
}

const AUTO_DELIM = /[,;\t ]+/;

/** 텍스트(CSV/TSV/공백 구분) → Spectrum. 빈 줄과 #/// 주석 줄은 무시. */
export function parseSpectrumText(text: string, opts: ParseOptions = {}): Spectrum {
  const delimiter = opts.delimiter ?? AUTO_DELIM;
  const ec = opts.energyColumn ?? 0;
  const fc = opts.fluenceColumn ?? 1;
  const skipHeader = opts.skipHeader ?? "auto";

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("//"));
  if (lines.length === 0) throw new Error("spectrum import: empty text");

  const split = (l: string) => l.split(delimiter).map((s) => s.trim()).filter((s) => s.length > 0);
  const isNumericRow = (cells: string[]) =>
    cells.length > Math.max(ec, fc) && Number.isFinite(Number(cells[ec])) && Number.isFinite(Number(cells[fc]));

  let start = 0;
  const first = split(lines[0]);
  if (skipHeader === true || (skipHeader === "auto" && !isNumericRow(first))) start = 1;

  const rows: [number, number][] = [];
  for (let i = start; i < lines.length; i++) {
    const cells = split(lines[i]);
    if (cells.length <= Math.max(ec, fc)) throw new Error(`spectrum import: line ${i + 1} has too few columns`);
    const e = Number(cells[ec]);
    const f = Number(cells[fc]);
    if (!Number.isFinite(e) || !Number.isFinite(f)) throw new Error(`spectrum import: non-numeric value on line ${i + 1}`);
    rows.push([e, f]);
  }
  return importSpectrum(rows, opts);
}
