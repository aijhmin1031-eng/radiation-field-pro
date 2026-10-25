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
  presetFromIso,
  type FilterRow,
  type SourceKind,
  type WorkbenchInput,
} from "./compute";

interface Props {
  input: WorkbenchInput;
  onChange: (next: WorkbenchInput) => void;
}

const num = (v: string, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function InputPanel({ input, onChange }: Props) {
  const set = (patch: Partial<WorkbenchInput>) => onChange({ ...input, ...patch });
  const setX = (patch: Partial<WorkbenchInput["xray"]>) => set({ xray: { ...input.xray, ...patch } });
  const setG = (patch: Partial<WorkbenchInput["gamma"]>) => set({ gamma: { ...input.gamma, ...patch } });
  const setR = (patch: Partial<WorkbenchInput["airReading"]>) => set({ airReading: { ...input.airReading, ...patch } });
  const setFilter = (i: number, patch: Partial<FilterRow>) =>
    setX({ filters: input.xray.filters.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const presets = isoPresetNames();
  const isX = input.source === "xray";

  return (
    <div className="stack">
      <section className="panel">
        <h2 className="ph">
          <span className="idx">01</span> 선원
        </h2>
        <div className="pb">
          <div className="seg" role="group" aria-label="선원 종류">
            {(["xray", "Cs-137", "Co-60", "import"] as SourceKind[]).map((s) => (
              <button key={s} type="button" aria-pressed={input.source === s} onClick={() => set({ source: s })}>
                {s === "xray" ? "X선관" : s === "import" ? "불러오기" : s}
              </button>
            ))}
          </div>

          {isX ? (
            <>
              <div className="row">
                <label htmlFor="preset">ISO 선질</label>
                <select
                  id="preset"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) set({ xray: presetFromIso(e.target.value), isoQuality: "auto" });
                  }}
                >
                  <option value="">프리셋 불러오기…</option>
                  {(["L", "N", "W", "H"] as const).map((s) => (
                    <optgroup key={s} label={`${s} 시리즈`}>
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
                <label htmlFor="kvp">관전압</label>
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
                    aria-label="관전압 kV"
                  />
                  <span className="unit">kV</span>
                </div>
              </div>
              <div className="row">
                <label htmlFor="air">공기 경로</label>
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
                    <span className="tag">{i === 0 ? "고유" : `부가 ${i}`}</span>
                    <select value={f.material} onChange={(e) => setFilter(i, { material: e.target.value })} aria-label="여과 재질">
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
                        aria-label="여과 두께 mm"
                      />
                      <span className="unit">mm</span>
                    </div>
                    <button
                      type="button"
                      aria-label="여과층 삭제"
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
                  + 여과층
                </button>
              </div>
            </>
          ) : input.source === "import" ? (
            <ImportBox input={input} onChange={onChange} />
          ) : (
            <>
              <div className="row">
                <label htmlFor="act">활동도</label>
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
                    aria-label="활동도 단위"
                  >
                    <option>MBq</option>
                    <option>GBq</option>
                  </select>
                </div>
              </div>
              <div className="row">
                <label htmlFor="ref">교정 기준일</label>
                <input id="ref" type="date" value={input.gamma.referenceDate} onChange={(e) => setG({ referenceDate: e.target.value })} />
              </div>
              <div className="row">
                <label htmlFor="eval">평가일</label>
                <input id="eval" type="date" value={input.gamma.evalDate} onChange={(e) => setG({ evalDate: e.target.value })} />
              </div>
              <div className="row">
                <label htmlFor="dist">거리</label>
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
          <span className="idx">02</span> 기하·평가 조건
        </h2>
        <div className="pb">
          <div className="row">
            <label htmlFor="alpha">입사각 α</label>
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
            <label htmlFor="hvlm">HVL 재질</label>
            <select id="hvlm" value={input.hvlMaterial} onChange={(e) => set({ hvlMaterial: e.target.value as WorkbenchInput["hvlMaterial"] })}>
              <option value="auto">자동 (ISO 매칭 재질)</option>
              <option value="Al">Al</option>
              <option value="Cu">Cu</option>
              <option value="Pb">Pb</option>
            </select>
          </div>
          {isX && (
            <>
              <div className="row">
                <label htmlFor="isoq">ISO 비교 대상</label>
                <select id="isoq" value={input.isoQuality} onChange={(e) => set({ isoQuality: e.target.value })}>
                  <option value="auto">자동 매칭</option>
                  {presets.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row">
                <label htmlFor="tol">허용 밴드</label>
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
          <span className="idx">03</span> 판독값 보정 (ISO 4037-4)
        </h2>
        <div className="pb">
          <div className="row">
            <label htmlFor="rd">판독값</label>
            <input id="rd" type="number"
                    inputMode="decimal"
                    autoComplete="off" step={0.001} value={input.airReading.reading} onChange={(e) => setR({ reading: num(e.target.value, input.airReading.reading) })} />
          </div>
          <div className="row">
            <label htmlFor="t">온도</label>
            <div className="ctl">
              <input id="t" type="number"
                    inputMode="decimal"
                    autoComplete="off" step={0.1} value={input.airReading.tempC} onChange={(e) => setR({ tempC: num(e.target.value, input.airReading.tempC) })} />
              <span className="unit">°C</span>
            </div>
          </div>
          <div className="row">
            <label htmlFor="p">기압</label>
            <div className="ctl">
              <input id="p" type="number"
                    inputMode="decimal"
                    autoComplete="off" step={0.01} value={input.airReading.pressureKPa} onChange={(e) => setR({ pressureKPa: num(e.target.value, input.airReading.pressureKPa) })} />
              <span className="unit">kPa</span>
            </div>
          </div>
          <div className="row">
            <label htmlFor="rh">상대습도</label>
            <div className="ctl">
              <input id="rh" type="number"
                    inputMode="decimal"
                    autoComplete="off" min={0} max={100} step={1} value={input.airReading.relHumidityPct} onChange={(e) => setR({ relHumidityPct: num(e.target.value, input.airReading.relHumidityPct) })} />
              <span className="unit">%</span>
            </div>
          </div>
          <div className="hint">기준조건 20 °C · 101.325 kPa · 65 % RH 로 환산합니다.</div>
        </div>
      </section>

      <section className="panel">
        <h2 className="ph">
          <span className="idx">04</span> 반복측정 불확도 (GUM Type A)
        </h2>
        <div className="pb">
          <div className="row" style={{ alignItems: "start" }}>
            <label htmlFor="rd-vals">판독값 목록</label>
            <textarea
              id="rd-vals"
              className="mono"
              rows={3}
              placeholder={"1.482 1.495 1.471 …  (공백·쉼표·줄바꿈 구분)"}
              defaultValue={input.readings.values.join(" ")}
              onBlur={(e) => set({ readings: { ...input.readings, values: parseReadings(e.target.value) } })}
              spellCheck={false}
              style={{ width: "100%", border: "1px solid var(--rule-strong)", borderRadius: "var(--r)", padding: 6, fontSize: 12 }}
            />
          </div>
          <div className="row">
            <label htmlFor="rd-air">밀도 보정</label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <input
                id="rd-air"
                type="checkbox"
                checked={input.readings.applyAirCorrection}
                onChange={(e) => set({ readings: { ...input.readings, applyAirCorrection: e.target.checked } })}
              />
              판독값마다 k_ρ(03 패널 조건) 적용
            </label>
          </div>
          <div className="filters">
            {input.readings.typeB.map((b, i) => (
              <div className="frow" key={i} style={{ gridTemplateColumns: "1fr 86px 26px" }}>
                <input
                  type="text"
                  value={b.label}
                  aria-label="Type B 성분 이름"
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
                    aria-label="상대 표준불확도 %"
                    onChange={(e) => set({ readings: { ...input.readings, typeB: input.readings.typeB.map((x, j) => (j === i ? { ...x, relPct: num(e.target.value, x.relPct) } : x)) } })}
                  />
                  <span className="unit">%</span>
                </div>
                <button type="button" aria-label="성분 삭제" onClick={() => set({ readings: { ...input.readings, typeB: input.readings.typeB.filter((_, j) => j !== i) } })}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="add" onClick={() => set({ readings: { ...input.readings, typeB: [...input.readings.typeB, { label: "Type B 성분", relPct: 0.5 }] } })}>
              + Type B 성분 (상대 표준불확도)
            </button>
          </div>
          <div className="hint">Type A: u = s/√n, k = t₀.₉₇₅,ₙ₋₁ (95 %). Type B와 제곱합 합성, Welch–Satterthwaite ν_eff.</div>
        </div>
      </section>
    </div>
  );
}

/** 측정 스펙트럼 불러오기: 파일 선택 또는 붙여넣기 → 파싱 → 상태 저장. */
function ImportBox({ input, onChange }: Props) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<"keV" | "MeV" | "eV">("keV");
  const [density, setDensity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (raw: string, label: string) => {
    try {
      const imported = parseImportedSpectrum(raw, label || "붙여넣기", { energyUnit: unit, fluenceIsDensity: density });
      setError(null);
      onChange({ ...input, imported, isoQuality: "auto" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const onFile = (f: File | undefined) => {
    if (!f) return;
    f.text().then((t) => {
      setText(t);
      setName(f.name);
      apply(t, f.name);
    });
  };
  const im = input.imported;
  return (
    <>
      <div className="row">
        <label htmlFor="imp-file">파일</label>
        <input id="imp-file" type="file" accept=".csv,.txt,.tsv,.dat,text/plain,text/csv" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <div className="row">
        <label htmlFor="imp-unit">에너지 단위</label>
        <div className="ctl">
          <select id="imp-unit" value={unit} onChange={(e) => setUnit(e.target.value as "keV" | "MeV" | "eV")} style={{ width: 90 }}>
            <option>keV</option>
            <option>MeV</option>
            <option>eV</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <input type="checkbox" checked={density} onChange={(e) => setDensity(e.target.checked)} /> 값이 /keV 밀도
          </label>
        </div>
      </div>
      <div className="row" style={{ alignItems: "start" }}>
        <label htmlFor="imp-text">붙여넣기</label>
        <textarea
          id="imp-text"
          className="mono"
          rows={5}
          placeholder={"에너지, 플루언스\n20, 1.2e3\n30, 4.5e3\n…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          style={{ width: "100%", border: "1px solid var(--rule-strong)", borderRadius: "var(--r)", padding: 6, fontSize: 12 }}
        />
      </div>
      <div className="ctl" style={{ justifyContent: "flex-end", marginTop: 6 }}>
        <button type="button" className="add" style={{ marginTop: 0 }} onClick={() => apply(text, name)} disabled={!text.trim()}>
          스펙트럼 적용
        </button>
      </div>
      {error && (
        <div className="hint" role="alert" style={{ color: "var(--bad)" }}>
          불러오기 실패: {error} — 열 순서(에너지, 플루언스)·단위·구분자를 확인하세요.
        </div>
      )}
      {im ? (
        <div className="hint" aria-live="polite">
          적용됨: <span className="mono">{im.name}</span> · {im.energy.length} 점 · {im.energy[0]}–{im.energy[im.energy.length - 1]} keV
        </div>
      ) : (
        <div className="hint">불러온 스펙트럼이 없으면 X선 설정으로 표시합니다. CSV/TSV/공백 구분, 헤더·#주석 허용.</div>
      )}
    </>
  );
}
