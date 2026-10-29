/* check-shell — 공통 셸(HEADER-SPEC v3)이 **정본 그대로** 산출물에 박혀 있는가 (2026-10-28 신설 · 정적 · 브라우저 없음, T3).
 *  우산 `radiation-lab/gate/check-shell.mjs` · RadCalc `radiation-calc/gate/check-shell.mjs` 를 본떴다 — 이쪽은 Vite 산출물
 *  `dist/index.html` · `dist/404.html` 과 그 원본 `public/404.html` 을 잰다. `npm run gate` = build → 이 검사.
 *
 *  계기: 네 오리진이 「Radiation Lab /」 글자 말고는 글꼴 · 배경 · 메뉴 · 꼬리말이 제각각이었다(2026-10-28 실측 17쪽). Field Pro 는
 *  셸 자체가 없었고(앱 도구막대가 머리글, Google Fonts IBM Plex, hex 토큰, 404 없음), 이제 정본은 우산 `public/shell/`
 *  (shell.json · render.mjs · shell.css · shell.js)이고 이 저장소는 `shell/` 사본(`npm run sync-shell`)으로 빌드 때 머리글 · 꼬리말을
 *  그린다(`scripts/vite-plugin-shell.mjs` · `scripts/build-pages.mjs`). 이 게이트는 그 결과가 **그 함수의 출력과 글자 그대로 같은지**
 *  잰다 — index.html 에서 자리표시를 지우거나, 옛 글꼴 · 토큰이 다시 들어오거나, 사본만 갱신하고 404 를 안 만들면 빨개진다.
 *
 *  ★ 재는 것
 *    ① dist/index.html · dist/404.html · public/404.html · 구역 메뉴 임시 쪽 넷(dist · public 의 guide/methods/validation/about/index.html) —
 *       header.site 가 정확히 하나이고 renderHeader(spec, {section:"pro", currentHref})
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
 *       설명 쪽 일곱(구역 메뉴 넷 + 예제 셋, T6) — renderBreadcrumb 출력이 머리글과 main 사이에 글자 그대로 · 구역 메뉴 「현재」 칸
 *       (예제는 Guide) · noindex 없음 · canonical · <title> · description(160자 이하) · og:url · og:type article · TechArticle JSON-LD 하나
 *       (headline = h1, url = canonical, dateModified = PAGES.updated) · h1 · 「Open the workbench」 · 한글 0 · about 에 #limits
 *       (shell.json 의 pro disclaimer 목적지). index 의 소개 절은 구역 메뉴 쪽 넷과 예제 셋을 링크한다(앱 → 설명 쪽).
 *    ⑨ 글(T6 인계서 — 애드센스 「가치가 별로 없는 콘텐츠」 재심사용): 본문 단어 400~900(표 · 출처 목록 · 쪽 사이 링크 제외) ·
 *       출처 목록(ol.src) 항목 2개 이상 · **여덟 단어 이상의 문장이 두 쪽에 겹치지 않는다**(설명 쪽 일곱 + index 소개 절) ·
 *       본문의 사이트 안 링크(`/…`)가 실제 파일과 그 안의 #id 로 닿는다 · sitemap.xml(public · dist)이 앱 + 설명 쪽 일곱을 한 번씩,
 *       lastmod = PAGES.updated 로 든다(404 는 빠진다).
 *    ⑦ shell.json — version 정수 · 모든 href 가 절대 주소(https://…radiation-lab.com/). pro 구역에 계정 칸이 없다(가짜 칸 금지).
 *    ⑩ 판(T17 — 정본 src/version.json): RELEASES 가 x.y.z · 실제 날짜 · 최신이 위(번호가 내려가고 날짜가 거꾸로 가지 않는다). 모든 쪽(앱 · 404 ·
 *       설명 쪽 · 변경 기록, dist · public)에 renderVersion 출력이 **하나**, 꼬리말 바로 앞(사이에 빈칸뿐)에 글자 그대로 있다.
 *       변경 기록 쪽에 판마다 `<h2 id="v1-0-0">1.0.0 — 29 October 2026</h2>` 꼴의 절 머리가 하나씩 RELEASES 순서로(첫 절 = 지금 판),
 *       About 이 /changelog/ 를 링크한다. 변경 기록도 ⑥ · ⑨ 를 설명 쪽과 같이 받는다(색인 · 400~900어 · 출처 · 사이트맵).
 *    ⑧ vendored 사본(shell/)이 우산 정본과 같은가 — 옆에 우산 체크아웃(`../radiation-lab/public/shell` 또는 SHELL_SOURCE)이 있을 때만
 *       대조해 **경고**로 적는다(실패 아님 — CI 에는 우산이 없고, 정본이 앞서 갔을 수 있다 → `npm run sync-shell`).
 *  ★ 못 보는 것 — 화면은 안 본다(머리글 높이 · 넘침 · 다크 전환 · 뒤로가기는 e2e/workbench.spec.ts 가 Chromium 으로 잰다).
 *    shell.css 자체가 옳은지는 우산의 check-shell 이 잰다(이쪽은 사본을 신뢰한다). */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, SECTION, HOME, HOME_SHARE, loadShell, fragmentsFor, PAGES, SECTION_PAGES, CONTENT_PAGES, ARTICLE_PAGES, esc, RELEASES, VERSION, versionLine, releaseId, longDate } from "../scripts/shell-page.mjs";

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
  /* 설명 쪽 일곱(구역 메뉴 넷 + 예제 셋, T6) — dist 와 public 둘 다 */
  ...ARTICLE_PAGES.flatMap((k) => [
    { tag: `dist/${PAGES[k].path}/index.html`,   file: join(DIST, PAGES[k].path, "index.html"),           page: k, is404: false, section: true },
    { tag: `public/${PAGES[k].path}/index.html`, file: join(ROOT, "public", PAGES[k].path, "index.html"), page: k, is404: false, section: true },
  ]),
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

const prose = new Map(); // 설명 쪽 key → { s, body } (⑨ 글 검사용)
let homeAbout = "";
for (const f of FILES) {
  if (!existsSync(f.file)) { bad.push(`${f.tag}: 파일이 없다${f.page !== "home" ? " — `npm run build:pages`" : ""}`); continue; }
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
    const pg = PAGES[f.page];
    if (!foots[0].includes(`data-url="${pg.pageUrl}?utm_source=copy`)) bad.push(`${f.tag}: 공유 줄이 ${pg.pageUrl} 을 권하지 않는다`);
    if (!foots[0].includes(encodeURIComponent(pg.shareText))) bad.push(`${f.tag}: 공유 글이 「${pg.shareText}」 가 아니다`);
  }
  /* ⑩ 판 줄 — 하나, 꼬리말 바로 앞 */
  const line = versionLine();
  const ver = s.split(line).length - 1;
  if (ver !== 1) bad.push(`${f.tag}: 판 줄(renderVersion — Version ${VERSION.version} · ${longDate(VERSION.date)} · What changed)이 ${ver}개(하나여야 한다)`);
  else if (!/^\s*<footer class="site"/.test(s.slice(s.indexOf(line) + line.length))) bad.push(`${f.tag}: 판 줄이 꼬리말 바로 앞에 있지 않다`);
  if (!/\.fp-ver\s*\{/.test(cssOf(s))) bad.push(`${f.tag}: 판 줄의 CSS(.fp-ver)가 없다`);
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
  if (f.section) {
    const pg = PAGES[f.page];
    if (!s.includes(want.crumbs)) bad.push(`${f.tag}: 빵부스러기(renderBreadcrumb, Radiation Lab / Field Pro / ${pg.trail[0].label} + JSON-LD)가 글자 그대로 없다`);
    const crumbAt = body.indexOf('<nav class="crumbs"'), mainAt = body.indexOf('<main id="main"'), hdrEnd = body.indexOf("</header>");
    if (!(hdrEnd < crumbAt && crumbAt < mainAt)) bad.push(`${f.tag}: 빵부스러기가 머리글과 main 사이에 있지 않다`);
    if (!heads[0]?.includes(`<a class="hd-item" href="${pg.currentHref}" aria-current="page">`)) bad.push(`${f.tag}: 구역 메뉴의 「현재」 칸이 ${pg.currentHref} 가 아니다`);
    if (/<meta name="robots" content="[^"]*noindex/.test(head)) bad.push(`${f.tag}: robots noindex 가 남았다(T6 에서 본문을 채웠으므로 색인 대상이다)`);
    if (!head.includes(`<link rel="canonical" href="${pg.url}" />`)) bad.push(`${f.tag}: canonical 이 ${pg.url} 가 아니다`);
    if (!head.includes(`<title>${esc(pg.title)}</title>`)) bad.push(`${f.tag}: <title> 이 「${pg.title}」 이 아니다`);
    if (!head.includes(`<meta property="og:url" content="${pg.url}" />`) || !/<meta name="description" content="[^"]+" \/>/.test(head)) bad.push(`${f.tag}: description · og:url 이 없다`);
    if (pg.description.length > 160) bad.push(`${f.tag}: description 이 ${pg.description.length}자 — 160자 이하로(검색 결과에서 잘린다)`);
    if (!head.includes('<meta property="og:type" content="article" />') || !head.includes('<meta name="twitter:card" content="summary_large_image" />')) bad.push(`${f.tag}: og:type article · twitter:card 가 없다`);
    const lds = [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } });
    const art = lds.filter((x) => x?.["@type"] === "TechArticle");
    if (art.length !== 1) bad.push(`${f.tag}: head 의 TechArticle JSON-LD 가 ${art.length}개(하나여야 한다)`);
    else if (art[0].headline !== pg.h1 || art[0].url !== pg.url || art[0].dateModified !== pg.updated || art[0].inLanguage !== "en") bad.push(`${f.tag}: TechArticle 의 headline · url · dateModified · inLanguage 가 쪽과 다르다`);
    if (!body.includes(`<main id="main"><article class="pg">\n  <h1>${esc(pg.h1)}</h1>`)) bad.push(`${f.tag}: main#main > article.pg 의 h1 이 「${pg.h1}」 이 아니다`);
    if (!body.includes(`<a class="open" href="${HOME}">Open the workbench`)) bad.push(`${f.tag}: 「Open the workbench」 링크가 없다`);
    /* ⑨ 글 — public 쪽에서 한 번만 잰다(dist 는 아래에서 public 과 같은지 본다) */
    if (f.tag.startsWith("public/")) prose.set(f.page, { s, body });
    if (/[가-힣]/.test(s)) bad.push(`${f.tag}: 한글이 있다(영어 전용)`);
    if (f.page === "about" && !body.includes('id="limits"')) bad.push(`${f.tag}: #limits 가 없다(shell.json pro disclaimer 가 about/#limits 를 가리킨다)`);
  } else if (f.is404) {
    if (!s.includes(R.renderNotFound(spec, { section: SECTION }))) bad.push(`${f.tag}: renderNotFound 본문(main#main > div.nf)이 글자 그대로 없다`);
    if (!/<meta name="robots" content="noindex/.test(head)) bad.push(`${f.tag}: robots noindex 가 없다`);
    if (!s.includes(`<a href="${HOME}">Field Pro home</a>`)) bad.push(`${f.tag}: 구역 홈 링크가 없다`);
    if (/<title>Page not found · Field Pro · Radiation Lab<\/title>/.test(head) === false) bad.push(`${f.tag}: <title> 이 「Page not found · Field Pro · Radiation Lab」 이 아니다`);
  } else {
    if (!/<div id="root"><\/div>/.test(body)) bad.push(`${f.tag}: #root 가 없다`);
    if (!/<section class="fp-about"/.test(body)) bad.push(`${f.tag}: 정적 소개 절(.fp-about)이 없다`);
    else {
      homeAbout = body.slice(body.indexOf('<section class="fp-about"'), body.indexOf("</section>", body.indexOf('<section class="fp-about"')));
      for (const k of CONTENT_PAGES) if (!homeAbout.includes(`href="/${PAGES[k].path}/"`)) bad.push(`${f.tag}: 소개 절이 /${PAGES[k].path}/ 를 링크하지 않는다(앱 → 설명 쪽)`);
    }
    if (!/#root\s*\{\s*min-height:\s*100vh;?\s*\}/.test(head)) bad.push(`${f.tag}: #root 의 자리 예약(min-height: 100vh — CLS)이 없다`);
    if (!/Source \(MIT\)/.test(body) || !/accuracy\s+specification/.test(body)) bad.push(`${f.tag}: 소개 절에 Source (MIT) · accuracy specification 링크가 없다(옛 앱 꼬리말이 들던 것)`);
    if (/<header class="hdr"|class="foot /.test(body)) bad.push(`${f.tag}: 옛 앱 머리글 · 꼬리말 마크업이 정적으로 남았다`);
  }
  note(`${f.tag.padEnd(18)} 머리글 ${heads[0]?.length ?? 0}자 · 꼬리말 ${foots[0]?.length ?? 0}자 · 현재 ${(heads[0]?.match(/aria-current="page"/g) || []).length}곳 · 인라인 CSS hex ${hex.length}`);
}
/* dist 와 public 의 정적 쪽 · 사이트맵이 같은가 */
for (const rel of ["404.html", "sitemap.xml", ...ARTICLE_PAGES.map((k) => `${PAGES[k].path}/index.html`)])
  if (existsSync(join(DIST, rel)) && existsSync(join(ROOT, "public", rel)) && lf(readFileSync(join(DIST, rel), "utf8")) !== lf(readFileSync(join(ROOT, "public", rel), "utf8")))
    bad.push(`dist/${rel} 과 public/${rel} 이 다르다 — 빌드가 public/ 을 그대로 복사해야 한다`);

/* ⑨ 글 — 단어 수 · 출처 · 겹치는 문장 · 사이트 안 링크 · 사이트맵 */
const unent = (t) => t.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&[a-z]+;/g, " ");
const textOf = (h) => unent(h.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const articleOf = (body) => body.slice(body.indexOf('<article class="pg">'), body.indexOf("</article>"));
const proseOf = (a) => a.replace(/<ol class="src">[\s\S]*?<\/ol>|<table>[\s\S]*?<\/table>|<nav class="more"[\s\S]*?<\/nav>|<p class="upd">[\s\S]*?<\/p>/g, "");
const sentences = (t) => t.split(/(?<=[.!?])\s+/).map((x) => x.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim()).filter((x) => x.split(" ").length >= 8);
const seen = new Map(); // 문장 → 처음 나온 쪽
const addSentences = (t, where) => { for (const x of sentences(t)) { const w = seen.get(x); if (w && w !== where) bad.push(`겹치는 문장(${w} · ${where}): 「${x.slice(0, 90)}…」`); else seen.set(x, where); } };
if (homeAbout) addSentences(textOf(homeAbout), "index 소개 절");
const words = [];
for (const k of ARTICLE_PAGES) {
  const got = prose.get(k);
  if (!got) continue;
  const art = articleOf(got.body);
  const n = textOf(proseOf(art)).split(" ").filter((w) => /[A-Za-z]/.test(w)).length;
  words.push(`${k} ${n}`);
  if (n < 400 || n > 900) bad.push(`public/${PAGES[k].path}: 본문 ${n}어 — 400~900어(T6 인계서)`);
  const src = (art.match(/<ol class="src">([\s\S]*?)<\/ol>/) || [, ""])[1].match(/<li>/g) || [];
  if (src.length < 2) bad.push(`public/${PAGES[k].path}: 출처 목록(ol.src)이 ${src.length}항목 — 2개 이상`);
  addSentences(textOf(proseOf(art)), PAGES[k].path);
  /* 사이트 안 링크 — `/…` 와 pro.radiation-lab.com 절대 주소. 쪽 파일이 있고, #id 가 있으면 그 쪽에 그 id 가 있어야 한다 */
  for (const [, href] of art.matchAll(/href="([^"]+)"/g)) {
    const u = href.startsWith("/") ? new URL(href, HOME) : href.startsWith(HOME) ? new URL(href) : null;
    if (!u) continue;
    const rel = u.pathname === "/" ? "index.html" : `${u.pathname.replace(/^\//, "")}index.html`;
    const file = u.pathname === "/" ? join(DIST, "index.html") : join(ROOT, "public", rel);
    if (!u.pathname.endsWith("/") || !existsSync(file)) { bad.push(`public/${PAGES[k].path}: 링크 ${href} 가 닿는 쪽이 없다`); continue; }
    if (u.hash && u.pathname !== "/" && !readFileSync(file, "utf8").includes(`id="${u.hash.slice(1)}"`)) bad.push(`public/${PAGES[k].path}: 링크 ${href} 의 ${u.hash} 가 그 쪽에 없다`);
  }
}
for (const where of ["public", "dist"]) {
  const file = join(where === "public" ? join(ROOT, "public") : DIST, "sitemap.xml");
  if (!existsSync(file)) { bad.push(`${where}/sitemap.xml 이 없다`); continue; }
  const xml = readFileSync(file, "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map((m) => [m[1], m[2]]);
  const want = [[HOME, PAGES.home.updated], ...ARTICLE_PAGES.map((k) => [PAGES[k].url, PAGES[k].updated])];
  if (JSON.stringify(locs) !== JSON.stringify(want)) bad.push(`${where}/sitemap.xml 이 앱 + 설명 쪽 일곱 + 변경 기록(lastmod = PAGES.updated)과 다르다 — ${locs.map((l) => l[0].replace(HOME, "/")).join(" ")}`);
}

/* ⑩ 판 · 변경 기록 */
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const num = (v) => v.match(SEMVER).slice(1).map(Number);
if (!Array.isArray(RELEASES) || !RELEASES.length) bad.push("src/version.json: releases 가 비었다");
RELEASES.forEach((r, i) => {
  if (!SEMVER.test(r.version ?? "")) return bad.push(`src/version.json: 판 번호 「${r.version}」 이 x.y.z 가 아니다`);
  const d = new Date(`${r.date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date ?? "") || isNaN(d) || d.toISOString().slice(0, 10) !== r.date) bad.push(`src/version.json: ${r.version} 의 날짜 「${r.date}」 가 실제 날짜가 아니다`);
  const prev = RELEASES[i - 1];
  if (prev && SEMVER.test(prev.version)) {
    const [a, b] = [num(prev.version), num(r.version)];
    const cmp = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    if (cmp <= 0) bad.push(`src/version.json: ${prev.version} 다음에 ${r.version} — 최신이 위여야 한다(번호가 내려가야 한다)`);
    if (prev.date < r.date) bad.push(`src/version.json: ${prev.version}(${prev.date}) 이 ${r.version}(${r.date}) 보다 이르다`);
  }
});
if (prose.has("changelog")) {
  const art = articleOf(prose.get("changelog").body);
  const got = [...art.matchAll(/<h2 id="(v[\d-]+)">([^<]*)<\/h2>/g)].map((m) => `${m[1]} ${m[2]}`);
  const wantH = RELEASES.map((r) => `${releaseId(r.version)} ${r.version} — ${longDate(r.date)}`);
  if (JSON.stringify(got) !== JSON.stringify(wantH)) bad.push(`public/changelog: 판 절 머리가 RELEASES 와 다르다 — 있음 [${got.join(" | ")}] · 있어야 [${wantH.join(" | ")}]`);
}
if (prose.has("about") && !articleOf(prose.get("about").body).includes('href="/changelog/"')) bad.push("public/about: 변경 기록(/changelog/) 링크가 없다");

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
console.log(`✅ 공통 셸 v${V} — index · 404 · 설명 쪽 7 · 변경 기록(dist · public, ${FILES.length}파일) 머리글 · 꼬리말(· 빵부스러기)이 render.mjs 출력과 글자 그대로 같다 · 설명 쪽 색인 · TechArticle · 현재 칸 ✓ · 본문 단어(${words.join(", ")}) · 겹치는 문장 0 · 사이트 안 링크 · 사이트맵 ${ARTICLE_PAGES.length + 1}주소 ✓ · 판 ${VERSION.version} 줄 ${FILES.length}/${FILES.length} · 변경 기록 절 ${RELEASES.length} · head 자산 ?v=${V}(apex 절대 주소) · Google Fonts · IBM Plex · @font-face 0 · 옛 토큰 · hex 색 0(인라인 + assets CSS ${cssN}) · 구획 해시 9 + 탭 2 · shell.json 절대 주소 ${hrefs.length}개 · pro 계정 칸 없음`);
for (const w of warn) console.log("   ⚠️  " + w);
if (!existsSync(join(SRC, "shell.json"))) console.log(`   (우산 정본 ${SRC} 이 옆에 없어 사본 대조는 건너뛰었다 — CI 에서는 늘 그렇다)`);
