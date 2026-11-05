#!/usr/bin/env node
/**
 * Veri paneli: diller, son bir yılda eklenen/silinen satır, commit, çalışma saati
 * ve haftanın günü — tek panelde, açık ve koyu temada, iki dilde.
 *
 * Veri kaynağı YEREL git depolarıdır — GitHub'a hiç gitmemiş iş depoları dahil.
 * Bu yüzden CI'da koşmaz; elle yenilenir:
 *     node tools/gen-data.mjs
 *
 * Sonuç: assets/data-{tr,en}-{light,dark}.svg  (ölçüm tarihi panelin altında)
 *
 * ÖNEMLİ — ME listesi: iş depoları paylaşılan makine hesaplarıyla kullanılmış,
 * aynı e-posta birden fazla kişinin adıyla commit atmış. Eşleştirme ad + e-posta
 * çifti üzerinden yapılır; yalnız e-postaya bakmak başkalarının işini buraya
 * yazar. Yeni bir kimlik eklemeden önce şununla doğrula:
 *     git log --all --pretty='%an|%ae' | sort | uniq -c | sort -rn
 */
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Projeler 13.10.2026'da Masaüstü'nden projelerim'e taşındı; ikisi de taranır.
const SCAN = [join(homedir(), "projelerim"), join(homedir(), "Desktop")];
const DEPTH = 4;
// Kendi profil depolarımızı ve bağımlılık klasörlerini sayma.
const SKIP = ["github-profil", "AysenurYldz-profile", "node_modules", ".git"];

// `birsavcom` ortak makine hesabı: o kimliğin commit'leri YALNIZCA bu depolarda sayılır.
const MINE = [
  /belediyespor/i,
  /kollektif/i,
  /biryap[iı]/i,
  /birstok/i,
  /(^|[-_/])ik([-_]|$)|insan[-_]?kaynak|(^|[-_/])hr([-_]|$)/i,
];

// Baştan sona Ayşenur'un yazdığı depolar: yazara bakılmaz (2026-08-21 teyidi).
const OURS = [
  /birstok-(frontend|backend|mobile)/i,
  /insan-kaynaklari/i,
  /gursubelediyespor-web/i,
];

const BOTS = /\[bot\]|dependabot|github-actions|noreply@anthropic\.com|codex@local/i;

const ME = [
  { name: "*", email: "94763983+AysenurYldz@users.noreply.github.com" },
  { name: "*", email: "aysenur.yildiz.2905@gmail.com" },
  { name: "birsavaysenur", email: "birsavunmasanayi07@gmail.com" },
  { name: "Birsav", email: "brsvbilisim@gmail.com" },
  { name: "birsavcom", email: "birsavunmasanayi07@gmail.com", repos: MINE },
  { name: "birsavcom", email: "birsavunmasanayi@gmail.com", repos: MINE },
];

// Dil eşlemesi — yalnız programlama/işaretleme dilleri; belge ve veri sayılmaz.
const LANG = {
  ".py": "Python", ".ipynb": "Python",
  ".ts": "TypeScript", ".tsx": "TypeScript",
  ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript",
  ".dart": "Dart",
  ".sql": "SQL",
  ".html": "HTML", ".css": "CSS", ".scss": "CSS",
  ".sh": "Shell", ".ps1": "Shell",
  ".cpp": "C++", ".cc": "C++", ".h": "C++", ".hpp": "C++", ".c": "C++",
  ".kt": "Kotlin", ".swift": "Swift", ".php": "PHP",
};
// Üretilmiş ya da kopyalanmış dosyalar satır sayısına girmez.
const NOISE = /(^|\/)(node_modules|dist|build|\.next|out|coverage|vendor|venv|\.venv|__pycache__|migrations\/_?dump|generated)\/|package-lock\.json|yarn\.lock|pnpm-lock|\.min\.(js|css)$|\.lock$/i;
// Tek commit'te bundan büyük ekleme (toplu içe aktarma, kopyalanmış kütüphane) sayılmaz.
const FILE_CAP = 5000;

const COLORS = {
  Python: "#3572A5", TypeScript: "#3178C6", JavaScript: "#E8C93F", Dart: "#00B4AB",
  SQL: "#336790", HTML: "#E34C26", CSS: "#7E57C2", Shell: "#89C24A", "C++": "#F34B7D",
  Kotlin: "#A97BFF", Swift: "#F05138", PHP: "#4F5D95",
};

const MONO = "'JetBrains Mono','SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";
const THEME = {
  // Kahve paleti: krema zemin, espresso yazı, karamel vurgu; koyu temada kavrulmuş çekirdek.
  light: {
    card: "#FFFFFF", edge: "#ECE3DA", ink: "#2B211C", faint: "#97897F", track: "#F2ECE6",
    rule: "#EFE7DF", accent: "#C29B76", add: "#4F9A6E", del: "#C9584D", peak: "#C9A27C",
  },
  dark: {
    card: "#15110E", edge: "#33291F", ink: "#F2EAE2", faint: "#A3968A", track: "#2A221C",
    rule: "#2B231D", accent: "#C9A27C", add: "#6FC08F", del: "#E9796C", peak: "#C9A27C",
  },
};

const L = {
  tr: {
    langs: "DİLLER", year: "SON BİR YIL", hours: "ÇALIŞMA SAATİ", days: "HAFTANIN GÜNÜ",
    added: "eklenen satır", removed: "silinen satır", commits: "commit",
    reposLine: (n) => `${n} depoda, yazar olarak`, period: "son 365 gün",
    langsNote: (n) => `${n} depo · son 365 gün`,
    wd: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"],
    foot: (d) => `yerel git geçmişi — GitHub'a hiç gitmemiş iş depoları dahil · ölçüm ${d}`,
    dec: ",", th: ".", K: "B", M: "M", pct: (s) => `%${s}`,
    alt: "Gerçek git verisi: diller, satırlar, çalışma saati ve haftanın günü",
  },
  en: {
    langs: "LANGUAGES", year: "LAST 12 MONTHS", hours: "HOUR OF DAY", days: "DAY OF WEEK",
    added: "lines added", removed: "lines removed", commits: "commits",
    reposLine: (n) => `across ${n} repositories, as author`, period: "last 365 days",
    langsNote: (n) => `${n} repos · last 365 days`,
    wd: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    foot: (d) => `local git history — includes work repositories that never reached GitHub · measured ${d}`,
    dec: ".", th: ",", K: "K", M: "M", pct: (s) => `${s}%`,
    alt: "Real git data: languages, lines, hour of day and day of week",
  },
};

async function findRepos(root, depth) {
  const out = [];
  async function walk(dir, left) {
    if (left < 0) return;
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    if (entries.some((e) => e.isDirectory() && e.name === ".git")) out.push(dir);
    for (const e of entries) {
      if (!e.isDirectory() || SKIP.includes(e.name) || e.name.startsWith(".")) continue;
      await walk(join(dir, e.name), left - 1);
    }
  }
  try { await stat(root); } catch { return out; }
  await walk(root, depth);
  return out;
}

function isMine(name, email, tag) {
  if (BOTS.test(`${name} ${email}`)) return false;
  if (OURS.some((re) => re.test(tag))) return true;
  return ME.some((m) => m.email === email && (m.name === "*" || m.name === name) &&
    (!m.repos || m.repos.some((re) => re.test(tag))));
}

async function scan() {
  const hours = new Array(24).fill(0);
  const wdays = new Array(7).fill(0);
  const langs = {};
  const seen = new Set();
  const repoSet = new Set();
  let commits = 0, added = 0, removed = 0;

  const roots = [];
  for (const r of SCAN) roots.push(...(await findRepos(r, DEPTH)));

  for (const dir of roots) {
    let remote = "";
    try { ({ stdout: remote } = await run("git", ["-C", dir, "remote", "get-url", "origin"])); } catch { /* yerel depo */ }
    const tag = `${basename(dir)} ${remote.trim()}`;
    const whole = OURS.some((re) => re.test(tag));
    // Git tarafında ön süzgeç: yalnız tanınan e-postalar (OURS depolarında hepsi).
    const authorArgs = whole ? [] : [...new Set(ME.map((m) => m.email))].map((e) => `--author=${e}`);
    let stdout = "";
    try {
      ({ stdout } = await run("git", [
        "-C", dir, "log", "--all", "--no-merges", "--since=365.days", ...authorArgs,
        "--pretty=@@%H|%an|%ae|%ad", "--date=format:%H|%u", "--numstat",
      ], { maxBuffer: 512 * 1024 * 1024 }));
    } catch { continue; }

    // Kimlik: depo klasörünün adı + remote. Aynı depo birden çok klonda olabilir.
    const repoKey = remote.trim() || basename(dir);
    let cur = null, hit = 0;
    for (const line of stdout.split("\n")) {
      if (line.startsWith("@@")) {
        const [sha, name, email, h, d] = line.slice(2).split("|");
        cur = null;
        if (!isMine(name, email, tag) || seen.has(sha)) continue;
        seen.add(sha);
        const hi = Number(h), di = Number(d);
        if (!Number.isInteger(hi) || !Number.isInteger(di)) continue;
        hours[hi]++; wdays[di - 1]++; commits++; hit++;
        cur = sha;
        continue;
      }
      if (!cur || !line.trim()) continue;
      const [a, r, ...pathParts] = line.split("\t");
      const path = pathParts.join("\t");
      if (a === "-" || NOISE.test(path)) continue;          // ikili ya da üretilmiş
      const lang = LANG[extname(path.replace(/[{}]/g, "").split(" => ").pop()).toLowerCase()];
      if (!lang) continue;
      const ai = Math.min(Number(a) || 0, FILE_CAP), ri = Math.min(Number(r) || 0, FILE_CAP);
      added += ai; removed += ri;
      langs[lang] = (langs[lang] || 0) + ai;
    }
    if (hit) { repoSet.add(repoKey); console.log(`  ${basename(dir).padEnd(30)} ${hit}`); }
  }
  if (!commits) {
    console.error("commit bulunamadı — ME listesini kontrol et.");
    process.exit(1);
  }
  return { hours, wdays, langs, commits, added, removed, repos: repoSet.size };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
function compact(n, t) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".", t.dec) + t.M;
  if (n >= 1e4) return Math.round(n / 1e3) + t.K;
  return n.toLocaleString("en-US").replace(/,/g, t.th);
}
const full = (n, t) => n.toLocaleString("en-US").replace(/,/g, t.th);

function build(t, th, d, stamp) {
  const W = 1000, H = 440, P = 32;
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t.alt)}">`);
  o.push(`<title>${esc(t.alt)}</title>`);
  o.push(`<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="18" fill="${th.card}" stroke="${th.edge}" stroke-width="1.5"/>`);
  const label = (x, y, s, anchor = "start") =>
    `<text x="${x}" y="${y}" font-family="${MONO}" font-size="11" letter-spacing="2.2" fill="${th.faint}" text-anchor="${anchor}">${esc(s)}</text>`;

  // ── Diller (sol üst) ──
  const total = Object.values(d.langs).reduce((s, v) => s + v, 0) || 1;
  const top = Object.entries(d.langs).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const LX = P, LW = 560, barX = LX + 120, barW = 370;
  o.push(label(LX, 46, t.langs));
  o.push(label(LX + LW, 46, t.langsNote(d.repos), "end"));
  top.forEach(([name, v], i) => {
    const y = 76 + i * 25, pct = (v / total) * 100;
    const w = Math.max(4, (barW * pct) / 100);
    o.push(`<text x="${LX}" y="${y + 4}" font-family="${MONO}" font-size="13" fill="${th.ink}">${esc(name)}</text>`);
    o.push(`<rect x="${barX}" y="${y - 6}" width="${barW}" height="10" rx="5" fill="${th.track}"/>`);
    o.push(`<rect x="${barX}" y="${y - 6}" width="${w.toFixed(1)}" height="10" rx="5" fill="${COLORS[name] || th.accent}"/>`);
    o.push(`<text x="${LX + LW}" y="${y + 4}" font-family="${MONO}" font-size="12.5" fill="${th.faint}" text-anchor="end">${t.pct(pct.toFixed(1).replace(".", t.dec))}</text>`);
  });

  // ── Son bir yıl (sağ üst) ──
  const RX = 640;
  o.push(`<line x1="${RX - 24}" y1="34" x2="${RX - 24}" y2="250" stroke="${th.rule}" stroke-width="1.2"/>`);
  o.push(label(RX, 46, t.year));
  const big = (y, s, c) => `<text x="${RX}" y="${y}" font-family="${MONO}" font-size="30" font-weight="700" fill="${c}">${esc(s)}</text>`;
  const small = (y, s) => `<text x="${RX}" y="${y}" font-family="${MONO}" font-size="11.5" letter-spacing="1.2" fill="${th.faint}">${esc(s)}</text>`;
  o.push(big(98, "+" + compact(d.added, t), th.add), small(118, t.added));
  o.push(big(160, "−" + compact(d.removed, t), th.del), small(180, t.removed));
  o.push(big(222, full(d.commits, t), th.ink), small(242, t.commits));

  o.push(`<line x1="${P}" y1="270" x2="${W - P}" y2="270" stroke="${th.rule}" stroke-width="1.2"/>`);

  // ── Çalışma saati (sol alt) ──
  const HX = P, HW = 560, base = 392, maxH = 80;
  const hmax = Math.max(...d.hours) || 1, hpeak = d.hours.indexOf(hmax);
  o.push(label(HX, 296, t.hours));
  const hbw = HW / 24;
  d.hours.forEach((v, i) => {
    const h = Math.max(2, (v / hmax) * maxH);
    o.push(`<rect x="${(HX + i * hbw + 2).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${(hbw - 4).toFixed(1)}" height="${h.toFixed(1)}" rx="2.5" fill="${i === hpeak ? th.peak : th.track}"/>`);
    if (i % 3 === 0) o.push(`<text x="${(HX + i * hbw + hbw / 2).toFixed(1)}" y="${base + 18}" font-family="${MONO}" font-size="10.5" fill="${th.faint}" text-anchor="middle">${String(i).padStart(2, "0")}</text>`);
  });

  // ── Haftanın günü (sağ alt) ──
  const DX = RX, DW = W - P - RX;
  const dmax = Math.max(...d.wdays) || 1, dpeak = d.wdays.indexOf(dmax);
  o.push(label(DX, 296, t.days));
  const dbw = DW / 7;
  d.wdays.forEach((v, i) => {
    const h = Math.max(2, (v / dmax) * maxH);
    o.push(`<rect x="${(DX + i * dbw + 5).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${(dbw - 10).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${i === dpeak ? th.peak : th.track}"/>`);
    o.push(`<text x="${(DX + i * dbw + dbw / 2).toFixed(1)}" y="${base + 18}" font-family="${MONO}" font-size="10.5" fill="${th.faint}" text-anchor="middle">${t.wd[i]}</text>`);
  });

  o.push(`<text x="${P}" y="${H - 12}" font-family="${MONO}" font-size="10" fill="${th.faint}">${esc(t.foot(stamp))}</text>`);
  o.push("</svg>");
  return o.join("\n");
}

// Ölçüm yalnız toplam sayılardır (depo adı yok); `--ciz` ile yeniden taramadan yalnız çizim yenilenir.
const CACHE = join(ROOT, "tools", "data-olcum.json");
let data;
if (process.argv.includes("--ciz")) {
  data = JSON.parse(await (await import("node:fs/promises")).readFile(CACHE, "utf8"));
} else {
  data = await scan();
  data.stamp = new Date().toISOString().slice(0, 10);
  await writeFile(CACHE, JSON.stringify(data, null, 1));
}
const now = new Date(data.stamp);
const stamp = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
await mkdir(join(ROOT, "assets"), { recursive: true });
for (const lang of ["tr", "en"]) {
  for (const mode of ["light", "dark"]) {
    await writeFile(join(ROOT, "assets", `data-${lang}-${mode}.svg`), build(L[lang], THEME[mode], data, stamp));
  }
}
console.log(`commit ${data.commits} · depo ${data.repos} · +${data.added} −${data.removed}`);
console.log(Object.entries(data.langs).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
