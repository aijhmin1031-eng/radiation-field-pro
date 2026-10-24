import { test } from "node:test";
import assert from "node:assert/strict";
import { importSpectrum, parseSpectrumText } from "./spectrum-import.ts";
import { airKerma, hvl1 } from "./dosimetry.ts";
import { gammaSpectrum, meanEnergy } from "./spectrum.ts";
import { meanConversionCoefficient } from "./operational-dose.ts";

test("쌍 목록 → Spectrum (keV 기본, 에너지 오름차순 정렬)", () => {
  const s = importSpectrum([
    [60, 2],
    [20, 1],
    [40, 3],
  ]);
  assert.deepEqual(s.energy, [20, 40, 60]);
  assert.deepEqual(s.fluence, [1, 3, 2]);
});

test("에너지 단위 환산: MeV·eV → keV", () => {
  assert.deepEqual(importSpectrum([[0.662, 1]], { energyUnit: "MeV" }).energy, [662]);
  assert.deepEqual(importSpectrum([[662000, 1]], { energyUnit: "eV" }).energy, [662]);
});

test("밀도(/keV) 입력은 빈 폭을 곱해 빈 총량으로 환산 (비균일 빈)", () => {
  // 에너지 10,20,40: 내부 폭 (40-10)/2=15, 끝 폭 10 및 20
  const s = importSpectrum(
    [
      [10, 1],
      [20, 1],
      [40, 1],
    ],
    { fluenceIsDensity: true },
  );
  assert.deepEqual(s.fluence, [10, 15, 20]);
});

test("normalize 옵션은 Σfluence = 1 로 정규화", () => {
  const s = importSpectrum(
    [
      [10, 2],
      [20, 6],
    ],
    { normalize: true },
  );
  assert.ok(Math.abs(s.fluence.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  assert.ok(Math.abs(s.fluence[0] - 0.25) < 1e-12);
});

test("잘못된 입력은 예외: 빈 목록·비양수 에너지·음수 플루언스·중복 에너지·비유한값", () => {
  assert.throws(() => importSpectrum([]));
  assert.throws(() => importSpectrum([[0, 1]]));
  assert.throws(() => importSpectrum([[10, -1]]));
  assert.throws(() =>
    importSpectrum([
      [10, 1],
      [10, 2],
    ]),
  );
  assert.throws(() => importSpectrum([[NaN, 1]]));
});

test("텍스트 파싱: 헤더 자동 건너뜀, 쉼표/탭/공백, 주석·빈 줄 무시", () => {
  const csv = `# measured spectrum\nenergy_keV,fluence\n\n20,1\n40, 3\n60\t2\n`;
  const s = parseSpectrumText(csv);
  assert.deepEqual(s.energy, [20, 40, 60]);
  assert.deepEqual(s.fluence, [1, 3, 2]);
});

test("텍스트 파싱: 열 지정과 명시적 구분자", () => {
  const txt = `id;E;phi\n1;10;5\n2;30;7`;
  const s = parseSpectrumText(txt, { delimiter: ";", energyColumn: 1, fluenceColumn: 2 });
  assert.deepEqual(s.energy, [10, 30]);
  assert.deepEqual(s.fluence, [5, 7]);
});

test("텍스트 파싱: 비숫자 데이터 줄과 열 부족은 예외", () => {
  assert.throws(() => parseSpectrumText("10,1\nabc,2"));
  assert.throws(() => parseSpectrumText("10\n20"));
  assert.throws(() => parseSpectrumText("   \n# only comment"));
});

test("불러온 스펙트럼은 하류 계산에 그대로 쓰인다 (Cs-137 선을 가져오면 내장 감마와 동일)", () => {
  const cs = gammaSpectrum("Cs-137");
  const imported = importSpectrum(cs.energy.map((e, i) => [e, cs.fluence[i]] as [number, number]));
  assert.ok(Math.abs(meanEnergy(imported) - meanEnergy(cs)) < 1e-12);
  assert.ok(Math.abs(airKerma(imported) - airKerma(cs)) < 1e-12);
  assert.ok(Math.abs(hvl1(imported, "Pb") - hvl1(cs, "Pb")) < 1e-9);
  assert.ok(Math.abs(meanConversionCoefficient(imported, "Hp(10)", 0) - meanConversionCoefficient(cs, "Hp(10)", 0)) < 1e-12);
});
