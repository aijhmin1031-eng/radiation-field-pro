/** 공통 셸 v3 에 이 쪽(Field Pro)이 자기를 어떻게 말하는가 — 머리글의 「현재」와 꼬리말의 공유 대상 (2026-10-28, T3).
 *
 *  ★ 정본 `radiation-lab/public/shell/render.mjs`(사본 `shell/render.mjs`)는 쪽에 대해 둘만 묻는다: `currentHref`(어느 칸이
 *    「현재」인가)와 `pageUrl` · `shareText`(공유 줄이 무엇을 권하는가). 그 답을 정하는 규칙이 이 파일이다.
 *  ★ **세 자리가 같은 함수를 부른다** — `scripts/vite-plugin-shell.mjs`(index.html 에 그린다), `scripts/build-404.mjs`
 *    (public/404.html 을 만든다), `gate/check-shell.mjs`(산출물이 그 출력과 바이트 동일한지 잰다). 규칙을 한쪽에만 적으면
 *    게이트가 자기 규칙으로 재어 늘 빨개지거나 늘 통과한다. Vite 설정과 node 가 둘 다 그대로 읽는 평문 .mjs 다.
 *  (RadCalc `src/lib/shell-page.mjs` 와 같은 처방.) */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SECTION = "pro";
export const HOME = "https://pro.radiation-lab.com/";
export const HOME_SHARE = "Field Pro — ISO 4037 reference X-ray and gamma field workbench · Radiation Lab";

/** 이 저장소의 쪽 둘. 404 는 제 주소가 없으므로 「현재」 칸 없이, 공유 줄은 구역 홈을 권한다(우산 · RadCalc 의 404 와 같은 처방). */
export const PAGES = {
  home:     { currentHref: HOME, pageUrl: HOME, shareText: HOME_SHARE },
  notFound: { currentHref: "",   pageUrl: HOME, shareText: HOME_SHARE },
};

/** vendored 사본을 읽는다 — shell.json 과 render.mjs. 둘은 같은 판이어야 한다(sync-shell 이 한 번에 받는다). */
export async function loadShell() {
  const spec = JSON.parse(readFileSync(join(ROOT, "shell", "shell.json"), "utf8"));
  const R = await import(new URL("../shell/render.mjs", import.meta.url).href);
  return { spec, R };
}

/** 쪽 하나에 들어가는 조각 셋 — head 자산(테마 부팅 + apex 절대 주소의 css · js), 머리글, 꼬리말. */
export function fragmentsFor({ spec, R }, page) {
  const p = PAGES[page];
  return {
    head:   R.renderHeadAssets(spec, { apex: false }),
    header: R.renderHeader(spec, { section: SECTION, currentHref: p.currentHref }),
    footer: R.renderFooter(spec, { section: SECTION, pageUrl: p.pageUrl, shareText: p.shareText }),
  };
}

/** index.html 의 자리표시 셋. 사람이 읽는 index.html 에는 이 주석만 있고, 산출물에는 render.mjs 출력이 글자 그대로 들어간다. */
export const SLOTS = { head: "<!-- rl-shell:head -->", header: "<!-- rl-shell:header -->", footer: "<!-- rl-shell:footer -->" };

/** 자리표시를 조각으로 바꾼다. 셋이 다 있어야 한다 — 하나라도 없으면 쪽이 셸 없이 나가므로 실패다. */
export function fillSlots(html, frag) {
  for (const k of Object.keys(SLOTS)) {
    const n = html.split(SLOTS[k]).length - 1;
    if (n !== 1) throw new Error(`index.html: 자리표시 ${SLOTS[k]} 가 ${n}개(하나여야 한다)`);
    html = html.replace(SLOTS[k], frag[k]);
  }
  return html;
}
