/**
 * Katkı ızgarasında dolaşan siyah kedi — yılan animasyonunun yerine.
 *
 * Kedi, katkı olan kareleri hafta sırasıyla gezer; uğradığı kare ızgaradan
 * kalkar ve sağdaki sepet dolar. Döngü sonunda kareler yerine döner.
 * Veriyi gen-contrib.mjs çeker; bu modül yalnız çizer:
 *     buildCat(weeks, total, "light" | "dark", "tr" | "en")
 */
const MONO = "'JetBrains Mono','SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

// Pastel sonbahar rampası: açıktan koyuya, beyaz zeminde sıralı okunur.
const THEME = {
  light: {
    card: "#FFFFFF", edge: "#ECE3DA", faint: "#9A8D82",
    lv: ["#F3EDE6", "#EBDCCA", "#DEC3A5", "#C9A27C", "#A9825F"],
    cat: "#26201C", rim: "#26201C", eye: "#E8C98A", nose: "#E8A9A0",
    basket: "#D9BC97", basketDark: "#B9966F", basketIn: "#F1E3CF",
  },
  dark: {
    card: "#15110E", edge: "#33291F", faint: "#A3968A",
    lv: ["#262019", "#43372C", "#6E5842", "#A88763", "#DDBE98"],
    cat: "#0E0B09", rim: "#6A5847", eye: "#E8C98A", nose: "#E4A79E",
    basket: "#8E7152", basketDark: "#6E5640", basketIn: "#2C241D",
  },
};
const L = {
  tr: { title: "KATKI SEPETİ", note: (n) => `${n} katkı`, alt: "Siyah bir kedi katkı ızgarasındaki kareleri toplayıp sepetine atıyor" },
  en: { title: "CONTRIBUTION BASKET", note: (n) => `${n} contributions`, alt: "A black cat collects the squares of the contribution grid into its basket" },
};

const r3 = (n) => Number(n.toFixed(3));
const r5 = (n) => Number(n.toFixed(5));

function catSprite(th) {
  // Yandan görünen yürüyen kedi; (0,0) ayak hizası ortası, sağa bakar.
  const leg = (x, d) => `<rect x="${x}" y="-6" width="2.6" height="6" rx="1.3" fill="${th.cat}">
      <animateTransform attributeName="transform" type="rotate" values="-14 ${x + 1.3} -6;14 ${x + 1.3} -6;-14 ${x + 1.3} -6" dur="0.5s" begin="${d}s" repeatCount="indefinite"/></rect>`;
  return `
    <path d="M-9 -11 C-15 -12 -17 -18 -14 -23" fill="none" stroke="${th.cat}" stroke-width="2.6" stroke-linecap="round">
      <animateTransform attributeName="transform" type="rotate" values="0 -9 -11;12 -9 -11;0 -9 -11" dur="1.2s" repeatCount="indefinite"/></path>
    ${leg(-7, 0)}${leg(-3, 0.25)}${leg(3, 0.25)}${leg(7, 0)}
    <ellipse cx="0" cy="-10" rx="10" ry="5.5" fill="${th.cat}" stroke="${th.rim}" stroke-width="0.8"/>
    <path d="M7 -18 L8 -24 L11 -19.5 Z M12 -19 L14.5 -24 L15.5 -18 Z" fill="${th.cat}" stroke="${th.rim}" stroke-width="0.8" stroke-linejoin="round"/>
    <circle cx="11.5" cy="-14.5" r="5.6" fill="${th.cat}" stroke="${th.rim}" stroke-width="0.8"/>
    <ellipse cx="13.3" cy="-15.3" rx="1.25" ry="1.6" fill="${th.eye}"/>
    <ellipse cx="10" cy="-15.3" rx="1.25" ry="1.6" fill="${th.eye}"/>
    <circle cx="16.6" cy="-13.2" r="0.8" fill="${th.nose}"/>`;
}

export function buildCat(weeks, total, mode = "light", lang = "tr") {
  const th = THEME[mode], t = L[lang];
  const S = 15, C = 12;                 // adım ve kare boyu
  const GX = 24, GY = 44;               // ızgara sol üst köşe
  const nW = weeks.length;
  const gridW = nW * S;
  const BX = GX + gridW + 26;           // sepet konumu
  const W = BX + 110, H = GY + 7 * S + 30;

  // Kedinin gezeceği kareler: haftalar soldan sağa, hafta içi yön her hafta değişir (zikzak).
  const stops = [];
  weeks.forEach((wk, wi) => {
    const days = [...wk].sort((a, b) => a.weekday - b.weekday);
    if (wi % 2) days.reverse();
    for (const d of days) if (d.level > 0) stops.push({ x: GX + wi * S + C / 2, y: GY + d.weekday * S + C / 2, wi, wd: d.weekday });
  });

  // Yol: başlangıç (ızgaranın solu) → her kare → sepet. Süre yol boyuna göre dağıtılır.
  const start = { x: GX - 18, y: GY + 6 * S + C / 2 };
  // Bitiş: sepetin ağzı — kedi kenara oturur, alttaki sayıyı örtmez.
  const end = { x: BX + 34, y: GY + 3 * S + 4 - C / 2 + 1 };
  const pts = [start, ...stops, end];
  const seg = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const len = seg.at(-1) || 1;
  const WALK = 0.86;                    // döngünün yürüyüşe ayrılan payı; kalanı sepette bekleme
  const DUR = Math.max(16, Math.min(60, len / 55));
  const tk = seg.map((s) => r5((s / len) * WALK));

  // Kedinin ayakları karenin üst kenarına basar.
  const pos = pts.map((p) => `${r3(p.x - 4)} ${r3(p.y + C / 2 - 1)}`);
  const values = [...pos, pos.at(-1), pos[0]].join(";");
  const keyTimes = [...tk, 0.985, 1].join(";");

  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t.alt}">`);
  o.push(`<title>${t.alt}</title>`);
  o.push(`<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="14" fill="${th.card}" stroke="${th.edge}" stroke-width="1.5"/>`);
  o.push(`<text x="${GX}" y="26" font-family="${MONO}" font-size="11" letter-spacing="2.2" fill="${th.faint}">${t.title}</text>`);

  // Izgara: katkısı olan kare kedi uğrayınca kalkar, döngü sonunda geri gelir.
  let k = 0;
  weeks.forEach((wk, wi) => {
    for (const d of wk) {
      const x = GX + wi * S, y = GY + d.weekday * S;
      o.push(`<rect x="${x}" y="${y}" width="${C}" height="${C}" rx="3" fill="${th.lv[0]}"/>`);
      if (d.level > 0) {
        const s = stops.findIndex((p) => p.wi === wi && p.wd === d.weekday);
        const at = tk[s + 1];
        o.push(`<rect x="${x}" y="${y}" width="${C}" height="${C}" rx="3" fill="${th.lv[Math.min(4, d.level)]}">
  <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;${at};${r5(Math.min(at + 0.004, 0.97))};0.985;1" dur="${DUR}s" repeatCount="indefinite"/></rect>`);
        k++;
      }
    }
  });

  // Sepet: kedi topladıkça dolar.
  const by = GY + 3 * S + 4, bw = 64, bh = 40;
  o.push(`<g transform="translate(${BX} ${by})">
    <path d="M6 0 C6 -26 ${bw - 6} -26 ${bw - 6} 0" fill="none" stroke="${th.basketDark}" stroke-width="3" stroke-linecap="round"/>
    <clipPath id="sepet-ic"><path d="M0 0 L${bw} 0 L${bw - 7} ${bh} L7 ${bh} Z"/></clipPath>
    <path d="M0 0 L${bw} 0 L${bw - 7} ${bh} L7 ${bh} Z" fill="${th.basketIn}"/>
    <g clip-path="url(#sepet-ic)">
      <rect x="0" y="${bh}" width="${bw}" height="${bh}" fill="${th.lv[3]}">
        <animate attributeName="y" values="${bh};${bh};${r3(bh * 0.25)};${r3(bh * 0.25)};${bh}" keyTimes="0;${tk[1] ?? 0};${WALK};0.985;1" dur="${DUR}s" repeatCount="indefinite"/>
      </rect>
    </g>
    <path d="M0 0 L${bw} 0 L${bw - 7} ${bh} L7 ${bh} Z" fill="none" stroke="${th.basketDark}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M3 10 H${bw - 3} M5 20 H${bw - 5} M6 30 H${bw - 6}" stroke="${th.basket}" stroke-width="2"/>
    <text x="${bw / 2}" y="${bh + 18}" font-family="${MONO}" font-size="10.5" fill="${th.faint}" text-anchor="middle">${t.note(total.toLocaleString("en-US").replace(/,/g, lang === "tr" ? "." : ","))}</text>
  </g>`);

  // Kedi
  o.push(`<g><animateTransform attributeName="transform" type="translate" values="${values}" keyTimes="${keyTimes}" dur="${DUR}s" calcMode="linear" repeatCount="indefinite"/>${catSprite(th)}</g>`);
  o.push("</svg>");
  return o.join("\n");
}
