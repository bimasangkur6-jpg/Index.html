let databaseUang = {
    kasAwal: 0,
    transaksi: [],
    produk: []
};

let keranjangKasir = [];
let logStrukTerakhir = null;
let chartKeranjangInstance = null; // Menyimpan object Chart.js

window.onload = function () {
    const dataLokal = localStorage.getItem('smarthcashier_v3_data');

    // Inisialisasi Diagram Kosong Pertama Kali di Nota Kasir
    inisialisasiDiagramNota();

    if (dataLokal) {
        databaseUang = JSON.parse(dataLokal);
        if (!databaseUang.produk) databaseUang.produk = [];
        if (!databaseUang.transaksi) databaseUang.transaksi = [];
        SinkronisasiFormKasAwal();
    } else {
        ResetDataDefault();
    }
    renderSeluruhSistem();
};

function ResetDataDefault() {
    databaseUang.kasAwal = 5000000;
    databaseUang.produk = [
        { id: 1, nama: 'Tensimeter Digital', harga: 275000, stok: 15, fotoBase64: "" },
        { id: 2, nama: 'Stetoskop Duplex', harga: 180000, stok: 8, fotoBase64: "" }
    ];
    databaseUang.transaksi = [
        { id: 991, jenis: 'pengeluaran', nama: 'Sewa Ruko Bulanan', nominal: 1500000, cicilan: 0 }
    ];
    simpanKeMemori();
    SinkronisasiFormKasAwal();
}

function SinkronisasiFormKasAwal() {
    const inputKas = document.getElementById('input-kas-awal');
    if (inputKas) {
        inputKas.value = databaseUang.kasAwal;
        maskerRupiah(inputKas);
    }
}

function simpanKeMemori() {
    localStorage.setItem('smarthcashier_v3_data', JSON.stringify(databaseUang));
}

// ================= INSTANSASI ENGINE DIAGRAM REAL-TIME (CHART.JS) =================
function inisialisasiDiagramNota() {
    const ctx = document.getElementById('chart-keranjang').getContext('2d');
    chartKeranjangInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Keranjang Kosong'],
            datasets: [{
                label: 'Subtotal Belanja (Rp)',
                data: [0],
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, display: false }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function updateDiagramNota() {
    if (!chartKeranjangInstance) return;

    if (keranjangKasir.length === 0) {
        chartKeranjangInstance.data.labels = ['Keranjang Kosong'];
        chartKeranjangInstance.data.datasets[0].data = [0];
    } else {
        // Petakan data keranjang belanja saat ini langsung ke diagram
        chartKeranjangInstance.data.labels = keranjangKasir.map(item => item.nama);
        chartKeranjangInstance.data.datasets[0].data = keranjangKasir.map(item => item.harga * item.qty);
    }
    chartKeranjangInstance.update(); // RE-RENDER GRAFIK SECARA REAL-TIME!
}

// ================= BACKUP & RESTORE SECURITY LAYER =================
function eksporDataKeFile() {
    const stringData = JSON.stringify(databaseUang, null, 2);
    const blob = new Blob([stringData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const d = new Date();
    const a = document.createElement('a');
    a.href = url;
    a.download = `BACKUP_KASIR_${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function triggerInputFile() { document.getElementById('file-restore').click(); }

function imporDataDariFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.kasAwal !== undefined && parsed.produk && parsed.transaksi) {
                databaseUang = parsed;
                simpanKeMemori();
                SinkronisasiFormKasAwal();
                renderSeluruhSistem();
                alert("🎉 Sukses! Seluruh data dan model keuangan dipulihkan.");
            }
        } catch (err) { alert("Format file rusak!"); }
    };
    reader.readAsText(file);
}

// ================= INPUT SCANNER BARCODE CEPAT =================
function handleBarcodeSearch(e) {
    if (e.key === 'Enter') {
        const keyword = document.getElementById('scan-barcode').value.trim().toLowerCase();
        if (!keyword) return;
        const prod = databaseUang.produk.find(p => p.nama.toLowerCase().includes(keyword) || p.id.toString() === keyword);
        if (prod) {
            tambahKeKeranjang(prod.id);
            document.getElementById('scan-barcode').value = '';
        } else { alert("Produk tidak ada!"); }
    }
}

function maskerRupiah(element) {
    let raw = element.value.replace(/[^0-9]/g, '');
    element.value = raw ? 'Rp ' + parseInt(raw, 10).toLocaleString('id-ID') : '';
}

function ambilAngkaMentah(idElement) {
    return parseFloat(document.getElementById(idElement).value.replace(/[^0-9]/g, '')) || 0;
}

function sesuaikanFormUtang() {
    const jenis = document.getElementById('tx-jenis').value;
    document.getElementById('form-khusus-utang').style.display = jenis === 'utang' ? 'block' : 'none';
}

function updateKasAwal() {
    databaseUang.kasAwal = ambilAngkaMentah('input-kas-awal');
    simpanKeMemori();
    renderSeluruhSistem();
    alert('Saldo kas diperbarui!');
}

// ================= INVENTARIS MASTER DATA =================
function tambahBarangMaster(e) {
    e.preventDefault();
    const nama = document.getElementById('prod-nama').value;
    const harga = ambilAngkaMentah('prod-harga');
    const stok = parseInt(document.getElementById('prod-stok').value) || 0;
    const fileFoto = document.getElementById('prod-foto').files[0];

    if (fileFoto) {
        const reader = new FileReader();
        reader.onloadend = function () { eksekusiSimpanProduk(nama, harga, stok, reader.result); };
        reader.readAsDataURL(fileFoto);
    } else { eksekusiSimpanProduk(nama, harga, stok, ""); }
}

function eksekusiSimpanProduk(nama, harga, stok, fotoBase64) {
    databaseUang.produk.push({ id: Date.now(), nama, harga, stok, fotoBase64 });
    simpanKeMemori();
    renderSeluruhSistem();
    document.getElementById('form-barang').reset();
}

function hapusMasterProduk(id) {
    if (confirm("Hapus master produk?")) {
        databaseUang.produk = databaseUang.produk.filter(p => p.id !== id);
        keranjangKasir = keranjangKasir.filter(k => k.idProduk !== id);
        simpanKeMemori();
        renderSeluruhSistem();
    }
}

// ================= FRONT OPERASIONAL KASIR =================
function tambahKeKeranjang(idProduk) {
    const prod = databaseUang.produk.find(p => p.id === idProduk);
    if (!prod || prod.stok <= 0) return alert("Stok habis!");

    const item = keranjangKasir.find(k => k.idProduk === idProduk);
    if (item) {
        if (item.qty >= prod.stok) return alert("Mencapai batas stok!");
        item.qty++;
    } else {
        keranjangKasir.push({ idProduk: idProduk, nama: prod.nama, harga: prod.harga, qty: 1 });
    }
    renderKeranjangBelanja();
}

function ubahQtyKeranjang(idProduk, perubahan) {
    const item = keranjangKasir.find(k => k.idProduk === idProduk);
    const prod = databaseUang.produk.find(p => p.id === idProduk);
    if (!item) return;

    item.qty += perubahan;
    if (item.qty > prod.stok) item.qty = prod.stok;
    if (item.qty <= 0) keranjangKasir = keranjangKasir.filter(k => k.idProduk !== idProduk);
    renderKeranjangBelanja();
}

// MEROMBAK BARIS TR TABEL NOTA DENGAN TAMPILAN LOGISTIK KEREN
function renderKeranjangBelanja() {
    const cartBody = document.getElementById('cart-body');
    cartBody.innerHTML = '';
    let totalTagihan = 0;

    keranjangKasir.forEach(item => {
        const prodGudang = databaseUang.produk.find(p => p.id === item.idProduk);
        const subtotal = item.harga * item.qty;
        totalTagihan += subtotal;

        // Hitung sisa stok setelah dimasukkan keranjang untuk ditampilkan di TR
        const sisaStokRealTime = prodGudang.stok - item.qty;
        const persenSisaStok = (sisaStokRealTime / prodGudang.stok) * 100;
        let barColor = sisaStokRealTime <= 2 ? '#f43f5e' : '#10b981';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>📦 ${item.nama}</strong><br>
                <span class="text-muted" style="font-size:0.75rem;">Satuan: ${formatMataUang(item.harga)}</span>
                <div style="font-size: 10px; color:#6b7280; margin-top:4px;">Gudang Sisa: ${sisaStokRealTime} unit</div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${persenSisaStok}%; background-color: ${barColor};"></div>
                </div>
            </td>
            <td>
                <div class="qty-btn-group">
                    <button class="qty-btn" onclick="ubahQtyKeranjang(${item.idProduk}, -1)">-</button>
                    <span style="font-weight:bold; margin:0 5px;">${item.qty}</span>
                    <button class="qty-btn" onclick="ubahQtyKeranjang(${item.idProduk}, 1)">+</button>
                </div>
            </td>
            <td style="font-weight:bold; color:#374151;">${formatMataUang(subtotal)}</td>
            <td><button onclick="ubahQtyKeranjang(${item.idProduk}, -${item.qty})" class="btn btn-danger" style="padding: 4px 8px; font-size:0.75rem;">💥 Batal</button></td>
        `;
        cartBody.appendChild(tr);
    });

    document.getElementById('cart-total-bill').innerText = formatMataUang(totalTagihan);
    hitungKembalian();
    updateDiagramNota(); // Sinkronkan grafik batang kasir
}

function hitungKembalian() {
    const total = parseFloat(document.getElementById('cart-total-bill').innerText.replace(/[^0-9]/g, '')) || 0;
    const bayar = ambilAngkaMentah('pay-amount');
    const kembalian = bayar - total;
    const node = document.getElementById('pay-change');

    if (kembalian < 0) {
        node.innerText = "Uang Kurang!";
        node.className = "text-danger";
    } else {
        node.innerText = formatMataUang(kembalian);
        node.className = "text-success";
    }
}

function prosesSelesaiBayar() {
    if (keranjangKasir.length === 0) return alert("Keranjang kosong!");
    const total = parseFloat(document.getElementById('cart-total-bill').innerText.replace(/[^0-9]/g, '')) || 0;
    const bayar = ambilAngkaMentah('pay-amount');

    if (bayar < total) return alert("Uang belum cukup!");

    keranjangKasir.forEach(item => {
        const prod = databaseUang.produk.find(p => p.id === item.idProduk);
        if (prod) prod.stok -= item.qty;
    });

    let rincian = keranjangKasir.map(k => `${k.nama} (${k.qty}x)`).join(', ');
    databaseUang.transaksi.push({ id: Date.now(), jenis: 'pemasukan', nama: `Kasir: ${rincian}`, nominal: total, cicilan: 0 });
    databaseUang.kasAwal += total;
    SinkronisasiFormKasAwal();

    logStrukTerakhir = { notaId: Date.now().toString().slice(-6), items: [...keranjangKasir], total, bayar, kembali: bayar - total };
    alert(`Transaksi Sukses!`);

    keranjangKasir = [];
    document.getElementById('pay-amount').value = '';
    simpanKeMemori();
    renderSeluruhSistem();
    buatStrukturHtmlStruk();
}

function buatStrukturHtmlStruk() {
    if (!logStrukTerakhir) return;
    const printableArea = document.getElementById('struk-printable');
    let itemRows = logStrukTerakhir.items.map(i => `${i.nama}<br>  ${i.qty} x ${formatMataUang(i.harga)} = ${formatMataUang(i.qty * i.harga)}`).join('<br>');
    printableArea.innerHTML = `
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
            <h3>SMARTCASHIER NOTA</h3><small>ID: #${logStrukTerakhir.notaId}</small>
        </div>
        <div style="border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">${itemRows}</div>
        <div><strong>TOTAL : ${formatMataUang(logStrukTerakhir.total)}</strong><br>BAYAR : ${formatMataUang(logStrukTerakhir.bayar)}<br>KEMBALI : ${formatMataUang(logStrukTerakhir.kembali)}</div>
    `;
}

function cetakStrukThermal() {
    if (!logStrukTerakhir) return alert("Belum ada transaksi!");
    buatStrukturHtmlStruk();
    window.print();
}

function tambahTransaksiBiaya(e) {
    e.preventDefault();
    const jenis = document.getElementById('tx-jenis').value;
    const nama = document.getElementById('tx-nama').value;
    const nominal = ambilAngkaMentah('tx-nominal');
    const cicilan = ambilAngkaMentah('tx-cicilan');

    if (jenis === 'pengeluaran') {
        databaseUang.kasAwal -= nominal;
        SinkronisasiFormKasAwal();
    }
    databaseUang.transaksi.push({ id: Date.now(), jenis, nama, nominal, cicilan: jenis === 'utang' ? cicilan : 0 });
    simpanKeMemori();
    renderSeluruhSistem();
    document.getElementById('form-transaksi').reset();
    sesuaikanFormUtang();
}

function hapusTransaksiJurnal(id) {
    const item = databaseUang.transaksi.find(t => t.id === id);
    if (item && item.jenis === 'pengeluaran') {
        databaseUang.kasAwal += item.nominal;
        SinkronisasiFormKasAwal();
    }
    databaseUang.transaksi = databaseUang.transaksi.filter(t => t.id !== id);
    simpanKeMemori();
    renderSeluruhSistem();
}

function formatMataUang(angka) { return 'Rp ' + Math.round(angka).toLocaleString('id-ID'); }

// ================= MEROMBAK INTEGRASI DASHBOARD & MODEL DEBT RATIO =================
function renderSeluruhSistem() {
    let totalOmsetKasirPemasukan = 0;
    let totalBebanBiayaTetap = 0;
    let totalUtangPokokBisnis = 0;
    let totalNilaiAsetBarangToko = 0;
    let arrayStokKritis = [];

    // 1. RENDER JURNAL BUKU BESAR DENGAN CAPSULE BADGE MODERN
    const ledgerBody = document.getElementById('ledger-body');
    ledgerBody.innerHTML = '';

    databaseUang.transaksi.forEach(item => {
        if (item.jenis === 'pemasukan') totalOmsetKasirPemasukan += item.nominal;
        else if (item.jenis === 'pengeluaran') totalBebanBiayaTetap += item.nominal;
        else if (item.jenis === 'utang') {
            totalUtangPokokBisnis += item.nominal;
            totalBebanBiayaTetap += item.cicilan;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge-capsule bg-${item.jenis}">${item.jenis}</span></td>
            <td><strong>${item.nama}</strong></td>
            <td style="font-weight:bold;">${formatMataUang(item.nominal)}</td>
            <td class="text-danger">${item.jenis === 'utang' ? formatMataUang(item.cicilan) + '/bln' : '-'}</td>
            <td><button onclick="hapusTransaksiJurnal(${item.id})" class="btn btn-danger" style="padding:4px 8px; font-size:0.75rem;">🗑️ Hapus</button></td>
        `;
        ledgerBody.appendChild(tr);
    });

    // 2. RENDER MASTER KATALOG
    const catalogContainer = document.getElementById('cashier-catalog-container');
    catalogContainer.innerHTML = '';

    databaseUang.produk.forEach(prod => {
        totalNilaiAsetBarangToko += (prod.harga * prod.stok);
        if (prod.stok <= 3) arrayStokKritis.push(`${prod.nama} (${prod.stok} sisa)`);

        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => tambahKeKeranjang(prod.id);
        let frameContent = prod.fotoBase64 ? `<img src="${prod.fotoBase64}" alt="${prod.nama}">` : `<span>📦</span>`;
        card.innerHTML = `
            <div class="img-frame">${frameContent}</div>
            <div class="prod-info">
                <h4>${prod.nama}</h4>
                <div class="prod-meta">
                    <span class="text-success" style="font-weight:700;">${formatMataUang(prod.harga)}</span>
                    <span style="color:${prod.stok <= 3 ? '#f43f5e' : '#6b7280'}; font-weight:bold;">Stok: ${prod.stok}</span>
                </div>
            </div>
        `;
        catalogContainer.appendChild(card);
    });

    // Notifikasi Logistik
    const panelStok = document.getElementById('panel-stok-kritis');
    if (arrayStokKritis.length > 0) {
        panelStok.style.display = "block";
        document.getElementById('list-stok-kritis').innerText = arrayStokKritis.join(', ');
    } else { panelStok.style.display = "none"; }

    document.getElementById('stat-total-kas').innerText = formatMataUang(databaseUang.kasAwal);
    document.getElementById('stat-total-barang').innerText = formatMataUang(totalNilaiAsetBarangToko);
    document.getElementById('stat-total-utang').innerText = formatMataUang(totalUtangPokokBisnis);

    // 3. KALKULASI RUNWAY MODAL
    const defisitOperasional = totalBebanBiayaTetap - totalOmsetKasirPemasukan;
    const statRunway = document.getElementById('stat-runway');
    const runwayCard = document.getElementById('runway-card');
    const runwaySub = document.getElementById('runway-sub');
    let nilaiRunwayBulan = 999;

    if (defisitOperasional <= 0) {
        statRunway.innerText = "∞ Aman";
        statRunway.className = "text-success";
        runwaySub.innerText = "Omset Kasir Surplus";
    } else {
        nilaiRunwayBulan = databaseUang.kasAwal / defisitOperasional;
        statRunway.innerText = nilaiRunwayBulan.toFixed(1) + " Bulan";
    }

    // 4. PEMODELAN MODEL DEBT SERVICE RATIO (DSR) BAR METERAN
    let totalCicilanSaja = databaseUang.transaksi.filter(t => t.jenis === 'utang').reduce((sum, curr) => sum + curr.cicilan, 0);
    const rasioUtang = totalOmsetKasirPemasukan > 0 ? (totalCicilanSaja / totalOmsetKasirPemasukan) * 100 : (totalCicilanSaja > 0 ? 100 : 0);

    // Update Meteran DSR Visual
    document.getElementById('debt-ratio-badge').innerText = `DSR: ${rasioUtang.toFixed(1)}%`;
    const dsrBar = document.getElementById('dsr-progress-bar');
    const dsrInterpretation = document.getElementById('dsr-interpretation');

    dsrBar.style.width = Math.min(rasioUtang, 100) + '%';
    if (rasioUtang <= 35) {
        dsrBar.style.backgroundColor = '#10b981'; // Hijau (Aman)
        dsrInterpretation.innerText = `🟢 Sehat. Kapasitas pinjaman sisa aman: ${formatMataUang((totalOmsetKasirPemasukan * 0.35) - totalCicilanSaja)} / bulan.`;
    } else if (rasioUtang <= 50) {
        dsrBar.style.backgroundColor = '#f59e0b'; // Kuning (Waspada)
        dsrInterpretation.innerText = `🟡 Waspada! Beban cicilan menggerogoti omset kasir Anda terlalu dalam.`;
    } else {
        dsrBar.style.backgroundColor = '#f43f5e'; // Merah (Bahaya)
        dsrInterpretation.innerText = `🔴 Krisis Likuiditas! Lebih dari setengah omset kasir habis hanya untuk bayar utang.`;
    }

    // 5. PENILAIAN SKOR KESEHATAN FINANSIAL GLOBAL (ALGORITMA GRADASI)
    const finScoreNode = document.getElementById('fin-score');
    if (rasioUtang <= 35 && defisitOperasional <= 0) {
        finScoreNode.innerText = "A"; finScoreNode.style.color = "#10b981";
    } else if (rasioUtang <= 45 && nilaiRunwayBulan >= 3) {
        finScoreNode.innerText = "B"; finScoreNode.style.color = "#3b82f6";
    } else if (rasioUtang <= 60 && nilaiRunwayBulan >= 1.5) {
        finScoreNode.innerText = "C"; finScoreNode.style.color = "#f59e0b";
    } else {
        finScoreNode.innerText = "F"; finScoreNode.style.color = "#f43f5e";
    }

    evaluasiKondisiKebangkrutan(nilaiRunwayBulan, rasioUtang, defisitOperasional, totalNilaiAsetBarangToko);
    renderKeranjangBelanja();
}

function evaluasiKondisiKebangkrutan(runway, rasioUtang, defisit, totalAsetBarang) {
    const box = document.getElementById('radar-box');
    const title = document.getElementById('radar-title');
    const desc = document.getElementById('radar-desc');
    const actions = document.getElementById('radar-actions');
    const statusGlobal = document.getElementById('status-global');

    if (runway <= 1.5 && defisit > 0) {
        title.innerText = "🚨 ALARM DARURAT: Risiko Tinggi Kebangkrutan Jangka Pendek";
        desc.innerText = `Defisit bulanan ${formatMataUang(defisit)}. Sisa modal habis dalam ${runway.toFixed(1)} bulan.`;
        statusGlobal.innerText = "Krisis Akut"; statusGlobal.className = "badge text-danger";
        actions.innerHTML = `<li><strong>Obral Aset Gudang:</strong> Likuidasi stok senilai ${formatMataUang(totalAsetBarang)} menjadi uang kas lewat diskon kasir harian!</li>`;
    } else {
        title.innerText = "✅ KONDISI NORMAL: Finansial Terkendali";
        desc.innerText = "Omset kasir lancar menutup seluruh pengeluaran tetap usaha.";
        statusGlobal.innerText = "Sehat"; statusGlobal.className = "badge text-success";
        actions.innerHTML = `<li>Pertahankan disiplin input data transaksi kasir harian secara real-time.</li>`;
    }
}
