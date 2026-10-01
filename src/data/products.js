/* ============================================================
   Gearly — Data produk contoh (fallback statis utk demo HTML)
   Dalam produksi, data ini datang dari API yang sama.
   ============================================================ */

window.GEARLY_PRODUCTS = [
  {
    id: "px-14",
    brand: "Xiova",
    name: "Xiova Note 14 Pro",
    category: "smartphone",
    price: 4299000,
    image: null,
    flag: "Baru",
    rating: 4.5,
    specs: {
      "Layar": "6.7\" AMOLED, 120Hz",
      "Chipset": "Helio G99 Ultra",
      "RAM": "8 GB",
      "Penyimpanan": "256 GB",
      "Kamera": "108 MP + 8 MP + 2 MP",
      "Baterai": "5100 mAh, 67W"
    },
    keySpecs: ["6.7\" AMOLED 120Hz", "8/256GB", "108MP", "5100mAh 67W"]
  },
  {
    id: "aur-9",
    brand: "Aurora",
    name: "Aurora Nine 5G",
    category: "smartphone",
    price: 5699000,
    image: null,
    flag: null,
    rating: 4.6,
    specs: {
      "Layar": "6.67\" AMOLED, 144Hz",
      "Chipset": "Snapdragon 7+ Gen 2",
      "RAM": "12 GB",
      "Penyimpanan": "512 GB",
      "Kamera": "50 MP OIS + 12 MP UW",
      "Baterai": "5500 mAh, 100W"
    },
    keySpecs: ["SD 7+ Gen2", "12/512GB", "50MP OIS", "100W"]
  },
  {
    id: "kobo-lite",
    brand: "Kobiton",
    name: "Kobiton Lite A15",
    category: "smartphone",
    price: 1599000,
    image: null,
    flag: "Terlaris",
    rating: 4.2,
    specs: {
      "Layar": "6.5\" IPS, 90Hz",
      "Chipset": "Unisoc T606",
      "RAM": "4 GB",
      "Penyimpanan": "128 GB",
      "Kamera": "13 MP + 2 MP",
      "Baterai": "5000 mAh, 18W"
    },
    keySpecs: ["6.5\" IPS 90Hz", "4/128GB", "13MP", "5000mAh"]
  },
  {
    id: "nex-bud",
    brand: "Nexa",
    name: "NexaPods ANC Pro",
    category: "audio",
    price: 899000,
    image: null,
    flag: null,
    rating: 4.4,
    specs: {
      "Driver": "11mm dynamic",
      "ANC": "-45 dB hybrid",
      "Bluetooth": "5.4, multipoint",
      "Baterai": "8 jam (case 36 jam)",
      "Resistansi": "IPX5"
    },
    keySpecs: ["ANC -45dB", "BT 5.4", "36 jam", "IPX5"]
  },
  {
    id: "urb-wat",
    brand: "Urbanode",
    name: "Urbanode Watch S3",
    category: "wearable",
    price: 1249000,
    image: null,
    flag: "Promo",
    rating: 4.3,
    specs: {
      "Layar": "1.43\" AMOLED",
      "Baterai": "14 hari",
      "Sensor": "HR, SpO2, GPS",
      "Ketahanan": "5 ATM"
    },
    keySpecs: ["1.43\" AMOLED", "GPS", "14 hari", "5 ATM"]
  },
  {
    id: "volt-65",
    brand: "Voltpack",
    name: "Voltpack GaN 65W",
    category: "aksesori",
    price: 349000,
    image: null,
    flag: null,
    rating: 4.7,
    specs: {
      "Daya": "65W",
      "Port": "2× USB-C, 1× USB-A",
      "Teknologi": "GaN III"
    },
    keySpecs: ["65W GaN", "2× USB-C", "1× USB-A"]
  }
];

window.GEARLY_FORMAT_IDR = function (n) {
  return "Rp" + n.toLocaleString("id-ID");
};
