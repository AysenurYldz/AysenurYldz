/**
 * Katkı ızgarasında dolaşan kedi — yılan animasyonunun yerine.
 *
 * Kedi katkı olan kareleri hafta sırasıyla gezer; ızgara çizgileri üzerinde
 * yürür (önce yatay, sonra dikey), uğradığı kare kalkar. Sonunda ızgaranın
 * ucunda durur, kareler yerine döner ve döngü baştan başlar. Kedi iki ayağı
 * üstünde yürür, önündeki sepet topladıkça dolar.
 * Veriyi gen-contrib.mjs çeker; bu modül yalnız çizer:
 *     buildCat(weeks, total, "light" | "dark", "tr" | "en")
 */

// Gökyüzü paleti: sisten petrol yeşiline sıralı ölçek.
const THEME = {
  // Boş kareler soluk; toplanacak kareler belirgin petrol yeşili ölçeğinde.
  light: { id: "l", lv: ["#EEF1F5", "#A9CCD4", "#7DB1BA", "#5E9396", "#3E6F73"], cat: "#3A4657", eye: "#EEF1F5", wick: "#C99A3E", basketIn: "#FBF3E2" },
  dark: { id: "d", lv: ["#1C2430", "#3C6670", "#5E9396", "#8CC2C7", "#C3E6E9"], cat: "#C8D2DE", eye: "#1C2430", wick: "#E8B866", basketIn: "#2A2A2E" },
};
const ALT = {
  tr: "Bir kedi katkı ızgarasındaki kareleri gezerek topluyor",
  en: "A cat walks the contribution grid, collecting the squares",
};

const r3 = (n) => Number(n.toFixed(3));
const r5 = (n) => Number(n.toFixed(5));

// İki ayağı üstünde yürüyen kedi, önünde sepet: (0,0) ayak hizasının ortası, sağa bakar.
// `g` verilirse sepet her toplanan karede biraz dolar.
function walking(th, g) {
  const leg = (x, d) => `<line x1="${x}" y1="-8" x2="${x}" y2="0" stroke="${th.cat}" stroke-width="2.6" stroke-linecap="round">
      <animateTransform attributeName="transform" type="rotate" values="-18 ${x} -8;18 ${x} -8;-18 ${x} -8" dur="0.5s" begin="${d}s" repeatCount="indefinite"/></line>`;
  return `<g class="yuru">
    ${leg(-1.6, 0)}${leg(1.6, 0.25)}
    <path d="M-4 -10 C-10 -10 -12 -16 -9 -21" fill="none" stroke="${th.cat}" stroke-width="2.2" stroke-linecap="round">
      <animateTransform attributeName="transform" type="rotate" values="0 -4 -10;12 -4 -10;0 -4 -10" dur="1.2s" repeatCount="indefinite"/></path>
    <ellipse cx="0" cy="-14" rx="5.4" ry="7.2" fill="${th.cat}"/>
    <circle cx="1" cy="-25" r="5.2" fill="${th.cat}"/>
    <path d="M-3.4 -27.8 L-2.8 -33.5 L0.4 -29.6 Z M1.8 -29.8 L4.6 -33.4 L5.6 -27.6 Z" fill="${th.cat}"/>
    <circle cx="3.4" cy="-25.6" r="0.95" fill="${th.eye}"/>
    <!-- sepet: iki ön pati önde tutar -->
    <g transform="translate(9.5 -15)">
      <path d="M-4.5 0 C-4.5 -7 4.5 -7 4.5 0" fill="none" stroke="${th.wick}" stroke-width="1.4" stroke-linecap="round"/>
      <clipPath id="sepet-ic-${th.id}"><path d="M-6 0 H6 L4.6 8 H-4.6 Z"/></clipPath>
      <path d="M-6 0 H6 L4.6 8 H-4.6 Z" fill="${th.basketIn}"/>
      <g clip-path="url(#sepet-ic-${th.id})">
        <rect x="-6" y="8" width="12" height="8" fill="${th.lv[3]}">
          <animate attributeName="y" values="${g.fill}" keyTimes="${g.keyTimes}" dur="${g.dur}s" repeatCount="indefinite"/>
        </rect>
      </g>
      <path d="M-6 0 H6 L4.6 8 H-4.6 Z" fill="none" stroke="${th.wick}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M-5.5 3 H5.5 M-5 5.6 H5" stroke="${th.wick}" stroke-width="0.7" opacity="0.7"/>
    </g>
    <line x1="3" y1="-17" x2="6" y2="-14.5" stroke="${th.cat}" stroke-width="2.2" stroke-linecap="round"/>
  </g>`;
}

export function buildCat(weeks, total, mode = "light", lang = "tr") {
  const th = THEME[mode];
  const S = 15, C = 12;                       // adım ve kare boyu
  const GX = 18, GY = 26;                     // ızgaranın sol üst köşesi
  const W = GX * 2 + weeks.length * S + 22, H = GY + 7 * S + 14;

  // Gezilecek kareler: haftalar soldan sağa, hafta içinde yön her hafta değişir.
  const stops = [];
  weeks.forEach((wk, wi) => {
    const days = [...wk].sort((a, b) => a.weekday - b.weekday);
    if (wi % 2) days.reverse();
    for (const d of days) if (d.level > 0) stops.push({ x: GX + wi * S + C / 2, y: GY + d.weekday * S + C / 2, wi, wd: d.weekday });
  });

  // Yol ızgara çizgisi üzerinde: her geçiş önce yatay, sonra dikey.
  const start = { x: GX - 10, y: GY + C / 2 };
  const end = { x: GX + weeks.length * S + 8, y: GY + 6 * S + C / 2 };
  const pts = [start];
  const visit = [];                           // her durağın pts içindeki sırası
  for (const p of [...stops, end]) {
    const last = pts.at(-1);
    if (last.x !== p.x && last.y !== p.y) pts.push({ x: p.x, y: last.y });
    pts.push({ x: p.x, y: p.y });
    visit.push(pts.length - 1);
  }
  const seg = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const len = seg.at(-1) || 1;
  const WALK = 0.9;                           // döngünün yürüyüş payı; kalanında kedi oturur
  const DUR = Math.max(14, Math.min(70, len / 70));
  const tk = seg.map((s) => r5((s / len) * WALK));

  // Ayaklar karenin üst kenarına değil ortasına basar ki kedi ızgaranın içinde yürüsün.
  const pos = pts.map((p) => `${r3(p.x)} ${r3(p.y + 4)}`);
  const values = [...pos, pos.at(-1), pos[0]].join(";");
  const keyTimes = [...tk, 0.99, 1].join(";");

  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${ALT[lang]}">`);
  o.push(`<title>${ALT[lang]}</title>`);
  weeks.forEach((wk, wi) => {
    for (const d of wk) {
      const x = GX + wi * S, y = GY + d.weekday * S;
      o.push(`<rect x="${x}" y="${y}" width="${C}" height="${C}" rx="3" fill="${th.lv[0]}"/>`);
      if (d.level > 0) {
        const s = stops.findIndex((p) => p.wi === wi && p.wd === d.weekday);
        const at = tk[visit[s]];
        o.push(`<rect x="${x}" y="${y}" width="${C}" height="${C}" rx="3" fill="${th.lv[Math.min(4, d.level)]}">
  <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;${at};${r5(Math.min(at + 0.003, 0.98))};0.99;1" dur="${DUR}s" repeatCount="indefinite"/></rect>`);
      }
    }
  });
  // Sepet dolar: her toplanan karede doluluk biraz yükselir; döngü başında boşalır.
  const eaten = visit.slice(0, stops.length).map((i) => tk[i]);
  const n = Math.max(1, eaten.length);
  const fs = [0, ...eaten.map((_, i) => (i + 1) / n), 1, 0];
  const g = {
    dur: DUR,
    keyTimes: [0, ...eaten, 0.99, 1].join(";"),
    fill: fs.map((f) => r3(8 - 8 * f)).join(";"),
  };
  o.push(`<g><animateTransform attributeName="transform" type="translate" values="${values}" keyTimes="${keyTimes}" dur="${DUR}s" calcMode="linear" repeatCount="indefinite"/>${walking(th, g)}</g>`);
  o.push("</svg>");
  return o.join("\n");
}
