/* ============================================================
   Gearly — Halaman perbandingan: bangun tabel dari localStorage
   atau ?ids=. Tabel dibungkus horizontal-scroll (lihat detail.css).
   ============================================================ */
(function () {
  "use strict";
  var root = document.getElementById("compare-root");
  if (!root) return;

  var products = window.GEARLY_PRODUCTS || [];
  var fmt = window.GEARLY_FORMAT_IDR;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var params = new URLSearchParams(location.search);
  var ids = (params.get("ids") || "").split(",").filter(Boolean);
  if (window.GearlyUI && ids.length === 0) ids = window.GearlyUI.getCompare();
  var chosen = ids.map(function (id) {
    return products.find(function (p) { return p.id === id; });
  }).filter(Boolean);

  if (chosen.length < 2) {
    root.innerHTML = '<div class="ad-slot" style="min-height:120px">' +
      '<span>Pilih minimal 2 produk di <a href="index.html">katalog</a> lalu tekan “Bandingkan”.</span></div>';
    return;
  }

  /* Kumpulkan semua atribut (urutan kemunculan) */
  var attrs = [];
  chosen.forEach(function (p) {
    Object.keys(p.specs).forEach(function (k) {
      if (attrs.indexOf(k) === -1) attrs.push(k);
    });
  });

  function svgImg(p, s) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '">' +
      '<rect width="100%" height="100%" fill="#eef1f7"/>' +
      '<text x="50%" y="50%" font-family="sans-serif" font-size="' + Math.round(s / 8) +
      '" fill="#8b93a5" text-anchor="middle" dominant-baseline="middle">' + esc(p.brand) + '</text></svg>';
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  var head = '<tr><th scope="col" class="attr-col">Atribut</th>' +
    chosen.map(function (p) {
      return '<th scope="col"><img class="thumb" src="' + svgImg(p, 96) + '" width="96" height="96"' +
        ' alt=""><br><a href="detail.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a></th>';
    }).join("") + '</tr>';

  var rows = '<tr><th scope="row" class="attr-col">Harga</th>' +
    chosen.map(function (p) { return '<td><strong>' + fmt(p.price) + '</strong></td>'; }).join("") + '</tr>';

  attrs.forEach(function (a) {
    rows += '<tr><th scope="row" class="attr-col">' + esc(a) + '</th>' +
      chosen.map(function (p) {
        var v = p.specs[a];
        return '<td' + (v ? '' : ' style="color:var(--c-text-muted)"') + '>' +
          (v ? esc(v) : '—') + '</td>';
      }).join("") + '</tr>';
  });

  root.innerHTML =
    '<div class="compare-table-wrap">' +
      '<table class="compare-table">' +
        '<caption class="visually-hidden">Perbandingan spesifikasi ' +
          chosen.map(function (p) { return p.name; }).join(", ") + '</caption>' +
        '<thead>' + head + '</thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>' +
    '<p class="scroll-hint">↔ Geser tabel ke samping untuk melihat semua produk.</p>';
})();
