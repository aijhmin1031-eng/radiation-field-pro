/** Vite 플러그인 — index.html 의 자리표시 셋에 공통 셸 v3(머리글 · 꼬리말 · head 자산)을 **빌드 때 글자로** 넣는다 (2026-10-28, T3).
 *
 *  ★ 왜 플러그인인가: 이 저장소는 Vite 단일 쪽(React)이라 Astro 의 레이아웃(RadCalc) 같은 자리가 없다. 머리글을 React 로
 *    그리면 JS 가 돌기 전 첫 화면에 사이트 셸이 없고(D5 「JS 로 머리글을 그리지 않음」), 크롤러 · 무JS 방문자도 못 본다.
 *    `transformIndexHtml`(order: "pre")은 dev 서버와 build 둘 다에서 돌아 index.html 을 Vite 가 손대기 전에 바꾼다 —
 *    산출물 dist/index.html 에 render.mjs 출력이 **정적으로** 박히고, gate/check-shell 이 그 바이트를 잰다.
 *  ★ 자리표시(`<!-- rl-shell:head -->` 등)와 쪽별 값(현재 칸 · 공유 대상)은 `scripts/shell-page.mjs` 한 곳에 있다(404 · 임시 쪽 넷은 `scripts/build-pages.mjs`). */
import { loadShell, fragmentsFor, fillSlots } from "./shell-page.mjs";

export default function shellPlugin() {
  let shell;
  return {
    name: "rl-shell",
    async buildStart() { shell = await loadShell(); },
    transformIndexHtml: {
      order: "pre",
      async handler(html) {
        shell ??= await loadShell();
        return fillSlots(html, fragmentsFor(shell, "home"));
      },
    },
  };
}
