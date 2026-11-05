/**
 * Katkı ızgarasında dolaşan kedi — yılan animasyonunun yerine.
 *
 * Kedi katkı olan kareleri hafta sırasıyla gezer; ızgara çizgileri üzerinde
 * yürür (önce yatay, sonra dikey), uğradığı kare kalkar. Sonunda ızgaranın
 * ucunda oturur, kareler yerine döner ve döngü baştan başlar.
 * Veriyi gen-contrib.mjs çeker; bu modül yalnız çizer:
 *     buildCat(weeks, total, "light" | "dark", "tr" | "en")
 */

// Gökyüzü paleti: sisten petrol yeşiline sıralı ölçek.
const THEME = {
  light: { lv: ["#EEF1F5", "#D8E2EB", "#B9C9D8", "#8897AA", "#5E9396"], cat: "#3A4657", eye: "#EEF1F5" },
  dark: { lv: ["#1C2430", "#2C3A4C", "#46607A", "#7E9CB8", "#9ECFD3"], cat: "#C8D2DE", eye: "#1C2430" },
};
const ALT = {
  tr: "Bir kedi katkı ızgarasındaki kareleri gezerek topluyor",
  en: "A cat walks the contribution grid, collecting the squares",
};

const r3 = (n) => Number(n.toFixed(3));
const r5 = (n) => Number(n.toFixed(5));

// Yandan, yürüyen kedi silüeti: (0,0) ayak hizasının ortası, sağa bakar.
function walking(th) {
  const leg = (x, d) => `<line x1="${x}" y1="-5" x2="${x}" y2="0" stroke="${th.cat}" stroke-width="2.2" stroke-linecap="round">
      <animateTransform attributeName="transform" type="rotate" values="-16 ${x} -5;16 ${x} -5;-16 ${x} -5" dur="0.45s" begin="${d}s" repeatCount="indefinite"/></line>`;
  return `<g class="yuru">
    ${leg(-6, 0)}${leg(-2.5, 0.22)}${leg(3, 0.22)}${leg(6.5, 0)}
    <path d="M-9 -8 C-14 -9 -16 -14 -13 -18" fill="none" stroke="${th.cat}" stroke-width="2.2" stroke-linecap="round">
      <animateTransform attributeName="transform" type="rotate" values="0 -9 -8;10 -9 -8;0 -9 -8" dur="1.1s" repeatCount="indefinite"/></path>
    <ellipse cx="0" cy="-8.5" rx="9.5" ry="4.8" fill="${th.cat}"/>
    <circle cx="10" cy="-12.5" r="4.8" fill="${th.cat}"/>
    <path d="M6.8 -15.5 L7.6 -20.5 L10.2 -16.6 Z M11 -16.8 L13.6 -20.6 L14.4 -15.4 Z" fill="${th.cat}"/>
    <circle cx="12" cy="-13" r="0.9" fill="${th.eye}"/>
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
  o.push(`<g><animateTransform attributeName="transform" type="translate" values="${values}" keyTimes="${keyTimes}" dur="${DUR}s" calcMode="linear" repeatCount="indefinite"/>${walking(th)}</g>`);
  o.push("</svg>");
  return o.join("\n");
}
