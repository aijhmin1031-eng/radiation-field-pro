import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import shell from "./scripts/vite-plugin-shell.mjs";

export default defineConfig({
  // rl-shell: 공통 셸 v3(radiation-lab/public/shell, 사본 shell/)을 index.html 에 빌드 때 글자로 넣는다 — scripts/vite-plugin-shell.mjs
  plugins: [shell(), react()],
  build: { outDir: "dist", sourcemap: false },
});
