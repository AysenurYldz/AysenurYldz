#!/usr/bin/env node
/**
 * Sayfa sonu şeridi: ince bir çizgi, üzerinde küçük kedi silüeti ve bir fincan.
 * Bilerek çok sade — yazı yok, tek renk; açık ve koyu tema.
 *     node tools/gen-cozy.mjs   →  assets/cozy-{tr,en}-{light,dark}.svg
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const T = {
  light: { line: "#DCE3EC", ink: "#8897AA", steam: "#C8C7D7" },
  dark: { line: "#2C3646", ink: "#7F8DA1", steam: "#4A5266" },
};

function build(th) {
  const W = 1000, H = 64, base = 52, cx = W / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Küçük bir kedi silüeti ve fincan">
  <line x1="${cx - 220}" y1="${base}" x2="${cx + 220}" y2="${base}" stroke="${th.line}" stroke-width="1.5" stroke-linecap="round"/>
  <g transform="translate(${cx - 40} ${base - 44})" fill="${th.ink}">
    <path d="M30 44 C40 44 42 34 36 30" fill="none" stroke="${th.ink}" stroke-width="3" stroke-linecap="round">
      <animateTransform attributeName="transform" type="rotate" values="0 30 44;-8 30 44;0 30 44" dur="5s" repeatCount="indefinite"/>
    </path>
    <ellipse cx="18" cy="32" rx="12" ry="12.5"/>
    <circle cx="18" cy="13" r="8.5"/>
    <path d="M10.5 9 L11.5 0.5 L16.5 6 Z M25.5 9 L24.5 0.5 L19.5 6 Z"/>
  </g>
  <g transform="translate(${cx + 18} ${base - 22})" fill="none" stroke="${th.ink}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 2 H18 L16 20 C16 21 15 22 14 22 H4 C3 22 2 21 2 20 Z"/>
    <path d="M18 6 C23 6 23 14 17 14"/>
    <path d="M6 -3 C4 -6 8 -8 6 -11 M12 -3 C10 -6 14 -8 12 -11" stroke="${th.steam}">
      <animate attributeName="opacity" values="0.2;1;0.2" dur="3.6s" repeatCount="indefinite"/>
    </path>
  </g>
</svg>`;
}

await mkdir(join(ROOT, "assets"), { recursive: true });
for (const lang of ["tr", "en"]) for (const mode of ["light", "dark"]) {
  await writeFile(join(ROOT, "assets", `cozy-${lang}-${mode}.svg`), build(T[mode]));
}
console.log("cozy: 4 dosya");
