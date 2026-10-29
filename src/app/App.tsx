// 워크벤치 루트. 입력 초안(draft)과 계산에 쓰인 입력(committed)을 분리한다.
//  - 수동 모드(기본): 입력을 바꾸면 결과가 "대기" 상태가 되고, [계산하기]를 눌러야 반영 + 이전 값 대비 변화량 표시.
//  - 자동 모드: 입력마다 즉시 계산(live). ISO 매칭은 useDeferredValue 로 분리.
// 상태는 localStorage 에 보존. 980px 이하에서는 [입력 | 결과] 탭 + 하단 고정 계산 바.
// 사이트 머리글 · 꼬리말은 공통 셸 v3(index.html 에 빌드 때 정적으로 들어감 — scripts/vite-plugin-shell.mjs). 이 컴포넌트는
// 그 아래 본문만 그린다: 앱 머리 블록(h1 · 부제 · 도구 막대 · 모바일 탭) → 워크벤치. 탭 · 패널 주소는 hash.ts(설계 D8).
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import { parseHash, pushTarget, scrollToPanel, type Tab } from "./hash";
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
// 판 — 정본은 src/version.json(T17). 인쇄 리포트 머리에 적어 어느 판으로 계산했는지 남긴다(화면의 판 줄은 index.html 의 정적 조각).
import RELEASES from "../version.json";
const VERSION = RELEASES.releases[0];

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
  // 접속 때 해시(#results · #characteristics …)가 있으면 그 탭으로 연다(구획 링크 공유).
  const [mobileTab, setMobileTab] = useState<Tab>(() => parseHash(window.location.hash)?.tab ?? "input");
  const [pendingScroll, setPendingScroll] = useState<string | null>(() => parseHash(window.location.hash)?.panel ?? null);
  const narrow = useIsNarrow();
  const fileRef = useRef<HTMLInputElement>(null);
  const [toolMsg, setToolMsg] = useState<string | null>(null);

  // 탭을 옮기면 주소에 기록한다 → 뒤로가기가 앱 안에서 멈춘다.
  const goTab = (tab: Tab) => {
    setMobileTab(tab);
    pushTarget({ tab });
  };
  // 뒤로 · 앞으로, 그리고 패널 번호(<a href="#source">) 클릭: 주소가 바뀌면 그 탭을 열고 그 패널로 내려간다.
  useEffect(() => {
    const on = () => {
      const t = parseHash(window.location.hash);
      if (!t) return;
      setMobileTab(t.tab);
      if (t.panel) setPendingScroll(t.panel);
    };
    window.addEventListener("popstate", on);
    window.addEventListener("hashchange", on);
    return () => {
      window.removeEventListener("popstate", on);
      window.removeEventListener("hashchange", on);
    };
  }, []);
  // 그 탭이 그려진 뒤에 내려간다(좁은 화면에서는 다른 탭의 패널이 hidden 이라 먼저 탭을 바꿔야 한다).
  useEffect(() => {
    if (!pendingScroll) return;
    scrollToPanel(pendingScroll);
    setPendingScroll(null);
  }, [pendingScroll, mobileTab]);

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
    if (narrow) goTab("result");
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
      {/* 앱 머리 블록 — 사이트 머리글(header.site, 「Radiation Lab / Field Pro」 · 메뉴 · 테마)은 공통 셸이 index.html 에 들고 있어
          여기서는 제품명 h1 과 도구 막대만 둔다(2026-10-28, 공통 셸 v3). 건너뛰기 링크도 index.html 의 정적 요소다. */}
      <div className="hdr">
        <h1>Radiation Field Pro</h1>
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
            <button type="button" role="tab" aria-selected={mobileTab === "input"} onClick={() => goTab("input")}>
              {t("tabInput")}
            </button>
            <button type="button" role="tab" aria-selected={mobileTab === "result"} onClick={() => goTab("result")}>
              {t("tabResult")}{dirty ? " •" : ""}
            </button>
          </div>
        )}
      </div>
      <div className="print-only print-head">
        <strong>Radiation Field Pro</strong> {t("printVersion", VERSION.version)} · {t("printTitle")} · {t("printed")} {new Date().toLocaleString(t("dateLocale"))}
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
            <h2 className="ph" id="spectrum">
              <a className="idx" href="#spectrum">00</a> {t("spectrum")}
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
      {/* 앱 꼬리말은 공통 셸 꼬리말(footer.site)로 — Source (MIT) · accuracy specification 링크는 index.html 의 소개 절(.fp-about)에 있다. */}
      {narrow && (
        <div className="mbar no-print">
          <button type="button" className={`calc${dirty ? " dirty" : ""}`} onClick={runCalc} disabled={autoMode && !dirty}>
            {autoMode ? t("autoRunning") : dirty ? t("calcDot") : t("calc")}
          </button>
          <button type="button" className="mono msum" onClick={() => goTab("result")}>
            {summary}
          </button>
        </div>
      )}
    </>
  );
}
