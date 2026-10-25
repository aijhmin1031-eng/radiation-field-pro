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
- The interface is in English by default, with a Korean option (EN/KO toggle in the header; the choice is remembered in the browser). Quantity symbols and units follow ISO 4037 and ICRU usage.

---

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
npm run build        # dist/ 에 정적 파일 생성
npm run e2e          # Playwright E2E (데스크톱·모바일, 빌드 뒤 4173 미리보기 서버)
npm run report:accuracy   # docs/accuracy-spec.md 재생성
```

## 구조

- `src/engine/` — 계산 엔진(스펙트럼, 감쇠, 선량 변환, ISO 비교, 붕괴, 공기밀도, 불확도). 화면과 독립적이다.
- `src/data/` — 감쇠계수, 텅스텐 방출 스펙트럼, ISO 4037-1 선질 표, ISO 4037-3 변환계수.
- `src/validation/` — ISO 표값과 대조하는 검증 테스트.
- `src/app/` — React 화면.
- `docs/` — 정확도 사양, 화면 설계 기록.

## 라이선스

[MIT](LICENSE) © 2026 Radiation Lab
