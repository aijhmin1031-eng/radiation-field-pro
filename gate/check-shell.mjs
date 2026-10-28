/* check-shell — 공통 셸(HEADER-SPEC v3)이 **정본 그대로** 산출물에 박혀 있는가 (2026-10-28 신설 · 정적 · 브라우저 없음, T3).
 *  우산 `radiation-lab/gate/check-shell.mjs` · RadCalc `radiation-calc/gate/check-shell.mjs` 를 본떴다 — 이쪽은 Vite 산출물
 *  `dist/index.html` · `dist/404.html` 과 그 원본 `public/404.html` 을 잰다. `npm run gate` = build → 이 검사.
 *
 *  계기: 네 오리진이 「Radiation Lab /」 글자 말고는 글꼴 · 배경 · 메뉴 · 꼬리말이 제각각이었다(2026-10-28 실측 17쪽). Field Pro 는
 *  셸 자체가 없었고(앱 도구막대가 머리글, Google Fonts IBM Plex, hex 토큰, 404 없음), 이제 정본은 우산 `public/shell/`
 *  (shell.json · render.mjs · shell.css · shell.js)이고 이 저장소는 `shell/` 사본(`npm run sync-shell`)으로 빌드 때 머리글 · 꼬리말을
 *  그린다(`scripts/vite-plugin-shell.mjs` · `scripts/build-404.mjs`). 이 게이트는 그 결과가 **그 함수의 출력과 글자 그대로 같은지**
 *  잰다 — index.html 에서 자리표시를 지우거나, 옛 글꼴 · 토큰이 다시 들어오거나, 사본만 갱신하고 404 를 안 만들면 빨개진다.
 *
 *  ★ 재는 것
 *    ① dist/index.html · dist/404.html · public/404.html — header.site 가 정확히 하나이고 renderHeader(spec, {section:"pro", currentHref})
 *       와 **바이트 동일**(현재 칸 규칙은 `scripts/shell-page.mjs` — 빌드와 게이트가 같은 함수를 부른다). 머리글은 body 의 첫 요소
 *       (건너뛰기 링크 다음), 꼬리말은 마지막 요소(스크립트 앞)다.
 *    ② footer.site 가 정확히 하나이고 renderFooter(…) 와 바이트 동일. 공유 줄은 구역 홈 + HOME_SHARE 를 권한다.
 *    ③ head 에 apex 절대 주소의 `shell.css?v=N` · `shell.js?v=N`(N = shell.json 의 version) · preconnect · 그리기 전 테마 스크립트가 있다.
 *    ④ 글꼴: Google Fonts(fonts.googleapis · fonts.gstatic) · IBM Plex · Pretendard · @font-face 가 HTML · 묶인 CSS 어디에도 0.
 *       토큰: 옛 이름(`--paper:` · `--ink:` · `--signal:` · `--sans:` · `--rule:`)이 0 · **hex 색이 0**(CSS 값 자리의 #rgb · #rrggbb) ·
 *       `color-scheme: light` 고정이 0 — 색은 모두 `rgb(var(--c-*))` 또는 쪽 전용 삼중항 `--fp-*` 라 data-theme 로 뒤집힌다.
 *       IBM Plex 가 번들 JS 에도 없다.
 *    ⑤ 구획 해시(D8): 패널 제목 id 아홉(source · geometry · readout · repeatability · spectrum · characteristics · operational · iso ·
 *       uncertainty)과 `#input` · `#results` 가 번들 JS 에 있고, pushState · popstate 를 쓴다. `<main id="main">` 이 번들에 있다.
 *    ⑥ 404 — renderNotFound 본문(`div.nf`) · `<main id="main">` · robots noindex · 구역 홈 링크. index 에 #root 와 .fp-about.
 *    ⑦ shell.json — version 정수 · 모든 href 가 절대 주소(https://…radiation-lab.com/). pro 구역에 계정 칸이 없다(가짜 칸 금지).
 *    ⑧ vendored 사본(shell/)이 우산 정본과 같은가 — 옆에 우산 체크아웃(`../radiation-lab/public/shell` 또는 SHELL_SOURCE)이 있을 때만
 *       대조해 **경고**로 적는다(실패 아님 — CI 에는 우산이 없고, 정본이 앞서 갔을 수 있다 → `npm run sync-shell`).
 *  ★ 못 보는 것 — 화면은 안 본다(머리글 높이 · 넘침 · 다크 전환 · 뒤로가기는 e2e/workbench.spec.ts 가 Chromium 으로 잰다).
 *    shell.css 자체가 옳은지는 우산의 check-shell 이 잰다(이쪽은 사본을 신뢰한다). */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, SECTION, HOME, HOME_SHARE, loadShell, fragmentsFor, PAGES } from "../scripts/shell-page.mjs";

const DIST = join(ROOT, "dist");
const { spec, R } = await loadShell();
const V = spec.version;
const bad = [];
const note = (s) => console.log("   " + s);
const lf = (s) => s.replace(/\r\n/g, "\n");

/* ⑦ shell.json */
if (!Number.isInteger(V) || V < 1) bad.push(`shell.json version 이 정수가 아니다: ${V}`);
const hrefs = [];
(function walk(o) { if (Array.isArray(o)) return o.forEach(walk); if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { if (k === "href" || k === "home" || k === "account" || k === "disclaimer") { if (typeof v === "string") hrefs.push(v); } else walk(v); } })(spec);
for (const h of hrefs) if (!/^https:\/\/[a-z.]*radiation-lab\.com\//.test(h) && h !== "{disclaimer}") bad.push(`shell.json 에 절대 주소가 아닌 href: ${h}`);
if (spec.sections[SECTION]?.account) bad.push(`shell.json sections.${SECTION}.account 가 있다 — Field Pro 에는 계정이 없다(가짜 칸 금지)`);
if (spec.sections[SECTION]?.home !== HOME) bad.push(`shell.json sections.${SECTION}.home(${spec.sections[SECTION]?.home}) 이 이 쪽의 주소(${HOME})와 다르다`);

if (!existsSync(join(DIST, "index.html"))) { console.error("❌ dist/index.html 이 없다 — `npm run build` 먼저"); process.exit(1); }

const FILES = [
  { tag: "dist/index.html",  file: join(DIST, "index.html"), page: "home",     is404: false },
  { tag: "dist/404.html",    file: join(DIST, "404.html"),   page: "notFound", is404: true },
  { tag: "public/404.html",  file: join(ROOT, "public", "404.html"), page: "notFound", is404: true },
];
const OLD_FONT = [/fonts\.googleapis\.com/, /fonts\.gstatic\.com/, /IBM Plex/, /Pretendard/, /@font-face/];
const OLD_TOKEN = [/--paper:/, /--paper-2:/, /--ink:/, /--ink-2:/, /--ink-3:/, /--signal:/, /--signal-soft:/, /--sans:/, /--rule:/, /--rule-strong:/, /--panel:/, /--grid:/, /--ok:/, /--bad:/];
/* hex 색 — 값 자리(콜론 · 공백 · 쉼표 · 괄호 뒤)의 #rgb/#rrggbb(aa). #root · #main 같은 id 선택자는 글자가 hex 범위를 벗어나 걸리지 않는다. */
const HEX = /(?<=[:\s,(])#[0-9a-fA-F]{3,8}(?=[\s;,)!}])/g;
/* 번들 JS 의 문자열 따옴표 — 압축기가 백틱을 쓴다 */
const Q = "[\"'`]";
/* 인쇄 블록은 종이 색(white · black)을 쓰므로 hex 검사에서 뺀다 — 중괄호를 세어 @media print{…} 만 떼어 낸다 */
function stripPrint(css) {
  let out = css, i;
  while ((i = out.indexOf("@media print")) >= 0) {
    let j = out.indexOf("{", i), depth = 0;
    for (; j < out.length; j++) { if (out[j] === "{") depth++; else if (out[j] === "}" && --depth === 0) break; }
    out = out.slice(0, i) + out.slice(j + 1);
  }
  return out;
}
const cssOf = (html) => (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join("\n");

for (const f of FILES) {
  if (!existsSync(f.file)) { bad.push(`${f.tag}: 파일이 없다${f.is404 ? " — `npm run build:404`" : ""}`); continue; }
  const s = lf(readFileSync(f.file, "utf8"));
  const want = fragmentsFor({ spec, R }, f.page);
  /* ① 머리글 */
  const heads = s.match(/<header class="site"[\s\S]*?<\/header>/g) || [];
  if (heads.length !== 1) bad.push(`${f.tag}: header.site 가 ${heads.length}개(하나여야 한다)`);
  else if (heads[0] !== want.header) {
    const i = [...heads[0]].findIndex((c, k) => c !== want.header[k]);
    bad.push(`${f.tag}: 머리글이 render.mjs 출력과 다르다(${heads[0].length} vs ${want.header.length}자, 첫 차이 ${i}번째: 「${heads[0].slice(Math.max(0, i - 20), i + 30).replace(/\n/g, "⏎")}」)`);
  }
  const body = s.slice(s.indexOf("<body"));
  const firstEl = body.replace(/^<body[^>]*>\s*/, "").replace(/^<a class="skip" href="#main">[^<]*<\/a>\s*/, "");
  if (!firstEl.startsWith("<header class=\"site\"")) bad.push(`${f.tag}: 머리글이 body 의 첫 요소(건너뛰기 링크 다음)가 아니다`);
  if (!/<a class="skip" href="#main">Skip to main content<\/a>/.test(body)) bad.push(`${f.tag}: 건너뛰기 링크(.skip → #main)가 없다`);
  /* ② 꼬리말 */
  const foots = s.match(/<footer class="site"[\s\S]*?<\/footer>/g) || [];
  if (foots.length !== 1) bad.push(`${f.tag}: footer.site 가 ${foots.length}개(하나여야 한다)`);
  else {
    if (foots[0] !== want.footer) bad.push(`${f.tag}: 꼬리말이 render.mjs 출력과 다르다(${foots[0].length} vs ${want.footer.length}자)`);
    const after = body.slice(body.indexOf("</footer>") + "</footer>".length).replace(/<script[^>]*>[\s\S]*?<\/script>|<link[^>]*>|\s/g, "");
    if (after !== "</body></html>") bad.push(`${f.tag}: 꼬리말 뒤에 스크립트 말고 다른 것이 있다 — 「${after.slice(0, 60)}」`);
    if (!foots[0].includes(`data-url="${HOME}?utm_source=copy`)) bad.push(`${f.tag}: 공유 줄이 구역 홈(${HOME})을 권하지 않는다`);
    if (!foots[0].includes(encodeURIComponent(HOME_SHARE))) bad.push(`${f.tag}: 공유 글이 HOME_SHARE 가 아니다`);
  }
  /* ③ head 자산 */
  const head = s.slice(0, s.indexOf("<body"));
  if (!head.includes(want.head)) bad.push(`${f.tag}: head 에 renderHeadAssets 출력(테마 부팅 + preconnect + shell.css?v=${V} + shell.js?v=${V})이 글자 그대로 없다`);
  if ((head.match(/shell\.css\?v=/g) || []).length !== 1) bad.push(`${f.tag}: shell.css 링크가 하나가 아니다`);
  if (!/dataset\.theme = dark \? "dark" : "light"/.test(head)) bad.push(`${f.tag}: head 의 그리기 전 테마 스크립트가 없다`);
  if (/<meta name="color-scheme" content="light"/.test(head)) bad.push(`${f.tag}: color-scheme 이 light 로 고정돼 있다(data-theme 로 다크가 돌아야 한다)`);
  /* ④ 글꼴 · 토큰 (HTML 전체 + 인라인 CSS) */
  for (const re of OLD_FONT) if (re.test(s)) bad.push(`${f.tag}: 옛 글꼴 요청이 남았다 — ${re.source}`);
  const css = cssOf(s);
  for (const re of OLD_TOKEN) if (re.test(css)) bad.push(`${f.tag}: 인라인 CSS 에 옛 토큰이 남았다 — ${re.source}`);
  const hex = stripPrint(css).match(HEX) || [];
  if (hex.length) bad.push(`${f.tag}: 인라인 CSS 에 hex 색 ${hex.length}개 — ${[...new Set(hex)].join(" ")}`);
  if (/color-scheme:\s*light\b/.test(css)) bad.push(`${f.tag}: 인라인 CSS 가 color-scheme: light 를 고정한다`);
  /* ⑥ 쪽마다 */
  if (f.is404) {
    if (!s.includes(R.renderNotFound(spec, { section: SECTION }))) bad.push(`${f.tag}: renderNotFound 본문(main#main > div.nf)이 글자 그대로 없다`);
    if (!/<meta name="robots" content="noindex/.test(head)) bad.push(`${f.tag}: robots noindex 가 없다`);
    if (!s.includes(`<a href="${HOME}">Field Pro home</a>`)) bad.push(`${f.tag}: 구역 홈 링크가 없다`);
    if (/<title>Page not found · Field Pro · Radiation Lab<\/title>/.test(head) === false) bad.push(`${f.tag}: <title> 이 「Page not found · Field Pro · Radiation Lab」 이 아니다`);
  } else {
    if (!/<div id="root"><\/div>/.test(body)) bad.push(`${f.tag}: #root 가 없다`);
    if (!/<section class="fp-about"/.test(body)) bad.push(`${f.tag}: 정적 소개 절(.fp-about)이 없다`);
    if (!/#root\s*\{\s*min-height:\s*100vh;?\s*\}/.test(head)) bad.push(`${f.tag}: #root 의 자리 예약(min-height: 100vh — CLS)이 없다`);
    if (!/Source \(MIT\)/.test(body) || !/accuracy\s+specification/.test(body)) bad.push(`${f.tag}: 소개 절에 Source (MIT) · accuracy specification 링크가 없다(옛 앱 꼬리말이 들던 것)`);
    if (/<header class="hdr"|class="foot /.test(body)) bad.push(`${f.tag}: 옛 앱 머리글 · 꼬리말 마크업이 정적으로 남았다`);
  }
  note(`${f.tag.padEnd(18)} 머리글 ${heads[0]?.length ?? 0}자 · 꼬리말 ${foots[0]?.length ?? 0}자 · 현재 ${(heads[0]?.match(/aria-current="page"/g) || []).length}곳 · 인라인 CSS hex ${hex.length}`);
}
/* dist 와 public 의 404 가 같은가 */
if (existsSync(join(DIST, "404.html")) && existsSync(join(ROOT, "public", "404.html")) && lf(readFileSync(join(DIST, "404.html"), "utf8")) !== lf(readFileSync(join(ROOT, "public", "404.html"), "utf8")))
  bad.push("dist/404.html 과 public/404.html 이 다르다 — 빌드가 public/ 을 그대로 복사해야 한다");

/* ④⑤ 묶인 CSS · JS */
const assets = existsSync(join(DIST, "assets")) ? readdirSync(join(DIST, "assets")) : [];
let cssN = 0, jsN = 0;
for (const a of assets.filter((x) => x.endsWith(".css"))) {
  cssN++;
  const css = readFileSync(join(DIST, "assets", a), "utf8");
  for (const re of OLD_FONT) if (re.test(css)) bad.push(`assets/${a}: 옛 글꼴이 남았다 — ${re.source}`);
  for (const re of OLD_TOKEN) if (re.test(css)) bad.push(`assets/${a}: 옛 토큰 정의가 남았다 — ${re.source}`);
  const hex = stripPrint(css).match(HEX) || [];
  if (hex.length) bad.push(`assets/${a}: hex 색 ${hex.length}개 — ${[...new Set(hex)].join(" ")} (토큰으로 — data-theme 로 뒤집혀야 한다)`);
  if (/color-scheme:\s*light\b/.test(css)) bad.push(`assets/${a}: color-scheme: light 고정이 남았다`);
  for (const must of ["rgb(var(--c-paper))", "rgb(var(--c-ink))", "rgb(var(--c-accent))", "var(--body)", "var(--display)", "var(--mono)"])
    if (!css.includes(must)) bad.push(`assets/${a}: 정본 토큰 ${must} 를 쓰지 않는다`);
  if (!/header\.site,\s*footer\.site[^{]*\{[^}]*display:\s*none/.test(css)) bad.push(`assets/${a}: 인쇄에서 공통 머리글 · 꼬리말을 숨기지 않는다`);
}
for (const a of assets.filter((x) => x.endsWith(".js"))) {
  jsN++;
  const js = readFileSync(join(DIST, "assets", a), "utf8");
  if (/IBM Plex|fonts\.googleapis/.test(js)) bad.push(`assets/${a}: 번들 JS 에 옛 글꼴 이름이 있다`);
  for (const id of ["source", "geometry", "readout", "repeatability", "spectrum", "characteristics", "operational", "iso", "uncertainty"])
    if (!new RegExp(`id:${Q}${id}${Q}`).test(js) || !new RegExp(`href:${Q}#${id}${Q}`).test(js)) bad.push(`assets/${a}: 패널 해시 #${id} 가 번들에 없다`);
  for (const h of ["input", "results"]) if (!new RegExp(`:${Q}${h}${Q}`).test(js)) bad.push(`assets/${a}: 탭 해시 #${h} 가 번들에 없다`);
  if (!/pushState/.test(js) || !/popstate/.test(js)) bad.push(`assets/${a}: history.pushState · popstate 가 번들에 없다(D8 구획 해시)`);
  if (!new RegExp(`id:${Q}main${Q}`).test(js)) bad.push(`assets/${a}: <main id="main"> 이 번들에 없다(건너뛰기 링크의 목적지)`);
  if (new RegExp(`className:${Q}skip${Q}|className:${Q}foot[ \`"']`).test(js)) bad.push(`assets/${a}: 옛 건너뛰기 링크 · 앱 꼬리말이 React 에 남았다`);
}
if (cssN !== 1) bad.push(`dist/assets 의 CSS 가 ${cssN}개(하나여야 한다)`);
if (jsN < 1) bad.push("dist/assets 에 JS 가 없다");

/* ⑧ 사본이 정본과 같은가 — 경고만 */
const SRC = process.env.SHELL_SOURCE || join(ROOT, "..", "radiation-lab", "public", "shell");
const warn = [];
if (existsSync(join(SRC, "shell.json"))) {
  for (const f of ["shell.json", "render.mjs", "shell.css", "shell.js"]) {
    const a = lf(readFileSync(join(ROOT, "shell", f), "utf8"));
    const b = existsSync(join(SRC, f)) ? lf(readFileSync(join(SRC, f), "utf8")) : null;
    if (b === null) warn.push(`${SRC} 에 ${f} 가 없다`); else if (a !== b) warn.push(`shell/${f} 가 우산 정본(${SRC})과 다르다 — 정본이 앞섰으면 npm run sync-shell`);
  }
}

if (bad.length) { console.error(`❌ 공통 셸 v${V} — 정본에서 벗어난 것 ${bad.length}건\n`); bad.forEach((b) => console.error("  · " + b)); process.exit(1); }
console.log(`✅ 공통 셸 v${V} — index · 404(dist · public) 머리글 · 꼬리말이 render.mjs 출력과 글자 그대로 같다 · head 자산 ?v=${V}(apex 절대 주소) · Google Fonts · IBM Plex · @font-face 0 · 옛 토큰 · hex 색 0(인라인 + assets CSS ${cssN}) · 구획 해시 9 + 탭 2 · shell.json 절대 주소 ${hrefs.length}개 · pro 계정 칸 없음`);
for (const w of warn) console.log("   ⚠️  " + w);
if (!existsSync(join(SRC, "shell.json"))) console.log(`   (우산 정본 ${SRC} 이 옆에 없어 사본 대조는 건너뛰었다 — CI 에서는 늘 그렇다)`);
void PAGES;
