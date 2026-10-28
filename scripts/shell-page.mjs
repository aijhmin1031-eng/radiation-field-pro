/** 공통 셸 v3 에 이 저장소의 쪽이 자기를 어떻게 말하는가 — 머리글의 「현재」 · 빵부스러기 · 꼬리말의 공유 대상 (2026-10-28, T3).
 *
 *  ★ 정본 `radiation-lab/public/shell/render.mjs`(사본 `shell/render.mjs`)는 쪽에 대해 셋만 묻는다: `currentHref`(어느 칸이
 *    「현재」인가) · `trail`(빵부스러기 마지막 조각) · `pageUrl` · `shareText`(공유 줄이 무엇을 권하는가). 그 답이 이 파일이다.
 *  ★ **세 자리가 같은 함수를 부른다** — `scripts/vite-plugin-shell.mjs`(index.html 에 그린다), `scripts/build-pages.mjs`
 *    (public/404.html 과 구역 메뉴 임시 쪽 넷을 만든다), `gate/check-shell.mjs`(산출물이 그 출력과 바이트 동일한지 잰다). 규칙을
 *    한쪽에만 적으면 게이트가 자기 규칙으로 재어 늘 빨개지거나 늘 통과한다. Vite 설정과 node 가 둘 다 그대로 읽는 평문 .mjs 다.
 *  (RadCalc `src/lib/shell-page.mjs` 와 같은 처방.) */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SECTION = "pro";
export const HOME = "https://pro.radiation-lab.com/";
export const HOME_SHARE = "Field Pro — ISO 4037 reference X-ray and gamma field workbench · Radiation Lab";

/** 이 저장소의 쪽들.
 *  - home: 앱(index.html). 404: 제 주소가 없으므로 「현재」 칸 없이, 공유 줄은 구역 홈을 권한다(우산 · RadCalc 의 404 와 같은 처방).
 *  - guide · methods · validation · about: 구역 메뉴의 네 주소에 두는 **임시 쪽**(2026-10-28 감독 지시) — 본문은 T6 에서 채운다.
 *    그때까지 `noindex,follow`. 사실만 적는다(거짓 약속 없음). `about/#limits` 는 shell.json 의 pro disclaimer 가 가리키는 자리다. */
export const PAGES = {
  home:     { currentHref: HOME, pageUrl: HOME, shareText: HOME_SHARE },
  notFound: { currentHref: "",   pageUrl: HOME, shareText: HOME_SHARE },
  guide: {
    path: "guide", title: "Guide · Field Pro · Radiation Lab", h1: "Guide",
    description: "A step-by-step guide to the Field Pro workbench is planned for this page. Until it is written, the workbench carries short hints next to each field.",
    body: [
      "This page is reserved for a step-by-step guide to the workbench: choosing the source, setting the filtration and the air path, the geometry and evaluation options, and reading the results and the uncertainty budget.",
      "It has not been written yet. Until then, the workbench itself carries short hints next to each field, and the section below the workbench summarises what it computes and how accurate it is.",
    ],
  },
  methods: {
    path: "methods", title: "Methods · Field Pro · Radiation Lab", h1: "Methods",
    description: "The methods behind the Field Pro workbench — spectrum model, attenuation data, HVL evaluation, conversion coefficients and the uncertainty budget — are to be documented on this page.",
    body: [
      "This page is reserved for the methods behind the workbench: the tungsten-anode spectrum model, the attenuation data, the evaluation of half-value layers and homogeneity, the spectrum-averaged conversion coefficients of ISO 4037-3, and the GUM uncertainty budget.",
      "It has not been written yet. The engine and its data are published with the source code, and the accuracy specification generated from the engine is linked from the Validation page.",
    ],
  },
  validation: {
    path: "validation", title: "Validation · Field Pro · Radiation Lab", h1: "Validation",
    description: "How the Field Pro engine is checked: HVL1 against the ISO 4037-1 table for all 50 qualities and conversion coefficients against ISO 4037-3, enforced by the test suite.",
    body: [
      "This page is reserved for the validation record of the workbench.",
      "Today the engine's first half-value layer is compared with the ISO 4037-1 table for all 50 radiation qualities (every deviation within 4% below 40 keV mean energy and within 2% above it), and the Cs-137 and Co-60 conversion coefficients with the ISO 4037-3 recommended values (within 2%). These checks run in the test suite, and the generated table is the <a href=\"https://github.com/aijhmin1031-eng/radiation-field-pro/blob/master/docs/accuracy-spec.md\">accuracy specification</a> in the repository.",
    ],
  },
  about: {
    path: "about", title: "About · Field Pro · Radiation Lab", h1: "About Field Pro",
    description: "Field Pro is a browser workbench for ISO 4037 reference X-ray and gamma fields, one of the pro workbenches of Radiation Lab. Everything runs in the browser; the source is MIT-licensed.",
    body: [
      "Field Pro is one of the pro workbenches of <a href=\"https://radiation-lab.com/\">Radiation Lab</a>: a browser workbench for characterising the reference X-ray and gamma fields of ISO 4037, written for calibration laboratories, dosimetry services and instrument test houses.",
      "Every calculation runs in your browser; nothing you enter is sent to a server. The source code is published on GitHub under the MIT licence: <a href=\"https://github.com/aijhmin1031-eng/radiation-field-pro\">Source (MIT)</a>.",
      "<span id=\"limits\">Limits.</span> The workbench supports the measurements and quality procedures of a laboratory; it does not replace them. Values for a real reference field are fixed by that facility's own measurements.",
    ],
  },
};
for (const [k, p] of Object.entries(PAGES)) {
  if (!p.path) continue;
  p.url = `${HOME}${p.path}/`;
  p.currentHref = p.url;
  p.pageUrl = p.url;
  p.shareText = p.title;
  p.trail = [{ label: k === "about" ? "About" : p.h1 }];
  p.key = k;
}
/** 구역 메뉴 임시 쪽 넷(생성 · 검사 순서). */
export const SECTION_PAGES = ["guide", "methods", "validation", "about"];

/** vendored 사본을 읽는다 — shell.json 과 render.mjs. 둘은 같은 판이어야 한다(sync-shell 이 한 번에 받는다). */
export async function loadShell() {
  const spec = JSON.parse(readFileSync(join(ROOT, "shell", "shell.json"), "utf8"));
  const R = await import(new URL("../shell/render.mjs", import.meta.url).href);
  return { spec, R };
}

/** 쪽 하나에 들어가는 조각 — head 자산(테마 부팅 + apex 절대 주소의 css · js), 머리글, (홈이 아닌 쪽은) 빵부스러기, 꼬리말. */
export function fragmentsFor({ spec, R }, page) {
  const p = PAGES[page];
  return {
    head:   R.renderHeadAssets(spec, { apex: false }),
    header: R.renderHeader(spec, { section: SECTION, currentHref: p.currentHref }),
    crumbs: p.trail ? R.renderBreadcrumb(spec, { section: SECTION, trail: p.trail }) : "",
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
