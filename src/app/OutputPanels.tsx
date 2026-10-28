// 우측 출력: 판독창(특성·운영선량·감마·보정), ISO 비교 패널.
import { useEffect, useRef, useState } from "react";
import { TYPE_A_LABEL, fmt, fmtDev, type Characteristics, type FastOutput, type IsoOutput, type UncertaintyOutput } from "./compute";
import { useI18n, type Key } from "./i18n";

const REASON_KEY: Record<NonNullable<IsoOutput["reason"]>, Key> = {
  radionuclide: "reasonRadionuclide",
  "no-import": "reasonNoImport",
  "above-400-kev": "reasonAbove400",
};

/** 직전 계산 대비 변화량(절대·%). */
export interface Delta {
  abs: number;
  pct: number;
}
export interface Deltas {
  meanEnergy?: Delta;
  effectiveEnergy?: Delta;
  hvl1?: Delta;
  hvl2?: Delta;
  homogeneity?: Delta;
  transmission?: Delta;
  hp10?: Delta;
  hStar10?: Delta;
  hPrime007?: Delta;
  kermaRate?: Delta;
  airFactor?: Delta;
}

function DeltaTag({ d, sig = 3 }: { d?: Delta; sig?: number }) {
  const { t } = useI18n();
  if (!d) return null;
  const tiny = Math.abs(d.pct) < 0.005 || !Number.isFinite(d.pct);
  if (tiny && Math.abs(d.abs) < 1e-12) return <span className="delta same">{t("noChange")}</span>;
  const up = d.abs > 0;
  return (
    <span className={`delta ${up ? "up" : "down"}`} title={t("vsPrev")}>
      {up ? "▲" : "▼"} {fmt(Math.abs(d.abs), sig)}
      {Number.isFinite(d.pct) ? ` (${d.pct >= 0 ? "+" : ""}${d.pct.toFixed(2)} %)` : ""}
    </span>
  );
}

/** 값이 바뀌면 잠깐 주황으로 점등하는 판독창. */
function Readout({
  label,
  value,
  unit,
  note,
  primary = false,
  delta,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  primary?: boolean; // 핵심량: 더 큰 판독창(위계)
  delta?: Delta; // 직전 계산 대비 변화량
}) {
  const [tick, setTick] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setTick(true);
      const t = setTimeout(() => setTick(false), 160); // 짧게 켜고 CSS 200 ms 로 소등
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
      <DeltaTag d={delta} />
    </div>
  );
}

export function CharacteristicsPanel({
  c,
  transmission,
  provisional,
  deltas = {},
}: {
  c: Characteristics;
  transmission: number;
  provisional: boolean;
  deltas?: Deltas;
}) {
  const { t } = useI18n();
  return (
    <section className="panel">
      <h2 className="ph" id="characteristics">
        <a className="idx" href="#characteristics">A</a> {t("pA")}
        {provisional && <span className="stale" aria-live="polite">{t("settling")}</span>}
      </h2>
      <div className="pb readouts">
        <Readout label={t("meanE")} value={fmt(c.meanEnergyKeV)} unit="keV" delta={deltas.meanEnergy} />
        <Readout label={t("effE")} value={fmt(c.effectiveEnergyKeV)} unit="keV" delta={deltas.effectiveEnergy} />
        <Readout label="HVL1" value={fmt(c.hvl1Mm)} unit={`mm ${c.material}`} primary delta={deltas.hvl1} />
        <Readout label="HVL2" value={fmt(c.hvl2Mm)} unit={`mm ${c.material}`} delta={deltas.hvl2} />
        <Readout label={t("homog")} value={fmt(c.homogeneity, 3)} delta={deltas.homogeneity} />
        <Readout label={t("transm")} value={fmt(transmission * 100, 3)} unit="%" delta={deltas.transmission && { abs: deltas.transmission.abs * 100, pct: deltas.transmission.pct }} />
      </div>
    </section>
  );
}

export function OperationalPanel({ fast, deltas = {} }: { fast: FastOutput; deltas?: Deltas }) {
  const { t } = useI18n();
  const o = fast.operational;
  const a = `${o.alphaDeg}°`;
  return (
    <section className="panel">
      <h2 className="ph" id="operational">
        <a className="idx" href="#operational">B</a> {t("pB")}
      </h2>
      <div className="pb readouts">
        <Readout label={`Hp(10, ${a}) / Ka`} value={fmt(o.hp10)} unit="Sv/Gy" note={t("slab")} primary delta={deltas.hp10} />
        <Readout label="H*(10) / Ka" value={fmt(o.hStar10)} unit="Sv/Gy" note={t("isotropic")} delta={deltas.hStar10} />
        <Readout label={`H′(0.07, ${a}) / Ka`} value={fmt(o.hPrime007)} unit="Sv/Gy" delta={deltas.hPrime007} />
        {fast.gamma && (
          <>
            <Readout
              label={t("activityOn", fast.gamma.nuclide)}
              value={fmt(fast.gamma.activityNowBq / 1e9)}
              unit="GBq"
              note={t("elapsed", fast.gamma.elapsedDays.toFixed(0))}
            />
            <Readout label={t("kermaRate")} value={fmt(fast.gamma.airKermaRateUGyPerH)} unit="μGy/h" note={t("invSq")} delta={deltas.kermaRate} />
          </>
        )}
        <Readout label={t("krho")} value={fmt(fast.airReading.factor, 5)} note={t("corrected", fmt(fast.airReading.corrected))} delta={deltas.airFactor} />
      </div>
    </section>
  );
}

export function IsoPanel({ iso, stale }: { iso: IsoOutput; stale: boolean }) {
  const { t } = useI18n();
  return (
    <section className="panel">
      <h2 className="ph" id="iso">
        <a className="idx" href="#iso">C</a> {t("pC")}
        {stale && <span className="stale" aria-live="polite">{t("matching")}</span>}
      </h2>
      <div className="pb">
        {!iso.applicable || !iso.comparison ? (
          <>
            {iso.radionuclide && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <span className={`led ${Math.abs(iso.radionuclide.deviationPct) < 0.5 ? "ok" : "bad"}`} />
                <strong className="mono" style={{ fontSize: 15 }}>
                  {iso.radionuclide.quality}
                </strong>
                <span className="hint" style={{ marginTop: 0 }}>
                  {t("nominalMean", fmt(iso.radionuclide.nominalMeanKeV, 5), fmt(iso.radionuclide.modelMeanKeV, 5), fmtDev(iso.radionuclide.deviationPct))}
                </span>
              </div>
            )}
            <div className="na">{t(iso.reason ? REASON_KEY[iso.reason] : "reasonDefault")}</div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <span className={`led ${iso.comparison.pass ? "ok" : "bad"}`} />
              <strong className="mono" style={{ fontSize: 15 }}>
                {iso.selected}
              </strong>
              <span className={`badge ${iso.comparison.pass ? "ok" : "bad"}`}>{iso.comparison.pass ? t("inBand") : t("outBand")}</span>
              <span className="badge muted">±{iso.comparison.tolerancePct} %</span>
              {iso.matched && (
                <span className="hint" style={{ marginTop: 0 }}>
                  {t("autoMatched", iso.matched.name, fmtDev(iso.matchHvl1DeviationPct))}
                </span>
              )}
            </div>
            <table className="cmp">
              <thead>
                <tr>
                  <th>{t("thChar")}</th>
                  <th>{t("thIso")}</th>
                  <th>{t("thCalc")}</th>
                  <th>{t("thDev")}</th>
                  <th>{t("thVerdict")}</th>
                </tr>
              </thead>
              <tbody>
                {iso.comparison.rows.map((r) => (
                  <tr key={r.characteristic}>
                    <td>
                      {r.characteristic === "homogeneity coefficient" ? t("rowHomog") : r.characteristic === "mean energy" ? t("rowMean") : r.characteristic}
                      {r.unit && <span className="unit"> {r.unit}</span>}
                    </td>
                    <td className="num">{r.reference == null ? "—" : fmt(r.reference)}</td>
                    <td className="num">{fmt(r.measured)}</td>
                    <td className="num">{fmtDev(r.deviationPct)}</td>
                    <td>
                      {r.withinTolerance == null ? (
                        <span className="badge muted">{t("noRef")}</span>
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

export function UncertaintyPanel({ u }: { u: UncertaintyOutput }) {
  const { t } = useI18n();
  const a = u.typeA;
  const c = u.combined;
  return (
    <section className="panel">
      <h2 className="ph" id="uncertainty">
        <a className="idx" href="#uncertainty">D</a> {t("pD")}
      </h2>
      <div className="pb">
        {!a || !c ? (
          <div className="na">{t("uNeed")}</div>
        ) : (
          <>
            <div className="readouts">
              <Readout label={t("meanN", u.n)} value={fmt(a.mean, 5)} primary note={`s = ${fmt(a.standardDeviation, 3)} · u(x̄) = ${fmt(a.standardUncertainty, 3)}`} />
              <Readout label={t("typeAU", a.coverageFactor.toFixed(3), a.degreesOfFreedom)} value={fmt(a.expandedUncertainty, 3)} note={t("relative", (a.relativeExpandedUncertainty * 100).toFixed(2))} />
              <Readout
                label={t("combinedU", c.coverageFactor.toFixed(3), Number.isFinite(c.effectiveDegreesOfFreedom) ? c.effectiveDegreesOfFreedom.toFixed(1) : "∞")}
                value={fmt(c.expandedUncertainty, 3)}
                primary
                note={`${t("relative", (c.relativeExpandedUncertainty * 100).toFixed(2))} · u_c/|y| = ${(c.combinedRelativeStandardUncertainty * 100).toFixed(3)} %`}
              />
              <Readout label={t("reportFmt")} value={`${fmt(c.value, 5)} ± ${fmt(c.expandedUncertainty, 2)}`} note={t("approx95", c.coverageFactor.toFixed(2))} />
            </div>
            <table className="cmp" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>{t("thComp")}</th>
                  <th>{t("thRelStd")}</th>
                  <th>{t("thDof")}</th>
                </tr>
              </thead>
              <tbody>
                {c.components.map((k) => (
                  <tr key={k.label}>
                    <td>{k.label === TYPE_A_LABEL ? t("typeALabel") : k.label}</td>
                    <td className="num">{(k.relativeStandardUncertainty * 100).toFixed(3)} %</td>
                    <td className="num">{Number.isFinite(k.degreesOfFreedom) ? k.degreesOfFreedom : "∞"}</td>
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
