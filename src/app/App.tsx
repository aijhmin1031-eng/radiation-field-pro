// 임시 뼈대: 계산 어댑터가 브라우저에서 동작하는지 확인용. 화면은 다음 단계에서 설계한다.
import { useMemo } from "react";
import { DEFAULT_INPUT, computeFast, computeIso, fmt } from "./compute";

export function App() {
  const fast = useMemo(() => computeFast(DEFAULT_INPUT), []);
  const iso = useMemo(() => computeIso(DEFAULT_INPUT, fast.spectrum), [fast.spectrum]);
  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Radiation Field Pro</h1>
      <p>기준 X선·감마장 특성화 및 선량 워크벤치 — 뼈대</p>
      <ul>
        <li>
          HVL1: {fmt(fast.characteristics.hvl1Mm)} mm {fast.characteristics.material}
        </li>
        <li>평균E: {fmt(fast.characteristics.meanEnergyKeV)} keV</li>
        <li>Hp(10,0°)/Ka: {fmt(fast.operational.hp10)} Sv/Gy</li>
        <li>ISO 매칭: {iso.matched?.name}</li>
      </ul>
    </main>
  );
}
