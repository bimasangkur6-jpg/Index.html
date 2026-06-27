let databaseUang = {
    kasAwal: 0,
    transaksi: [],
    produk: []
};

let keranjangKasir = [];
let logStrukTerakhir = null;
let chartKeranjangInstance = null; 
let currentUserRole = null; 
let kategoriAktif = "Semua";

const PIN_ADMIN = "1674";
const PIN_KASIR = "8790";

window.onload = function () {
    const sessionRole = sessionStorage.getItem('cashier_session_role');
    const dataLokal = localStorage.getItem('smarthcashier_v3_data');

    inisialisasiDiagramNota();

    if (dataLokal) {
        databaseUang = JSON.parse(dataLokal);
        if (!databaseUang.produk) databaseUang.produk = [];
        if (!databaseUang.transaksi) databaseUang.transaksi = [];
        SinkronisasiFormKasAwal();
    } else {
        ResetDataDefault();
    }

    if (sessionRole) {
        currentUserRole = sessionRole;
        document.getElementById('login-overlay').style.display = 'none';
        renderSeluruhSistem();
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
    }
};

// ================= AUTHENTICATION SYSTEMS =================
function prosesLogin() {
    const role = document.getElementById('login-role').value;
    const pin = document.getElementById('login-pin').value;

    if (role === 'admin' && pin === PIN_ADMIN) {
        currentUserRole = 'admin';
    } else if (role === 'kasir' && pin === PIN_KASIR) {
        currentUserRole = 'kasir';
    } else {
        alert("⚠️ PIN Keamanan Salah! Akses ditolak.");
        return;
    }

    sessionStorage.setItem('cashier_session_role', currentUserRole);
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('login-pin').value = '';
    renderSeluruhSistem();
}

function prosesLogout() {
    currentUserRole = null;
    sessionStorage.removeItem('cashier_session_role');
    keranjangKasir = [];
    document.getElementById('login-overlay').style.display = 'flex';
}

function proteksiAksesAdmin() {
    if (currentUserRole !== 'admin') {
        alert("🛡️ HAK AKSES TERBATAS: Fitur ini dikunci dan hanya dapat dimodifikasi oleh Admin!");
        return false;
    }
    return true;
}

function ResetDataDefault() {
    databaseUang.kasAwal = 5000000;
    databaseUang.produk = [
        { id: 1, nama: 'Tensimeter Digital', harga: 275000, stok: 15, kategori: 'Alkes', fotoBase64: "" },
        { id: 2, nama: 'Stetoskop Duplex', harga: 180000, stok: 8, kategori: 'Alkes', fotoBase64: "" },
        { id: 3, nama: 'Masker Medis 3-Ply', harga: 35000, stok: 40, kategori: 'Umum', fotoBase64: "" }
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

// ================= LIVE FILTERS & FRONTEND SEARCH ENGINES =================
function handleLiveSearch() {
    const keyword = document.getElementById('scan-barcode').value.toLowerCase().trim();
    const cards = document.querySelectorAll('.product-card');

    cards.forEach(card => {
        const nama = card.getAttribute('data-nama');
        const id = card.getAttribute('data-id');
        const kat = card.getAttribute('data-kategori');

        const cocokKeyword = nama.includes(keyword) || id.includes(keyword);
        const cocokKategori = (kategoriAktif === "Semua" || kat === kategoriAktif);

        if (cocokKeyword && cocokKategori) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

function filterKategori(kategori, element) {
    kategoriAktif = kategori;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    handleLiveSearch(); // Saring ulang kombinasi kata kunci pencarian & kategori tabs
}

function kosongkanKeranjang() {
    if (keranjangKasir.length === 0) return;
    if (confirm("Kosongkan semua daftar item di keranjang?")) {
        keranjangKasir = [];
        renderKeranjangBelanja();
    }
}

// ================= CHART ENGINE =================
function inisialisasiDiagramNota() {
    const ctx = document.getElementById('chart-keranjang').getContext('2d');
    chartKeranjangInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Keranjang Kosong'],
            datasets: [{
                label: 'Subtotal (Rp)',
                data: [0],
                backgroundColor: 'rgba(16, 185, 129, 0.7)', 
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#9ca3af', font: { size: 9 } }, grid: { display: false } },
                y: { beginAtZero: true, ticks: { display: false }, grid: { color: '#222d3f' } }
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
        chartKeranjangInstance.data.labels = keranjangKasir.map(item => item.nama.slice(0, 10) + '..');
        chartKeranjangInstance.data.datasets[0].data = keranjangKasir.map(item => item.harga * item.qty);
    }
    chartKeranjangInstance.update(); 
}

// ================= UTILITIES MASKING =================
function maskerRupiah(element) {
    let raw = element.value.replace(/[^0-9]/g, '');
    element.value = raw ? 'Rp ' + parseInt(raw, 10).toLocaleString('id-ID') : '';
}

function ambilAngkaMentah(idElement) {
    const el = document.getElementById(idElement);
    if(!el) return 0;
    return parseFloat(el.value.replace(/[^0-9]/g, '')) || 0;
}

function formatMataUang(angka) { return 'Rp ' + Math.round(angka).toLocaleString('id-ID'); }

function sesuaikanFormUtang() {
    const jenis = document.getElementById('tx-jenis').value;
    document.getElementById('form-khusus-utang').style.display = jenis === 'utang' ? 'block' : 'none';
}

// ================= BACKUP CORE ACTIONS =================
function eksporDataKeFile() {
    if(!proteksiAksesAdmin()) return;
    const stringData = JSON.stringify(databaseUang, null, 2);
    const blob = new Blob([stringData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const d = new Date();
    const a = document.createElement('a');
    a.href = url;
    a.download = `BACKUP_KASIR_${d.getDate()}-${d.getMonth() + 1}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function triggerInputFile() { 
    if(!proteksiAksesAdmin()) return;
    document.getElementById('file-restore').click(); 
}

function imporDataDariFile(event) {
    if(!proteksiAksesAdmin()) return;
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm("⚠️ PERINGATAN: Memuat file ini akan menimpa seluruh database lokal saat ini. Lanjutkan?")) {
        event.target.value = ''; 
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.kasAwal !== undefined && parsed.produk && parsed.transaksi) {
                databaseUang = parsed;
                simpanKeMemori();
                SinkronisasiFormKasAwal();
                renderSeluruhSistem();
                alert("🎉 Sukses memulihkan pangkalan data.");
            } else { alert("Format data file rusak/tidak cocok!"); }
        } catch (err) { alert("Gagal memproses berkas berkode eksternal!"); }
    };
    reader.readAsText(file);
}

// ================= CORE CALCULATIONS & OPERATIONS =================
function updateKasAwal() {
    if(!proteksiAksesAdmin()) return;
    databaseUang.kasAwal = ambilAngkaMentah('input-kas-awal');
    simpanKeMemori();
    renderSeluruhSistem();
    alert('Saldo brankas kas dikalibrasi!');
}

function tambahBarangMaster(e) {
    e.preventDefault();
    if(!proteksiAksesAdmin()) return;
    const nama = document.getElementById('prod-nama').value;
    const kategori = document.getElementById('prod-kategori').value;
    const harga = ambilAngkaMentah('prod-harga');
    const stok = parseInt(document.getElementById('prod-stok').value) || 0;
    const fileFoto = document.getElementById('prod-foto').files[0];

    if (fileFoto) {
        const reader = new FileReader();
        reader.onloadend = function () { eksekusiSimpanProduk(nama, harga, stok, kategori, reader.result); };
        reader.readAsDataURL(fileFoto);
    } else { eksekusiSimpanProduk(nama, harga, stok, kategori, ""); }
}

function eksekusiSimpanProduk(nama, harga, stok, kategori, fotoBase64) {
    databaseUang.produk.push({ id: Date.now(), nama, harga, stok, kategori, fotoBase64 });
    simpanKeMemori();
    renderSeluruhSistem();
    document.getElementById('form-barang').reset();
}

// FIX UTAMA: Ditambahkan penahan event agar tidak ikut memicu tambahKeKeranjang()
function hapusMasterProduk(id, event) {
    if (event) event.stopPropagation(); 
    if (!proteksiAksesAdmin()) return;
    
    if (confirm("Hapus master barang produk ini permanen dari display toko?")) {
        databaseUang.produk = databaseUang.produk.filter(p => p.id !== id);
        keranjangKasir = keranjangKasir.filter(k => k.idProduk !== id);
        simpanKeMemori();
        renderSeluruhSistem();
    }
}

function restockProdukCepat(id, event) {
    if (event) event.stopPropagation(); 
    if(!proteksiAksesAdmin()) return;
    const prod = databaseUang.produk.find(p => p.id === id);
    if (!prod) return;

    let tambahan = prompt(`Jumlah pasokan restock untuk "${prod.nama}" (Stok sekarang: ${prod.stok}):`, "10");
    if (tambahan === null) return;

    let jumlah = parseInt(tambahan);
    if (isNaN(jumlah) || jumlah < 0) return alert("Jumlah angka tidak valid!");

    prod.stok += jumlah;
    simpanKeMemori();
    renderSeluruhSistem();
}

function tambahKeKeranjang(idProduk) {
    const prod = databaseUang.produk.find(p => p.id === idProduk);
    if (!prod) return;
    if (prod.stok <= 0) return alert("Gagal transaksi: Stok di gudang display kosong!");

    const item = keranjangKasir.find(k => k.idProduk === idProduk);
    if (item) {
        if (item.qty >= prod.stok) return alert("Pembelian melampaui sisa pasokan stok toko!");
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

function renderKeranjangBelanja() {
    const cartBody = document.getElementById('cart-body');
    if(!cartBody) return;
    cartBody.innerHTML = '';
    let kotorBill = 0;

    keranjangKasir.forEach(item => {
        const subtotal = item.harga * item.qty;
        kotorBill += subtotal;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span style="font-size:0.85rem; font-weight:600;">${item.nama}</span><br>
                <small class="text-muted">${formatMataUang(item.harga)}</small>
            </td>
            <td>
                <div class="qty-btn-group" style="display:flex; align-items:center; gap:4px;">
                    <button class="qty-btn" onclick="ubahQtyKeranjang(${item.idProduk}, -1)">-</button>
                    <span style="font-weight:bold; font-size:0.85rem;">${item.qty}</span>
                    <button class="qty-btn" onclick="ubahQtyKeranjang(${item.idProduk}, 1)">+</button>
                </div>
            </td>
            <td style="font-weight:bold;">${formatMataUang(subtotal)}</td>
            <td><button onclick="ubahQtyKeranjang(${item.idProduk}, -${item.qty})" class="btn btn-danger" style="padding: 2px 6px; font-size:0.7rem;">✕</button></td>
        `;
        cartBody.appendChild(tr);
    });

    // Kalkulasi Simulator Diskon Nota Jualan
    const diskonPersen = parseFloat(document.getElementById('cart-discount').value) || 0;
    const nilaiPotongan = (diskonPersen / 100) * kotorBill;
    const bersihBill = Math.max(0, kotorBill - nilaiPotongan);

    document.getElementById('cart-total-bill').innerText = formatMataUang(bersihBill);
    hitungKembalian();
    updateDiagramNota(); 
}

function hitungKembalian() {
    const finalBill = parseFloat(document.getElementById('cart-total-bill').innerText.replace(/[^0-9]/g, '')) || 0;
    const cash = ambilAngkaMentah('pay-amount');
    const kembalian = cash - finalBill;
    const displayChange = document.getElementById('pay-change');

    if (!displayChange) return;
    if (kembalian < 0) {
        displayChange.innerText = "Uang Kurang!";
        displayChange.className = "text-danger";
    } else {
        displayChange.innerText = formatMataUang(kembalian);
        displayChange.className = "text-success";
    }
}

function prosesSelesaiBayar() {
    if (keranjangKasir.length === 0) return alert("Nota transaksi kosong!");
    const total = parseFloat(document.getElementById('cart-total-bill').innerText.replace(/[^0-9]/g, '')) || 0;
    const bayar = ambilAngkaMentah('pay-amount');

    if (bayar < total) return alert("Pembayaran kas belum cukup!");

    keranjangKasir.forEach(item => {
        const prod = databaseUang.produk.find(p => p.id === item.idProduk);
        if (prod) prod.stok -= item.qty;
    });

    let rincian = keranjangKasir.map(k => `${k.nama} (x${k.qty})`).join(', ');
    databaseUang.transaksi.push({ id: Date.now(), jenis: 'pemasukan', nama: `Pen penjualan: ${rincian}`, nominal: total, cicilan: 0 });
    databaseUang.kasAwal += total;

    logStrukTerakhir = { notaId: Date.now().toString().slice(-6), items: [...keranjangKasir], total, bayar, kembali: bayar - total };
    alert(`🎉 Pembayaran Lunas!`);

    keranjangKasir = [];
    document.getElementById('pay-amount').value = '';
    document.getElementById('cart-discount').value = '0';
    simpanKeMemori();
    renderSeluruhSistem();
    buatStrukturHtmlStruk();
}

function buatStrukturHtmlStruk() {
    if (!logStrukTerakhir) return;
    const printableArea = document.getElementById('struk-printable');
    let itemRows = logStrukTerakhir.items.map(i => `${i.nama}<br>  ${i.qty} x ${formatMataUang(i.harga)} = ${formatMataUang(i.qty * i.harga)}`).join('<br>');
    printableArea.innerHTML = `
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px;">
            <h3>SMARTCASHIER RECEIPT</h3><small>ID: #${logStrukTerakhir.notaId}</small>
        </div>
        <div style="border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; font-size:11px;">${itemRows}</div>
        <div style="font-size:11px;"><strong>TOTAL AKHIR: ${formatMataUang(logStrukTerakhir.total)}</strong><br>TUNAI: ${formatMataUang(logStrukTerakhir.bayar)}<br>KEMBALI: ${formatMataUang(logStrukTerakhir.kembali)}</div>
    `;
}

function cetakStrukThermal() {
    if (!logStrukTerakhir) return alert("Belum ada memori rekaman nota jualan terakhir!");
    buatStrukturHtmlStruk();
    window.print();
}

function tambahTransaksiBiaya(e) {
    e.preventDefault();
    if(!proteksiAksesAdmin()) return;
    const jenis = document.getElementById('tx-jenis').value;
    const nama = document.getElementById('tx-nama').value;
    const nominal = ambilAngkaMentah('tx-nominal');
    const cicilan = ambilAngkaMentah('tx-cicilan');

    if (jenis === 'pengeluaran') {
        databaseUang.kasAwal -= nominal;
    }
    databaseUang.transaksi.push({ id: Date.now(), jenis, nama, nominal, cicilan: jenis === 'utang' ? cicilan : 0 });
    simpanKeMemori();
    renderSeluruhSistem();
    document.getElementById('form-transaksi').reset();
    sesuaikanFormUtang();
}

function hapusTransaksiJurnal(id) {
    if(!proteksiAksesAdmin()) return;
    const item = databaseUang.transaksi.find(t => t.id === id);
    if (item && item.jenis === 'pengeluaran') {
        databaseUang.kasAwal += item.nominal;
    }
    databaseUang.transaksi = databaseUang.transaksi.filter(t => t.id !== id);
    simpanKeMemori();
    renderSeluruhSistem();
}

// ================= RENDER INTERACTION SYSTEMS =================
function renderSeluruhSistem() {
    const adminElements = document.querySelectorAll('.admin-only');
    if (currentUserRole === 'admin') {
        adminElements.forEach(el => el.style.display = 'block');
        document.getElementById('user-badge').innerText = "👑 Admin";
        document.getElementById('user-badge').className = "role-indicator badge-admin";
    } else {
        adminElements.forEach(el => el.style.display = 'none');
        document.getElementById('user-badge').innerText = "🧑‍💼 Kasir";
        document.getElementById('user-badge').className = "role-indicator badge-kasir";
    }

    let totalOmsetKasirPemasukan = 0;
    let totalBebanBiayaTetap = 0;
    let totalUtangPokokBisnis = 0;
    let totalNilaiAsetBarangToko = 0;
    let arrayStokKritis = [];

    const ledgerBody = document.getElementById('ledger-body');
    if(ledgerBody) ledgerBody.innerHTML = '';

    databaseUang.transaksi.forEach(item => {
        if (item.jenis === 'pemasukan') totalOmsetKasirPemasukan += item.nominal;
        else if (item.jenis === 'pengeluaran') totalBebanBiayaTetap += item.nominal;
        else if (item.jenis === 'utang') {
            totalUtangPokokBisnis += item.nominal;
            totalBebanBiayaTetap += item.cicilan;
        }

        if(ledgerBody) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="badge-capsule bg-${item.jenis}">${item.jenis}</span></td>
                <td><strong>${item.nama}</strong></td>
                <td style="font-weight:bold;">${formatMataUang(item.nominal)}</td>
                <td class="text-danger">${item.jenis === 'utang' ? formatMataUang(item.cicilan) + '/bln' : '-'}</td>
                <td><button onclick="hapusTransaksiJurnal(${item.id})" class="btn btn-danger" style="padding:4px 8px; font-size:0.75rem;">🗑️ Hapus</button></td>
            `;
            ledgerBody.appendChild(tr);
        }
    });

    const catalogContainer = document.getElementById('cashier-catalog-container');
    if(catalogContainer) catalogContainer.innerHTML = '';

    databaseUang.produk.forEach(prod => {
        totalNilaiAsetBarangToko += (prod.harga * prod.stok);
        if (prod.stok <= 3) arrayStokKritis.push(`${prod.nama} (${prod.stok} sisa)`);

        if(catalogContainer) {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.setAttribute('data-nama', prod.nama.toLowerCase());
            card.setAttribute('data-id', prod.id.toString());
            card.setAttribute('data-kategori', prod.kategori || 'Umum');
            card.onclick = () => tambahKeKeranjang(prod.id);
            
            let frameContent = prod.fotoBase64 ? `<img src="${prod.fotoBase64}" alt="${prod.nama}">` : `<span>📦</span>`;
            
            // FIX UTAMA: Ditambahkan tombol hapus micro overlay dengan event stopper
            let actionButtons = '';
            if (currentUserRole === 'admin') {
                actionButtons = `
                    <div class="prod-meta-actions" style="margin-top: 8px; display:flex; gap:5px; width:100%;">
                        <button class="btn-restock" onclick="restockProdukCepat(${prod.id}, event)" style="flex:1; background:var(--clr-indigo); color:#fff; border:none; padding:4px; font-size:0.7rem; border-radius:4px; cursor:pointer;">+ Stok</button>
                        <button class="btn btn-danger" style="padding: 2px 6px; font-size: 0.7rem;" onclick="hapusMasterProduk(${prod.id}, event)">🗑️</button>
                    </div>`;
            }

            card.innerHTML = `
                <div class="img-frame">${frameContent}</div>
                <div class="prod-info" style="width:100%;">
                    <h4 style="font-size:0.9rem; margin-bottom:4px;">${prod.nama}</h4>
                    <div class="prod-meta" style="display:flex; justify-content:space-between; font-size:0.8rem;">
                        <span class="text-success" style="font-weight:700;">${formatMataUang(prod.harga)}</span>
                        <span style="color:${prod.stok <= 3 ? '#f43f5e' : '#9ca3af'}; font-weight:bold;">Stok: ${prod.stok}</span>
                    </div>
                    ${actionButtons}
                </div>
            `;
            catalogContainer.appendChild(card);
        }
    });

    // Pemicu filter pencarian & kategori setelah rendering selesai
    handleLiveSearch();

    const panelStok = document.getElementById('panel-stok-kritis');
    if (panelStok) {
        if (arrayStokKritis.length > 0 && currentUserRole === 'admin') {
            panelStok.style.display = "block";
            document.getElementById('list-stok-kritis').innerText = arrayStokKritis.join(', ');
        } else { panelStok.style.display = "none"; }
    }

    document.getElementById('stat-total-kas').innerText = formatMataUang(databaseUang.kasAwal);
    document.getElementById('stat-total-barang').innerText = formatMataUang(totalNilaiAsetBarangToko);
    document.getElementById('stat-total-utang').innerText = formatMataUang(totalUtangPokokBisnis);

    const defisitOperasional = totalBebanBiayaTetap - totalOmsetKasirPemasukan;
    const statRunway = document.getElementById('stat-runway');
    const runwaySub = document.getElementById('runway-sub');
    let nilaiRunwayBulan = 999;

    if (defisitOperasional <= 0) {
        statRunway.innerText = "∞ Aman";
        statRunway.className = "text-success";
        runwaySub.innerText = "Omset Kasir Surplus";
    } else {
        nilaiRunwayBulan = databaseUang.kasAwal / defisitOperasional;
        statRunway.innerText = nilaiRunwayBulan.toFixed(1) + " Bulan";
        statRunway.className = nilaiRunwayBulan <= 2 ? "text-danger" : "text-warning";
    }

    let totalCicilanSaja = databaseUang.transaksi.filter(t => t.jenis === 'utang').reduce((sum, curr) => sum + curr.cicilan, 0);
    const rasioUtang = totalOmsetKasirPemasukan > 0 ? (totalCicilanSaja / totalOmsetKasirPemasukan) * 100 : (totalCicilanSaja > 0 ? 100 : 0);

    document.getElementById('debt-ratio-badge').innerText = `DSR: ${rasioUtang.toFixed(1)}%`;
    const dsrBar = document.getElementById('dsr-progress-bar');
    const dsrInterpretation = document.getElementById('dsr-interpretation');

    if(dsrBar) {
        dsrBar.style.width = Math.min(rasioUtang, 100) + '%';
        if (rasioUtang <= 35) {
            dsrBar.style.backgroundColor = '#10b981'; 
            dsrInterpretation.innerText = `🟢 Sehat. Kapasitas sisa pinjaman aman.`;
        } else if (rasioUtang <= 50) {
            dsrBar.style.backgroundColor = '#f59e0b'; 
            dsrInterpretation.innerText = `🟡 Waspada! Cicilan memotong omset bulanan toko.`;
        } else {
            dsrBar.style.backgroundColor = '#f43f5e'; 
            dsrInterpretation.innerText = `🔴 Krisis Likuiditas! Setengah omset tergerus utang.`;
        }
    }

    const finScoreNode = document.getElementById('fin-score');
    if(finScoreNode) {
        if (rasioUtang <= 35 && defisitOperasional <= 0) {
            finScoreNode.innerText = "A"; finScoreNode.style.color = "#10b981";
        } else if (rasioUtang <= 45 && nilaiRunwayBulan >= 3) {
            finScoreNode.innerText = "B"; finScoreNode.style.color = "#3b82f6";
        } else if (rasioUtang <= 60 && nilaiRunwayBulan >= 1.5) {
            finScoreNode.innerText = "C"; finScoreNode.style.color = "#f59e0b";
        } else {
            finScoreNode.innerText = "F"; finScoreNode.style.color = "#f43f5e";
        }
    }

    evaluasiKondisiKebangkrutan(nilaiRunwayBulan, rasioUtang, defisitOperasional, totalNilaiAsetBarangToko);
    renderKeranjangBelanja();
}

function evaluasiKondisiKebangkrutan(runway, rasioUtang, defisit, totalAsetBarang) {
    const title = document.getElementById('radar-title');
    const desc = document.getElementById('radar-desc');
    const actions = document.getElementById('radar-actions');
    const statusGlobal = document.getElementById('status-global');

    if(!title || !desc || !actions || !statusGlobal) return;

    if (runway <= 1.5 && defisit > 0) {
        title.innerText = "🚨 ALARM CRISIS: Risiko Bangkrut Jangka Pendek";
        desc.innerText = `Defisit bulanan mencapai ${formatMataUang(defisit)}. Sisa dana operasional habis dlm ${runway.toFixed(1)} bln.`;
        statusGlobal.innerText = "Krisis Akut"; statusGlobal.className = "badge text-danger";
        actions.innerHTML = `<li><strong>Obral Likuidasi Stok:</strong> Ubah barang senilai ${formatMataUang(totalAsetBarang)} menjadi kas siap pakai!</li>`;
    } else {
        title.innerText = "✅ DASHBOARD STABIL: Arus Kas Normal";
        desc.innerText = "Omset transaksi kasir aman mencakup beban kebutuhan biaya periodik.";
        statusGlobal.innerText = "Sehat"; statusGlobal.className = "badge text-success";
        actions.innerHTML = `<li>Pertahankan pencatatan kasir digital secara real-time.</li>`;
    }
}