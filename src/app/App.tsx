// 워크벤치 루트. 입력 상태를 소유하고 localStorage 에 보존한다.
// 빠른 경로(computeFast)는 입력마다 동기, 느린 경로(computeIso)는 useDeferredValue 로 분리.
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import "./styles.css";
import { DEFAULT_INPUT, buildSpectrum, computeFast, computeIso, isGamma, presetFromIso, type WorkbenchInput } from "./compute";
import { InputPanel } from "./InputPanel";
import { SpectrumChart } from "./SpectrumChart";
import { CharacteristicsPanel, IsoPanel, OperationalPanel } from "./OutputPanels";

const STORAGE_KEY = "rfp.input.v1";

/** 딥링크: ?source=xray|Cs-137|Co-60, ?preset=N-80 (프리셋은 X선으로 전환). 저장본보다 우선. */
function applyDeepLink(base: WorkbenchInput): WorkbenchInput {
  try {
    const q = new URLSearchParams(window.location.search);
    let next = base;
    const preset = q.get("preset");
    if (preset) next = { ...next, source: "xray", xray: presetFromIso(preset), isoQuality: "auto" };
    const source = q.get("source");
    if (source === "xray" || source === "Cs-137" || source === "Co-60" || source === "import") next = { ...next, source };
    return next;
  } catch {
    return base;
  }
}

function loadInput(): WorkbenchInput {
  let base = DEFAULT_INPUT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<WorkbenchInput>;
      // 저장본에 없는 칸은 기본값으로 메워 구조 변경에 견딘다.
      base = {
        ...DEFAULT_INPUT,
        ...saved,
        imported: saved.imported ?? null,
      xray: { ...DEFAULT_INPUT.xray, ...(saved.xray ?? {}) },
        gamma: { ...DEFAULT_INPUT.gamma, ...(saved.gamma ?? {}) },
        airReading: { ...DEFAULT_INPUT.airReading, ...(saved.airReading ?? {}) },
      };
    }
  } catch {
    base = DEFAULT_INPUT;
  }
  return applyDeepLink(base);
}

export function App() {
  const [input, setInput] = useState<WorkbenchInput>(loadInput);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
    } catch {
      /* 저장 불가 환경은 무시 */
    }
  }, [input]);

  const fast = useMemo(() => computeFast(input), [input]);
  const deferred = useDeferredValue(input);
  const iso = useMemo(() => computeIso(deferred, buildSpectrum(deferred)), [deferred]);
  const isoStale = deferred !== input;

  // auto 재질이면 ISO 매칭 재질로 계산한 특성을 쓴다(도착 전엔 잠정 재질 값).
  const useIsoChars = input.hvlMaterial === "auto" && iso.applicable && iso.characteristics != null && !isoStale;
  const chars = useIsoChars ? iso.characteristics! : fast.characteristics;
  const provisional = input.hvlMaterial === "auto" && !isGamma(input.source) && iso.applicable && !useIsoChars;

  return (
    <>
      <a className="skip" href="#main">본문으로 건너뛰기</a>
      <header className="hdr">
        <h1>
          Radiation <span>Field</span> Pro
        </h1>
        <span className="sub">기준 X선·감마장 특성화 및 선량 워크벤치</span>
        <span className="std">ISO 4037-1/-3/-4 · GUM</span>
      </header>
      <main id="main" className="bench">
        <InputPanel input={input} onChange={setInput} />
        <div className="stack">
          <section className="panel">
            <h2 className="ph">
              <span className="idx">00</span> 스펙트럼
              <span className="hint" style={{ marginTop: 0, marginLeft: "auto" }}>
                {input.source === "xray"
                  ? `W 양극 20° · ${input.xray.kvp} kV · 여과 후`
                  : input.source === "import"
                    ? input.imported
                      ? `불러온 스펙트럼 · ${input.imported.name} · ${input.imported.energy.length} 점`
                      : "불러온 스펙트럼 없음 — X선 설정으로 표시 중"
                    : `${input.source} 선 스펙트럼`}
              </span>
            </h2>
            <div className="pb">
              <SpectrumChart
                spectrum={fast.spectrum}
                meanEnergyKeV={chars.meanEnergyKeV}
                effectiveEnergyKeV={chars.effectiveEnergyKeV}
                discrete={isGamma(input.source)}
              />
            </div>
          </section>
          <CharacteristicsPanel c={chars} transmission={fast.kermaTransmission} provisional={provisional} />
          <OperationalPanel fast={fast} />
          <IsoPanel iso={iso} stale={isoStale} />
        </div>
      </main>
    </>
  );
}
