# Radiation Field Pro

**A browser workbench for characterizing ISO 4037 reference X-ray and gamma fields and the dosimetry that goes with them.**

Radiation Field Pro models the spectrum of a tungsten-anode X-ray tube through any stack of filters and air,
derives the beam's mean and effective energy, first and second half-value layers and homogeneity coefficient,
and converts air kerma to the operational quantities Hp(10, α), H\*(10) and H′(0.07, α) with spectrum-averaged
coefficients. It compares the result with the ISO 4037-1:2019 radiation qualities (L, N, W and H series),
covers the Cs-137 and Co-60 nuclide fields, corrects a reading for air density, and combines repeated
readings into a GUM uncertainty budget. Everything runs in the browser; nothing is sent to a server.

- Live: https://pro.radiation-lab.com/
- Accuracy specification (generated from the engine and enforced by tests): [docs/accuracy-spec.md](docs/accuracy-spec.md)
- Part of [Radiation Lab](https://radiation-lab.com/) · [About](https://radiation-lab.com/about) · [Contact](https://radiation-lab.com/contact)
- The interface is in English. Quantity symbols and units follow ISO 4037 and ICRU usage.
- Versions and what changed between them: https://pro.radiation-lab.com/changelog/ (the number itself lives in `src/version.json`)

---

## ★★★ 판 표시와 변경 기록 (2026-10-29, T17)

- **정본은 `src/version.json` 한 곳**(`releases`, 최신이 위). 번호 규칙(소유주 결정 · RadCalc 와 같다): 계산값 · 자료가 바뀌면 가운데 자리(1.0 → 1.1), 글 · 화면만 고치면 끝자리(1.0.0 → 1.0.1). 첫 번호판은 1.0.0 · 2026-10-29.
- **읽는 자리**: 모든 쪽(앱 · 404 · 설명 쪽 · 변경 기록)의 공통 꼬리말 바로 위 판 줄 「Version 1.0.0 · 29 October 2026 · What changed」(`scripts/shell-page.mjs` 의 `renderVersion` — index.html 은 자리표시 `<!-- rl-version -->`), 앱 인쇄 리포트 머리(`src/app/App.tsx`), 변경 기록 쪽 `/changelog/`(`content/changelog.html`, 빵부스러기 · 「현재」 칸은 About). 정본 shell 은 고치지 않는다.
- **판을 올리는 법**: ① `src/version.json` 맨 위에 `{ "version", "date" }` 한 줄 ② `content/changelog.html` 맨 위에 그 판의 절 `<h2 id="v1-1-0">1.1.0 — 12 November 2026</h2>` — 계산값 · 판정이 바뀐 것을 먼저, 무엇이 · 언제 · 얼마나 · 그 전 결과가 어떻게 달랐는지 ③ `changelog` 의 `updated`(`scripts/shell-page.mjs`). `npm run gate`(check-shell ⑩)가 번호 꼴 · 순서 · 날짜, 19파일 모두의 판 줄(꼬리말 바로 앞, 하나), 변경 기록 절 머리가 RELEASES 와 같은지, About 의 링크를 잰다.
- 릴리스 · 태그는 아직 없다(만들 때는 소유주 확인 뒤).

---

## ★★★ 공통 셸 v3 — 머리글 · 꼬리말 · 토큰을 `radiation-lab/public/shell` 정본으로 (2026-10-28, T3)

**계기.** 소유주 「radiation-lab.com 이 하나의 사이트처럼 보이게」. 네 오리진 17쪽 실측(2026-10-28)에서 Field Pro 는 사이트 셸이 **없었다** —
앱 도구막대가 머리글이었고(휴대폰 191px), Google Fonts IBM Plex Sans KR · Mono 를 받았고(우산 원칙 「제3자 요청 0」과 충돌), 바탕 `#f4f1ea` ·
글자 `#1b2233` · 주황 `#e8641b` 의 hex 토큰이 `color-scheme: light` 로 고정돼 다크가 없었고, 404 는 Vercel 의 text/plain `NOT_FOUND` 78 바이트(링크 0)였고,
구획을 옮겨도 주소가 같아 뒤로가기가 앱 밖으로 나갔다(Lighthouse 모바일 82 · 데스크톱 71, CLS 0.955, 대비 미달 `span.idx` 3.2 · `span.unit` 2.98).
설계 · 결정 기록: `D:\Files\_작업\20261028_radiation-lab 사이트 개편\20261028_1240_…_공통 셸 명세·결정 기록·작업 분해_설계안.md` §3.9 · §4 C행 · D8.

**정본은 우산 `public/shell/`** (shell.json · render.mjs · shell.css · shell.js · fonts/ — https://radiation-lab.com/shell/, 파일 version 3 — v3 = data-wrap 구역의 휴대폰 ☰ 시트, 이 저장소의 390px 실측 125px 에 대응해 우산 #85 로 올라갔다).
이 저장소는 그 **사본 `shell/`** 을 든다 — `npm run sync-shell`(`scripts/sync-shell.mjs`)이 apex 에서 받아 온다(받은 것이 셸인지 검사한 뒤 쓴다 ·
네트워크가 안 되면 사본을 두고 경고 · `--from=<dir>` 로 로컬 체크아웃 복사, 글자 파일은 LF 로 맞춰 라이브와 바이트 동일). **사본은 손으로 고치지 않는다** —
고칠 것은 우산에 고치고 다시 받는다. 빌드는 shell.json · render.mjs 만 쓴다; shell.css · shell.js · Saira 글꼴은 라이브에서 apex 가 내주고(`?v=3`),
E2E · 실측은 Playwright route 로 apex 요청을 사본으로 돌려 세운다(`e2e/shell-assets.ts` — 주소가 절대 주소라 서버가 가로챌 수 없다).

| 자리 | 전 | 후 |
|---|---|---|
| 머리글 · 꼬리말 | 없음(앱 `<header class="hdr">` h1 「Radiation Lab / Field Pro」 + 도구막대 · `<footer class="foot">` 링크 5) | **Vite 플러그인** `scripts/vite-plugin-shell.mjs`(`transformIndexHtml`, dev · build 공통)이 `index.html` 의 자리표시 `<!-- rl-shell:head/header/footer -->` 에 `renderHeadAssets` · `renderHeader(section:"pro", currentHref 홈)` · `renderFooter(pageUrl 홈, shareText)` 출력을 **빌드 때 글자로** 넣는다 — dist/index.html 에 정적으로 박히고 JS 로 그리지 않는다(D5). 쪽별 값(현재 칸 · 공유 대상)은 `scripts/shell-page.mjs` 한 곳 |
| 앱 머리 블록 | 쪽 머리글 | 사이트 머리글 아래 **본문 첫 블록**(`div.hdr`): h1 「Radiation Field Pro」(e2e 가 「Radiation」 포함을 요구) · 부제 · `ISO 4037-1/-3/-4 · GUM` · 도구막대 · 모바일 탭. 「Radiation Lab /」 링크는 셸이 든다 |
| 앱 꼬리말 | Radiation Lab · About · Privacy · Contact · Source (MIT) + 정확도 사양 문장 | **제거** — 공통 꼬리말(공유 줄 + Field Pro / Radiation Lab / Legal). `Source (MIT)` · `accuracy specification` 링크와 「facility's own measurements」 문장은 정적 소개 절 `.fp-about` 에 보존 |
| 글꼴 | Google Fonts IBM Plex Sans KR · Mono(index.html 3줄) | **제거**. 본문 `var(--body)`(system-ui) · 제목 · 패널 제목 `var(--display)`(Saira, 셸이 로드) · 숫자 · 단위 `var(--mono)` |
| 토큰 `src/app/styles.css` | hex 20개(`--paper` · `--ink` · `--signal` …) + `color-scheme: light` | 모두 `rgb(var(--c-*))` — 바탕 paper · 카드 · 입력 surface · 흐린 바탕 panel · 선 line / line-strong · 글자 ink / ink-muted / ink-faint · 강조 **accent**(앰버 — `--signal` 자리 그대로: 활성 · 포커스 · 기준선 · 패널 번호) · 경고 warn. 셸에 없는 셋만 쪽 전용 삼중항 `--fp-ok` · `--fp-down` · `--fp-warn-soft`(라이트 · 다크). `color-scheme` 고정 삭제 → `data-theme` 로 **다크가 동작**(테마 단추는 셸) |
| 대비 | `span.idx` 3.2:1 · `span.unit` 2.98:1 | idx = accent 6.3:1(surface) · unit = ink-faint 5.4:1(surface) · 모든 보조 글자 ≥ 4.5:1 |
| CLS | 0.955 — 앱이 마운트되며 `.fp-about` 이 통째로 밀림 | `#root { min-height: 100vh }` 자리 예약(무JS 는 `<noscript>` 로 0) — 소개 절이 처음부터 접힘 아래라 밀려도 보이지 않는다 |
| 구획 해시(D8) | 없음 — 뒤로가기가 앱 밖으로 | `src/app/hash.ts`: 모바일 탭 `#input` · `#results`, 패널 제목 id 아홉(`#source` · `#geometry` · `#readout` · `#repeatability` · `#spectrum` · `#characteristics` · `#operational` · `#iso` · `#uncertainty`, 번호가 그 주소의 링크). 탭을 옮기면 `history.pushState`, `popstate` · `hashchange` 로 복원, 접속 때 해시로 탭 열고 패널로 내려감 |
| 404 | 없음 | `public/404.html` — `scripts/build-pages.mjs`(빌드 첫 단계)가 `renderHeader` + `renderNotFound(section:"pro")` + `renderFooter` 로 **정적** 생성 · 커밋. Vercel 이 산출물 뿌리의 404.html 을 자동으로 쓴다(Workers 이전 때는 `not_found_handling: "404-page"`) |
| 구역 메뉴 쪽 | 없음(Guide · Methods · Validation · About 이 404) | `public/{guide,methods,validation,about}/index.html` — 같은 스크립트가 공통 셸 + `renderBreadcrumb`(Radiation Lab / Field Pro / 쪽) + 사실만 담은 2~4문장 + 「Open the workbench」로 **정적** 생성 · 커밋(감독 지시 2026-10-28). 본문은 T6 에서 채웠다(위 「설명 층」 절 — noindex 해제). 구역 칸 「현재」는 그 쪽. about 의 `#limits` 는 shell.json pro disclaimer 의 목적지. 글은 `scripts/shell-page.mjs` PAGES 한 곳 |
| 건너뛰기 링크 | React 가 그림(머리글 뒤 포커스) | `index.html` 의 정적 `<a class="skip">`(body 첫 요소, 모양은 shell.css) |

**실측**(Playwright, dist + 사본 shell/ v3, 4쪽(/ · /404.html · /guide/ · /about/) × 1280/390 × 라이트/다크 = 16, `D:\Files\_작업\20261028_radiation-lab 사이트 개편\T3_캡처\실측.md`):
머리글 **56px(1280, 한 줄) · 91px(390, 두 줄 — 셸 파일 v3 의 ☰ 시트가 전역 메뉴 둘과 테마 단추를 품고 구역 5칸은 한 줄; 파일 v2 에서는 125px 세 줄이었다)**,
앱 머리 블록 108px(1280) · 191px(390), 가로 넘침 0, JS · HTTP 오류 0, 외부 요청 호스트 radiation-lab.com 뿐(Google Fonts 0), shell.css 200 · 적용, Saira 로드,
`--c-paper` 232 234 230 / 18 21 23, 테마 단추(390 은 ☰ 시트 안 `#thm-sheet`)로 전환 · 저장, 뒤로가기 2회가 앱 안(`/#characteristics → /#iso → 뒤로 → 뒤로 → /`), 임시 쪽의 구역 칸 「현재」 Guide · About.
Lighthouse(before 라이브 → after 로컬 dist): 모바일 perf 62 → 74 · a11y 97 → **100** · CLS 1 → **0**, 데스크톱 perf 71 → 97 · a11y 97 → **100** · CLS 0.955 → **0**, 대비 미달 35곳 → 0, 제3자 0.

**게이트 `npm run check-shell`**(`gate/check-shell.mjs`, 신설 · 정적 · 우산 · RadCalc 것을 본뜸): dist/index.html · dist/404.html · public/404.html 의
header.site · footer.site 가 같은 호출의 render.mjs 출력과 **바이트 동일**(머리글 14,124자 · 꼬리말 3,210자) · head 자산 `?v=` = shell.json version ·
Google Fonts · IBM Plex · Pretendard · `@font-face` 0 · 옛 토큰 이름 0 · **hex 색 0**(인라인 + 번들 CSS, 인쇄 블록 제외) · `color-scheme: light` 고정 0 ·
구획 해시 9 + 탭 2 와 pushState · popstate 가 번들에 있음 · shell.json 절대 주소 · pro 구역 계정 칸 없음 · 사본이 우산 정본과 같은가(옆에 있을 때 경고).
임시 쪽 넷(dist · public)도 머리글 · 꼬리말 · 빵부스러기 바이트 동일 · noindex · 현재 칸 · canonical · h1 · 한글 0 을 잰다. 체인: `npm run gate` = build → check-shell, `npm run ci` = typecheck → test → gate → e2e. `.github/workflows/ci.yml` 이 같은 체인을 돈다.

**E2E**(`e2e/workbench.spec.ts`, 데스크톱 1440 · Pixel 7): 기존 11건 유지(h1 「Radiation」 · 한글 0 · 0.57 · N-80 · k = 2.776 · 넘침 0) + 셸 6건 —
머리글 · 꼬리말 정적 · shell.css 적용(`--c-paper` 232 234 230, h1 Saira) · 외부 요청이 apex 뿐 · 테마 단추로 다크(`18 21 23`) 전환과 새로 고침 뒤 유지 ·
탭/패널 두 번 옮긴 뒤 뒤로가기 두 번이 앱 안에서 멈춤 · `#uncertainty` 접속 · 404.html · 구역 메뉴 다섯 링크 전부 200(로컬 서버) + `/validation/` 빵부스러기 · h1.

## ★★ 설명 층 — Guide · Methods · Validation · About + 예제 셋 (2026-10-28, T6)

**계기.** 애드센스 재심사(10-06 「가치가 별로 없는 콘텐츠」 거절)를 통과할 **고유한 설명**이 필요했다. 구역 메뉴 네 주소는 T3 에서 noindex 임시 쪽(사실 2~4문장)이었다.

| 쪽 | 주소 | 무엇 |
|---|---|---|
| Guide | `/guide/` | 입력 패널 01–04 · 수동/자동 계산 · 결과 A–D 읽기 · 저장 · 인쇄 · 딥링크 · 답을 바꾸는 실수 다섯 |
| Methods | `/methods/` | SpekPy 스펙트럼 · NIST 감쇠 · HVL · ISO 4037-1 매칭 규칙 · ISO 4037-3 스펙트럼 평균(평균에너지 지름길과의 차) · 핵종 · 공기밀도 · GUM |
| Validation | `/validation/` | HVL1 50선질 밴드 · N-80 상세 · 핵종 변환계수 · 커마율 상수 · 편차의 이유 · 검증 안 된 것 |
| About | `/about/` | 용도 · 저자 · 구성 · 브라우저에 남는 것 · `#limits`(shell.json pro disclaimer 목적지) · 연락 |
| 예제 셋 | `/examples/<slug>/` | N-80 측정기 시험 · Cs-137 2.5 m · 반복 판독 → 보고 불확도. 빵부스러기는 Guide 를 거치고 「현재」 칸은 Guide |

- **글은 `content/*.html`(예제는 `content/examples/`)**, 쪽 정보(제목 · h1 · 설명문 · 갱신일)는 `scripts/shell-page.mjs` 의 PAGES. `scripts/build-pages.mjs` 가
  공통 셸 · 빵부스러기 · h1 · 갱신일 · 「Open the workbench」 · 쪽 사이 링크로 두르고, head 에 canonical · OG(article) · TechArticle JSON-LD 를 단다.
  `public/sitemap.xml` 도 같은 스크립트가 만든다(앱 + 설명 쪽 일곱, lastmod = PAGES.updated). 앱 → 설명 쪽 링크는 `index.html` 소개 절 「Read more」.
- **숫자는 엔진을 같은 입력으로 돌려 얻었다**(작업 폴더 `D:\Files\_작업61028_radiation-lab 사이트 개편\T6_원고\_script`). 엔진 · 데이터를 고치면 쪽의 숫자도
  다시 확인한다 — 예제 표의 HVL1 0.5753 은 E2E 가 앱 화면과 대조한다. 핵종 자료는 IAEA Live Chart(ENSDF)와 대조했다.
- **게이트(`gate/check-shell.mjs` ⑨)**: 본문 400~900어 · 출처(ol.src) 2개 이상 · 여덟 단어 이상 문장이 두 쪽(+ 소개 절)에 겹치지 않음 · 사이트 안 링크와 `#id` 가
  닿음 · 사이트맵 · noindex 없음 · description 160자 이하. **E2E**: 일곱 쪽 넘침 0 · 한글 0 · 예제 → `/?preset=N-80` 딥링크가 같은 HVL1 을 띄움.

## ★★ 배포 — Cloudflare Workers 로 (2026-10-28, T8)

- **왜**: Vercel Hobby 는 상업적 이용을 금지하고 Google AdSense 를 이름으로 든다. 광고는 Guide 같은 설명 쪽에 실릴 계획이다(결정 D13). 우산 · RadCalc 는 같은 이유로 10-06 에 옮겼고, 여기도 같은 방식이다.
- **무엇**: `wrangler.jsonc`(정적 자산만 · Worker 스크립트 없음 · `not_found_handling: "404-page"` · `html_handling: "auto-trailing-slash"`) + `cf/_headers`(Vercel 이 보내던 CORS `*` · HSTS 2년 유지, `/assets/*` 1년 immutable) + `.github/workflows/deploy.yml`(master 푸시 → `npm run build` → `wrangler deploy` → workers.dev 연기 시험).
- **전환**: 라우트 `pro.radiation-lab.com/*` 는 `pro` DNS 레코드가 프록시(주황)일 때만 깨어난다. DNS-only(회색)인 동안은 Vercel 이 계속 나가고 이 Worker 는 `radiation-lab-pro.jhmin1031.workers.dev` 로만 답한다. 되돌리기는 레코드를 다시 DNS-only 로 돌리는 것이다.
- **달라지는 것 하나**: `/guide` 처럼 끝 슬래시 없는 주소가 Vercel 에서는 200 이었고 Workers 에서는 `/guide/` 로 307 이다. canonical · 사이트맵 · 링크는 전부 슬래시 쪽이다.
- **실측**(로컬 `wrangler dev`, 2026-10-28): 사이트맵 8쪽 · robots · favicon · 404 본문이 라이브 Vercel 과 같다(이 PC 의 CRLF 만 다르다 — CI 는 LF). 404 는 셸 404 쪽 · 상태 404, `_headers` 는 파일로 나가지 않는다. JS 해시 `index-BiHzizDo.js` 동일.
- 비밀값은 저장소 Actions secret `CLOUDFLARE_API_TOKEN`, 계정 ID 는 저장소 변수 `CLOUDFLARE_ACCOUNT_ID`.

## 무엇을 계산하는가

| 영역 | 내용 |
|---|---|
| X선 스펙트럼 | 텅스텐 양극(20°) 관, 관전압 10–400 kV, 여과층 목록(Be·Al·Cu·Sn·Ta·W·Pb)과 공기 경로를 지난 플루언스 스펙트럼 |
| 선질 특성 | 평균에너지, 유효에너지, 제1·제2 반가층(HVL1·HVL2, Al 또는 Cu), 균질도, 상대 공기커마 |
| 운영선량 | 공기커마 → Hp(10, α), H\*(10), H′(0.07, α) 변환계수(Sv/Gy), 스펙트럼 평균, 입사각 0–75° |
| ISO 비교 | ISO 4037-1:2019 선질 50개 중 자동 매칭, HVL1·HVL2·균질도·평균에너지 편차와 허용 밴드 판정 |
| 핵종 기준장 | Cs-137·Co-60 선 스펙트럼, 평가일 방사능(붕괴 보정), 점선원 공기커마율 |
| 판독 보정 | 온도·기압·습도로 공기밀도 보정계수 k_ρ |
| 불확도 | 반복측정의 A형, B형 합성, 유효자유도 ν_eff, 보고 형식(GUM) |
| 기타 | 측정 스펙트럼 불러오기(파일·붙여넣기), 세션 JSON 저장·불러오기, 인쇄용 리포트 |

## ISO 4037 범위와 정확도

- **ISO 4037-1:2019** — L·N·W·H 시리즈 X선 선질 50개(10–400 kV). 기준 빔(고유여과 + 부가여과 + 2.5 m 공기)에서
  모델 HVL1과 표값의 편차는 저에너지(평균 0–40 keV) 최대 3.91 %, 중에너지(40–150 keV) 최대 1.45 %,
  고에너지(≥ 150 keV) 최대 1.69 %이며, 보증 봉투는 각각 ≤ 4 %, ≤ 2 %, ≤ 2 %다.
- **ISO 4037-3:2019** — Cs-137·Co-60의 Hp(10)·H\*(10)·H′(0.07) 변환계수가 ISO 권고값과 1.03 % 이내로 맞는다(봉투 ≤ 2 %).
- 전체 표와 판정은 [docs/accuracy-spec.md](docs/accuracy-spec.md)에 있다. 이 문서는 `npm run report:accuracy`로
  엔진에서 다시 만들어지고, `src/validation/accuracy-spec.test.ts`가 봉투를 강제한다.
- 이 도구는 교정·시험 설계와 검토를 돕는 계산기다. 실제 기준장의 값은 그 시설의 측정으로 정한다.

## 실행

Node.js 22 이상이 필요하다.

```sh
npm ci
npm run dev          # 개발 서버
npm test             # 엔진·검증·화면 어댑터 단위 테스트
npm run typecheck    # 타입 검사
npm run build        # public/404.html + 설명 쪽 일곱 + sitemap.xml 생성 → dist/ 에 정적 파일 생성(공통 셸 삽입)
npm run e2e          # Playwright E2E (데스크톱·모바일, 빌드 뒤 4173 미리보기 서버; 셸 자산은 shell/ 사본으로)
npm run sync-shell   # 공통 셸 사본 shell/ 을 apex 에서 다시 받기(--from=<dir> 로 로컬 체크아웃)
npm run gate         # build + check-shell(공통 셸이 정본 그대로인가)
npm run ci           # typecheck → test → gate → e2e
npm run report:accuracy   # docs/accuracy-spec.md 재생성
```

## 구조

- `src/engine/` — 계산 엔진(스펙트럼, 감쇠, 선량 변환, ISO 비교, 붕괴, 공기밀도, 불확도). 화면과 독립적이다.
- `src/data/` — 감쇠계수, 텅스텐 방출 스펙트럼, ISO 4037-1 선질 표, ISO 4037-3 변환계수.
- `src/validation/` — ISO 표값과 대조하는 검증 테스트.
- `src/app/` — React 화면. `hash.ts` 가 구획 해시(탭 · 패널 주소)를 맡는다.
- `shell/` — 공통 셸 사본(지금 파일 v4, 우산 `radiation-lab/public/shell` 정본, `npm run sync-shell`). 손으로 고치지 않는다.
- `content/` — 설명 쪽 일곱의 본문 조각(영어 HTML).
- `scripts/` — `sync-shell.mjs` · `shell-page.mjs`(쪽별 셸 값 · PAGES) · `vite-plugin-shell.mjs`(index.html 삽입) · `build-pages.mjs`(public/404.html + 설명 쪽 일곱 + sitemap.xml) · 정확도 보고서 · 데이터 생성.
- `gate/` — `check-shell.mjs`(공통 셸 게이트).
- `docs/` — 정확도 사양, 화면 설계 기록.

## 라이선스

[MIT](LICENSE) © 2026 Radiation Lab
