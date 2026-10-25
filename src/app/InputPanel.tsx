// 좌측 입력 패널. 상태는 App 이 소유하고 여기서는 patch 콜백만 부른다.
import {
  ALPHA_MAX,
  FILTER_MATERIALS,
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
        <div className="ph">
          <span className="idx">01</span> 선원
        </div>
        <div className="pb">
          <div className="seg" role="group" aria-label="선원 종류">
            {(["xray", "Cs-137", "Co-60"] as SourceKind[]).map((s) => (
              <button key={s} type="button" aria-pressed={input.source === s} onClick={() => set({ source: s })}>
                {s === "xray" ? "X선관" : s}
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
          ) : (
            <>
              <div className="row">
                <label htmlFor="act">활동도</label>
                <div className="ctl">
                  <input
                    id="act"
                    type="number"
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
        <div className="ph">
          <span className="idx">02</span> 기하·평가 조건
        </div>
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
        <div className="ph">
          <span className="idx">03</span> 판독값 보정 (ISO 4037-4)
        </div>
        <div className="pb">
          <div className="row">
            <label htmlFor="rd">판독값</label>
            <input id="rd" type="number" step={0.001} value={input.airReading.reading} onChange={(e) => setR({ reading: num(e.target.value, input.airReading.reading) })} />
          </div>
          <div className="row">
            <label htmlFor="t">온도</label>
            <div className="ctl">
              <input id="t" type="number" step={0.1} value={input.airReading.tempC} onChange={(e) => setR({ tempC: num(e.target.value, input.airReading.tempC) })} />
              <span className="unit">°C</span>
            </div>
          </div>
          <div className="row">
            <label htmlFor="p">기압</label>
            <div className="ctl">
              <input id="p" type="number" step={0.01} value={input.airReading.pressureKPa} onChange={(e) => setR({ pressureKPa: num(e.target.value, input.airReading.pressureKPa) })} />
              <span className="unit">kPa</span>
            </div>
          </div>
          <div className="row">
            <label htmlFor="rh">상대습도</label>
            <div className="ctl">
              <input id="rh" type="number" min={0} max={100} step={1} value={input.airReading.relHumidityPct} onChange={(e) => setR({ relHumidityPct: num(e.target.value, input.airReading.relHumidityPct) })} />
              <span className="unit">%</span>
            </div>
          </div>
          <div className="hint">기준조건 20 °C · 101.325 kPa · 65 % RH 로 환산합니다.</div>
        </div>
      </section>
    </div>
  );
}
