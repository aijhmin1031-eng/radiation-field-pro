import { test } from "node:test";
import assert from "node:assert/strict";
import { DICTS, makeT, type Key } from "./i18n.ts";

const HANGUL = /[가-힣]/;
const sample = (v: unknown) => (typeof v === "function" ? (v as (...a: unknown[]) => string)(...Array(v.length).fill("x")) : (v as string));

test("i18n: en·ko 사전의 키 집합이 같다", () => {
  assert.deepEqual(Object.keys(DICTS.ko).sort(), Object.keys(DICTS.en).sort());
});

test("i18n: 같은 키는 두 사전에서 형태(문자열·함수와 인자 수)가 같다", () => {
  for (const k of Object.keys(DICTS.en) as Key[]) {
    const e = DICTS.en[k];
    const o = DICTS.ko[k];
    assert.equal(typeof o, typeof e, k);
    if (typeof e === "function") assert.equal((o as (...a: unknown[]) => string).length, e.length, k);
  }
});

test("i18n: 빈 문구가 없고, 영어 사전에는 한글이 없다", () => {
  for (const k of Object.keys(DICTS.en) as Key[]) {
    const e = sample(DICTS.en[k]);
    const o = sample(DICTS.ko[k]);
    assert.ok(e.trim().length > 0 && o.trim().length > 0, k);
    assert.ok(!HANGUL.test(e), `en.${k}: ${e}`);
  }
});

test("i18n: t(key, …) 는 인자를 끼워 넣는다", () => {
  assert.equal(makeT("en")("loaded", "a.json"), "Session loaded: a.json");
  assert.equal(makeT("ko")("loaded", "a.json"), "세션을 불러왔습니다: a.json");
  assert.equal(makeT("en")("calc"), "Calculate");
  assert.equal(makeT("ko")("calc"), "계산하기");
});
