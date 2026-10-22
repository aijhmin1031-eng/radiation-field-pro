// 정확도 사양 리포트(한글 마크다운)를 docs/accuracy-spec.md 로 생성한다.
//   실행: npx tsx scripts/gen-accuracy-report.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAccuracyReport, formatAccuracyReportMarkdown } from "../src/engine/accuracy-spec.ts";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../docs/accuracy-spec.md");
mkdirSync(dirname(out), { recursive: true });
const md = formatAccuracyReportMarkdown(buildAccuracyReport());
writeFileSync(out, md, "utf8");
console.log(`생성 완료: ${out} (${md.length} chars)`);
