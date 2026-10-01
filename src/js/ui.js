/* ============================================================
   Gearly — UI responsif: drawer, bottom-sheet, breakpoint watcher,
   compare bar. Tanpa dependensi.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Breakpoint watcher (sinkron dgn tokens.css) ----------
     JS tidak boleh menduplikasi angka breakpoint secara diam-diam;
     semua lewat tabel ini supaya mudah diaudit terhadap CSS. */
  var BP = { sm: 640, md: 768, lg: 1024, xl: 1280, xxl: 1440 };

  function mq(px) { return window.matchMedia("(min-width: " + px + "px)"); }
  var isDesktop = mq(BP.lg);

  /* ---------- Overlay bersama utk drawer & bottom sheet ---------- */
  var overlay = document.querySelector(".overlay");

  function openLayer(el, focusFirst) {
    if (!el) return;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    if (overlay) { overlay.classList.add("is-open"); }
    document.body.classList.add("has-overlay");
    if (focusFirst) {
      var f = el.querySelector("button, a, input, select");
      if (f) f.focus();
    }
  }
  function closeLayer(el) {
    if (!el) return;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    if (overlay && !document.querySelector(".drawer.is-open, .bottom-sheet.is-open")) {
      overlay.classList.remove("is-open");
      document.body.classList.remove("has-overlay");
    }
  }
  function closeAll() {
    document.querySelectorAll(".drawer.is-open, .bottom-sheet.is-open").forEach(closeLayer);
  }

  if (overlay) {
    overlay.addEventListener("click", closeAll);
    overlay.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAll();
  });

  /* ---------- Hamburger → menu drawer ---------- */
  var menuBtn = document.querySelector("[data-open='menu']");
  var menuDrawer = document.getElementById("menu-drawer");
  if (menuBtn && menuDrawer) {
    menuBtn.addEventListener("click", function () {
      // Toggle
      if (menuDrawer.classList.contains("is-open")) closeLayer(menuDrawer);
      else openLayer(menuDrawer, true);
    });
    menuDrawer.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeLayer(menuDrawer); // navigasi menutup drawer
    });
  }
  document.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = document.getElementById(btn.getAttribute("data-close"));
      closeLayer(target);
    });
  });

  /* ---------- Filter: bottom sheet (<1024px) / sidebar (≥1024px) ----------
     Elemen filter yang sama dipakai dua tempat: saat melewati
     breakpoint, kontennya dipindah (moved), bukan diduplikasi. */
  var filterSheet = document.getElementById("filter-sheet");
  var filterMount = document.getElementById("filter-mount"); // dalam bottom sheet
  var filterSlot  = document.getElementById("filter-slot");  // dalam sidebar desktop
  var filterForm  = document.getElementById("filter-form");

  function placeFilter(desktop) {
    if (!filterForm) return;
    var host = desktop ? filterSlot : filterMount;
    if (host && filterForm.parentElement !== host) host.appendChild(filterForm);
    filterForm.hidden = false; // form ada dalam DOM sejak awal, baru ditampilkan setelah dipindah
    if (desktop && filterSheet) closeLayer(filterSheet);
  }
  placeFilter(isDesktop.matches);
  var onBpChange = function (e) { placeFilter(e.matches); };
  if (isDesktop.addEventListener) isDesktop.addEventListener("change", onBpChange);
  else isDesktop.addListener(onBpChange); // Safari lama

  var filterBtns = document.querySelectorAll("[data-open='filter']");
  filterBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      if (filterSheet) openLayer(filterSheet, true);
    });
  });

  /* Terapkan / reset filter */
  if (filterForm) {
    filterForm.addEventListener("submit", function (e) { e.preventDefault(); applyFilters(); });
    filterForm.addEventListener("input", debounce(applyFilters, 250));
  }

  function getFilters() {
    var cats = Array.prototype.slice
      .call(filterForm ? filterForm.querySelectorAll('input[name="category"]:checked') : [])
      .map(function (i) { return i.value; });
    var priceMaxEl = filterForm && filterForm.querySelector('input[name="price_max"]');
    return {
      q: (document.getElementById("search-input") || {}).value || "",
      categories: cats,
      priceMax: priceMaxEl ? Number(priceMaxEl.value) || Infinity : Infinity
    };
  }

  function applyFilters() {
    var f = getFilters();
    var items = document.querySelectorAll(".product-grid > li[data-product]");
    var shown = 0;
    items.forEach(function (li) {
      var p = JSON.parse(li.getAttribute("data-product"));
      var okQ = !f.q || (p.name + " " + p.brand).toLowerCase().includes(f.q.toLowerCase());
      var okC = f.categories.length === 0 || f.categories.includes(p.category);
      var okP = p.price <= f.priceMax;
      var show = okQ && okC && okP;
      li.hidden = !show;
      if (show) shown++;
    });
    var count = document.getElementById("result-count");
    if (count) count.textContent = shown + " produk";
    var empty = document.getElementById("empty-state");
    if (empty) empty.hidden = shown !== 0;
  }

  var searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.addEventListener("input", debounce(applyFilters, 200));

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  /* ---------- Compare (max 4) + sticky bar ---------- */
  var MAX_COMPARE = 4;
  var compareBar = document.querySelector(".compare-bar");
  var compareItems = document.querySelector(".compare-bar__items");
  var compareCount = document.querySelector(".compare-bar__count");

  function getCompare() {
    try { return JSON.parse(localStorage.getItem("gearly.compare") || "[]"); }
    catch (e) { return []; }
  }
  function setCompare(list) {
    localStorage.setItem("gearly.compare", JSON.stringify(list));
    renderCompareBar();
    syncCompareButtons();
  }
  function toggleCompare(id) {
    var list = getCompare();
    var i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else {
      if (list.length >= MAX_COMPARE) {
        toast("Maksimal " + MAX_COMPARE + " produk dibandingkan.");
        return;
      }
      list.push(id);
    }
    setCompare(list);
  }
  function renderCompareBar() {
    if (!compareBar || !compareItems) return;
    var list = getCompare();
    var products = (window.GEARLY_PRODUCTS || []).reduce(function (m, p) { m[p.id] = p; return m; }, {});
    compareItems.innerHTML = list.map(function (id) {
      var p = products[id] || { name: id };
      return '<span class="compare-chip">' +
        '<span>' + escapeHtml(p.name) + '</span>' +
        '<button class="compare-chip__remove" data-remove="' + id + '" aria-label="Hapus ' + escapeHtml(p.name) + ' dari perbandingan">×</button>' +
        '</span>';
    }).join("");
    compareBar.classList.toggle("is-active", list.length > 0);
    if (compareCount) compareCount.textContent = list.length + "/" + MAX_COMPARE;
    var cta = compareBar.querySelector(".compare-bar__cta a, .compare-bar__cta button");
    if (cta && cta.tagName === "A") {
      cta.href = "compare.html?ids=" + list.join(",");
      cta.setAttribute("aria-disabled", list.length < 2 ? "true" : "false");
    }
    document.body.classList.toggle("has-compare", list.length > 0);
  }
  function syncCompareButtons() {
    var list = getCompare();
    document.querySelectorAll(".btn-compare").forEach(function (btn) {
      var on = list.includes(btn.getAttribute("data-id"));
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "Dibandingkan ✓" : "Bandingkan";
    });
  }
  document.addEventListener("click", function (e) {
    var cmp = e.target.closest(".btn-compare");
    if (cmp) { toggleCompare(cmp.getAttribute("data-id")); return; }
    var rm = e.target.closest("[data-remove]");
    if (rm) {
      var list = getCompare();
      var i = list.indexOf(rm.getAttribute("data-remove"));
      if (i >= 0) list.splice(i, 1);
      setCompare(list);
    }
  });

  /* ---------- Toast ringan (feedback tanpa menutupi konten lama) ---------- */
  var toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.setAttribute("role", "status");
      toastEl.style.cssText =
        "position:fixed;left:50%;bottom:calc(var(--h-compare-bar) + 16px);transform:translateX(-50%);" +
        "background:#1b2333;color:#fff;padding:10px 16px;border-radius:999px;font-size:14px;" +
        "z-index:80;box-shadow:0 4px 14px rgba(0,0,0,.25);max-width:min(90vw,420px);text-align:center";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = "1";
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.style.opacity = "0"; }, 2200);
  }

  /* ---------- Iklan sticky: jangan menutupi konten ----------
     Bila banner sticky aktif, body diberi padding tambahan agar
     footer/konten terakhir tetap terjangkau. */
  var stickyAd = document.querySelector(".ad--sticky-bottom");
  if (stickyAd) document.body.classList.add("has-sticky-ad");

  /* ---------- Tabel spesifikasi: mode daftar <768px / tabel nyata ≥768px ----------
     CSS hanya mendefinisikan gaya "daftar" (.spec-table-list); kelas ini
     dipasang/dilepas mengikuti matchMedia supaya di atas 768px tabel
     memakai display bawaan browser (table / table-header-group / table-cell). */
  var isTabletUp = mq(BP.md); // 768px
  function syncSpecTableMode(listMode) {
    document.querySelectorAll(".spec-table-wrap").forEach(function (w) {
      w.classList.toggle("spec-table-list", listMode);
    });
  }
  syncSpecTableMode(!isTabletUp.matches);
  if (isTabletUp.addEventListener) {
    isTabletUp.addEventListener("change", function (e) { syncSpecTableMode(!e.matches); });
  } else {
    isTabletUp.addListener(function (e) { syncSpecTableMode(!e.matches); });
  }

  /* ---------- Kartu horizontal di desktop ----
     Class .card--horizontal hanya berefek ≥1280px (CSS), jadi aman
     dipasang permanen di markup; JS tak perlu memantau resize. */

  /* Init */
  renderCompareBar();
  syncCompareButtons();
  applyFilters();

  window.GearlyUI = { getCompare: getCompare, toast: toast, BP: BP };
})();

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
