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

---

## ★★★ 공통 셸 v3 — 머리글 · 꼬리말 · 토큰을 `radiation-lab/public/shell` 정본으로 (2026-10-28, T3)

**계기.** 소유주 「radiation-lab.com 이 하나의 사이트처럼 보이게」. 네 오리진 17쪽 실측(2026-10-28)에서 Field Pro 는 사이트 셸이 **없었다** —
앱 도구막대가 머리글이었고(휴대폰 191px), Google Fonts IBM Plex Sans KR · Mono 를 받았고(우산 원칙 「제3자 요청 0」과 충돌), 바탕 `#f4f1ea` ·
글자 `#1b2233` · 주황 `#e8641b` 의 hex 토큰이 `color-scheme: light` 로 고정돼 다크가 없었고, 404 는 Vercel 의 text/plain `NOT_FOUND` 78 바이트(링크 0)였고,
구획을 옮겨도 주소가 같아 뒤로가기가 앱 밖으로 나갔다(Lighthouse 모바일 82 · 데스크톱 71, CLS 0.955, 대비 미달 `span.idx` 3.2 · `span.unit` 2.98).
설계 · 결정 기록: `D:\Files\_작업61028_radiation-lab 사이트 개편61028_1240_…_공통 셸 명세·결정 기록·작업 분해_설계안.md` §3.9 · §4 C행 · D8.

**정본은 우산 `public/shell/`** (shell.json · render.mjs · shell.css · shell.js · fonts/ — https://radiation-lab.com/shell/, version 2).
이 저장소는 그 **사본 `shell/`** 을 든다 — `npm run sync-shell`(`scripts/sync-shell.mjs`)이 apex 에서 받아 온다(받은 것이 셸인지 검사한 뒤 쓴다 ·
네트워크가 안 되면 사본을 두고 경고 · `--from=<dir>` 로 로컬 체크아웃 복사, 글자 파일은 LF 로 맞춰 라이브와 바이트 동일). **사본은 손으로 고치지 않는다** —
고칠 것은 우산에 고치고 다시 받는다. 빌드는 shell.json · render.mjs 만 쓴다; shell.css · shell.js · Saira 글꼴은 라이브에서 apex 가 내주고(`?v=2`),
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
| 404 | 없음 | `public/404.html` — `scripts/build-404.mjs`(빌드 첫 단계)가 `renderHeader` + `renderNotFound(section:"pro")` + `renderFooter` 로 **정적** 생성 · 커밋. Vercel 이 산출물 뿌리의 404.html 을 자동으로 쓴다(Workers 이전 때는 `not_found_handling: "404-page"`) |
| 건너뛰기 링크 | React 가 그림(머리글 뒤 포커스) | `index.html` 의 정적 `<a class="skip">`(body 첫 요소, 모양은 shell.css) |

**실측**(Playwright, dist + 사본 shell/, 2쪽 × 1280/390 × 라이트/다크 = 8, `D:\Files\_작업61028_radiation-lab 사이트 개편\T3_캡처\실측.md`):
머리글 **56px(1280, 한 줄) · 125px(390, 세 줄 — 2 메뉴 + 구역 5칸이 390px 한 줄에 들어가지 않아 shell.css 규칙대로 둘째 줄이 한 번 더 꺾인다)**,
앱 머리 블록 108px(1280) · 191px(390), 가로 넘침 0, JS · HTTP 오류 0, 외부 요청 호스트 radiation-lab.com 뿐(Google Fonts 0), shell.css 200 · 적용, Saira 로드,
`--c-paper` 232 234 230 / 18 21 23, 테마 단추로 전환 · 저장, 뒤로가기 2회가 앱 안(`/#characteristics → /#iso → 뒤로 → 뒤로 → /`).
Lighthouse(before 라이브 → after 로컬 dist): 모바일 perf 62 → 74 · a11y 97 → **100** · CLS 1 → **0**, 데스크톱 perf 71 → 97 · a11y 97 → **100** · CLS 0.955 → **0**, 대비 미달 35곳 → 0, 제3자 0.

**게이트 `npm run check-shell`**(`gate/check-shell.mjs`, 신설 · 정적 · 우산 · RadCalc 것을 본뜸): dist/index.html · dist/404.html · public/404.html 의
header.site · footer.site 가 같은 호출의 render.mjs 출력과 **바이트 동일**(머리글 11,891자 · 꼬리말 3,210자) · head 자산 `?v=` = shell.json version ·
Google Fonts · IBM Plex · Pretendard · `@font-face` 0 · 옛 토큰 이름 0 · **hex 색 0**(인라인 + 번들 CSS, 인쇄 블록 제외) · `color-scheme: light` 고정 0 ·
구획 해시 9 + 탭 2 와 pushState · popstate 가 번들에 있음 · shell.json 절대 주소 · pro 구역 계정 칸 없음 · 사본이 우산 정본과 같은가(옆에 있을 때 경고).
체인: `npm run gate` = build → check-shell, `npm run ci` = typecheck → test → gate → e2e. `.github/workflows/ci.yml` 이 같은 체인을 돈다.

**E2E**(`e2e/workbench.spec.ts`, 데스크톱 1440 · Pixel 7): 기존 11건 유지(h1 「Radiation」 · 한글 0 · 0.57 · N-80 · k = 2.776 · 넘침 0) + 셸 5건 —
머리글 · 꼬리말 정적 · shell.css 적용(`--c-paper` 232 234 230, h1 Saira) · 외부 요청이 apex 뿐 · 테마 단추로 다크(`18 21 23`) 전환과 새로 고침 뒤 유지 ·
탭/패널 두 번 옮긴 뒤 뒤로가기 두 번이 앱 안에서 멈춤 · `#uncertainty` 접속 · 404.html.

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
npm run build        # public/404.html 생성 → dist/ 에 정적 파일 생성(공통 셸 삽입)
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
- `shell/` — 공통 셸 v3 사본(우산 `radiation-lab/public/shell` 정본, `npm run sync-shell`). 손으로 고치지 않는다.
- `scripts/` — `sync-shell.mjs` · `shell-page.mjs`(쪽별 셸 값) · `vite-plugin-shell.mjs`(index.html 삽입) · `build-404.mjs`(public/404.html) · 정확도 보고서 · 데이터 생성.
- `gate/` — `check-shell.mjs`(공통 셸 게이트).
- `docs/` — 정확도 사양, 화면 설계 기록.

## 라이선스

[MIT](LICENSE) © 2026 Radiation Lab
