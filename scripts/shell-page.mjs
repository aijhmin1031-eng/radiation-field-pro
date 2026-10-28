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
 *  - guide · methods · validation · about: 구역 메뉴의 네 주소 — 설명 층 본문(2026-10-28 T6, 그전에는 noindex 임시 쪽). 본문은
 *    `content/<key>.html` 조각이고, 머리 · 빵부스러기 · TechArticle JSON-LD · 끝의 「Open the workbench」 · 쪽 사이 링크는 build-pages 가 두른다.
 *  - examples: 예제 셋(`/examples/<slug>/`, 본문 `content/examples/<slug>.html`). 구역 메뉴에 칸이 없으므로 「현재」 칸은 Guide 이고
 *    빵부스러기는 Guide 를 거친다(주소 없는 가운데 조각은 render.mjs 가 「현재」로 그리므로 Guide 에 주소를 준다).
 *  - 글의 원칙(T6 인계서): 영어 · 쪽당 400~900어 · 숫자마다 출처 · 앱이 실제로 하는 것만. 숫자는 엔진을 같은 입력으로 돌려 얻었다
 *    (작업 폴더 `T6_원고/_script`). `about/#limits` 는 shell.json 의 pro disclaimer 가 가리키는 자리다.
 *  - updated: 사이트맵 lastmod 와 JSON-LD dateModified 가 같은 값을 쓴다 — 본문을 고치면 함께 고친다. */
const UPDATED = "2026-10-28";
export const PAGES = {
  home:     { currentHref: HOME, pageUrl: HOME, shareText: HOME_SHARE, updated: UPDATED },
  notFound: { currentHref: "",   pageUrl: HOME, shareText: HOME_SHARE },
  guide: {
    path: "guide", crumb: "Guide", updated: UPDATED,
    title: "Guide to the workbench · Field Pro · Radiation Lab",
    h1: "Guide: from source settings to a reported result",
    description: "How to use Field Pro: the four input panels, calculation modes, reading HVL, conversion coefficients and uncertainty, saving and printing, and common mistakes.",
  },
  methods: {
    path: "methods", crumb: "Methods", updated: UPDATED,
    title: "Methods: spectra, HVL, conversion, GUM · Field Pro · Radiation Lab",
    h1: "Methods: how the engine computes a reference field",
    description: "The data and formulas behind Field Pro: SpekPy spectra, NIST attenuation, HVL, ISO 4037-1 matching, ISO 4037-3 conversion coefficients, decay and the GUM.",
  },
  validation: {
    path: "validation", crumb: "Validation", updated: UPDATED,
    title: "Validation against ISO 4037 · Field Pro · Radiation Lab",
    h1: "Validation: the engine against the ISO 4037 tables",
    description: "Field Pro against ISO 4037: HVL1 of all 50 qualities within 4% below 40 keV and 2% above, nuclide coefficients within 1.1%, causes of deviations, limits.",
  },
  about: {
    path: "about", crumb: "About", updated: UPDATED,
    title: "About Field Pro · Radiation Lab",
    h1: "About Field Pro",
    description: "What Field Pro is for, who writes it, how it is built, what stays on your computer, and its limits: planning and cross-checking, not an accredited calibration.",
  },
  "n-80": {
    path: "examples/n-80-survey-meter-type-test", crumb: "N-80 field example", example: true, updated: UPDATED,
    title: "Example: N-80 field for a survey-meter test · Field Pro · Radiation Lab",
    h1: "Example: an N-80 reference field for a survey-meter energy-response test",
    description: "N-80 in Field Pro: HVL1 0.5753 mm Cu against 0.580 in ISO 4037-1, H*(10)/Ka 1.723 Sv/Gy, the meter's conventional value, and kV and filter errors.",
  },
  "cs-137": {
    path: "examples/cs-137-field-at-2-5-m", crumb: "Cs-137 field example", example: true, updated: UPDATED,
    title: "Example: Cs-137 field at 2.5 m · Field Pro · Radiation Lab",
    h1: "Example: a Cs-137 field at 2.5 m — air kerma rate, lead HVL and Hp(10)",
    description: "A Cs-137 source after 10.8 years of decay: 94.53 µGy/h at 2.5 m, Hp(10) and H*(10) rates, a 5.6 mm lead HVL, and what the point-source model omits.",
  },
  uncertainty: {
    path: "examples/repeat-readings-uncertainty", crumb: "Uncertainty example", example: true, updated: UPDATED,
    title: "Example: readings to reported uncertainty · Field Pro · Radiation Lab",
    h1: "Example: from five chamber readings to a reported result",
    description: "Five chamber readings to 1.5328 ± 0.031: air-density correction 1.0336, Type A k = 2.776, a 1% certificate component, and why the combined k is 1.96.",
  },
};
for (const [k, p] of Object.entries(PAGES)) {
  if (!p.path) continue;
  p.url = `${HOME}${p.path}/`;
  p.currentHref = p.example ? `${HOME}guide/` : p.url;
  p.pageUrl = p.url;
  p.shareText = p.title;
  p.trail = p.example ? [{ label: "Guide", href: `${HOME}guide/` }, { label: p.crumb }] : [{ label: p.crumb }];
  p.content = `content/${p.path}.html`; // 본문 조각(저장소 뿌리 기준)
  p.key = k;
}
/** 구역 메뉴 쪽 넷 · 예제 셋(생성 · 검사 · 사이트맵 순서). */
export const SECTION_PAGES = ["guide", "methods", "validation", "about"];
export const EXAMPLE_PAGES = ["n-80", "cs-137", "uncertainty"];
export const CONTENT_PAGES = [...SECTION_PAGES, ...EXAMPLE_PAGES];
/** HTML 글자 이스케이프 — 빌드와 게이트가 같은 것을 쓴다. */
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
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
