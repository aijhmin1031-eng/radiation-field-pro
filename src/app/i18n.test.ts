import { test } from "node:test";
import assert from "node:assert/strict";
import { STRINGS, t, type Key } from "./i18n.ts";
import { DEFAULT_INPUT, deserializeSession, matchPreset, mergeInput, presetFromIso, serializeSession } from "./compute.ts";

const HANGUL = /[가-힣]/;
const sample = (v: unknown) => (typeof v === "function" ? (v as (...a: unknown[]) => string)(...Array(v.length).fill("x")) : (v as string));

test("문구: 빈 문구가 없고 한글이 없다(영어 전용)", () => {
  for (const k of Object.keys(STRINGS) as Key[]) {
    const s = sample(STRINGS[k]);
    assert.ok(s.trim().length > 0, k);
    assert.ok(!HANGUL.test(s), `${k}: ${s}`);
  }
});

test("문구: t(key, …) 는 인자를 끼워 넣는다", () => {
  assert.equal(t("loaded", "a.json"), "Session loaded: a.json");
  assert.equal(t("calc"), "Calculate");
});

test("기본값: Type B 기본 성분 이름이 영어다", () => {
  assert.equal(DEFAULT_INPUT.readings.typeB[0].label, "Calibration certificate (reference chamber)");
});

test("기본값: 한글 UI 시절에 저장된 기본 이름만 영어로 옮기고, 사용자가 쓴 이름은 그대로 둔다", () => {
  const m = mergeInput({
    readings: {
      values: [],
      applyAirCorrection: true,
      typeB: [
        { label: "교정 성적서(기준 전리함)", relPct: 1 },
        { label: "Type B 성분", relPct: 0.5 },
        { label: "내 전위계 분해능", relPct: 0.2 },
      ],
    },
  });
  assert.deepEqual(
    m.readings.typeB.map((b) => b.label),
    ["Calibration certificate (reference chamber)", "Type B component", "내 전위계 분해능"],
  );
  const s = deserializeSession(serializeSession({ ...DEFAULT_INPUT, imported: { name: "붙여넣기", energy: [10], fluence: [1] } as never }));
  assert.equal(s.imported?.name, "Pasted");
});

test("프리셋 판별: 프리셋 그대로면 그 이름, 관전압·여과를 바꾸면 null", () => {
  assert.equal(matchPreset(DEFAULT_INPUT.xray), "N-80");
  assert.equal(matchPreset(presetFromIso("H-150")), "H-150");
  assert.equal(matchPreset({ ...presetFromIso("N-80"), kvp: 81 }), null);
  const x = presetFromIso("N-80");
  assert.equal(matchPreset({ ...x, filters: x.filters.map((f, i) => (i === 1 ? { ...f, thicknessMm: f.thicknessMm + 0.1 } : f)) }), null);
});
