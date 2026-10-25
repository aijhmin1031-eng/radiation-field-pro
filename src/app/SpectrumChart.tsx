// hand-SVG 스펙트럼 차트: 상대 플루언스 vs 에너지(선형), 평균E·유효E 마커, y 로그 토글.
// 연속 X선은 면+선, 감마 선 스펙트럼은 막대. 모눈(그래프지) 배경.
import { useMemo, useState } from "react";
import type { Spectrum } from "../engine/spectrum";
import { useI18n } from "./i18n";

interface Props {
  spectrum: Spectrum;
  meanEnergyKeV: number;
  effectiveEnergyKeV: number;
  discrete: boolean;
  kermaWeights?: number[]; // 공기커마 기여(상대) 오버레이
  compact?: boolean; // 모바일: 좁은 viewBox 로 글자 크기 유지
}

const W_FULL = 760;
const W_COMPACT = 420;
const H_FULL = 300;
const H_COMPACT = 240;
const M = { l: 54, r: 18, t: 18, b: 34 };

function niceStep(range: number, target = 8): number {
  const raw = range / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}

export function SpectrumChart({ spectrum, meanEnergyKeV, effectiveEnergyKeV, discrete, kermaWeights, compact = false }: Props) {
  const W = compact ? W_COMPACT : W_FULL;
  const H = compact ? H_COMPACT : H_FULL;
  const { t } = useI18n();
  const [log, setLog] = useState(false);
  const [showKerma, setShowKerma] = useState(false);

  const g = useMemo(() => {
    const pts = spectrum.energy.map((e, i) => [e, spectrum.fluence[i]] as const).filter((p) => p[1] > 0 || !log);
    const maxF = Math.max(1e-30, ...spectrum.fluence);
    const minF = log ? Math.max(maxF * 1e-4, Math.min(...spectrum.fluence.filter((f) => f > 0))) : 0;
    const eMax = discrete ? Math.max(...spectrum.energy) * 1.15 : Math.max(...spectrum.energy);
    const eMin = 0;
    const x = (e: number) => M.l + ((e - eMin) / (eMax - eMin)) * (W - M.l - M.r);
    const y = (f: number) => {
      const v = log ? (Math.log10(Math.max(f, minF)) - Math.log10(minF)) / (Math.log10(maxF) - Math.log10(minF)) : f / maxF;
      return H - M.b - v * (H - M.t - M.b);
    };
    const xs = niceStep(eMax - eMin, compact ? 5 : 8);
    const xticks: number[] = [];
    for (let v = 0; v <= eMax + 1e-9; v += xs) xticks.push(v);
    const yticks = log
      ? Array.from({ length: 5 }, (_, i) => minF * 10 ** (i * (Math.log10(maxF / minF) / 4)))
      : [0, 0.25, 0.5, 0.75, 1].map((r) => r * maxF);
    let path = "";
    let area = "";
    if (!discrete && pts.length > 1) {
      path = pts.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join("");
      area = `${path}L${x(pts[pts.length - 1][0]).toFixed(1)},${(H - M.b).toFixed(1)}L${x(pts[0][0]).toFixed(1)},${(H - M.b).toFixed(1)}Z`;
    }
    // 커마 가중 곡선: 자기 최대값으로 정규화해 같은 y 스케일(0..1)에 겹친다
    let kermaPath = "";
    if (showKerma && kermaWeights && kermaWeights.length === spectrum.energy.length && !discrete) {
      const maxK = Math.max(1e-30, ...kermaWeights);
      const kp = spectrum.energy.map((e, i) => [e, (kermaWeights[i] / maxK) * maxF] as const).filter((p) => p[1] > 0 || !log);
      kermaPath = kp.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join("");
    }
    return { x, y, xticks, yticks, maxF, path, area, pts, eMax, kermaPath };
  }, [spectrum, log, discrete, showKerma, kermaWeights, W, H, compact]);

  const yLabel = (f: number) => (log ? f.toExponential(0) : (f / g.maxF).toFixed(2));

  return (
    <div className="chart-wrap">
      <div className="chart-tools">
        <button type="button" aria-pressed={!log} onClick={() => setLog(false)}>
          lin
        </button>
        <button type="button" aria-pressed={log} onClick={() => setLog(true)}>
          log
        </button>
        {!discrete && (
          <button type="button" aria-pressed={showKerma} onClick={() => setShowKerma((v) => !v)} title={t("kermaTitle")}>
            {t("kermaBtn")}
          </button>
        )}
      </div>
      <svg className="spec" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("chartAria")}>
        {/* 모눈 */}
        {g.xticks.map((t) => (
          <line key={`gx${t}`} className="grid" x1={g.x(t)} x2={g.x(t)} y1={M.t} y2={H - M.b} />
        ))}
        {g.yticks.map((t, i) => (
          <line key={`gy${i}`} className="grid" x1={M.l} x2={W - M.r} y1={g.y(t)} y2={g.y(t)} />
        ))}
        {g.xticks.slice(0, -1).map((t, i) => {
          const half = (t + g.xticks[i + 1]) / 2;
          return <line key={`gm${t}`} className="grid minor" x1={g.x(half)} x2={g.x(half)} y1={M.t} y2={H - M.b} />;
        })}
        {/* 축 */}
        <line className="axis" x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} />
        <line className="axis" x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} />
        {g.xticks.map((t) => (
          <text key={`tx${t}`} x={g.x(t)} y={H - M.b + 14} textAnchor="middle">
            {Math.round(t)}
          </text>
        ))}
        {g.yticks.map((t, i) => (
          <text key={`ty${i}`} x={M.l - 6} y={g.y(t) + 3.5} textAnchor="end">
            {yLabel(t)}
          </text>
        ))}
        <text x={W - M.r} y={H - 4} textAnchor="end">
          {t("axisE")}
        </text>
        <text x={M.l + 4} y={M.t - 6}>
          {t("axisF")}{log ? " (log)" : ""}
        </text>
        {/* 데이터 */}
        {discrete
          ? g.pts.map((p) => (
              <line key={p[0]} className="bar" x1={g.x(p[0])} x2={g.x(p[0])} y1={H - M.b} y2={g.y(p[1])} />
            ))
          : (
              <>
                <path className="area" d={g.area} />
                <path className="line" d={g.path} />
              </>
            )}
        {/* 마커 */}
        {g.kermaPath && (
          <>
            <path className="kerma" d={g.kermaPath} />
            <text className="kerma-t" x={M.l + 4} y={M.t + 8}>
              {t("kermaLegend")}
            </text>
          </>
        )}
        {/* 마커 라벨: Ē 는 선 오른쪽 위, E_eff 는 선 왼쪽 아래(끝 정렬)로 두어 가까워도 겹치지 않게 */}
        {Number.isFinite(meanEnergyKeV) && (
          <>
            <line className="mk" x1={g.x(meanEnergyKeV)} x2={g.x(meanEnergyKeV)} y1={M.t} y2={H - M.b} />
            <text
              className="mk-t"
              x={g.x(meanEnergyKeV) + (g.x(meanEnergyKeV) > W * 0.7 ? -4 : 4)}
              y={M.t + 10}
              textAnchor={g.x(meanEnergyKeV) > W * 0.7 ? "end" : "start"}
            >
              Ē {meanEnergyKeV.toFixed(1)}
            </text>
          </>
        )}
        {Number.isFinite(effectiveEnergyKeV) && (
          <>
            <line className="mk mk-eff" x1={g.x(effectiveEnergyKeV)} x2={g.x(effectiveEnergyKeV)} y1={M.t} y2={H - M.b} />
            <text className="mk-t eff" x={g.x(effectiveEnergyKeV) - 4} y={H - M.b - 6} textAnchor="end">
              E_eff {effectiveEnergyKeV.toFixed(1)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
