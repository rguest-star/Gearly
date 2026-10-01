/* ============================================================
   Gearly — Verifikasi responsif berbasis jsdom.
   Karena tidak ada browser headless di lingkungan ini, kita:
     1) parse HTML → bangun DOM + jalankan JS halaman (render.js/ui.js),
     2) evaluasi SEMUA media query CSS secara deklaratif untuk tiap
        viewport target, lalu
     3) assert aturan kunci mobile-first (navbar, grid, sidebar, dsb).
   Jalankan: node tools/responsive-test.mjs
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const CSS_FILES = ["tokens.css", "base.css", "nav.css", "product.css", "detail.css", "admin.css"];

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name} ${detail ? "→ " + detail : ""}`); }
}

/* ---------- 1. Kumpulkan media queries dari CSS ---------- */
function extractRules(cssText) {
  const rules = [];
  const re = /@media([^{]+)\{/g;
  let m;
  while ((m = re.exec(cssText))) {
    const cond = m[1].trim();
    const start = re.lastIndex;
    let depth = 1, i = start;
    while (i < cssText.length && depth > 0) {
      if (cssText[i] === "{") depth++;
      else if (cssText[i] === "}") depth--;
      i++;
    }
    const body = cssText.slice(start, i - 1);
    const sre = /([^{}]+)\{([^{}]*)\}/g;
    let sm;
    while ((sm = sre.exec(body))) {
      rules.push({ cond, selector: sm[1].trim(), decls: sm[2] });
    }
  }
  return rules;
}

/* Evaluator kondisi media vs viewport {w,h,orientation}.
   "and" hanya di-split bila diapit spasi agar "(prefers-reduced-motion: reduce)" utuh. */
function evalCond(cond, vp) {
  const parts = cond.split(/\s+and\s+/).map(s => s.trim()).filter(Boolean);
  return parts.every(p => {
    p = p.replace(/[()]/g, "").trim();
    let mm;
    if ((mm = p.match(/^min-width:\s*(\d+)px$/))) return vp.w >= +mm[1];
    if ((mm = p.match(/^max-width:\s*(\d+)px$/))) return vp.w <= +mm[1];
    if ((mm = p.match(/^min-height:\s*(\d+)px$/))) return vp.h >= +mm[1];
    if ((mm = p.match(/^max-height:\s*(\d+)px$/))) return vp.h <= +mm[1];
    if ((mm = p.match(/^orientation:\s*(\w+)$/))) return vp.orientation === mm[1];
    if (p.startsWith("prefers-")) return false; // anggap preferensi default OS
    if (/^(hover|pointer|any-hover|any-pointer):/.test(p)) return true;
    throw new Error("Kondisi media tak dikenal: " + p);
  });
}

/* ---------- 2. Muat halaman dengan JS aktif ---------- */
async function loadPage(file, vp, storage = {}) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const dom = new JSDOM(html, {
    url: "http://localhost/" + file,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  for (const [k, v] of Object.entries(storage)) window.localStorage.setItem(k, v);
  window.matchMedia = (q) => {
    const mm = q.match(/min-width:\s*(\d+)px/);
    const matches = !mm || vp.w >= +mm[1];
    return { matches, media: q, addEventListener() {}, addListener() {} };
  };
  const scripts = ["src/data/products.js", "src/js/render.js", "src/js/ui.js"];
  if (file === "compare.html") scripts.push("src/js/compare.js");
  for (const src of scripts) {
    const code = fs.readFileSync(path.join(ROOT, src), "utf8");
    try { window.eval(code); } catch (e) {
      console.error(`  ! error menjalankan ${src} di ${file}: ${e.message}`);
      failures++;
    }
  }
  return window;
}

/* ---------- 3. Viewport target (device & orientasi) ---------- */
const VPS = [
  { name: "Android kecil portrait (360×640)", w: 360, h: 640, orientation: "portrait" },
  { name: "iPhone SE portrait (375×667)",     w: 375, h: 667, orientation: "portrait" },
  { name: "iPhone Pro Max portrait (430×932)",w: 430, h: 932, orientation: "portrait" },
  { name: "HP landscape pendek (740×360)",    w: 740, h: 360, orientation: "landscape" },
  { name: "Tablet portrait (768×1024)",       w: 768, h: 1024, orientation: "portrait" },
  { name: "Tablet landscape (1024×768)",      w: 1024, h: 768, orientation: "landscape" },
  { name: "Laptop 1366×768",                  w: 1366, h: 768, orientation: "landscape" },
  { name: "Monitor 1080p (1920×1080)",        w: 1920, h: 1080, orientation: "landscape" },
  { name: "Monitor 1440p (2560×1440)",        w: 2560, h: 1440, orientation: "landscape" },
  { name: "Monitor 4K (3840×2160)",           w: 3840, h: 2160, orientation: "landscape" },
];

const allCSS = CSS_FILES.map(f => fs.readFileSync(path.join(ROOT, "src/styles", f), "utf8")).join("\n");

/* ---------- Parser CSS ringan (state machine) — menggantikan regex rapuh ---------- */
function parseCSS(text) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = []; // {cond|null, selector, decls}
  let i = 0;
  function readBlock(start) {
    let depth = 1, j = start;
    while (j < clean.length && depth > 0) {
      if (clean[j] === "{") depth++;
      else if (clean[j] === "}") depth--;
      j++;
    }
    return [clean.slice(start, j - 1), j];
  }
  while (i < clean.length) {
    const brace = clean.indexOf("{", i);
    if (brace === -1) break;
    const head = clean.slice(i, brace).trim();
    if (head.startsWith("@media")) {
      const cond = head.slice(6).trim();
      const [body, end] = readBlock(brace + 1);
      let k = 0;
      while (k < body.length) {
        const b2 = body.indexOf("{", k);
        if (b2 === -1) break;
        const sel = body.slice(k, b2).trim();
        let depth = 1, e = b2 + 1;
        while (e < body.length && depth > 0) { if (body[e] === "{") depth++; else if (body[e] === "}") depth--; e++; }
        if (sel && !sel.startsWith("@")) rules.push({ cond, selector: sel, decls: body.slice(b2 + 1, e - 1) });
        k = e;
      }
      i = end;
    } else if (head.startsWith("@")) {
      const [, end] = readBlock(brace + 1);
      i = end;
    } else {
      const [decls, end] = readBlock(brace + 1);
      if (head) rules.push({ cond: null, selector: head, decls });
      i = end;
    }
  }
  return rules;
}
const parsedRules = parseCSS(allCSS);

function getDecl(selector, prop, vp) {
  let value = null;
  for (const r of parsedRules) {
    if (!r.selector.split(",").map(s => s.trim()).includes(selector)) continue;
    if (r.cond !== null && !evalCond(r.cond, vp)) continue;
    const m = r.decls.match(new RegExp("(?:^|;)\\s*" + prop + "\\s*:\\s*([^;]+)"));
    if (m) value = m[1].trim();
  }
  return value;
}
function declFor(selector, vp, prop) { return getDecl(selector, prop, vp); }
function baseDecl(selector, prop) { return getDecl(selector, prop, VPS[0]); }

console.log("== A. Struktur breakpoint CSS ==");
check("Breakpoint 640 hadir", allCSS.includes("(min-width: 640px)"));
check("Breakpoint 768 hadir", allCSS.includes("(min-width: 768px)"));
check("Breakpoint 1024 hadir", allCSS.includes("(min-width: 1024px)"));
check("Breakpoint 1280 hadir", allCSS.includes("(min-width: 1280px)"));
check("Breakpoint 1440 hadir", allCSS.includes("(min-width: 1440px)"));
check("Kunci 4K ≥1920 hadir", allCSS.includes("(min-width: 1920px)"));
check("Max-width hanya utk disable-features di atas breakpoint (≥767), tidak pernah <320",
  !/max-width:\s*(?:[1-7]?\d{1,2})px/.test(allCSS));
check("Touch target token = 44px", /--touch-target:\s*44px/.test(allCSS));
check("Base font-size 16px (tanpa zoom)", /--fs-base:\s*1rem/.test(allCSS));
check("Viewport meta ada di semua halaman",
  ["index.html","detail.html","compare.html","admin.html"].every(f =>
    fs.readFileSync(path.join(ROOT,f),"utf8").includes('width=device-width')));

console.log("\n== B. Perilaku layout per viewport ==");
for (const vp of VPS) {
  console.log(`\n[${vp.name}]`);
  const isMobile = vp.w < 1024, isDesktop = vp.w >= 1024;

  const navLinksDisplay = declFor(".nav-links", vp, "display") ?? baseDecl(".nav-links", "display");
  check("Menu navbar hidden di mobile / flex di desktop",
    isMobile ? navLinksDisplay === "none" : navLinksDisplay === "flex", `got ${navLinksDisplay}`);

  const cols = declFor(".product-grid", vp, "grid-template-columns") ?? baseDecl(".product-grid", "grid-template-columns");
  // Grid mengikuti LEBAR viewport; pada HP landscape pendek tinggi layar membatasi → gunakan w efektif utk assertion pola
  if (vp.w < 400) check("Grid 1 kolom", cols === "1fr", `got ${cols}`);
  else if (vp.w < 640) check("Grid 2 kolom", /^repeat\(2,/.test(cols), `got ${cols}`);
  else if (vp.w < 1024) check("Grid multi-kolom tablet", /auto-fill|repeat\(2,/.test(cols), `got ${cols}`);
  else check("Grid auto-fill/terkunci desktop", /auto-fill|repeat\(4/.test(cols), `got ${cols}`);

  const side = declFor(".filter-sidebar", vp, "display") ?? baseDecl(".filter-sidebar", "display");
  check("Sidebar filter hanya desktop", isDesktop ? side === "block" : side === "none", `got ${side}`);
  const ftoggle = declFor(".filter-toggle", vp, "display") ?? baseDecl(".filter-toggle", "display");
  check("Tombol bottom-sheet filter hanya <1024", isDesktop ? ftoggle === "none" : ftoggle === "inline-flex", `got ${ftoggle}`);

  const cmax = (() => {
    let v = "100%";
    for (const r of parsedRules) {
      if (r.selector !== ":root") continue;
      if (r.cond !== null && !evalCond(r.cond, vp)) continue;
      {
        const m = r.decls.match(/--container-max:\s*([^;]+)/);
        if (m) v = m[1].trim();
      }
    }
    return v;
  })();
  if (vp.w >= 1920) check("4K: container terkunci ≤1440px", parseInt(cmax) <= 1440, `got ${cmax}`);
  else if (isDesktop) check("Desktop: container dibatasi px", /px$/.test(cmax), `got ${cmax}`);
  else check("Mobile: container fluid", cmax === "100%", `got ${cmax}`);

  if (vp.orientation === "landscape" && vp.h <= 460) {
    check("Landscape pendek: navbar lebih ramping (48px)",
      (() => { for (const r of parsedRules) if (r.selector === ":root" && r.cond !== null && evalCond(r.cond, vp) && /--h-navbar:\s*48px/.test(r.decls)) return true; return false; })());
  }

  const detDir = declFor(".detail", vp, "flex-direction") ?? baseDecl(".detail", "flex-direction");
  check("Detail vertikal di mobile / berdampingan di desktop",
    isMobile ? detDir === "column" : detDir === "row", `got ${detDir}`);

  const thead = declFor("table.spec-table thead", vp, "display");
  if (vp.w < 768) check("Spec table jadi daftar (thead hidden) → no overflow buruk", thead === "none", `got ${thead}`);
  else check("Spec table sebagai tabel nyata", thead === null, `got ${thead}`);

  check("Compare wrap overflow-x auto", baseDecl(".compare-table-wrap", "overflow-x") === "auto");

  const anav = declFor(".admin__nav", vp, "display") ?? baseDecl(".admin__nav", "display");
  check("Admin nav drawer(<lg)/sidebar(≥lg)", isDesktop ? anav === "flex" : anav === "none", `got ${anav}`);

  const adS = declFor(".ad--sticky-bottom", vp, "display") ?? baseDecl(".ad--sticky-bottom", "display");
  check("Sticky ad off di desktop", !isDesktop || adS === "none", `got ${adS}`);
}

console.log("\n== C. Runtime DOM (jsdom) ==");
(async () => {
  const winM = await loadPage("index.html", VPS[0]);
  const cards = winM.document.querySelectorAll("#product-grid li[data-product] .card");
  check("Katalog merender seluruh produk", cards.length === 6, `got ${cards.length}`);
  const order = Array.from(winM.document.querySelectorAll(".card__body > *")).slice(0, 5).map(e => e.className.split(" ")[0]);
  check("Urutan isi kartu: brand→title→specs→price→actions",
    order.join(",").startsWith("card__brand,card__title,card__specs,card__price,card__actions"), order.join(","));
  const formInSheet = winM.document.getElementById("filter-form").parentElement.id;
  check("Di mobile form filter berada dalam bottom sheet", formInSheet === "filter-mount", `got ${formInSheet}`);

  const winD = await loadPage("index.html", VPS[6]);
  const formInSide = winD.document.getElementById("filter-form").parentElement.id;
  check("Di desktop form filter pindah ke sidebar persisten", formInSide === "filter-slot", `got ${formInSide}`);

  const ctaShrink = baseDecl(".compare-bar__cta", "flex-shrink");
  check("CTA compare bar flex-shrink:0", ctaShrink === "0", `got ${ctaShrink}`);

  const winC = await loadPage("compare.html", VPS[1], { "gearly.compare": JSON.stringify(["px-14", "aur-9", "kobo-lite"]) });
  const ct = winC.document.querySelector("table.compare-table");
  check("Tabel perbandingan terbentuk (3 produk)", !!ct && ct.querySelectorAll("thead th").length === 4,
    ct ? `th=${ct.querySelectorAll("thead th").length}` : "no table");
  check("Kolom atribut sticky tersedia", !!winC.document.querySelector(".attr-col"));

  check("body overflow-x hidden", baseDecl("body", "overflow-x") === "hidden");
  const imgBlock = (() => { const m = allCSS.match(/img, video, svg, canvas\s*\{([^}]*)\}/); return m ? m[1] : ""; })();
  check("img max-width 100% (gambar responsive)", /max-width:\s*100%/.test(imgBlock));

  console.log(failures === 0 ? "\nSEMUA PEMERIKSAAN LULUS ✅" : `\nGAGAL: ${failures} pemeriksaan ❌`);
  process.exit(failures === 0 ? 0 : 1);
})();
