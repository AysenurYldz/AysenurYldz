#!/usr/bin/env node
/**
 * Sonbahar köşesi: siyah kedi, latte, düşen yapraklar — profilin ara bölmesi.
 * Veri yok, yalnız çizim; açık ve koyu tema, iki dilde altyazı.
 *     node tools/gen-cozy.mjs   →  assets/cozy-{tr,en}-{light,dark}.svg
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MONO = "'JetBrains Mono','SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

const T = {
  light: {
    bg1: "#FBF6EF", bg2: "#F3E9DC", edge: "#ECE3DA", ink: "#2B211C", faint: "#97897F",
    cat: "#2A2420", catHi: "#3C332D", rim: "#2A2420", eye: "#E6C27A", nose: "#E8A9A0", desk: "#E6D5C1",
    mug: "#F7EFE4", mugEdge: "#D9C3A8", coffee: "#B98A62", foam: "#F3E2CC", steam: "#C9B7A4",
    leaves: ["#E3A68B", "#E6C27A", "#B98A62", "#A9BFA0", "#D9967A"], book1: "#A9BFA0", book2: "#D9967A", book3: "#E6C27A",
  },
  dark: {
    bg1: "#1B1612", bg2: "#231C17", edge: "#33291F", ink: "#F2EAE2", faint: "#A3968A",
    cat: "#0F0C0A", catHi: "#2A231E", rim: "#5A4A3E", eye: "#E9C77E", nose: "#E4A79E", desk: "#3A2F27",
    mug: "#EADCC9", mugEdge: "#B79C80", coffee: "#9E714F", foam: "#E8D3B8", steam: "#7D6E62",
    leaves: ["#D9967A", "#D9B46A", "#B98A62", "#93AE8F", "#C98B6F"], book1: "#7F9A7B", book2: "#B97F66", book3: "#C9A462",
  },
};
const CAP = {
  tr: ["kahve", "kedi", "kod"],
  en: ["coffee", "cats", "code"],
};

function leaf(x, y, c, s, dur, delay, rot) {
  // Yaprak: iki kavisle çizilmiş basit form; aşağı süzülür, sağa sola salınır.
  return `<g transform="translate(${x} ${y})"><g>
    <animateTransform attributeName="transform" type="translate" values="0 -30; 18 60; -10 150; 12 230" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
    <g transform="rotate(${rot}) scale(${s})">
      <animateTransform attributeName="transform" type="rotate" values="${rot};${rot + 40};${rot - 20};${rot + 30}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite" additive="sum"/>
      <path d="M0 -10 C8 -6 9 4 0 10 C-9 4 -8 -6 0 -10 Z" fill="${c}" opacity="0.9"/>
      <path d="M0 -9 L0 9" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="1"/>
    </g>
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
  </g></g>`;
}

function build(th, cap) {
  const W = 1000, H = 230;
  const steam = (x, d) => `<path d="M${x} 118 C${x - 8} 106 ${x + 8} 96 ${x} 84 C${x - 8} 72 ${x + 6} 64 ${x} 54" fill="none" stroke="${th.steam}" stroke-width="3" stroke-linecap="round" opacity="0">
      <animate attributeName="opacity" values="0;0.8;0" dur="3.6s" begin="${d}s" repeatCount="indefinite"/>
      <animateTransform attributeName="transform" type="translate" values="0 6; 0 -10" dur="3.6s" begin="${d}s" repeatCount="indefinite"/>
    </path>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Siyah kedi, latte ve sonbahar yaprakları">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${th.bg1}"/><stop offset="1" stop-color="${th.bg2}"/></linearGradient>
    <clipPath id="kart"><rect width="${W}" height="${H}" rx="18"/></clipPath>
  </defs>
  <g clip-path="url(#kart)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <circle cx="880" cy="40" r="120" fill="${th.leaves[1]}" opacity="0.10"/>
    <circle cx="120" cy="230" r="140" fill="${th.leaves[3]}" opacity="0.10"/>

    ${leaf(90, 0, th.leaves[0], 1.1, 11, 0, 20)}
    ${leaf(260, 0, th.leaves[1], 0.9, 13, 3, -30)}
    ${leaf(470, 0, th.leaves[3], 1.0, 12, 6, 50)}
    ${leaf(780, 0, th.leaves[4], 1.2, 14, 1.5, -10)}
    ${leaf(930, 0, th.leaves[2], 0.85, 10, 4.5, 70)}

    <!-- masa -->
    <rect x="0" y="196" width="${W}" height="34" fill="${th.desk}"/>
    <rect x="0" y="196" width="${W}" height="2" fill="${th.mugEdge}" opacity="0.5"/>

    <!-- kitaplar -->
    <g transform="translate(560 150)">
      <rect x="0" y="30" width="120" height="16" rx="3" fill="${th.book1}"/>
      <rect x="10" y="14" width="104" height="16" rx="3" fill="${th.book2}"/>
      <rect x="4" y="0" width="112" height="14" rx="3" fill="${th.book3}"/>
      <rect x="18" y="5" width="40" height="3" rx="1.5" fill="#FFFFFF" opacity="0.5"/>
      <rect x="24" y="20" width="52" height="3" rx="1.5" fill="#FFFFFF" opacity="0.5"/>
      <rect x="14" y="36" width="36" height="3" rx="1.5" fill="#FFFFFF" opacity="0.5"/>
    </g>

    <!-- latte -->
    <g transform="translate(720 0)">
      ${steam(52, 0)}${steam(68, 1.2)}${steam(84, 2.4)}
      <path d="M118 140 C142 140 142 176 116 176" fill="none" stroke="${th.mugEdge}" stroke-width="7" stroke-linecap="round"/>
      <path d="M26 126 L122 126 L114 192 C112 198 106 200 100 200 L48 200 C42 200 36 198 34 192 Z" fill="${th.mug}" stroke="${th.mugEdge}" stroke-width="2"/>
      <ellipse cx="74" cy="127" rx="47" ry="9" fill="${th.coffee}"/>
      <path d="M74 132 C66 124 58 128 62 133 C64 136 70 138 74 141 C78 138 84 136 86 133 C90 128 82 124 74 132 Z" fill="${th.foam}"/>
      <rect x="44" y="160" width="60" height="4" rx="2" fill="${th.mugEdge}" opacity="0.6"/>
    </g>

    <!-- siyah kedi -->
    <g transform="translate(330 64)">
      <!-- kuyruk: tabanından salınır -->
      <g transform="translate(118 118)">
        <g><path d="M0 0 C40 4 58 -20 46 -48 C40 -62 52 -70 60 -62" fill="none" stroke="${th.rim}" stroke-width="19" stroke-linecap="round"/><path d="M0 0 C40 4 58 -20 46 -48 C40 -62 52 -70 60 -62" fill="none" stroke="${th.cat}" stroke-width="14" stroke-linecap="round"/>
          <animateTransform attributeName="transform" type="rotate" values="0;-9;0;7;0" dur="4.5s" repeatCount="indefinite"/>
        </g>
      </g>
      <!-- gövde -->
      <ellipse cx="80" cy="102" rx="62" ry="36" fill="${th.cat}" stroke="${th.rim}" stroke-width="2.5"/>
      <path d="M40 82 C56 72 84 70 104 76" fill="none" stroke="${th.catHi}" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
      <!-- patiler -->
      <ellipse cx="40" cy="132" rx="15" ry="8" fill="${th.cat}"/>
      <ellipse cx="74" cy="134" rx="15" ry="8" fill="${th.cat}"/>
      <!-- baş -->
      <g transform="translate(28 50)">
        <path d="M-30 -14 L-22 -48 L-4 -26 Z" fill="${th.cat}" stroke="${th.rim}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M30 -14 L22 -48 L4 -26 Z" fill="${th.cat}" stroke="${th.rim}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M-22 -36 L-12 -26 L-20 -22 Z" fill="${th.nose}" opacity="0.55"/>
        <path d="M22 -36 L12 -26 L20 -22 Z" fill="${th.nose}" opacity="0.55"/>
        <circle cx="0" cy="0" r="38" fill="${th.cat}" stroke="${th.rim}" stroke-width="2.5"/>
        <!-- gözler: ara ara kırpılır -->
        <g>
          <ellipse cx="-14" cy="-2" rx="7" ry="8.5" fill="${th.eye}"/>
          <ellipse cx="14" cy="-2" rx="7" ry="8.5" fill="${th.eye}"/>
          <ellipse cx="-14" cy="-1" rx="2.6" ry="6" fill="${th.cat}"/>
          <ellipse cx="14" cy="-1" rx="2.6" ry="6" fill="${th.cat}"/>
          <circle cx="-12" cy="-5" r="1.6" fill="#FFFFFF"/>
          <circle cx="16" cy="-5" r="1.6" fill="#FFFFFF"/>
          <animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 0.08;1 1;1 1" keyTimes="0;0.9;0.93;0.96;1" dur="5s" repeatCount="indefinite" additive="sum"/>
        </g>
        <path d="M-3 10 L3 10 L0 13.5 Z" fill="${th.nose}"/>
        <path d="M0 13.5 C-2 17 -6 17 -8 15 M0 13.5 C2 17 6 17 8 15" fill="none" stroke="${th.faint}" stroke-width="1.4" stroke-linecap="round"/>
        <circle cx="-22" cy="10" r="4.5" fill="${th.nose}" opacity="0.75"/>
        <circle cx="22" cy="10" r="4.5" fill="${th.nose}" opacity="0.75"/>
        <path d="M-26 6 L-46 2 M-26 11 L-46 13 M26 6 L46 2 M26 11 L46 13" stroke="${th.faint}" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
      </g>
    </g>

    <!-- altyazı -->
    <g font-family="${MONO}" font-size="13" letter-spacing="3" fill="${th.faint}">
      <text x="48" y="92">${cap[0]}</text>
      <text x="48" y="118">${cap[1]}</text>
      <text x="48" y="144">${cap[2]}</text>
    </g>
    <circle cx="36" cy="88" r="3.5" fill="${th.leaves[2]}"/>
    <circle cx="36" cy="114" r="3.5" fill="${th.leaves[0]}"/>
    <circle cx="36" cy="140" r="3.5" fill="${th.leaves[3]}"/>
  </g>
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="18" fill="none" stroke="${th.edge}" stroke-width="1.5"/>
</svg>`;
}

await mkdir(join(ROOT, "assets"), { recursive: true });
for (const lang of ["tr", "en"]) for (const mode of ["light", "dark"]) {
  await writeFile(join(ROOT, "assets", `cozy-${lang}-${mode}.svg`), build(T[mode], CAP[lang]));
}
console.log("cozy: 4 dosya");
