/* ============================================================
   Gearly — Render kartu produk & halaman detail dari data.
   Markup kartu mengikuti pola responsif:
     mobile  : [IMAGE] / Brand / Name / Key Specs / Price / Compare
     desktop : [IMAGE] + kolom teks (via .card--horizontal, efek ≥1280px)
   ============================================================ */
(function () {
  "use strict";

  var products = window.GEARLY_PRODUCTS || [];
  var fmt = window.GEARLY_FORMAT_IDR;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Placeholder gambar inline (SVG data-URI) → tidak ada request eksternal,
     tetap responsive karena img { max-width:100%; height:auto }. */
  function imgFor(p, w, h) {
    if (p.image) {
      // Produksi: pakai <img srcset sizes>. Contoh:
      // return '<img src="..." srcset="sm.jpg 400w, md.jpg 800w, lg.jpg 1200w" ' +
      //        'sizes="(min-width:1280px) 180px, (min-width:640px) 50vw, 100vw" alt="...">';
      return '<img src="' + esc(p.image) + '" width="' + w + '" height="' + h +
             '" loading="lazy" decoding="async" alt="' + esc(p.name) + '">';
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
      '<rect width="100%" height="100%" fill="#eef1f7"/>' +
      '<text x="50%" y="50%" font-family="sans-serif" font-size="' + Math.round(h / 8) +
      '" fill="#8b93a5" text-anchor="middle" dominant-baseline="middle">' + esc(p.brand) + '</text></svg>';
    return '<img src="' + ("data:image/svg+xml," + encodeURIComponent(svg)) + '" width="' + w +
           '" height="' + h + '" loading="lazy" decoding="async" alt="Ilustrasi ' + esc(p.name) + '">';
  }

  function cardHTML(p) {
    return '' +
      '<article class="card card--horizontal">' +
        '<div class="card__media">' +
          (p.flag ? '<span class="card__flag">' + esc(p.flag) + '</span>' : '') +
          imgFor(p, 400, 300) +
        '</div>' +
        '<div class="card__body">' +
          '<span class="card__brand">' + esc(p.brand) + '</span>' +
          '<h3 class="card__title"><a href="detail.html?id=' + encodeURIComponent(p.id) + '">' +
            esc(p.name) + '</a></h3>' +
          '<p class="card__specs">' + esc(p.keySpecs.join(" · ")) + '</p>' +
          '<p class="card__price">' + fmt(p.price) + ' <small>estimasi</small></p>' +
          '<div class="card__actions">' +
            '<button type="button" class="btn btn-outline btn-compare" data-id="' + esc(p.id) + '"' +
              ' aria-pressed="false">Bandingkan</button>' +
            '<a class="btn btn-primary" href="detail.html?id=' + encodeURIComponent(p.id) + '">Detail</a>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* ---- Katalog ---- */
  var grid = document.getElementById("product-grid");
  if (grid) {
    grid.innerHTML = products.map(function (p) {
      // data-product dipakai ui.js utk filter tanpa round-trip
      return '<li data-product="' + esc(JSON.stringify(p)) + '">' + cardHTML(p) + '</li>';
    }).join("");
  }

  /* ---- Detail ---- */
  var mount = document.getElementById("detail-root");
  if (mount) {
    var id = new URLSearchParams(location.search).get("id") || products[0].id;
    var p = products.find(function (x) { return x.id === id; }) || products[0];
    document.title = p.name + " — Gearly";

    var keyspecs = Object.keys(p.specs).slice(0, 6).map(function (k) {
      return '<li><span class="k">' + esc(k) + '</span><span class="v">' + esc(p.specs[k]) + '</span></li>';
    }).join("");

    var specRows = Object.keys(p.specs).map(function (k) {
      return '<tr><th scope="row">' + esc(k) + '</th><td>' + esc(p.specs[k]) + '</td></tr>';
    }).join("");

    mount.innerHTML = '' +
      '<div class="detail">' +
        '<div class="detail__media">' +
          '<img class="detail__main-image" src="' + imgSrc(p, 800, 800) + '" width="800" height="800"' +
               ' alt="' + esc(p.name) + '">' +
          '<div class="detail__thumbs">' +
            thumb(p, 800) + thumb(p, 600) + thumb(p, 400) +
          '</div>' +
        '</div>' +
        '<div class="detail__info">' +
          '<span class="detail__brand">' + esc(p.brand) + ' · ' + esc(p.category) + '</span>' +
          '<h1 class="detail__title">' + esc(p.name) + '</h1>' +
          '<div class="detail__rating"><span class="stars" aria-hidden="true">★★★★☆</span> ' +
            p.rating.toFixed(1) + ' <span>(124 ulasan)</span></div>' +
          '<div class="detail__price">' + fmt(p.price) + '</div>' +
          '<ul class="keyspecs">' + keyspecs + '</ul>' +
          '<div class="detail__actions">' +
            '<button type="button" class="btn btn-outline btn-block btn-compare" data-id="' + esc(p.id) + '"' +
              ' aria-pressed="false">Bandingkan</button>' +
            '<a class="btn btn-primary btn-block" href="compare.html">Lihat perbandingan</a>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<section style="margin-top:var(--sp-5)">' +
        '<div class="spec-table-wrap">' +
          '<table class="spec-table">' +
            '<caption>Spesifikasi lengkap</caption>' +
            '<thead><tr><th scope="col">Atribut</th><th scope="col">Nilai</th></tr></thead>' +
            '<tbody>' +
              '<tr class="group-row"><td colspan="2">Umum</td></tr>' + specRows +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</section>';

    /* Ganti gambar utama saat thumbnail ditekan */
    mount.addEventListener("click", function (e) {
      var t = e.target.closest(".detail__thumbs img");
      if (!t) return;
      var main = mount.querySelector(".detail__main-image");
      main.src = t.src; // thumbnail adalah crop/versi lain dari gambar yang sama
      mount.querySelectorAll(".detail__thumbs img").forEach(function (i) {
        i.setAttribute("aria-current", i === t ? "true" : "false");
      });
    });
  }

  function imgSrc(p, s) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '">' +
      '<rect width="100%" height="100%" fill="#eef1f7"/>' +
      '<text x="50%" y="50%" font-family="sans-serif" font-size="' + Math.round(s / 10) +
      '" fill="#8b93a5" text-anchor="middle" dominant-baseline="middle">' + esc(p.name) + '</text></svg>';
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }
  function thumb(p, s) {
    return '<img src="' + imgSrc(p, s) + '" width="' + s + '" height="' + s +
           '" alt="Pratinjau ' + esc(p.name) + '" loading="lazy" role="button" tabindex="0">';
  }
})();
