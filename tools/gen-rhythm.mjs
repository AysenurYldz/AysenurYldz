#!/usr/bin/env node
/**
 * Çalışma ritmi paneli: toplam commit, saat ve haftanın günü dağılımı.
 *
 * Veri kaynağı YEREL git depolarıdır — GitHub'a hiç gitmemiş işler dahil.
 * Bu yüzden CI'da koşmaz; elle yenilenir:
 *     node tools/gen-rhythm.mjs
 *
 * Sonuç: assets/rhythm-{en,tr}.svg  (ölçüm tarihi panelin altına yazılır)
 *
 * ÖNEMLİ — ME listesi: iş depoları paylaşılan makine hesaplarıyla kullanılmış,
 * aynı e-posta birden fazla kişinin adıyla commit atmış. Bu yüzden eşleştirme
 * ad + e-posta çifti üzerinden yapılır; yalnız e-postaya bakmak başkalarının
 * işini buraya yazar. Yeni bir kimlik eklemeden önce şununla doğrula:
 *     git log --all --pretty='%an|%ae' | sort | uniq -c | sort -rn
 */
import { mkdir, writeFile } from "node:fs/promises";
import { readdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Taranacak kökler ve tarama derinliği.
const SCAN = [join(homedir(), "Desktop")];
const DEPTH = 4;
// Kendi araç depolarımızı sayma.
const SKIP = ["AysenurYldz-profile", "node_modules", ".git"];

// Ayşenur'un üzerinde çalıştığı projeler. `birsavcom` ortak makine hesabı olduğu
// için o kimliğin commit'leri YALNIZCA bu depolarda sayılır; başka depolardaki
// birsavcom commit'leri meslektaşlarına ait. Depo adı veya remote URL'i eşleşir.
const MINE = [
  /belediyespor/i,
  /kollektif/i,
  /biryap[iı]/i,
  /birsuit/i,
  /(^|[-_/])ik([-_]|$)|insan[-_]?kaynak|(^|[-_/])hr([-_]|$)/i,
];

// Sayılacak kimlikler. `repos` verilirse o kimlik sadece eşleşen depolarda sayılır;
// verilmezse tüm depolarda sayılır. name "*" ise o e-postanın tamamı sayılır.
const ME = [
  // Kişisel GitHub kimliği — bu noreply adresi yalnızca Ayşenur'a ait,
  // hangi ada yazılmış olursa olsun sayılır (iş depolarına kendi hesabıyla
  // push ettiği commit'ler burada çıkıyor).
  { name: "*", email: "94763983+AysenurYldz@users.noreply.github.com" },
  { name: "*", email: "aysenur.yildiz.2905@gmail.com" },

  { name: "birsavaysenur", email: "birsavunmasanayi07@gmail.com" },
  { name: "Birsav", email: "brsvbilisim@gmail.com" },
  { name: "birsavcom", email: "birsavunmasanayi07@gmail.com", repos: MINE },
  { name: "birsavcom", email: "birsavunmasanayi@gmail.com", repos: MINE },
];

const MONO = "'JetBrains Mono','SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";
const P = {
  card: "#0A0918", edge: "#242352", ink: "#EDEBFA", faint: "#6E6A9B",
  track: "#1B1840", accent: "#7C5CFF", blue: "#3D8BFF", cyan: "#4CC9F0",
  sheen: "#FFFFFF", sheenA: 0.075, rim: "#8B7FE8", rimA: 0.16,
};

const L = {
  en: {
    title: "WORK RHYTHM", hours: "HOUR OF DAY", days: "DAY OF WEEK",
    stats: ["commits", "repositories", "peak hour", "between 22:00–05:00"],
    wd: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    foot: (d) => `local git history — includes work that never reached GitHub · measured ${d}`,
    sep: ",", alt: (n) => `Working rhythm across ${n} local commits`,
  },
  tr: {
    title: "ÇALIŞMA RİTMİ", hours: "GÜNÜN SAATİ", days: "HAFTANIN GÜNÜ",
    stats: ["commit", "depo", "zirve saat", "22:00–05:00 arası"],
    wd: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"],
    foot: (d) => `yerel git geçmişi — GitHub'a hiç gitmemiş işler dahil · ölçüm ${d}`,
    sep: ".", alt: (n) => `${n} yerel commit üzerinden çalışma ritmi`,
  },
};

async function findRepos(root, depth) {
  const out = [];
  async function walk(dir, left) {
    if (left < 0) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.isDirectory() && e.name === ".git")) out.push(dir);
    for (const e of entries) {
      if (!e.isDirectory() || SKIP.includes(e.name) || e.name.startsWith(".")) continue;
      await walk(join(dir, e.name), left - 1);
    }
  }
  try {
    await stat(root);
  } catch {
    return out;
  }
  await walk(root, depth);
  return out;
}

async function scan() {
  const hours = new Array(24).fill(0);
  const wdays = new Array(7).fill(0);
  const seen = new Set();
  let commits = 0, repos = 0;

  const roots = [];
  for (const r of SCAN) roots.push(...(await findRepos(r, DEPTH)));

  for (const dir of roots) {
    let stdout = "";
    try {
      ({ stdout } = await run("git", [
        "-C", dir, "log", "--all", "--pretty=%H|%an|%ae|%ad", "--date=format:%H|%u",
      ], { maxBuffer: 256 * 1024 * 1024 }));
    } catch {
      continue;
    }
    // Depo kimliği: KLASÖRÜN KENDİ ADI + remote URL. Tam yolu kullanmak yanlış
    // eşleşme üretir — belediyespor/ klasörünün içinde duran biryerden-api,
    // yol "belediyespor" içerdiği için sahiplenilmiş görünüyordu.
    let remote = "";
    try {
      ({ stdout: remote } = await run("git", ["-C", dir, "remote", "get-url", "origin"]));
    } catch { /* remote'suz depo olabilir */ }
    const tag = `${basename(dir)} ${remote.trim()}`;

    let hit = 0;
    for (const line of stdout.split("\n")) {
      const parts = line.split("|");
      if (parts.length !== 5) continue;
      const [sha, name, email, h, d] = parts;
      const mine = ME.some((m) =>
        m.email === email &&
        (m.name === "*" || m.name === name) &&
        (!m.repos || m.repos.some((re) => re.test(tag))));
      if (!mine) continue;
      // aynı commit birden fazla depoda (fork/klon) görünebilir — bir kez say
      if (seen.has(sha)) continue;
      seen.add(sha);
      const hi = Number(h), di = Number(d);
      if (!Number.isInteger(hi) || !Number.isInteger(di)) continue;
      hours[hi]++; wdays[di - 1]++; commits++; hit++;
    }
    if (hit) { repos++; console.log(`  ${basename(dir).padEnd(28)} ${hit}`); }
  }

  if (!commits) {
    console.error("commit bulunamadı — ME listesindeki ad/e-posta çiftlerini kontrol et.");
    console.error("  git log --all --pretty='%an|%ae' | sort | uniq -c | sort -rn");
    process.exit(1);
  }
  return { hours, wdays, commits, repos };
}

const num = (n, sep) => n.toLocaleString("en-US").replace(/,/g, sep);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// 17s döngü: çubuklar sırayla yükselir, uzun süre durur, sonunda iner
const CYC = 17, GROW = 0.9, RISE_SPAN = 3.6, HOLD_END = 14, DOWN_END = 15;
const r5 = (n) => Number(n.toFixed(5));

function barAnim(i, n) {
  const t0 = 0.5 + RISE_SPAN * (i / Math.max(1, n - 1));
  return `<animateTransform attributeName="transform" type="scale" ` +
    `values="1 0;1 0;1 1;1 1;1 0;1 0" ` +
    `keyTimes="0;${r5(t0 / CYC)};${r5((t0 + GROW) / CYC)};${r5(HOLD_END / CYC)};${r5(DOWN_END / CYC)};1" ` +
    `dur="${CYC}s" calcMode="spline" ` +
    `keySplines=".4 0 .6 1;.2 .8 .3 1;0 0 1 1;.4 0 .6 1;0 0 1 1" repeatCount="indefinite"/>`;
}

function build(t, { hours, wdays, commits, repos }, stamp) {
  const W = 1000, H = 244;
  const peak = hours.indexOf(Math.max(...hours));
  const night = hours.reduce((s, v, h) => (h >= 22 || h < 5 ? s + v : s), 0);
  const nightPct = Math.round((night / commits) * 100);

  const o = [
    `<rect width="${W}" height="${H}" rx="10" fill="${P.card}"/>`,
    `<path d="M11,1.4 H${W - 11}" stroke="${P.rim}" stroke-opacity="${P.rimA}" stroke-width="1.4" fill="none"/>`,
    `<text x="24" y="28" font-family="${MONO}" font-size="9.5" letter-spacing="2" fill="${P.faint}">${t.title}</text>`,
  ];

  // üst şerit: dört sayı
  const vals = [
    num(commits, t.sep),
    num(repos, t.sep),
    `${String(peak).padStart(2, "0")}:00`,
    `%${nightPct}`,
  ];
  const cols = [26, 268, 510, 736];
  vals.forEach((v, i) => {
    const col = [P.accent, P.ink, P.blue, P.cyan][i];
    o.push(`<text x="${cols[i]}" y="70" font-family="${MONO}" font-size="30" font-weight="700" fill="${col}">${v}</text>`);
    o.push(`<text x="${cols[i] + 2}" y="88" font-family="${MONO}" font-size="9.5" letter-spacing="1.1" fill="${P.faint}">${t.stats[i]}</text>`);
  });
  o.push(`<line x1="24" y1="104" x2="${W - 24}" y2="104" stroke="${P.edge}"/>`);

  const BASE = 208, MAXH = 78;

  const chart = (x0, x1, labels, data, title, everyOther) => {
    o.push(`<text x="${x0}" y="128" font-family="${MONO}" font-size="9.5" letter-spacing="2" fill="${P.faint}">${title}</text>`);
    const n = data.length;
    const mx = Math.max(...data) || 1;
    const span = (x1 - x0) / n;
    const bw = span * 0.62;
    const top = data.indexOf(mx);
    data.forEach((v, i) => {
      const h = Math.max(2, (v / mx) * MAXH);
      const bx = x0 + i * span + (span - bw) / 2;
      o.push(`<rect x="${bx.toFixed(1)}" y="${BASE - MAXH}" width="${bw.toFixed(1)}" height="${MAXH}" rx="2" fill="${P.track}" opacity="0.5"/>`);
      o.push(`<g transform="translate(${bx.toFixed(1)},${BASE})"><g>${barAnim(i, n)}` +
        `<rect x="0" y="${(-h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" ` +
        `fill="${i === top ? P.accent : P.blue}" opacity="${i === top ? 1 : 0.55}">` +
        `<title>${labels[i]}: ${v}</title></rect></g></g>`);
      if (!everyOther || i % everyOther === 0) {
        o.push(`<text x="${(bx + bw / 2).toFixed(1)}" y="${BASE + 15}" text-anchor="middle" ` +
          `font-family="${MONO}" font-size="8" fill="${P.faint}">${labels[i]}</text>`);
      }
    });
    o.push(`<line x1="${x0}" y1="${BASE}" x2="${x1}" y2="${BASE}" stroke="${P.edge}"/>`);
  };

  chart(26, 560, hours.map((_, i) => String(i).padStart(2, "0")), hours, t.hours, 3);
  chart(612, 974, t.wd, wdays, t.days, 0);

  o.push(`<text x="24" y="${H - 10}" font-family="${MONO}" font-size="8.5" letter-spacing="0.6" fill="${P.faint}">${esc(t.foot(stamp))}</text>`);

  // cam süpürmesi
  o.push(`<g clip-path="url(#cprh)"><rect x="-420" y="-${H}" width="300" height="${H * 3}" ` +
    `fill="url(#swrh)" transform="skewX(-16)">` +
    `<animate attributeName="x" values="-420;-420;${W + 260};${W + 260}" keyTimes="0;0.25;0.72;1" dur="23s" repeatCount="indefinite"/></rect></g>`);
  o.push(`<rect x="0.7" y="0.7" width="${W - 1.4}" height="${H - 1.4}" rx="10" fill="none" stroke="${P.edge}" stroke-width="1.4"/>`);

  const defs =
    `<clipPath id="cprh"><rect width="${W}" height="${H}" rx="10"/></clipPath>` +
    `<linearGradient id="swrh" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0%" stop-color="${P.sheen}" stop-opacity="0"/>` +
    `<stop offset="45%" stop-color="${P.sheen}" stop-opacity="${P.sheenA}"/>` +
    `<stop offset="55%" stop-color="${P.sheen}" stop-opacity="${P.sheenA}"/>` +
    `<stop offset="100%" stop-color="${P.sheen}" stop-opacity="0"/></linearGradient>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ` +
    `role="img" aria-label="${esc(t.alt(num(commits, t.sep)))}">` +
    `<defs>${defs}</defs>${o.join("")}</svg>\n`;
}

console.log("taranıyor…");
const data = await scan();
const d = new Date();
const pad = (n) => String(n).padStart(2, "0");

const out = join(ROOT, "assets");
await mkdir(out, { recursive: true });
for (const [lang, t] of Object.entries(L)) {
  const stamp = lang === "tr"
    ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
    : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  await writeFile(join(out, `rhythm-${lang}.svg`), build(t, data, stamp), "utf8");
}

console.log(`yazıldı: commit=${data.commits} depo=${data.repos}`);
