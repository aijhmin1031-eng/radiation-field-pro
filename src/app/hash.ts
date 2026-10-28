// 구획 해시(설계 D8, 2026-10-28): 모바일 [Input | Results] 탭과 패널 01~04 · 00 · A~D 에 주소를 준다.
//  - 탭이나 패널로 옮길 때 history.pushState 로 기록 → 브라우저 뒤로가기가 앱 **안에서** 멈춘다(그전에는 주소가 늘 같아 앱 밖으로 나갔다).
//  - popstate 로 되돌린다. 접속 때 해시가 있으면 그 탭을 열고 그 패널로 내려간다(구획 링크 공유).
//  - 주소만 다룬다. 계산 · 입력 상태는 건드리지 않는다(?source= · ?preset= 딥링크는 App 의 applyDeepLink 가 그대로 맡는다).
export type Tab = "input" | "result";

/** 패널 제목(h2.ph)의 id = 해시 이름. 어느 탭에 있는지도 적어 둔다(980px 이하에서는 그 탭을 먼저 열어야 보인다). */
export const PANELS: Record<string, Tab> = {
  source: "input",          // 01
  geometry: "input",        // 02
  readout: "input",         // 03
  repeatability: "input",   // 04
  spectrum: "result",       // 00
  characteristics: "result",// A
  operational: "result",    // B
  iso: "result",            // C
  uncertainty: "result",    // D
};
const TAB_HASH: Record<Tab, string> = { input: "input", result: "results" };

export interface Target { tab: Tab; panel?: string }

/** 해시 → 목표. 빈 해시는 첫 상태(Input 탭 — 뒤로가기로 접속 때 주소에 돌아온 경우). 모르는 해시(옛 북마크 · 외부 앵커)는 null — 아무 일도 하지 않는다. */
export function parseHash(hash: string): Target | null {
  const h = hash.replace(/^#/, "");
  if (h === "" || h === TAB_HASH.input) return { tab: "input" };
  if (h === TAB_HASH.result) return { tab: "result" };
  if (Object.hasOwn(PANELS, h)) return { tab: PANELS[h], panel: h }; // in 이 아니라 hasOwn — "constructor" 같은 상속 이름을 걸러 낸다
  return null;
}

export function hashFor(t: Target): string {
  return "#" + (t.panel ?? TAB_HASH[t.tab]);
}

/** 지금 주소의 해시가 다르면 pushState 한다(같으면 기록을 늘리지 않는다). 경로 · 질의(?source=…)는 그대로 둔다. */
export function pushTarget(t: Target): void {
  const next = hashFor(t);
  if (window.location.hash === next) return;
  try {
    window.history.pushState(null, "", next);
  } catch {
    /* file: 등 pushState 가 막힌 환경은 무시 */
  }
}

/** 패널 제목으로 내려간다. React 가 그 탭을 그린 뒤에 불러야 하므로 호출자가 useEffect 에서 부른다. */
export function scrollToPanel(id: string): void {
  document.getElementById(id)?.scrollIntoView({ block: "start" });
}
