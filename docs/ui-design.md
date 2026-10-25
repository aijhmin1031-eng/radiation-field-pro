# UI 설계 합의서 — radiation-field-pro U1

확정일 2026-10-25. 엔진(D1–D5 + 슬롯 3종) 완결 후 UI 착수 전에 사용자와 합의한 결정. 이 문서가 U1 구현의 기준이다.

## 기반
- 스택: Vite + React + TypeScript 순수 SPA. 같은 저장소 `src/app/`(UI), `src/engine/`(그대로 import).
- 배포: Vercel 프로젝트 `radiation-field-pro` ← GitHub `master`(공개 저장소, MIT). 프로덕션 공개, 미리보기는 Vercel Authentication(팀 로그인) 보호. 로컬 `npm run dev` 상시 가능.
- 언어: 한글 UI. 물리량 기호·단위(Hp(10), H*(10), HVL, keV, Sv/Gy, μGy/h)는 원형. 영어 토글 없음.
- 이름: `Radiation Field Pro` — 부제 "기준 X선·감마장 특성화 및 선량 워크벤치". 탭 제목 동일.

## 화면
- 좌: 입력 패널 / 우: 출력(차트 위, 수치표 아래) 2단 워크벤치. 데스크톱 우선, 좁은 화면에서 세로로 접힘.
- 시각 방향: "교정실 계측기 패널" — 수치 중심, 밀도 높음, 라이트 테마(다크는 후순위).
- 디자인 스킬 순서: frontend-design → ui-ux-pro-max → hallmark → emil-design-eng → web-design-guidelines.
- 차트: hand-SVG(라이브러리 없음).

## 입력
- 선원 선택: X선 / Cs-137 / Co-60.
- X선: 관전압 슬라이더+숫자 10–400 kV(엔진 격자). 여과층 목록(재질 Be/Al/Cu/Sn/Ta/W/Pb + 두께 mm, 행 추가/삭제; 첫 행 = 고유여과). 공기 경로 길이 기본 2500 mm(ISO 2.5 m). ISO 선질 프리셋 드롭다운 → 관전압·고유여과·부가여과 자동 채움 후 자유 편집.
- 감마: 활동도(MBq/GBq 선택), 교정 기준일, 평가일(기본 오늘), 거리 m.
- 입사각 α: 슬라이더 0–75°, 15° 눈금, 기본 0° (Hp(10) 정의 범위).
- HVL 재질: 자동매칭 선질의 재질(Al/Cu) 기본, Al/Cu 수동 전환. 감마는 Pb 기본.
- 판독값 보정 소패널: 판독값 1개 + T/P/RH → k_ρ 와 보정값.
- 첫 화면 기본 상태 = N-80 프리셋(80 kV, 4 mm Al + 2 mm Cu, 공기 2500 mm, α 0°).
- 상태 보존: localStorage 자동 저장·복원.

## 출력 (전부 live)
- 스펙트럼 차트: 상대 플루언스 vs 에너지(선형 축), 평균E·유효E 세로 마커, 감마는 선 스펙트럼 막대, y축 로그 토글.
- 특성: 평균E, 유효E, HVL1, HVL2, 균질도, 상대 공기커마.
- 운영선량: Hp(10,α), H*(10), H′(0.07,α) — 스펙트럼 평균 변환계수(Sv/Gy).
- 감마: 평가일 활동도, 점선원 공기커마율(μGy/h).
- ISO 비교: 자동매칭 결과 기본 선택 + 수동 지정 드롭다운, 허용밴드 입력(기본 ±5 %), 표 4행(HVL1·HVL2·균질도·평균E) 편차 % + ✅/❌. 감마 선택 시 "해당 없음(핵종 기준장 S-Cs/S-Co)"로 접음.
- 갱신 방식: 스펙트럼·특성·운영선량은 입력마다 동기 계산(<10 ms). ISO 자동매칭(≈80 ms)만 React `useDeferredValue`. Web Worker 없음.
- 수치 표기: 유효숫자 4자리, 단위를 값 옆에(`0.580 mm Cu`), 편차는 부호 포함 소수 2자리 %.

## 테스트
- 엔진 `node:test` 유지. UI는 계산 어댑터(입력 상태 → 엔진 호출 → 출력) 단위 테스트만. 브라우저 E2E(Playwright)는 U2.

## U2 예약
측정 스펙트럼 파일 import · 반복측정 → GUM 불확도 패널(판독 보정 이어받음) · 인쇄용 리포트 뷰(PDF 라이브러리 없음) · 세션 JSON 저장/불러오기 · 커마 가중 곡선 오버레이 · S-Cs/S-Co 표값 · Playwright · (필요 시) Web Worker.

## 근거 측정 (2026-10-25)
전체 재계산 ≈74 ms. ISO 자동매칭 ≈84 ms(50개 선질 HVL 이분법)로 지배적, 나머지(스펙트럼·커마·HVL·운영선량 3종) 합쳐 <10 ms.

## 배포 (2026-10-25 완료)
- Vercel 프로젝트 `radiation-field-pro` (팀 aijhmin1031-3885s-projects, id `prj_T72FIbT6PFQjo7NcXRCVYdTXYchv`) ← GitHub `aijhmin1031-eng/radiation-field-pro` `master` 자동 배포. 프레임워크 vite, 출력 `dist`.
- URL: https://pro.radiation-lab.com/ (정식 주소, canonical) · https://radiation-field-pro.vercel.app — 보호 방식 Standard Protection(`ssoProtection.deploymentType = all_except_custom_domains`, 2026-10-25 변경): 프로덕션 도메인은 누구나 열 수 있고, 미리보기·배포별 URL은 팀 로그인이 필요하다. 자매 프로젝트(radiation-calc·radiation-meter-tester·m-phreefiteq)와 같은 설정.
- 로컬: `npm run dev` (개발) / `npm run build && npm run preview` (빌드 확인).
- 디자인 스킬 5단계(frontend-design → ui-ux-pro-max → hallmark → emil-design-eng → web-design-guidelines) 점검·반영 완료.

## U2 진행 (2026-10-25)
- U2-1 측정 스펙트럼 불러오기(선원 "불러오기": 파일/붙여넣기, 단위, /keV 밀도, 400 keV 이하 ISO 매칭) ✅
- U2-2 반복측정 → GUM 불확도 패널(04 입력 / D 출력: Type A, Type B 합성, ν_eff, 보고 형식) ✅
- U2-3 세션 JSON 저장/불러오기(헤더 툴바, 형식 검증) ✅ · U2-4 인쇄용 리포트 뷰(@media print, A4, 입력 요약) ✅
- U2-5 커마 가중 곡선 오버레이("커마" 토글) · S-Cs/S-Co 공칭 평균에너지 대조 ✅
- U2-6 Playwright E2E: `npm run e2e` (e2e/workbench.spec.ts, 4173 preview 서버 재사용)
- 미구현: Web Worker(현재 불필요 — 매칭 deferred로 충분).

## U3 — 사용 피드백 반영 (2026-10-25)
- 사용자 피드백(휴대폰 확인): "모바일 최적화 부족", "계산하기 버튼이 있어야 값이 바뀐 건지 알 수 있다".
- **계산 모드**: 기본 수동 — 입력(초안)을 바꾸면 결과가 대기 상태(흐림 + "조건이 바뀌었습니다" 띠), [계산하기]로 반영. 판독창마다 **직전 계산 대비 ▲▼ 변화량(절대·%)** 표시. "자동 계산" 토글로 live 복귀(localStorage 기억).
- **모바일(≤980px)**: [입력 | 결과] 탭, 하단 고정 계산 바(계산하기 + HVL1·Hp(10) 요약), 판독창 2열, 차트 compact 좌표계(420×240)와 도구 버튼 상단 배치.
- E2E 갱신: 수동/자동 모드, 탭 전환, 모바일 스크린샷(test-results/mobile-*.png).

## 공개 준비 (2026-10-25, 브랜치 public-prep)
- 주소 `https://pro.radiation-lab.com/`(Radiation Lab 하위 도메인). 라이선스 MIT(저작권자 Radiation Lab), README 영어 요약 + 한글 본문.
- `index.html`: 제목·설명·canonical·OG(`public/og.png` 1200×630), `noindex` 제거. `public/robots.txt`·`sitemap.xml`·`favicon.svg`.
- 머리글 좌측 「Radiation Lab / Field Pro」(Radiation Lab → radiation-lab.com), 영어 한 줄 소개. 꼬리말: Radiation Lab·About·Privacy·Contact·Source(MIT), 브라우저 안 계산 안내, 정확도 사양 링크. 모바일은 꼬리말이 하단 계산 바 높이만큼 여백을 맡는다.
- 광고 코드 없음(입력칸·버튼 근처 광고 금지 원칙).
