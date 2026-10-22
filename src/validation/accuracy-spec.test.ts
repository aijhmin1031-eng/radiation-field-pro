// 정확도 사양 봉투 강제 테스트: 밴드별 HVL1 편차와 감마 변환계수 교차검증이 선언된 봉투를
// 벗어나면 실패한다. 커밋되는 정확도 리포트가 조용히 어긋나는 것을 막는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildAccuracyReport,
  hvlAccuracyByBand,
  gammaConversionCrossCheck,
  ENERGY_BANDS,
  GAMMA_CONVERSION_TOLERANCE_PCT,
} from "../engine/accuracy-spec.ts";

test("HVL1 정확도: 모든 에너지 밴드가 보증 봉투 이내", () => {
  for (const b of hvlAccuracyByBand()) {
    assert.ok(b.n > 0, `${b.band.label} 밴드에 선질이 없음`);
    assert.ok(
      b.maxAbsDeviationPct <= b.band.hvl1TolerancePct,
      `${b.band.label}: 최대 ${b.maxAbsDeviationPct.toFixed(2)}% > 봉투 ${b.band.hvl1TolerancePct}% (최악 ${b.worst?.name})`,
    );
  }
});

test("감마 변환계수: Cs-137 / Co-60 모두 ISO 권고값 봉투 이내", () => {
  for (const g of gammaConversionCrossCheck()) {
    assert.ok(
      Math.abs(g.deviationPct) <= GAMMA_CONVERSION_TOLERANCE_PCT,
      `${g.nuclide} ${g.quantity}: ${g.deviationPct.toFixed(2)}% > ${GAMMA_CONVERSION_TOLERANCE_PCT}%`,
    );
  }
});

test("50개 선질 전체가 집계에 포함된다", () => {
  const rep = buildAccuracyReport();
  assert.equal(rep.hvlDeviations.length, 50);
  assert.equal(rep.bands.reduce((a, b) => a + b.n, 0), 50);
});

test("밴드 경계는 연속(겹침/빈틈 없음)이고 저<중<고", () => {
  for (let i = 1; i < ENERGY_BANDS.length; i++) {
    assert.equal(ENERGY_BANDS[i].minKeV, ENERGY_BANDS[i - 1].maxKeV, "밴드 경계 불연속");
  }
});

test("종합 판정이 참이다(전 항목 사양 충족)", () => {
  assert.equal(buildAccuracyReport().allWithinSpec, true);
});
