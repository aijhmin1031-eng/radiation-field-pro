// 우측 출력: 판독창(특성·운영선량·감마·보정), ISO 비교 패널.
import { useEffect, useRef, useState } from "react";
import { fmt, fmtDev, type Characteristics, type FastOutput, type IsoOutput } from "./compute";

/** 값이 바뀌면 잠깐 주황으로 점등하는 판독창. */
function Readout({
  label,
  value,
  unit,
  note,
  primary = false,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  primary?: boolean; // 핵심량: 더 큰 판독창(위계)
}) {
  const [tick, setTick] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setTick(true);
      const t = setTimeout(() => setTick(false), 380);
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <div className={`ro${primary ? " primary" : ""}${tick ? " tick" : ""}`}>
      <div className="k">{label}</div>
      <div className="v">
        {value}
        {unit && <span className="u">{unit}</span>}
      </div>
      {note && <div className="n">{note}</div>}
    </div>
  );
}

export function CharacteristicsPanel({
  c,
  transmission,
  provisional,
}: {
  c: Characteristics;
  transmission: number;
  provisional: boolean;
}) {
  return (
    <section className="panel">
      <div className="ph">
        <span className="idx">A</span> 선질 특성
        {provisional && <span className="stale">재질 확정 중…</span>}
      </div>
      <div className="pb readouts">
        <Readout label="평균 에너지 Ē" value={fmt(c.meanEnergyKeV)} unit="keV" />
        <Readout label="유효 에너지 E_eff" value={fmt(c.effectiveEnergyKeV)} unit="keV" />
        <Readout label="HVL1" value={fmt(c.hvl1Mm)} unit={`mm ${c.material}`} primary />
        <Readout label="HVL2" value={fmt(c.hvl2Mm)} unit={`mm ${c.material}`} />
        <Readout label="균질도 h = HVL1/HVL2" value={fmt(c.homogeneity, 3)} />
        <Readout label="부가여과 커마 투과율 (고유여과 기준)" value={fmt(transmission * 100, 3)} unit="%" />
      </div>
    </section>
  );
}

export function OperationalPanel({ fast }: { fast: FastOutput }) {
  const o = fast.operational;
  const a = `${o.alphaDeg}°`;
  return (
    <section className="panel">
      <div className="ph">
        <span className="idx">B</span> 운영선량 변환계수 (ISO 4037-3, 스펙트럼 평균)
      </div>
      <div className="pb readouts">
        <Readout label={`Hp(10, ${a}) / Ka`} value={fmt(o.hp10)} unit="Sv/Gy" note="ICRU 슬랩 팬텀" primary />
        <Readout label="H*(10) / Ka" value={fmt(o.hStar10)} unit="Sv/Gy" note="등방" />
        <Readout label={`H′(0.07, ${a}) / Ka`} value={fmt(o.hPrime007)} unit="Sv/Gy" />
        {fast.gamma && (
          <>
            <Readout
              label={`${fast.gamma.nuclide} 평가일 활동도`}
              value={fmt(fast.gamma.activityNowBq / 1e9)}
              unit="GBq"
              note={`경과 ${fast.gamma.elapsedDays.toFixed(0)} 일`}
            />
            <Readout label="공기커마율 (점선원)" value={fmt(fast.gamma.airKermaRateUGyPerH)} unit="μGy/h" note="역제곱·공기감쇠 무시" />
          </>
        )}
        <Readout label="판독 보정 k_ρ" value={fmt(fast.airReading.factor, 5)} note={`보정값 ${fmt(fast.airReading.corrected)}`} />
      </div>
    </section>
  );
}

export function IsoPanel({ iso, stale }: { iso: IsoOutput; stale: boolean }) {
  return (
    <section className="panel">
      <div className="ph">
        <span className="idx">C</span> ISO 4037-1 기준장 비교
        {stale && <span className="stale">매칭 중…</span>}
      </div>
      <div className="pb">
        {!iso.applicable || !iso.comparison ? (
          <div className="na">해당 없음 — 핵종 기준장(S-Cs / S-Co)은 ISO 4037-1 연속 X선 표의 대상이 아닙니다.</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <span className={`led ${iso.comparison.pass ? "ok" : "bad"}`} />
              <strong className="mono" style={{ fontSize: 15 }}>
                {iso.selected}
              </strong>
              <span className={`badge ${iso.comparison.pass ? "ok" : "bad"}`}>{iso.comparison.pass ? "밴드 내" : "밴드 이탈"}</span>
              <span className="badge muted">±{iso.comparison.tolerancePct} %</span>
              {iso.matched && (
                <span className="hint" style={{ marginTop: 0 }}>
                  자동 매칭 {iso.matched.name} (HVL1 {fmtDev(iso.matchHvl1DeviationPct)})
                </span>
              )}
            </div>
            <table className="cmp">
              <thead>
                <tr>
                  <th>특성</th>
                  <th>ISO 표값</th>
                  <th>계산값</th>
                  <th>편차</th>
                  <th>판정</th>
                </tr>
              </thead>
              <tbody>
                {iso.comparison.rows.map((r) => (
                  <tr key={r.characteristic}>
                    <td>
                      {r.characteristic === "homogeneity coefficient" ? "균질도" : r.characteristic === "mean energy" ? "평균 에너지" : r.characteristic}
                      {r.unit && <span className="unit"> {r.unit}</span>}
                    </td>
                    <td className="num">{r.reference == null ? "—" : fmt(r.reference)}</td>
                    <td className="num">{fmt(r.measured)}</td>
                    <td className="num">{fmtDev(r.deviationPct)}</td>
                    <td>
                      {r.withinTolerance == null ? (
                        <span className="badge muted">표값 없음</span>
                      ) : (
                        <span className={`badge ${r.withinTolerance ? "ok" : "bad"}`}>{r.withinTolerance ? "✓" : "✗"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}
