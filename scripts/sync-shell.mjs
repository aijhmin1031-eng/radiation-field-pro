/** 공통 셸 v3 를 apex 에서 받아 `shell/` 에 vendoring 한다 — `npm run sync-shell` (2026-10-28, T3).
 *
 *  ★★ 정본은 우산 저장소 `radiation-lab/public/shell/`(HEADER-SPEC v3)이고 실서비스 주소는
 *    https://radiation-lab.com/shell/ 다. 이 저장소는 그 **사본**을 들고 빌드한다 —
 *    · `shell.json` · `render.mjs` → Vite 플러그인(`scripts/vite-plugin-shell.mjs`)이 빌드 때 index.html 에 머리글 · 꼬리말을
 *      그리고, `scripts/build-pages.mjs` 가 public/404.html 과 구역 메뉴 임시 쪽 넷을 만든다(네트워크 없이, 재현 가능).
 *    · `shell.css` · `shell.js` · `fonts/` → 라이브에서는 쪽이 apex(https://radiation-lab.com/shell/…?v=N)에서 읽으므로
 *      빌드 산출물에는 들어가지 않는다. **E2E · 실측**은 apex 요청을 이 사본으로 돌려 세운다(`e2e/shell-assets.ts`).
 *  ★ 이 사본은 **손으로 고치지 않는다** — 고칠 것이 있으면 우산 저장소의 정본을 고치고 다시 받는다.
 *  ★ 네트워크가 안 되면 **기존 사본을 그대로 두고 경고만** 한다(빌드는 사본으로 돈다). 사본이 아예 없을 때만 실패다.
 *  ★ `--from=<dir>` 로 로컬 체크아웃(예: ../radiation-lab/public/shell)에서 복사할 수도 있다 — 배포 전 판을 미리 받아 볼 때.
 *  ★ 받은 것은 쓰기 전에 검사한다 — shell.json 이 JSON 이고 version 이 정수인가 · render.mjs 가 renderHeader 를 내보내는가.
 *    HTML 오류 쪽(404 본문)을 사본으로 덮어쓰는 사고를 막는다.
 *  (RadCalc `radiation-calc/scripts/sync-shell.mjs` 와 같은 패턴.) */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "shell");
const ORIGIN = "https://radiation-lab.com/shell/";
const FILES = ["shell.json", "render.mjs", "shell.css", "shell.js",
               "fonts/saira-400.woff2", "fonts/saira-600.woff2", "fonts/saira-700.woff2", "fonts/Saira-OFL.txt"];
const from = process.argv.find((a) => a.startsWith("--from="))?.slice("--from=".length);

const got = new Map();
try {
  for (const f of FILES) {
    if (from) {
      /* 로컬 체크아웃은 Windows 에서 CRLF 로 놓여 있다 — apex 가 내주는 것(LF)과 같은 바이트가 되게 글자 파일만 LF 로 맞춘다.
         git 도 LF 로 저장하므로(autocrlf) 커밋되는 내용은 어느 경로로 받아도 같다. */
      const raw = readFileSync(join(from, f));
      got.set(f, /\.(json|mjs|css|js|txt)$/.test(f) ? Buffer.from(raw.toString("utf8").replace(/\r\n/g, "\n"), "utf8") : raw);
    } else {
      const res = await fetch(ORIGIN + f, { headers: { "cache-control": "no-cache" } });
      if (!res.ok) throw new Error(`${ORIGIN}${f} → HTTP ${res.status}`);
      got.set(f, Buffer.from(await res.arrayBuffer()));
    }
  }
} catch (e) {
  const have = existsSync(join(OUT, "shell.json")) && existsSync(join(OUT, "render.mjs"));
  console.warn(`⚠️  공통 셸을 받지 못했다 — ${e.message}`);
  if (!have) { console.error("❌ shell/ 에 사본도 없다 — 네트워크를 확인하거나 --from=<radiation-lab>/public/shell 로 복사할 것"); process.exit(1); }
  console.warn(`   기존 사본 shell/ (v${JSON.parse(readFileSync(join(OUT, "shell.json"), "utf8")).version}) 을 그대로 둔다`);
  process.exit(0);
}

/* 쓰기 전 검사 — 받은 것이 셸인가 */
let spec;
try { spec = JSON.parse(got.get("shell.json").toString("utf8")); } catch { console.error("❌ 받은 shell.json 이 JSON 이 아니다 — 쓰지 않는다"); process.exit(1); }
if (!Number.isInteger(spec.version) || spec.version < 1) { console.error(`❌ shell.json 의 version 이 정수가 아니다(${spec.version}) — 쓰지 않는다`); process.exit(1); }
const render = got.get("render.mjs").toString("utf8");
for (const fn of ["renderHeader", "renderFooter", "renderHeadAssets", "renderNotFound"])
  if (!render.includes(`export function ${fn}(`)) { console.error(`❌ 받은 render.mjs 에 ${fn} 이 없다 — 쓰지 않는다`); process.exit(1); }
if (!got.get("shell.css").toString("utf8").includes("--c-paper:")) { console.error("❌ 받은 shell.css 에 토큰(--c-paper)이 없다 — 쓰지 않는다"); process.exit(1); }

let changed = 0;
for (const [f, buf] of got) {
  const dst = join(OUT, f);
  mkdirSync(dirname(dst), { recursive: true });
  const same = existsSync(dst) && readFileSync(dst).equals(buf);
  if (!same) { writeFileSync(dst, buf); changed++; }
  console.log(`${same ? "＝ " : "✏️ "} shell/${f.padEnd(24)} ${String(buf.length).padStart(6)} B`);
}
console.log(changed ? `✅ 공통 셸 v${spec.version} — ${changed}개 파일을 새로 받았다(${from ? from : ORIGIN})`
                    : `✅ 공통 셸 v${spec.version} — 사본이 이미 최신이다(${from ? from : ORIGIN})`);
