# UI 설계 합의서 — radiation-field-pro U1

확정일 2026-10-25. 엔진(D1–D5 + 슬롯 3종) 완결 후 UI 착수 전에 사용자와 합의한 결정. 이 문서가 U1 구현의 기준이다.

## 기반
- 스택: Vite + React + TypeScript 순수 SPA. 같은 저장소 `src/app/`(UI), `src/engine/`(그대로 import).
- 배포: Vercel 비공개 프로젝트 `radiation-field-pro` ← GitHub `master`, Vercel Authentication(팀 로그인) 보호. 로컬 `npm run dev` 상시 가능.
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
- URL: https://radiation-field-pro.vercel.app — Vercel Authentication(팀 로그인) 보호, 전체 배포 대상. 비로그인 접근은 거부된다.
- 로컬: `npm run dev` (개발) / `npm run build && npm run preview` (빌드 확인).
- 디자인 스킬 5단계(frontend-design → ui-ux-pro-max → hallmark → emil-design-eng → web-design-guidelines) 점검·반영 완료.
