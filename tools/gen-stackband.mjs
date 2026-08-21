#!/usr/bin/env node
/**
 * Kayan teknoloji şeridi: kullandığım araçların logoları soldan sağa akar.
 *
 * İkon yolları simple-icons'tan çekilir (CC0). Ağ yalnızca üretim anında
 * gerekir; sonuç tek bir bağımsız SVG'dir:  assets/stackband.svg
 *
 *     node tools/gen-stackband.mjs
 *
 * Metin içermez, bu yüzden hem İngilizce hem Türkçe README aynı dosyayı kullanır.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons";

// Sıra bilinçli: dil -> yapay zekâ -> veri -> web -> mobil -> altyapı.
const ICONS = [
  ["python", "Python"],
  ["pytorch", "PyTorch"],
  ["tensorflow", "TensorFlow"],
  ["keras", "Keras"],
  ["scikitlearn", "scikit-learn"],
  ["opencv", "OpenCV"],
  ["pandas", "Pandas"],
  ["numpy", "NumPy"],
  ["javascript", "JavaScript"],
  ["nextdotjs", "Next.js"],
  ["nodedotjs", "Node.js"],
  ["flask", "Flask"],
  ["html5", "HTML5"],
  ["css", "CSS"],
  ["postgresql", "SQL"],
  ["flutter", "Flutter"],
  ["dart", "Dart"],
  ["docker", "Docker"],
  ["nvidia", "NVIDIA Triton"],
  ["onnx", "ONNX"],
  ["rabbitmq", "RabbitMQ"],
  ["git", "Git"],
];

// Profilin rampası; ikonlar sırayla bu dört rengi dolaşır.
const RAMP = ["#A78BFA", "#7C5CFF", "#3D8BFF", "#4CC9F0"];
const CARD = "#0A0918", EDGE = "#242352", RIM = "#8B7FE8";

const W = 1000, H = 72, SIZE = 26, GAP = 60, SPEED = 30; // px/saniye

async function icon(slug) {
  const res = await fetch(`${SRC}/${slug}.svg`);
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  const svg = await res.text();
  const m = svg.match(/<path[^>]*\bd="([^"]+)"/);
  if (!m) throw new Error(`${slug}: path bulunamadı`);
  return m[1];
}

const defs = [], symbols = [];
for (const [slug] of ICONS) {
  try {
    defs.push(`<g id="i-${slug}"><path d="${await icon(slug)}"/></g>`);
    symbols.push(slug);
  } catch (e) {
    console.warn(`  atlandı — ${e.message}`);
  }
}
if (!symbols.length) { console.error("hiç ikon alınamadı"); process.exit(1); }

const setW = symbols.length * GAP;
const scale = (SIZE / 24).toFixed(4);
const y = ((H - SIZE) / 2).toFixed(1);
const dur = Math.round(setW / SPEED);

// Aynı diziyi iki kez basıp bir set genişliği kaydırınca dikişsiz döngü olur.
const row = (offset) =>
  symbols.map((s, i) =>
    `<use href="#i-${s}" fill="${RAMP[i % RAMP.length]}" ` +
    `transform="translate(${offset + i * GAP + (GAP - SIZE) / 2},${y}) scale(${scale})"/>`
  ).join("");

const svg =
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${ICONS.map(([, n]) => n).join(", ")}">
<defs>
${defs.join("\n")}
<clipPath id="sb-clip"><rect width="${W}" height="${H}" rx="10"/></clipPath>
<linearGradient id="sb-fade" x1="0" y1="0" x2="1" y2="0">
<stop offset="0%" stop-color="#000"/><stop offset="7%" stop-color="#fff"/>
<stop offset="93%" stop-color="#fff"/><stop offset="100%" stop-color="#000"/>
</linearGradient>
<mask id="sb-mask"><rect width="${W}" height="${H}" fill="url(#sb-fade)"/></mask>
<linearGradient id="sb-sheen" x1="0" y1="0" x2="1" y2="0">
<stop offset="0%" stop-color="#FFF" stop-opacity="0"/><stop offset="45%" stop-color="#FFF" stop-opacity="0.075"/>
<stop offset="55%" stop-color="#FFF" stop-opacity="0.075"/><stop offset="100%" stop-color="#FFF" stop-opacity="0"/>
</linearGradient>
<style>
.sb-run{animation:sb-slide ${dur}s linear infinite}
@keyframes sb-slide{from{transform:translateX(0)}to{transform:translateX(-${setW}px)}}
@media (prefers-reduced-motion: reduce){.sb-run{animation:none}}
</style>
</defs>
<rect width="${W}" height="${H}" rx="10" fill="${CARD}"/>
<path d="M11,1.4 H${W - 11}" stroke="${RIM}" stroke-opacity="0.16" stroke-width="1.4" fill="none"/>
<g clip-path="url(#sb-clip)" mask="url(#sb-mask)">
<g class="sb-run">${row(0)}${row(setW)}</g>
</g>
<g clip-path="url(#sb-clip)"><rect x="-420" y="-${H}" width="300" height="${H * 3}" fill="url(#sb-sheen)" transform="skewX(-16)">
<animate attributeName="x" values="-420;-420;${W + 260};${W + 260}" keyTimes="0;0.25;0.72;1" dur="19s" repeatCount="indefinite"/></rect></g>
<rect x="0.7" y="0.7" width="${W - 1.4}" height="${H - 1.4}" rx="10" fill="none" stroke="${EDGE}" stroke-width="1.4"/>
</svg>
`;

await mkdir(join(ROOT, "assets"), { recursive: true });
await writeFile(join(ROOT, "assets", "stackband.svg"), svg, "utf8");
console.log(`yazıldı: ${symbols.length} ikon, set genişliği ${setW}px, döngü ${dur}s`);
