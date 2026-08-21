#!/usr/bin/env node
/**
 * GitHub katkı takvimini profilin lila/toz pembe diline uygun SVG'ler olarak üretir.
 *
 * Veri kaynağı: https://github.com/users/<login>/contributions — GitHub'ın profil
 * sayfasında kullandığı genel uç nokta. Token istemez ve tam olarak bir
 * ziyaretçinin gördüğü sayıları verir.
 *
 * Bağımlılığı yok; Node 18+ yeterli. Hem yerelde hem Actions içinde aynı script:
 *     node tools/gen-contrib.mjs
 *
 * Üç panel, iki dilde yazılır:
 *     assets/contrib-{en,tr}.svg    katkı takvimi + seriler
 *     assets/iso-{en,tr}.svg        günlük yoğunluğun 2.5B görünümü
 *     assets/landscape-{en,tr}.svg  katkılardan türetilmiş kayan manzara
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const USER = "AysenurYldz";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MONO = "'JetBrains Mono','SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Beyaz kart, toz pembe ana renk. Rampa açıktan koyuya gider ki yoğunluk
// sıralı bir ölçek olarak okunsun — beyaz zeminde ters yön işe yaramaz.
const P = {
  card: "#FFFFFF", edge: "#EFE2E8", ink: "#2E2430", faint: "#9C8C96",
  accent: "#C97B94", sheen: "#2E2430", sheenA: 0.035, rim: "#F7EBF0", rimA: 1,
  lv: ["#F5EDF1", "#EBC9D8", "#DDA3BC", "#C97B94", "#A85A76"],
};

const L = {
  en: {
    cal: "CONTRIBUTION CALENDAR", dens: "DENSITY", bar: "one bar per day",
    less: "less", more: "more", day: "d", sep: ",",
    statsCal: ["in the last year", "longest streak", "current streak", "active days"],
    statsIso: ["busiest day", "avg / active day", "weekend share", "busiest month"],
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    wd: [[1, "Mon"], [3, "Wed"], [5, "Fri"]],
    altCal: (t, l, n) => `${t} contributions in the last year, longest streak ${l} days, current streak ${n} days`,
    altIso: "Three-dimensional view of daily contribution density",
    altLs: "Landscape derived from contribution density",
  },
  tr: {
    cal: "KATKI TAKVİMİ", dens: "YOĞUNLUK", bar: "her çubuk bir gün",
    less: "az", more: "çok", day: "gün", sep: ".",
    statsCal: ["son 1 yıl", "en uzun seri", "güncel seri", "aktif gün"],
    statsIso: ["en yoğun gün", "aktif gün ort.", "hafta sonu payı", "en yoğun ay"],
    months: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
    wd: [[1, "Pzt"], [3, "Çar"], [5, "Cum"]],
    altCal: (t, l, n) => `Son bir yılda ${t} katkı, en uzun seri ${l} gün, güncel seri ${n} gün`,
    altIso: "Günlük katkı yoğunluğunun üç boyutlu görünümü",
    altLs: "Katkı yoğunluğundan türetilmiş manzara",
  },
};

const attr = (tag, name) => (tag.match(new RegExp(`${name}="([^"]*)"`)) || [])[1];

async function fetchCalendar() {
  const res = await fetch(`https://github.com/users/${USER}/contributions`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`katkı takvimi alınamadı: HTTP ${res.status}`);
  const html = await res.text();

  const counts = new Map();
  const tip = /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/g;
  for (const [, id, text] of html.matchAll(tip)) {
    const m = text.match(/([\d,]+)\s+contribution/);
    counts.set(id, m ? Number(m[1].replace(/,/g, "")) : 0);
  }

  const cols = new Map();
  const td = /<td\b[^>]*class="[^"]*ContributionCalendar-day[^"]*"[^>]*>/g;
  for (const [tag] of html.matchAll(td)) {
    const date = attr(tag, "data-date");
    if (!date) continue;
    const id = attr(tag, "id") || "";
    const m = id.match(/^contribution-day-component-(\d+)-(\d+)$/);
    const weekday = m ? Number(m[1]) : 0;
    const week = m ? Number(m[2]) : cols.size;
    if (!cols.has(week)) cols.set(week, []);
    cols.get(week).push({
      date,
      weekday,
      count: counts.get(id) ?? 0,
      level: Number(attr(tag, "data-level") || 0),
    });
  }

  if (cols.size === 0) {
    throw new Error("katkı takvimi ayrıştırılamadı — GitHub biçimi değişmiş olabilir");
  }

  const weeks = [...cols.keys()].sort((a, b) => a - b).map((k) => cols.get(k));
  const total = weeks.flat().reduce((s, d) => s + d.count, 0);
  return { weeks, total };
}

/** en uzun ve güncel seri (bugün henüz boşsa dünden geriye bakar) */
function streaks(days) {
  let longest = 0, run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }
  const tail = days.length && days.at(-1).count === 0 ? days.slice(0, -1) : days;
  let now = 0;
  for (let i = tail.length - 1; i >= 0 && tail[i].count > 0; i--) now++;
  return { longest, now };
}

/** iki hex rengi t oranında karıştırır (t=0 -> a, t=1 -> b) */
function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ca, cb] = [p(a), p(b)];
  const hex = (n) => Math.round(n).toString(16).toUpperCase().padStart(2, "0");
  return "#" + ca.map((v, i) => hex(v + (cb[i] - v) * t)).join("");
}

const num = (n, sep) => n.toLocaleString("en-US").replace(/,/g, sep);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** cam süpürmesi için klip + eğimli parlaklık gradyanı */
const defs = (uid, w, h) =>
  `<clipPath id="cp${uid}"><rect width="${w}" height="${h}" rx="10"/></clipPath>` +
  `<linearGradient id="sw${uid}" x1="0" y1="0" x2="1" y2="0">` +
  `<stop offset="0%" stop-color="${P.sheen}" stop-opacity="0"/>` +
  `<stop offset="45%" stop-color="${P.sheen}" stop-opacity="${P.sheenA}"/>` +
  `<stop offset="55%" stop-color="${P.sheen}" stop-opacity="${P.sheenA}"/>` +
  `<stop offset="100%" stop-color="${P.sheen}" stop-opacity="0"/></linearGradient>`;

/** karttan yavaşça geçen eğik ışık bandı */
const sweep = (uid, w, h, dur) =>
  `<g clip-path="url(#cp${uid})"><rect x="-420" y="-${h}" width="300" height="${h * 3}" ` +
  `fill="url(#sw${uid})" transform="skewX(-16)">` +
  `<animate attributeName="x" values="-420;-420;${w + 260};${w + 260}" ` +
  `keyTimes="0;0.25;0.72;1" dur="${dur}s" repeatCount="indefinite"/></rect></g>`;

const frame = (w, h) => [
  `<rect width="${w}" height="${h}" rx="10" fill="${P.card}"/>`,
  `<path d="M11,1.4 H${w - 11}" stroke="${P.rim}" stroke-opacity="${P.rimA}" stroke-width="1.4" fill="none"/>`,
];

const border = (w, h) =>
  `<rect x="0.7" y="0.7" width="${w - 1.4}" height="${h - 1.4}" rx="10" fill="none" ` +
  `stroke="${P.edge}" stroke-width="1.4"/>`;

const svg = (w, h, label, body, uid, extraDefs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ` +
  `role="img" aria-label="${esc(label)}">` +
  `<defs>${defs(uid, w, h)}${extraDefs}</defs>${body.join("")}</svg>\n`;

/** Panellerin ortak üst şeridi: dört büyük sayı + altlarında küçük etiket.
 *  rhythm panelindeki dille birebir aynı — dört panel yan yana tek bir set gibi
 *  okunsun diye tipografi, sütun konumları ve renk sırası paylaşılıyor. */
const STAT_COL = ["#A85A76", "#2E2430", "#9B72C4", "#5B93C4"];
const STAT_X = [26, 268, 510, 736];

function statRow(vals, labels, W) {
  const o = [];
  vals.forEach((v, i) => {
    o.push(`<text x="${STAT_X[i]}" y="70" font-family="${MONO}" font-size="30" font-weight="700" fill="${STAT_COL[i]}">${v}</text>`);
    o.push(`<text x="${STAT_X[i] + 2}" y="88" font-family="${MONO}" font-size="9.5" letter-spacing="1.1" fill="${P.faint}">${labels[i]}</text>`);
  });
  o.push(`<line x1="24" y1="104" x2="${W - 24}" y2="104" stroke="${P.edge}"/>`);
  return o;
}

// yılın hızlandırılmış tekrarı: hücreler tarih sırasıyla parlar, sonra tam kalır
const REPLAY = 9.0, HOLD = 7.0, CYC = 17.0;
const r5 = (n) => Number(n.toFixed(5));

/** hafta wi için dalga animasyonu — tüm haftayı tek <g> ile sürer */
function wave(wi, n) {
  const lit = r5((REPLAY * (wi / Math.max(1, n - 1))) / CYC);
  const dim = r5((REPLAY + HOLD) / CYC);
  const end = r5((REPLAY + HOLD + 0.6) / CYC);
  return `<animate attributeName="opacity" values="0.5;0.5;1;1;0.5;0.5" ` +
    `keyTimes="0;${Math.max(0, r5(lit - 0.004))};${lit};${dim};${end};1" ` +
    `dur="${CYC}s" repeatCount="indefinite"/>`;
}

function buildCalendar(t, weeks, total, longest, now, days) {
  const W = 1000, H = 262, CELL = 11, PITCH = 13, GX = 78, GY = 134;
  const n = weeks.length;
  const o = frame(W, H);
  o.push(`<text x="24" y="28" font-family="${MONO}" font-size="9.5" letter-spacing="2" fill="${P.faint}">${t.cal}</text>`);

  const active = days.filter((d) => d.count > 0).length;
  o.push(...statRow(
    [num(total, t.sep), `${longest} ${t.day}`, `${now} ${t.day}`, num(active, t.sep)],
    t.statsCal, W));

  const seen = new Set();
  weeks.forEach((wk, wi) => {
    const d0 = wk[0].date, m = Number(d0.slice(5, 7));
    if (!seen.has(m) && Number(d0.slice(8, 10)) <= 7) {
      seen.add(m);
      o.push(`<text x="${GX + wi * PITCH}" y="${GY - 8}" font-family="${MONO}" font-size="9" fill="${P.faint}">${t.months[m - 1]}</text>`);
    }
  });

  for (const [wd, lab] of t.wd) {
    o.push(`<text x="${GX - 8}" y="${GY + wd * PITCH + 9}" text-anchor="end" font-family="${MONO}" font-size="8.5" fill="${P.faint}">${lab}</text>`);
  }

  weeks.forEach((wk, wi) => {
    o.push(`<g opacity="0.5">${wave(wi, n)}`);
    for (const d of wk) {
      const lv = Math.min(4, Math.max(0, d.level));
      o.push(`<rect x="${GX + wi * PITCH}" y="${GY + d.weekday * PITCH}" width="${CELL}" height="${CELL}" rx="2.5" ` +
        `fill="${P.lv[lv]}"><title>${d.date}: ${d.count}</title></rect>`);
    }
    o.push("</g>");
  });

  // oynatma başlığı — dalgayla birlikte soldan sağa süpürür
  const endX = GX + (n - 1) * PITCH;
  o.push(`<rect x="${GX}" y="${GY - 3}" width="2.5" height="${7 * PITCH - 2}" rx="1.25" fill="${P.accent}" opacity="0">` +
    `<animate attributeName="x" values="${GX};${GX};${endX};${endX}" keyTimes="0;0.001;${r5(REPLAY / CYC)};1" dur="${CYC}s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0;0.9;0.9;0;0" keyTimes="0;0.01;${r5(REPLAY / CYC)};${r5((REPLAY + 0.4) / CYC)};1" dur="${CYC}s" repeatCount="indefinite"/></rect>`);

  const ly = GY + 7 * PITCH + 18;
  o.push(`<text x="${GX}" y="${ly}" font-family="${MONO}" font-size="8.5" fill="${P.faint}">${t.less}</text>`);
  P.lv.forEach((c, i) => o.push(`<rect x="${GX + 30 + i * 14}" y="${ly - 8}" width="10" height="10" rx="2" fill="${c}"/>`));
  o.push(`<text x="${GX + 30 + P.lv.length * 14 + 6}" y="${ly}" font-family="${MONO}" font-size="8.5" fill="${P.faint}">${t.more}</text>`);

  o.push(sweep("ct", W, H, 25), border(W, H));
  return svg(W, H, t.altCal(num(total, t.sep), longest, now), o, "ct");
}

/** Oblik (2.5B) takvim: her günün yüksekliği o günkü katkı yoğunluğu */
function buildIso(t, weeks, days) {
  const W = 1000, H = 262, PX = 17, SK = 5.2, PY = 11.6, TW = 15.0, OX = 52, OY = 152;
  const RISE = [0, 6, 12, 19, 27];
  const n = weeks.length;
  const f = (v) => v.toFixed(1);
  const o = frame(W, H);
  o.push(`<text x="24" y="28" font-family="${MONO}" font-size="9.5" letter-spacing="2" fill="${P.faint}">${t.dens}</text>`);
  o.push(`<text x="${W - 24}" y="28" text-anchor="end" font-family="${MONO}" font-size="9.5" letter-spacing="1.2" fill="${P.faint}">${t.bar}</text>`);

  // Aynı veriden, takvim panelininkilerle çakışmayan dört ölçü.
  const total = days.reduce((s, d) => s + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;
  const busiest = Math.max(0, ...days.map((d) => d.count));
  const avg = activeDays ? (total / activeDays).toFixed(1) : "0";
  // GitHub takviminde 0 = Pazar, 6 = Cumartesi
  const weekend = days.reduce((s, d) => (d.weekday === 0 || d.weekday === 6 ? s + d.count : s), 0);
  const weekendPct = total ? Math.round((weekend / total) * 100) : 0;
  const byMonth = new Map();
  for (const d of days) {
    const m = Number(d.date.slice(5, 7));
    byMonth.set(m, (byMonth.get(m) || 0) + d.count);
  }
  let topMonth = 1, topVal = -1;
  for (const [m, v] of byMonth) if (v > topVal) { topVal = v; topMonth = m; }

  o.push(...statRow(
    [num(busiest, t.sep), String(avg).replace(".", t.sep === "." ? "," : "."), `%${weekendPct}`, t.months[topMonth - 1]],
    t.statsIso, W));

  weeks.forEach((wk, wi) => {
    o.push(`<g opacity="0.5">${wave(wi, n)}`);
    for (const d of wk) {
      const r = d.weekday, lv = Math.min(4, Math.max(0, d.level)), h = RISE[lv];
      const bx = OX + wi * PX - r * SK, by = OY + r * PY;
      const top = P.lv[lv];
      if (h) {
        o.push(`<path d="M${f(bx - SK)},${f(by + PY - h)} L${f(bx - SK + TW)},${f(by + PY - h)} ` +
          `L${f(bx - SK + TW)},${f(by + PY)} L${f(bx - SK)},${f(by + PY)} Z" fill="${mix(top, P.card, 0.42)}"/>`);
        o.push(`<path d="M${f(bx + TW)},${f(by - h)} L${f(bx - SK + TW)},${f(by + PY - h)} ` +
          `L${f(bx - SK + TW)},${f(by + PY)} L${f(bx + TW)},${f(by)} Z" fill="${mix(top, P.card, 0.24)}"/>`);
      }
      o.push(`<path d="M${f(bx)},${f(by - h)} L${f(bx + TW)},${f(by - h)} ` +
        `L${f(bx - SK + TW)},${f(by + PY - h)} L${f(bx - SK)},${f(by + PY - h)} Z" fill="${top}">` +
        `<title>${d.date}: ${d.count}</title></path>`);
    }
    o.push("</g>");
  });

  o.push(sweep("iso", W, H, 21), border(W, H));
  return svg(W, H, t.altIso, o, "iso");
}

/** Katkıları arazi yüksekliği gibi okuyup katmanlı, kayan bir manzara çizer */
function buildLandscape(t, days) {
  const W = 1000, H = 150, BASE = H - 12;
  const counts = days.map((d) => d.count);
  const srt = [...counts].sort((a, b) => a - b);
  const cap = Math.max(1, srt[Math.floor(srt.length * 0.96)] || 1);

  const smooth = (k) => counts.map((_, i) => {
    const lo = Math.max(0, i - k), hi = Math.min(counts.length, i + k + 1);
    return counts.slice(lo, hi).reduce((a, b) => a + b, 0) / (hi - lo);
  });

  const layer = (vals, amp) => {
    const m = Math.max(...vals) || 1;
    return vals.map((v, i) => [
      i * (W / (vals.length - 1)),
      BASE - (0.07 + 0.93 * Math.min(1, v / Math.max(m, cap * 0.5))) * amp,
    ]);
  };

  const path = (pts, dx = 0) => {
    let d = `M${(pts[0][0] + dx).toFixed(1)},${BASE.toFixed(1)} L${(pts[0][0] + dx).toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (const [x, y] of pts.slice(1)) d += ` L${(x + dx).toFixed(1)},${y.toFixed(1)}`;
    return d + ` L${(pts.at(-1)[0] + dx).toFixed(1)},${BASE.toFixed(1)} Z`;
  };

  const o = frame(W, H);
  // uzaktan yakına üç katman; her biri farklı hızda kayar, derinlik bundan doğuyor
  const specs = [
    [smooth(12), 100, 0.30, 96, P.lv[2]],
    [smooth(6), 78, 0.48, 74, P.lv[3]],
    [smooth(2), 58, 0.90, 56, P.lv[4]],
  ];
  for (const [vals, amp, op, dur, col] of specs) {
    const pts = layer(vals, amp);
    o.push(`<g clip-path="url(#cpls)" fill="${mix(col, P.card, 0.35)}" opacity="${op}">` +
      `<g><animateTransform attributeName="transform" type="translate" values="0 0;-${W} 0" ` +
      `dur="${dur}s" repeatCount="indefinite"/>` +
      `<path d="${path(pts)}"/><path d="${path(pts, W)}"/></g></g>`);
  }
  o.push(`<line x1="0" y1="${BASE}" x2="${W}" y2="${BASE}" stroke="${P.edge}"/>`);
  o.push(`<text x="26" y="28" font-family="${MONO}" font-size="11.5" letter-spacing="2.2" fill="${P.faint}">github.com/${USER}</text>`);
  o.push(sweep("ls", W, H, 27), border(W, H));

  return svg(W, H, t.altLs, o, "ls", `<clipPath id="cpls"><rect width="${W}" height="${H}" rx="10"/></clipPath>`);
}

const { weeks, total } = await fetchCalendar();
const days = weeks.flat().sort((a, b) => a.date.localeCompare(b.date));
const { longest, now } = streaks(days);

const out = join(ROOT, "assets");
await mkdir(out, { recursive: true });
for (const [lang, t] of Object.entries(L)) {
  await writeFile(join(out, `contrib-${lang}.svg`), buildCalendar(t, weeks, total, longest, now, days), "utf8");
  await writeFile(join(out, `iso-${lang}.svg`), buildIso(t, weeks, days), "utf8");
  await writeFile(join(out, `landscape-${lang}.svg`), buildLandscape(t, days), "utf8");
}

console.log(`yazıldı: toplam=${total} en_uzun=${longest} güncel=${now} hafta=${weeks.length}`);
