/** E2E 에서 공통 셸 자산을 vendored 사본으로 대신 내준다 (2026-10-28, 공통 셸 v3).
 *
 *  ★ 왜: 쪽은 `https://radiation-lab.com/shell/shell.css?v=N` · `shell.js?v=N`(+ 글꼴)을 **apex 절대 주소**로 읽는다(하위 도메인은
 *    다른 오리진이라 루트 상대가 안 된다). 그대로 두면 E2E 가 실서비스 apex 에 기대 — 네트워크가 없으면 토큰도 막대 CSS 도 없는
 *    **벗은 쪽**을 재고, 있으면 배포된 판(앞서 갔을 수 있다)을 잰다. RadCalc 는 게이트 서버가 `/shell/*` 을 사본에서 내주는데
 *    (`gate/shell-assets.mjs`), 이 저장소의 주소는 절대 주소라 서버가 가로챌 수 없으므로 Playwright 의 route 로 같은 일을 한다.
 *  ★ 어디서: `SHELL_DIR` 환경변수가 있으면 그 폴더(우산 저장소를 옆에 두고 일할 때 `SHELL_DIR=../radiation-lab/public/shell`),
 *    없으면 이 저장소의 사본 `shell/` — 빌드가 쓰는 shell.json · render.mjs 와 **같은 판**이다.
 *  ★ apex 의 다른 요청(/track.js 등)은 건드리지 않는다. 없는 파일은 404 — `npm run sync-shell` 을 권한다. */
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import type { Page } from "@playwright/test";

export const SHELL_DIR = process.env.SHELL_DIR || join(import.meta.dirname, "..", "shell");
const MIME: Record<string, string> = { ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
                                       ".woff2": "font/woff2", ".txt": "text/plain" };

export async function routeShellAssets(page: Page): Promise<void> {
  await page.route(/^https:\/\/radiation-lab\.com\/shell\//, (route) => {
    const p = new URL(route.request().url()).pathname.slice("/shell/".length);
    const f = join(SHELL_DIR, p);
    if (!existsSync(f)) return route.fulfill({ status: 404, body: "404 — shell asset missing; run `npm run sync-shell`" });
    return route.fulfill({ status: 200, contentType: MIME[extname(f)] || "application/octet-stream", body: readFileSync(f),
                           headers: { "access-control-allow-origin": "*" } });
  });
}
