// 워크벤치 루트. 입력 초안(draft)과 계산에 쓰인 입력(committed)을 분리한다.
//  - 수동 모드(기본): 입력을 바꾸면 결과가 "대기" 상태가 되고, [계산하기]를 눌러야 반영 + 이전 값 대비 변화량 표시.
//  - 자동 모드: 입력마다 즉시 계산(live). ISO 매칭은 useDeferredValue 로 분리.
// 상태는 localStorage 에 보존. 980px 이하에서는 [입력 | 결과] 탭 + 하단 고정 계산 바.
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import {
  DEFAULT_INPUT,
  buildSpectrum,
  computeFast,
  computeIso,
  deserializeSession,
  fmt,
  isGamma,
  mergeInput,
  presetFromIso,
  serializeSession,
  type FastOutput,
  type WorkbenchInput,
} from "./compute";
import { InputPanel } from "./InputPanel";
import { SpectrumChart } from "./SpectrumChart";
import { CharacteristicsPanel, IsoPanel, OperationalPanel, UncertaintyPanel, type Deltas } from "./OutputPanels";

const STORAGE_KEY = "rfp.input.v1";
const MODE_KEY = "rfp.autoMode.v1";

/** 딥링크: ?source=xray|Cs-137|Co-60|import, ?preset=N-80 (프리셋은 X선으로 전환). 저장본보다 우선. */
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

function loadAutoMode(): boolean {
  try {
    return localStorage.getItem(MODE_KEY) === "1";
  } catch {
    return false;
  }
}

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 980 : false));
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

/** 두 결과 사이의 변화량(판독창별). */
function makeDeltas(prev: FastOutput | null, cur: FastOutput): Deltas {
  if (!prev) return {};
  const d = (a: number, b: number) => ({ abs: b - a, pct: a !== 0 ? ((b - a) / Math.abs(a)) * 100 : NaN });
  return {
    meanEnergy: d(prev.characteristics.meanEnergyKeV, cur.characteristics.meanEnergyKeV),
    effectiveEnergy: d(prev.characteristics.effectiveEnergyKeV, cur.characteristics.effectiveEnergyKeV),
    hvl1: d(prev.characteristics.hvl1Mm, cur.characteristics.hvl1Mm),
    hvl2: d(prev.characteristics.hvl2Mm, cur.characteristics.hvl2Mm),
    homogeneity: d(prev.characteristics.homogeneity, cur.characteristics.homogeneity),
    transmission: d(prev.kermaTransmission, cur.kermaTransmission),
    hp10: d(prev.operational.hp10, cur.operational.hp10),
    hStar10: d(prev.operational.hStar10, cur.operational.hStar10),
    hPrime007: d(prev.operational.hPrime007, cur.operational.hPrime007),
    kermaRate: prev.gamma && cur.gamma ? d(prev.gamma.airKermaRateUGyPerH, cur.gamma.airKermaRateUGyPerH) : undefined,
    airFactor: d(prev.airReading.factor, cur.airReading.factor),
  };
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
  const [draft, setDraft] = useState<WorkbenchInput>(loadInput);
  const [committed, setCommitted] = useState<WorkbenchInput>(draft);
  const [autoMode, setAutoMode] = useState<boolean>(loadAutoMode);
  const [prevOut, setPrevOut] = useState<FastOutput | null>(null);
  const [runCount, setRunCount] = useState(0);
  const [mobileTab, setMobileTab] = useState<"input" | "result">("input");
  const narrow = useIsNarrow();
  const fileRef = useRef<HTMLInputElement>(null);
  const [toolMsg, setToolMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* 저장 불가 환경은 무시 */
    }
  }, [draft]);
  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, autoMode ? "1" : "0");
    } catch {
      /* 무시 */
    }
  }, [autoMode]);

  // 자동 모드: 초안을 즉시 반영
  const input = autoMode ? draft : committed;
  const dirty = !autoMode && draft !== committed;

  const fast = useMemo(() => computeFast(input), [input]);
  const deferred = useDeferredValue(input);
  const iso = useMemo(() => computeIso(deferred, buildSpectrum(deferred)), [deferred]);
  const isoStale = deferred !== input;
  const deltas = useMemo(() => makeDeltas(prevOut, fast), [prevOut, fast]);

  const useIsoChars = input.hvlMaterial === "auto" && iso.applicable && iso.characteristics != null && !isoStale;
  const chars = useIsoChars ? iso.characteristics! : fast.characteristics;
  const provisional = input.hvlMaterial === "auto" && !isGamma(input.source) && iso.applicable && !useIsoChars;

  const runCalc = () => {
    setPrevOut(fast); // 현재 결과를 "이전 값"으로 보관 → 변화량 표시
    setCommitted(draft);
    setRunCount((n) => n + 1);
    if (narrow) setMobileTab("result");
  };
  const toggleAuto = () => {
    const next = !autoMode;
    setAutoMode(next);
    if (next) {
      setPrevOut(fast);
      setCommitted(draft);
    }
  };

  const saveSession = () => {
    const blob = new Blob([serializeSession(draft)], { type: "application/json" });
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
        const next = deserializeSession(t);
        setDraft(next);
        setCommitted(next);
        setToolMsg(`세션을 불러왔습니다: ${f.name}`);
      })
      .catch((e: unknown) => setToolMsg(`불러오기 실패: ${e instanceof Error ? e.message : String(e)}`));
  };
  const resetAll = () => {
    if (window.confirm("모든 입력을 기본값(N-80)으로 되돌릴까요? 저장하지 않은 입력은 사라집니다.")) {
      setDraft(DEFAULT_INPUT);
      setCommitted(DEFAULT_INPUT);
      setPrevOut(null);
      setToolMsg("기본값으로 되돌렸습니다.");
    }
  };

  const showInput = !narrow || mobileTab === "input";
  const showResult = !narrow || mobileTab === "result";
  const summary = `HVL1 ${fmt(chars.hvl1Mm)} mm ${chars.material} · Hp(10) ${fmt(fast.operational.hp10)} Sv/Gy`;

  return (
    <>
      <a className="skip" href="#main">
        본문으로 건너뛰기
      </a>
      <header className="hdr">
        <h1>
          Radiation <span>Field</span> Pro
        </h1>
        <span className="sub">기준 X선·감마장 특성화 및 선량 워크벤치</span>
        <span className="std">ISO 4037-1/-3/-4 · GUM</span>
        <div className="toolbar no-print" role="toolbar" aria-label="세션">
          <button type="button" className={`calc${dirty ? " dirty" : ""}`} onClick={runCalc} disabled={autoMode}>
            {dirty ? "계산하기 — 조건 변경됨" : autoMode ? "자동 계산 중" : "계산하기"}
          </button>
          <label className="mode">
            <input type="checkbox" checked={autoMode} onChange={toggleAuto} /> 자동 계산
          </label>
          <span className="sep" aria-hidden="true" />
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
        {narrow && (
          <div className="mtabs no-print" role="tablist" aria-label="화면">
            <button type="button" role="tab" aria-selected={mobileTab === "input"} onClick={() => setMobileTab("input")}>
              입력
            </button>
            <button type="button" role="tab" aria-selected={mobileTab === "result"} onClick={() => setMobileTab("result")}>
              결과{dirty ? " •" : ""}
            </button>
          </div>
        )}
      </header>
      <div className="print-only print-head">
        <strong>Radiation Field Pro</strong> · 기준 X선·감마장 특성화 리포트 · 출력 {new Date().toLocaleString("ko-KR")}
      </div>
      <main id="main" className={`bench${narrow ? " narrow" : ""}`}>
        <div className="no-print" hidden={!showInput}>
          <InputPanel input={draft} onChange={setDraft} />
        </div>
        <div className={`stack results${dirty ? " pending" : ""}`} hidden={!showResult}>
          {dirty && (
            <div className="pending-bar no-print" role="status">
              조건이 바뀌었습니다. 아래 결과는 이전 조건의 값입니다 —{" "}
              <button type="button" className="calc dirty" onClick={runCalc}>
                계산하기
              </button>
            </div>
          )}
          {runCount > 0 && !dirty && prevOut && (
            <div className="calc-note no-print" role="status" aria-live="polite">
              계산 #{runCount} 완료 — 판독창의 ▲▼는 직전 계산 대비 변화량입니다.
            </div>
          )}
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
                compact={narrow}
              />
            </div>
          </section>
          <CharacteristicsPanel c={chars} transmission={fast.kermaTransmission} provisional={provisional} deltas={deltas} />
          <OperationalPanel fast={fast} deltas={deltas} />
          <IsoPanel iso={iso} stale={isoStale} />
          <UncertaintyPanel u={fast.uncertainty} />
        </div>
      </main>
      {narrow && (
        <div className="mbar no-print">
          <button type="button" className={`calc${dirty ? " dirty" : ""}`} onClick={runCalc} disabled={autoMode && !dirty}>
            {autoMode ? "자동 계산 중" : dirty ? "계산하기 •" : "계산하기"}
          </button>
          <button type="button" className="mono msum" onClick={() => setMobileTab("result")}>
            {summary}
          </button>
        </div>
      )}
    </>
  );
}
