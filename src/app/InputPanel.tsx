// 좌측 입력 패널. 상태는 App 이 소유하고 여기서는 patch 콜백만 부른다.
import { useState } from "react";
import {
  ALPHA_MAX,
  FILTER_MATERIALS,
  parseImportedSpectrum,
  parseReadings,
  KVP_MAX,
  KVP_MIN,
  isoPresetNames,
  matchPreset,
  presetFromIso,
  type FilterRow,
  type SourceKind,
  type WorkbenchInput,
} from "./compute";
import { useI18n } from "./i18n";

interface Props {
  input: WorkbenchInput;
  onChange: (next: WorkbenchInput) => void;
}

const num = (v: string, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function InputPanel({ input, onChange }: Props) {
  const { t } = useI18n();
  const set = (patch: Partial<WorkbenchInput>) => onChange({ ...input, ...patch });
  const setX = (patch: Partial<WorkbenchInput["xray"]>) => set({ xray: { ...input.xray, ...patch } });
  const setG = (patch: Partial<WorkbenchInput["gamma"]>) => set({ gamma: { ...input.gamma, ...patch } });
  const setR = (patch: Partial<WorkbenchInput["airReading"]>) => set({ airReading: { ...input.airReading, ...patch } });
  const setFilter = (i: number, patch: Partial<FilterRow>) =>
    setX({ filters: input.xray.filters.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const presets = isoPresetNames();
  const isX = input.source === "xray";
  // 드롭다운은 지금 값과 맞는 프리셋을 보인다(예전에는 value="" 고정이라 고른 뒤에도 안내 문구로 되돌아갔다).
  const preset = matchPreset(input.xray);

  return (
    <div className="stack">
      <section className="panel">
        <h2 className="ph">
          <span className="idx">01</span> {t("p01")}
        </h2>
        <div className="pb">
          <div className="seg" role="group" aria-label={t("segAria")}>
            {(["xray", "Cs-137", "Co-60", "import"] as SourceKind[]).map((s) => (
              <button key={s} type="button" aria-pressed={input.source === s} onClick={() => set({ source: s })}>
                {s === "xray" ? t("srcXray") : s === "import" ? t("srcImport") : s}
              </button>
            ))}
          </div>

          {isX ? (
            <>
              <div className="row">
                <label htmlFor="preset">{t("isoQuality")}</label>
                <select
                  id="preset"
                  value={preset ?? ""}
                  onChange={(e) => {
                    if (e.target.value) set({ xray: presetFromIso(e.target.value), isoQuality: "auto" });
                  }}
                >
                  <option value="" disabled>
                    {t("presetCustom")}
                  </option>
                  {(["L", "N", "W", "H"] as const).map((s) => (
                    <optgroup key={s} label={t("series", s)}>
                      {presets
                        .filter((p) => p.series === s)
                        .map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="row">
                <label htmlFor="kvp">{t("kvp")}</label>
                <div className="ctl">
                  <input
                    id="kvp"
                    type="range"
                    min={KVP_MIN}
                    max={KVP_MAX}
                    step={1}
                    value={input.xray.kvp}
                    onChange={(e) => setX({ kvp: num(e.target.value, input.xray.kvp) })}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    autoComplete="off"
                    style={{ width: 72 }}
                    min={KVP_MIN}
                    max={KVP_MAX}
                    value={input.xray.kvp}
                    onChange={(e) => setX({ kvp: num(e.target.value, input.xray.kvp) })}
                    aria-label={t("kvpAria")}
                  />
                  <span className="unit">kV</span>
                </div>
              </div>
              <div className="row">
                <label htmlFor="air">{t("air")}</label>
                <div className="ctl">
                  <input
                    id="air"
                    type="number"
                    inputMode="decimal"
                    autoComplete="off"
                    min={0}
                    step={100}
                    value={input.xray.airMm}
                    onChange={(e) => setX({ airMm: num(e.target.value, input.xray.airMm) })}
                  />
                  <span className="unit">mm</span>
                </div>
              </div>
              <div className="filters">
                {input.xray.filters.map((f, i) => (
                  <div className="frow" key={i}>
                    <span className="tag">{i === 0 ? t("tagInherent") : t("tagAdded", i)}</span>
                    <select value={f.material} onChange={(e) => setFilter(i, { material: e.target.value })} aria-label={t("filterMatAria")}>
                      {FILTER_MATERIALS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <div className="ctl">
                      <input
                        type="number"
                    inputMode="decimal"
                    autoComplete="off"
                        min={0}
                        step={0.1}
                        value={f.thicknessMm}
                        onChange={(e) => setFilter(i, { thicknessMm: num(e.target.value, f.thicknessMm) })}
                        aria-label={t("filterThickAria")}
                      />
                      <span className="unit">mm</span>
                    </div>
                    <button
                      type="button"
                      aria-label={t("removeFilter")}
                      onClick={() => setX({ filters: input.xray.filters.filter((_, j) => j !== i) })}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="add"
                  onClick={() => setX({ filters: [...input.xray.filters, { material: "Cu", thicknessMm: 0.1 }] })}
                >
                  {t("addFilter")}
                </button>
              </div>
            </>
          ) : input.source === "import" ? (
            <ImportBox input={input} onChange={onChange} />
          ) : (
            <>
              <div className="row">
                <label htmlFor="act">{t("activity")}</label>
                <div className="ctl">
                  <input
                    id="act"
                    type="number"
                    inputMode="decimal"
                    autoComplete="off"
                    min={0}
                    step={0.1}
                    value={input.gamma.activity}
                    onChange={(e) => setG({ activity: num(e.target.value, input.gamma.activity) })}
                  />
                  <select
                    style={{ width: 80 }}
                    value={input.gamma.activityUnit}
                    onChange={(e) => setG({ activityUnit: e.target.value as "MBq" | "GBq" })}
                    aria-label={t("activityUnitAria")}
                  >
                    <option>MBq</option>
                    <option>GBq</option>
                  </select>
                </div>
              </div>
              <div className="row">
                <label htmlFor="ref">{t("refDate")}</label>
                <input id="ref" type="date" value={input.gamma.referenceDate} onChange={(e) => setG({ referenceDate: e.target.value })} />
              </div>
              <div className="row">
                <label htmlFor="eval">{t("evalDate")}</label>
                <input id="eval" type="date" value={input.gamma.evalDate} onChange={(e) => setG({ evalDate: e.target.value })} />
              </div>
              <div className="row">
                <label htmlFor="dist">{t("distance")}</label>
                <div className="ctl">
                  <input
                    id="dist"
                    type="number"
                    inputMode="decimal"
                    autoComplete="off"
                    min={0.01}
                    step={0.1}
                    value={input.gamma.distanceM}
                    onChange={(e) => setG({ distanceM: num(e.target.value, input.gamma.distanceM) })}
                  />
                  <span className="unit">m</span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="ph">
          <span className="idx">02</span> {t("p02")}
        </h2>
        <div className="pb">
          <div className="row">
            <label htmlFor="alpha">{t("alpha")}</label>
            <div className="ctl">
              <input
                id="alpha"
                type="range"
                min={0}
                max={ALPHA_MAX}
                step={15}
                list="alpha-ticks"
                value={input.alphaDeg}
                onChange={(e) => set({ alphaDeg: num(e.target.value, input.alphaDeg) })}
              />
              <datalist id="alpha-ticks">
                {[0, 15, 30, 45, 60, 75].map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
              <span className="unit mono" style={{ width: 34, textAlign: "right" }}>
                {input.alphaDeg}°
              </span>
            </div>
          </div>
          <div className="row">
            <label htmlFor="hvlm">{t("hvlMat")}</label>
            <select id="hvlm" value={input.hvlMaterial} onChange={(e) => set({ hvlMaterial: e.target.value as WorkbenchInput["hvlMaterial"] })}>
              <option value="auto">{t("hvlAuto")}</option>
              <option value="Al">Al</option>
              <option value="Cu">Cu</option>
              <option value="Pb">Pb</option>
            </select>
          </div>
          {isX && (
            <>
              <div className="row">
                <label htmlFor="isoq">{t("isoTarget")}</label>
                <select id="isoq" value={input.isoQuality} onChange={(e) => set({ isoQuality: e.target.value })}>
                  <option value="auto">{t("autoMatch")}</option>
                  {presets.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row">
                <label htmlFor="tol">{t("tolerance")}</label>
                <div className="ctl">
                  <input
                    id="tol"
                    type="number"
                    inputMode="decimal"
                    autoComplete="off"
                    min={0.1}
                    step={0.5}
                    value={input.tolerancePct}
                    onChange={(e) => set({ tolerancePct: num(e.target.value, input.tolerancePct) })}
                  />
                  <span className="unit">±%</span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="ph">
          <span className="idx">03</span> {t("p03")}
        </h2>
        <div className="pb">
          <div className="row">
            <label htmlFor="rd">{t("reading")}</label>
            <input id="rd" type="number"
                    inputMode="decimal"
                    autoComplete="off" step={0.001} value={input.airReading.reading} onChange={(e) => setR({ reading: num(e.target.value, input.airReading.reading) })} />
          </div>
          <div className="row">
            <label htmlFor="t">{t("temp")}</label>
            <div className="ctl">
              <input id="t" type="number"
                    inputMode="decimal"
                    autoComplete="off" step={0.1} value={input.airReading.tempC} onChange={(e) => setR({ tempC: num(e.target.value, input.airReading.tempC) })} />
              <span className="unit">°C</span>
            </div>
          </div>
          <div className="row">
            <label htmlFor="p">{t("pressure")}</label>
            <div className="ctl">
              <input id="p" type="number"
                    inputMode="decimal"
                    autoComplete="off" step={0.01} value={input.airReading.pressureKPa} onChange={(e) => setR({ pressureKPa: num(e.target.value, input.airReading.pressureKPa) })} />
              <span className="unit">kPa</span>
            </div>
          </div>
          <div className="row">
            <label htmlFor="rh">{t("rh")}</label>
            <div className="ctl">
              <input id="rh" type="number"
                    inputMode="decimal"
                    autoComplete="off" min={0} max={100} step={1} value={input.airReading.relHumidityPct} onChange={(e) => setR({ relHumidityPct: num(e.target.value, input.airReading.relHumidityPct) })} />
              <span className="unit">%</span>
            </div>
          </div>
          <div className="hint">{t("airHint")}</div>
        </div>
      </section>

      <section className="panel">
        <h2 className="ph">
          <span className="idx">04</span> {t("p04")}
        </h2>
        <div className="pb">
          <div className="row" style={{ alignItems: "start" }}>
            <label htmlFor="rd-vals">{t("readings")}</label>
            <textarea
              id="rd-vals"
              className="mono"
              rows={3}
              placeholder={t("readingsPh")}
              defaultValue={input.readings.values.join(" ")}
              onBlur={(e) => set({ readings: { ...input.readings, values: parseReadings(e.target.value) } })}
              spellCheck={false}
              style={{ width: "100%", border: "1px solid var(--rule-strong)", borderRadius: "var(--r)", padding: 6, fontSize: 12 }}
            />
          </div>
          <div className="row">
            <label htmlFor="rd-air">{t("densityCorr")}</label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <input
                id="rd-air"
                type="checkbox"
                checked={input.readings.applyAirCorrection}
                onChange={(e) => set({ readings: { ...input.readings, applyAirCorrection: e.target.checked } })}
              />
              {t("applyKrho")}
            </label>
          </div>
          <div className="filters">
            {input.readings.typeB.map((b, i) => (
              <div className="frow" key={i} style={{ gridTemplateColumns: "1fr 86px 26px" }}>
                <input
                  type="text"
                  value={b.label}
                  aria-label={t("typeBNameAria")}
                  onChange={(e) => set({ readings: { ...input.readings, typeB: input.readings.typeB.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) } })}
                  style={{ border: "1px solid var(--rule-strong)", borderRadius: "var(--r)", padding: "4px 6px", fontSize: 12, minWidth: 0 }}
                />
                <div className="ctl">
                  <input
                    type="number"
                    inputMode="decimal"
                    autoComplete="off"
                    min={0}
                    step={0.1}
                    value={b.relPct}
                    aria-label={t("relStdAria")}
                    onChange={(e) => set({ readings: { ...input.readings, typeB: input.readings.typeB.map((x, j) => (j === i ? { ...x, relPct: num(e.target.value, x.relPct) } : x)) } })}
                  />
                  <span className="unit">%</span>
                </div>
                <button type="button" aria-label={t("removeComp")} onClick={() => set({ readings: { ...input.readings, typeB: input.readings.typeB.filter((_, j) => j !== i) } })}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="add" onClick={() => set({ readings: { ...input.readings, typeB: [...input.readings.typeB, { label: t("newTypeB"), relPct: 0.5 }] } })}>
              {t("addTypeB")}
            </button>
          </div>
          <div className="hint">{t("gumHint")}</div>
        </div>
      </section>
    </div>
  );
}

/** 측정 스펙트럼 불러오기: 파일 선택 또는 붙여넣기 → 파싱 → 상태 저장. */
function ImportBox({ input, onChange }: Props) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<"keV" | "MeV" | "eV">("keV");
  const [density, setDensity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (raw: string, label: string) => {
    try {
      const imported = parseImportedSpectrum(raw, label || t("pasted"), { energyUnit: unit, fluenceIsDensity: density });
      setError(null);
      onChange({ ...input, imported, isoQuality: "auto" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const onFile = (f: File | undefined) => {
    if (!f) return;
    f.text().then((raw) => {
      setText(raw);
      setName(f.name);
      apply(raw, f.name);
    });
  };
  const im = input.imported;
  return (
    <>
      <div className="row">
        <label htmlFor="imp-file">{t("file")}</label>
        <input
          id="imp-file"
          type="file"
          accept=".csv,.txt,.tsv,.dat,text/plain,text/csv"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = ""; // 같은 파일을 다시 골라도 change 가 나도록
          }}
        />
      </div>
      <div className="row">
        <label htmlFor="imp-unit">{t("energyUnit")}</label>
        <div className="ctl">
          <select id="imp-unit" value={unit} onChange={(e) => setUnit(e.target.value as "keV" | "MeV" | "eV")} style={{ width: 90 }}>
            <option>keV</option>
            <option>MeV</option>
            <option>eV</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <input type="checkbox" checked={density} onChange={(e) => setDensity(e.target.checked)} /> {t("perKeV")}
          </label>
        </div>
      </div>
      <div className="row" style={{ alignItems: "start" }}>
        <label htmlFor="imp-text">{t("paste")}</label>
        <textarea
          id="imp-text"
          className="mono"
          rows={5}
          placeholder={t("pastePh")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          style={{ width: "100%", border: "1px solid var(--rule-strong)", borderRadius: "var(--r)", padding: 6, fontSize: 12 }}
        />
      </div>
      <div className="ctl" style={{ justifyContent: "flex-end", marginTop: 6 }}>
        <button type="button" className="add" style={{ marginTop: 0 }} onClick={() => apply(text, name)} disabled={!text.trim()}>
          {t("applySpectrum")}
        </button>
      </div>
      {error && (
        <div className="hint" role="alert" style={{ color: "var(--bad)" }}>
          {t("importFailed", error)}
        </div>
      )}
      {im ? (
        <div className="hint" aria-live="polite">
          {t("applied")} <span className="mono">{im.name}</span> · {im.energy.length} {t("points")} · {im.energy[0]}–{im.energy[im.energy.length - 1]} keV
        </div>
      ) : (
        <div className="hint">{t("importHint")}</div>
      )}
    </>
  );
}
