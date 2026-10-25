// 워크벤치 루트. 입력 상태를 소유하고 localStorage 에 보존한다.
// 빠른 경로(computeFast)는 입력마다 동기, 느린 경로(computeIso)는 useDeferredValue 로 분리.
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import "./styles.css";
import { useRef } from "react";
import {
  DEFAULT_INPUT,
  buildSpectrum,
  computeFast,
  computeIso,
  deserializeSession,
  isGamma,
  mergeInput,
  presetFromIso,
  serializeSession,
  type WorkbenchInput,
} from "./compute";
import { InputPanel } from "./InputPanel";
import { SpectrumChart } from "./SpectrumChart";
import { CharacteristicsPanel, IsoPanel, OperationalPanel, UncertaintyPanel } from "./OutputPanels";

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
    if (raw) base = mergeInput(JSON.parse(raw) as Partial<WorkbenchInput>);
  } catch {
    base = DEFAULT_INPUT;
  }
  return applyDeepLink(base);
}

/** 인쇄 리포트에만 나오는 입력 요약(화면에서는 입력 패널이 보이므로 숨김). */
function PrintSummary({ input }: { input: WorkbenchInput }) {
  const x = input.xray;
  const g = input.gamma;
  const a = input.airReading;
  return (
    <section className="panel print-only">
      <h2 className="ph">입력 조건</h2>
      <div className="pb">
        <table className="cmp">
          <tbody>
            <tr>
              <td>선원</td>
              <td className="num">
                {input.source === "xray"
                  ? `X선관 W 20° · ${x.kvp} kV · 여과 ${x.filters.map((f) => `${f.thicknessMm} mm ${f.material}`).join(" + ")} · 공기 ${x.airMm} mm`
                  : input.source === "import"
                    ? `불러온 스펙트럼 ${input.imported?.name ?? "(없음)"}`
                    : `${input.source} · ${g.activity} ${g.activityUnit} (기준 ${g.referenceDate}) · 평가 ${g.evalDate} · ${g.distanceM} m`}
              </td>
            </tr>
            <tr>
              <td>입사각 α / HVL 재질 / ISO 비교</td>
              <td className="num">
                {input.alphaDeg}° / {input.hvlMaterial === "auto" ? "자동" : input.hvlMaterial} /{" "}
                {input.isoQuality === "auto" ? "자동 매칭" : input.isoQuality} (±{input.tolerancePct} %)
              </td>
            </tr>
            <tr>
              <td>판독 보정 조건</td>
              <td className="num">
                {a.tempC} °C · {a.pressureKPa} kPa · {a.relHumidityPct} % RH (기준 20 °C · 101.325 kPa · 65 %)
              </td>
            </tr>
            <tr>
              <td>반복측정</td>
              <td className="num">
                n = {input.readings.values.length}
                {input.readings.values.length ? ` · ${input.readings.values.join(", ")}` : ""} · Type B{" "}
                {input.readings.typeB.map((b) => `${b.label} ${b.relPct} %`).join(", ") || "없음"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function App() {
  const [input, setInput] = useState<WorkbenchInput>(loadInput);
  const fileRef = useRef<HTMLInputElement>(null);
  const [toolMsg, setToolMsg] = useState<string | null>(null);

  const saveSession = () => {
    const blob = new Blob([serializeSession(input)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
    a.href = url;
    a.download = `${stamp}_radiation-field-pro_세션.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToolMsg("세션 파일을 저장했습니다.");
  };
  const loadSession = (f: File | undefined) => {
    if (!f) return;
    f.text()
      .then((t) => {
        setInput(deserializeSession(t));
        setToolMsg(`세션을 불러왔습니다: ${f.name}`);
      })
      .catch((e: unknown) => setToolMsg(`불러오기 실패: ${e instanceof Error ? e.message : String(e)}`));
  };
  const resetAll = () => {
    if (window.confirm("모든 입력을 기본값(N-80)으로 되돌릴까요? 저장하지 않은 입력은 사라집니다.")) {
      setInput(DEFAULT_INPUT);
      setToolMsg("기본값으로 되돌렸습니다.");
    }
  };
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
        <div className="toolbar no-print" role="toolbar" aria-label="세션">
          <button type="button" onClick={saveSession}>
            세션 저장
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            세션 불러오기
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => loadSession(e.target.files?.[0])} />
          <button type="button" onClick={() => window.print()}>
            리포트 인쇄
          </button>
          <button type="button" onClick={resetAll}>
            초기화
          </button>
          {toolMsg && (
            <span className="hint" style={{ marginTop: 0 }} aria-live="polite">
              {toolMsg}
            </span>
          )}
        </div>
      </header>
      <div className="print-only print-head">
        <strong>Radiation Field Pro</strong> · 기준 X선·감마장 특성화 리포트 · 출력 {new Date().toLocaleString("ko-KR")}
      </div>
      <main id="main" className="bench">
        <div className="no-print">
          <InputPanel input={input} onChange={setInput} />
        </div>
        <div className="stack">
          <PrintSummary input={input} />
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
                kermaWeights={fast.kermaWeights}
              />
            </div>
          </section>
          <CharacteristicsPanel c={chars} transmission={fast.kermaTransmission} provisional={provisional} />
          <OperationalPanel fast={fast} />
          <IsoPanel iso={iso} stale={isoStale} />
          <UncertaintyPanel u={fast.uncertainty} />
        </div>
      </main>
    </>
  );
}
