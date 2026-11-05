#!/usr/bin/env node
/**
 * Bağlantı rozetleri: solda simge kutusu, sağda yazı; açık ve koyu tema.
 * Görüntülenme sayısı komarev sayacından okunur (sayaç, README'deki 1 px'lik
 * görsel çekildikçe artar). Okunamazsa önceki sayı korunur.
 *     node tools/gen-badges.mjs   →  assets/badge-*.svg
 * Actions'ta contrib iş akışıyla her gün koşar.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const USER = "AysenurYldz";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MONO = "'JetBrains Mono','SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";
// Genişlik hesabı: 13 px eş aralıklı yazıda karakter ~7,9 px; farklı yazı tiplerine pay bırakılır.
const CH = 8.4;

const THEME = {
  light: { card: "#FFFFFF", edge: "#E6DACD", ink: "#2B211C", faint: "#97897F" },
  dark: { card: "#15110E", edge: "#3A2F26", ink: "#F2EAE2", faint: "#A3968A" },
};

// Simgeler 20×20 kutuda çizilir; yazı tipine bağlı değildir.
const ICON = {
  linkedin: (c) => `<rect x="2" y="2" width="16" height="16" rx="3" fill="${c}"/><rect x="5" y="8" width="2.6" height="7" fill="#fff"/><circle cx="6.3" cy="5.6" r="1.5" fill="#fff"/><path d="M9.5 8h2.4v1.1c.4-.7 1.2-1.3 2.4-1.3 1.9 0 2.7 1.2 2.7 3.3V15h-2.6v-3.4c0-.9-.3-1.6-1.2-1.6s-1.3.7-1.3 1.6V15H9.5z" fill="#fff"/>`,
  medium: (c) => `<circle cx="6.5" cy="10" r="4.5" fill="${c}"/><ellipse cx="13.6" cy="10" rx="2.3" ry="4.3" fill="${c}"/><ellipse cx="17.6" cy="10" rx="0.9" ry="3.9" fill="${c}"/>`,
  mail: (c) => `<rect x="2" y="4.5" width="16" height="11" rx="2.2" fill="none" stroke="${c}" stroke-width="1.8"/><path d="M3 6l7 5 7-5" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/>`,
  web: (c) => `<circle cx="10" cy="10" r="7.2" fill="none" stroke="${c}" stroke-width="1.7"/><ellipse cx="10" cy="10" rx="3.2" ry="7.2" fill="none" stroke="${c}" stroke-width="1.5"/><path d="M3 10h14" stroke="${c}" stroke-width="1.5"/>`,
  eye: (c) => `<path d="M1.8 10C4 5.8 7 4.2 10 4.2S16 5.8 18.2 10C16 14.2 13 15.8 10 15.8S4 14.2 1.8 10Z" fill="none" stroke="${c}" stroke-width="1.7"/><circle cx="10" cy="10" r="2.8" fill="${c}"/>`,
};

// Simge kutularının pastel zeminleri (sonbahar üçlüsü) ve simge renkleri.
const TINT = {
  linkedin: ["#E3ECDF", "#718C6C"], medium: ["#EFE4D6", "#2B211C"], mail: ["#F6E3D8", "#C98A70"],
  web: ["#F3EAD4", "#9A7A3C"], eye: ["#EDE3DA", "#8B6A55"],
};
const TINT_DARK = {
  linkedin: ["#26301F", "#B4C8AE"], medium: ["#2E251E", "#E8D9C6"], mail: ["#33231C", "#E3A68B"],
  web: ["#302818", "#E6C27A"], eye: ["#2B231D", "#C9A27C"],
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function badge(icon, text, mode, value = null) {
  const th = THEME[mode];
  const [bg, fg] = (mode === "dark" ? TINT_DARK : TINT)[icon];
  const textW = Math.ceil(text.length * CH);
  const valW = value === null ? 0 : Math.ceil(String(value).length * (CH + 0.6)) + 16;
  const W = 44 + 16 + textW + valW + 16, H = 34;
  const val = value === null ? "" :
    `<text x="${44 + 16 + textW + 12}" y="22" font-family="${MONO}" font-size="13" font-weight="700" fill="${th.ink}">${esc(value)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(text)}${value === null ? "" : " " + value}">
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="9" fill="${th.card}" stroke="${th.edge}" stroke-width="1.5"/>
  <path d="M9.75 0.75 H44 V${H - 0.75} H9.75 A9 9 0 0 1 0.75 ${H - 9.75} V9.75 A9 9 0 0 1 9.75 0.75 Z" fill="${bg}"/>
  <line x1="44" y1="1" x2="44" y2="${H - 1}" stroke="${th.edge}" stroke-width="1.2"/>
  <g transform="translate(12 7)">${ICON[icon](fg)}</g>
  <text x="${44 + 14}" y="22" font-family="${MONO}" font-size="13" fill="${value === null ? th.ink : th.faint}">${esc(text)}</text>
  ${val}
</svg>`;
}

async function views() {
  try {
    const r = await fetch(`https://komarev.com/ghpvc/?username=${USER}&abbreviated=false&label=x`, {
      headers: { "user-agent": "profile-badges" }, signal: AbortSignal.timeout(15000),
    });
    const svg = await r.text();
    // Sayaç SVG'sinde son <text> düğümü sayıdır.
    const nums = [...svg.matchAll(/>\s*([\d.,]+)\s*</g)].map((m) => m[1].replace(/[.,]/g, ""));
    const n = Number(nums.at(-1));
    if (Number.isFinite(n) && n >= 0) return n;
  } catch { /* ağ yok */ }
  try {
    const old = await readFile(join(ROOT, "assets", "badge-views-tr-light.svg"), "utf8");
    const m = old.match(/font-weight="700"[^>]*>([\d.]+)</);
    if (m) return Number(m[1].replace(/\./g, ""));
  } catch { /* ilk koşum */ }
  return null;
}

const n = await views();
const fmt = (x) => (x === null ? "—" : x.toLocaleString("en-US").replace(/,/g, "."));
const items = [
  ["linkedin", "linkedin", { tr: "Ayşenur Yıldız", en: "Ayşenur Yıldız" }],
  ["medium", "medium", { tr: "@AysenurYldz", en: "@AysenurYldz" }],
  ["mail", "mail", { tr: "aysenur.yildiz.2905@gmail.com", en: "aysenur.yildiz.2905@gmail.com" }],
  ["web", "portfolio", { tr: "portfolyo", en: "portfolio" }],
];
for (const mode of ["light", "dark"]) {
  for (const lang of ["tr", "en"]) {
    for (const [icon, name, text] of items) {
      await writeFile(join(ROOT, "assets", `badge-${name}-${lang}-${mode}.svg`), badge(icon, text[lang], mode));
    }
    await writeFile(join(ROOT, "assets", `badge-views-${lang}-${mode}.svg`),
      badge("eye", lang === "tr" ? "görüntülenme" : "views", mode, fmt(n)));
  }
}
console.log(`rozetler yazıldı · görüntülenme ${fmt(n)}`);
