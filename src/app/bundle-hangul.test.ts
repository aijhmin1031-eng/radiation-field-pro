/**
 * 배포 번들에 한글이 남지 않았는지 — 화면은 영어 전용(2026-10-26 사용자 지시)이다.
 * 임시 폴더로 실제 vite 빌드를 하고, 나온 JS 의 한글 낱말을 모두 센다.
 * 허용: LEGACY_LABELS 의 키(한글 UI 시절 저장된 기본값 이름을 영어로 옮기는 데 필요).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { LEGACY_LABELS } from "./compute.ts";

const HANGUL = /[가-힣]+/g;
const ROOT = fileURLToPath(new URL("../..", import.meta.url));

test("번들 JS 에 한글 낱말이 LEGACY_LABELS 키 말고는 0건", { timeout: 120_000 }, async () => {
  const allowed = new Set(Object.keys(LEGACY_LABELS).flatMap((k) => k.match(HANGUL) ?? []));
  const out = mkdtempSync(join(tmpdir(), "rfp-bundle-"));
  try {
    await build({ root: ROOT, logLevel: "silent", build: { outDir: out, emptyOutDir: true } });
    const js = readdirSync(join(out, "assets")).filter((f) => f.endsWith(".js"));
    assert.ok(js.length > 0, "JS 번들이 없다");
    const stray: string[] = [];
    let legacy = 0;
    for (const f of js) {
      for (const [w] of readFileSync(join(out, "assets", f), "utf8").matchAll(HANGUL)) {
        if (allowed.has(w)) legacy++;
        else stray.push(`${f}: ${w}`);
      }
    }
    assert.deepEqual(stray, [], `허용 목록 밖 한글 ${stray.length}건`);
    assert.ok(legacy > 0, "LEGACY_LABELS 키가 번들에 없다 — 허용 목록 검사가 헛돈다");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
