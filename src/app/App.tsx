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
  SessionError,
  type FastOutput,
  type WorkbenchInput,
} from "./compute";
import { InputPanel } from "./InputPanel";
import { SpectrumChart } from "./SpectrumChart";
import { CharacteristicsPanel, IsoPanel, OperationalPanel, UncertaintyPanel, type Deltas } from "./OutputPanels";
import { useI18n } from "./i18n";

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
  const { t } = useI18n();
  const x = input.xray;
  const g = input.gamma;
  const a = input.airReading;
  return (
    <section className="panel print-only">
      <h2 className="ph">{t("printInputs")}</h2>
      <div className="pb">
        <table className="cmp">
          <tbody>
            <tr>
              <td>{t("rowSource")}</td>
              <td className="num">
                {input.source === "xray"
                  ? t("xraySummary", x.kvp, x.filters.map((f) => `${f.thicknessMm} mm ${f.material}`).join(" + "), x.airMm)
                  : input.source === "import"
                    ? t("importSummary", input.imported?.name ?? t("noneParen"))
                    : t("gammaSummary", input.source, g.activity, g.activityUnit, g.referenceDate, g.evalDate, g.distanceM)}
              </td>
            </tr>
            <tr>
              <td>{t("rowGeom")}</td>
              <td className="num">
                {input.alphaDeg}° / {input.hvlMaterial === "auto" ? t("auto") : input.hvlMaterial} /{" "}
                {input.isoQuality === "auto" ? t("autoMatch") : input.isoQuality} (±{input.tolerancePct} %)
              </td>
            </tr>
            <tr>
              <td>{t("rowAir")}</td>
              <td className="num">
                {a.tempC} °C · {a.pressureKPa} kPa · {a.relHumidityPct} % RH {t("airRef")}
              </td>
            </tr>
            <tr>
              <td>{t("rowReadings")}</td>
              <td className="num">
                n = {input.readings.values.length}
                {input.readings.values.length ? ` · ${input.readings.values.join(", ")}` : ""} · Type B{" "}
                {input.readings.typeB.map((b) => `${b.label} ${b.relPct} %`).join(", ") || t("none")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function App() {
  const { t } = useI18n();
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
    a.download = `${stamp}_radiation-field-pro_session.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToolMsg(t("saved"));
  };
  const loadSession = (f: File | undefined) => {
    if (!f) return;
    f.text()
      .then((text) => {
        const next = deserializeSession(text);
        setDraft(next);
        setCommitted(next);
        setToolMsg(t("loaded", f.name));
      })
      .catch((e: unknown) => {
        const msg =
          e instanceof SessionError
            ? t(e.code === "not-session" ? "errNotSession" : "errUnknownSource")
            : e instanceof Error
              ? e.message
              : String(e);
        setToolMsg(t("loadFailed", msg));
      });
  };
  const resetAll = () => {
    if (window.confirm(t("resetConfirm"))) {
      setDraft(DEFAULT_INPUT);
      setCommitted(DEFAULT_INPUT);
      setPrevOut(null);
      setToolMsg(t("resetDone"));
    }
  };

  const showInput = !narrow || mobileTab === "input";
  const showResult = !narrow || mobileTab === "result";
  const summary = `HVL1 ${fmt(chars.hvl1Mm)} mm ${chars.material} · Hp(10) ${fmt(fast.operational.hp10)} Sv/Gy`;

  return (
    <>
      <a className="skip" href="#main">
        {t("skip")}
      </a>
      <header className="hdr">
        {/* 공개용(2026-10-25): 좌측 브랜드 = 「Radiation Lab / Field Pro」. 제품명 표기(Field 주황)는 그대로. */}
        <h1>
          <a className="home" href="https://radiation-lab.com/">
            Radiation Lab
          </a>
          <span className="slash" aria-hidden="true">
            /
          </span>
          <span className="field">Field</span> Pro
        </h1>
        <span className="sub">{t("sub")}</span>
        <span className="std">ISO 4037-1/-3/-4 · GUM</span>
        <p className="en">{t("intro")}</p>
        <div className="toolbar no-print" role="toolbar" aria-label={t("toolbarAria")}>
          <button type="button" className={`calc${dirty ? " dirty" : ""}`} onClick={runCalc} disabled={autoMode}>
            {dirty ? t("calcDirty") : autoMode ? t("autoRunning") : t("calc")}
          </button>
          <label className="mode">
            <input type="checkbox" checked={autoMode} onChange={toggleAuto} /> {t("autoMode")}
          </label>
          <span className="sep" aria-hidden="true" />
          <button type="button" onClick={saveSession}>
            {t("save")}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            {t("load")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              loadSession(e.target.files?.[0]);
              e.target.value = ""; // 같은 파일을 다시 골라도 change 가 나도록
            }}
          />
          <button type="button" onClick={() => window.print()}>
            {t("print")}
          </button>
          <button type="button" onClick={resetAll}>
            {t("reset")}
          </button>
          {toolMsg && (
            <span className="hint" style={{ marginTop: 0 }} aria-live="polite">
              {toolMsg}
            </span>
          )}
        </div>
        {narrow && (
          <div className="mtabs no-print" role="tablist" aria-label={t("viewAria")}>
            <button type="button" role="tab" aria-selected={mobileTab === "input"} onClick={() => setMobileTab("input")}>
              {t("tabInput")}
            </button>
            <button type="button" role="tab" aria-selected={mobileTab === "result"} onClick={() => setMobileTab("result")}>
              {t("tabResult")}{dirty ? " •" : ""}
            </button>
          </div>
        )}
      </header>
      <div className="print-only print-head">
        <strong>Radiation Field Pro</strong> · {t("printTitle")} · {t("printed")} {new Date().toLocaleString(t("dateLocale"))}
      </div>
      <main id="main" className={`bench${narrow ? " narrow" : ""}`}>
        <div className="no-print" hidden={!showInput}>
          <InputPanel input={draft} onChange={setDraft} />
        </div>
        <div className={`stack results${dirty ? " pending" : ""}`} hidden={!showResult}>
          {dirty && (
            <div className="pending-bar no-print" role="status">
              {t("pending")}{" "}
              <button type="button" className="calc dirty" onClick={runCalc}>
                {t("calc")}
              </button>
            </div>
          )}
          {runCount > 0 && !dirty && prevOut && (
            <div className="calc-note no-print" role="status" aria-live="polite">
              {t("calcDone", runCount)}
            </div>
          )}
          <PrintSummary input={input} />
          <section className="panel">
            <h2 className="ph">
              <span className="idx">00</span> {t("spectrum")}
              <span className="hint" style={{ marginTop: 0, marginLeft: "auto" }}>
                {input.source === "xray"
                  ? t("specXray", input.xray.kvp)
                  : input.source === "import"
                    ? input.imported
                      ? t("specImported", input.imported.name, input.imported.energy.length)
                      : t("specNoImport")
                    : t("specGamma", input.source)}
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
      <footer className={`foot no-print${narrow ? " narrow" : ""}`}>
        <nav aria-label="Radiation Lab">
          <a href="https://radiation-lab.com/">Radiation Lab</a>
          <a href="https://radiation-lab.com/about">About</a>
          <a href="https://radiation-lab.com/privacy">Privacy</a>
          <a href="https://radiation-lab.com/contact">Contact</a>
          <a href="https://github.com/aijhmin1031-eng/radiation-field-pro">Source (MIT)</a>
        </nav>
        <p>
          {t("footA")}
          <a href="https://github.com/aijhmin1031-eng/radiation-field-pro/blob/master/docs/accuracy-spec.md">{t("footLink")}</a>
          {t("footB")}
        </p>
      </footer>
      {narrow && (
        <div className="mbar no-print">
          <button type="button" className={`calc${dirty ? " dirty" : ""}`} onClick={runCalc} disabled={autoMode && !dirty}>
            {autoMode ? t("autoRunning") : dirty ? t("calcDot") : t("calc")}
          </button>
          <button type="button" className="mono msum" onClick={() => setMobileTab("result")}>
            {summary}
          </button>
        </div>
      )}
    </>
  );
}
