let databaseUang = {
    kasAwal: 0,
    transaksi: [],
    produk: [],
    target: { hari: 1000000, bulan: 30000000, tahun: 360000000 },
    hutang: { total: 0, cicilan: 0 }
};

let keranjangKasir = [];
let chartBisnisInstance = null; 
let currentUserRole = null; 
let periodeGrafikAktif = "hari";

const PIN_ADMIN = "1234";
const PIN_KASIR = "5678";

function getIsoDateString(date = new Date()) {
    return date.toISOString().split('T')[0];
}

function dapatkanBatasMingguIni() {
    let sekarang = new Date();
    let hariKe = sekarang.getDay(); 
    let selisihMulai = sekarang.getDate() - hariKe + (hariKe === 0 ? -6 : 1); 
    let mulaiMinggu = new Date(sekarang.setDate(selisihMulai));
    let akhirMinggu = new Date(mulaiMinggu);
    akhirMinggu.setDate(akhirMinggu.getDate() + 6);
    return { mulai: getIsoDateString(mulaiMinggu), akhir: getIsoDateString(akhirMinggu) };
}

window.onload = function () {
    const sessionRole = sessionStorage.getItem('cashier_session_role');
    const dataLokal = localStorage.getItem('smarthcashier_v4_data');

    if (dataLokal) {
        databaseUang = JSON.parse(dataLokal);
        if (!databaseUang.produk) databaseUang.produk = [];
        if (!databaseUang.transaksi) databaseUang.transaksi = [];
        if (!databaseUang.target) databaseUang.target = { hari: 1000000, bulan: 30000000, tahun: 360000000 };
        if (!databaseUang.hutang) databaseUang.hutang = { total: 0, cicilan: 0 };
    } else {
        ResetDataDefault();
    }

    if (sessionRole) {
        currentUserRole = sessionRole;
        document.getElementById('login-overlay').style.display = 'none';
        sinkronisasiFormConfig();
        renderSeluruhSistem();
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
    }
};

// ================= SECURITY AUTHENTICATION =================
function prosesLogin() {
    const role = document.getElementById('login-role').value;
    const pin = document.getElementById('login-pin').value;

    if (role === 'admin' && pin === PIN_ADMIN) currentUserRole = 'admin';
    else if (role === 'kasir' && pin === PIN_KASIR) currentUserRole = 'kasir';
    else return alert("⚠️ PIN Keamanan Salah!");

    sessionStorage.setItem('cashier_session_role', currentUserRole);
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('login-pin').value = '';
    sinkronisasiFormConfig();
    renderSeluruhSistem();
}

function prosesLogout() {
    currentUserRole = null;
    sessionStorage.removeItem('cashier_session_role');
    document.getElementById('login-overlay').style.display = 'flex';
}

function proteksiAksesAdmin() {
    if (currentUserRole !== 'admin') {
        alert("🛡️ AKSES DITOLAK: Fitur ini hanya dikhususkan bagi Owner/Admin!");
        return false;
    }
    return true;
}

function ResetDataDefault() {
    databaseUang.kasAwal = 5000000;
    databaseUang.target = { hari: 1000000, bulan: 25000000, tahun: 300000000 };
    databaseUang.hutang = { total: 15000000, cicilan: 750000 };
    databaseUang.produk = [
        { id: 101, nama: 'Tensimeter Digital', hargaBeli: 180000, hargaJual: 275000, stok: 20 },
        { id: 102, nama: 'Stetoskop Premium', hargaBeli: 110000, hargaJual: 195000, stok: 12 }
    ];
    
    let tgl = getIsoDateString();
    databaseUang.transaksi = [
        { id: Date.now()-5000, tanggal: tgl, jenis: 'pemasukan', nama: 'Nota Kasir #TR01', nominal: 470000, hppTotal: 290000, rincian: [] }
    ];
    simpanKeMemori();
}

function simpanKeMemori() {
    localStorage.setItem('smarthcashier_v4_data', JSON.stringify(databaseUang));
}

function sinkronisasiFormConfig() {
    if(currentUserRole !== 'admin') return;
    document.getElementById('cfg-target-hari').value = formatMataUang(databaseUang.target.hari);
    document.getElementById('cfg-target-bulan').value = formatMataUang(databaseUang.target.bulan);
    document.getElementById('cfg-target-tahun').value = formatMataUang(databaseUang.target.tahun);
    document.getElementById('cfg-total-hutang').value = formatMataUang(databaseUang.hutang.total);
    document.getElementById('cfg-cicilan-hutang').value = formatMataUang(databaseUang.hutang.cicilan);
}

// ================= CONFIG INPUT UPDATE =================
function simpanKonfigurasiBisnis(e) {
    e.preventDefault();
    if (!proteksiAksesAdmin()) return;

    databaseUang.target.hari = ambilAngkaMentah('cfg-target-hari');
    databaseUang.target.bulan = ambilAngkaMentah('cfg-target-bulan');
    databaseUang.target.tahun = ambilAngkaMentah('cfg-target-tahun');
    databaseUang.hutang.total = ambilAngkaMentah('cfg-total-hutang');
    databaseUang.hutang.cicilan = ambilAngkaMentah('cfg-cicilan-hutang');

    simpanKeMemori();
    renderSeluruhSistem();
    alert("⚙️ Parameter Bisnis Berhasil Diperbarui!");
}

// ================= MANAJEMEN MASTER PRODUK =================
function tambahBarangMaster(e) {
    e.preventDefault();
    if (!proteksiAksesAdmin()) return;

    const nama = document.getElementById('prod-nama').value;
    const hargaBeli = ambilAngkaMentah('prod-harga-beli');
    const hargaJual = ambilAngkaMentah('prod-harga-jual');
    const stok = parseInt(document.getElementById('prod-stok').value) || 0;

    if (hargaBeli >= hargaJual) {
        return alert("⚠️ ERROR: Harga jual tidak boleh di bawah harga modal beli!");
    }

    databaseUang.produk.push({ id: Date.now(), nama, hargaBeli, hargaJual, stok });
    simpanKeMemori();
    renderSeluruhSistem();
    document.getElementById('form-barang').reset();
}

function hapusBarangMaster(idBarang) {
    if (!proteksiAksesAdmin()) return;
    if (confirm("Apakah Anda yakin ingin menghapus barang ini dari database toko secara permanen?")) {
        databaseUang.produk = databaseUang.produk.filter(p => p.id !== idBarang);
        // Bersihkan juga dari keranjang kasir jika sedang dipilih
        keranjangKasir = keranjangKasir.filter(k => k.idProduk !== idBarang);
        simpanKeMemori();
        renderSeluruhSistem();
    }
}

// ================= WORKSPACE TRANSAKSI KASIR =================
function tambahKeKeranjang(idProduk) {
    const prod = databaseUang.produk.find(p => p.id === idProduk);
    if (!prod || prod.stok <= 0) return alert("Stok habis!");

    const item = keranjangKasir.find(k => k.idProduk === idProduk);
    if (item) {
        if (item.qty >= prod.stok) return alert("Batas stok etalase tercapai!");
        item.qty++;
    } else {
        keranjangKasir.push({ idProduk: idProduk, nama: prod.nama, hargaBeli: prod.hargaBeli, hargaJual: prod.hargaJual, qty: 1 });
    }
    renderKeranjangBelanja();
}

function ubahQtyKeranjang(idProduk, value) {
    const item = keranjangKasir.find(k => k.idProduk === idProduk);
    if (!item) return;
    item.qty += value;
    if (item.qty <= 0) keranjangKasir = keranjangKasir.filter(k => k.idProduk !== idProduk);
    renderKeranjangBelanja();
}

function renderKeranjangBelanja() {
    const body = document.getElementById('cart-body');
    if(!body) return;
    body.innerHTML = '';
    let totalKotor = 0;

    keranjangKasir.forEach(item => {
        let subtotal = item.hargaJual * item.qty;
        totalKotor += subtotal;
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nama}</td>
            <td>
                <button class="qty-btn" onclick="ubahQtyKeranjang(${item.idProduk}, -1)">-</button>
                <strong>${item.qty}</strong>
                <button class="qty-btn" onclick="ubahQtyKeranjang(${item.idProduk}, 1)">+</button>
            </td>
            <td>${formatMataUang(subtotal)}</td>
            <td><button onclick="ubahQtyKeranjang(${item.idProduk}, -${item.qty})" class="btn-delete" style="padding:2px 6px;">✕</button></td>
        `;
        body.appendChild(tr);
    });

    let diskon = parseFloat(document.getElementById('cart-discount').value) || 0;
    let totalBersih = Math.max(0, totalKotor - (totalKotor * (diskon / 100)));
    document.getElementById('cart-total-bill').innerText = formatMataUang(totalBersih);
    hitungKembalian();
}

function hitungKembalian() {
    let bill = parseFloat(document.getElementById('cart-total-bill').innerText.replace(/[^0-9]/g, '')) || 0;
    let pay = ambilAngkaMentah('pay-amount');
    let change = pay - bill;
    let node = document.getElementById('pay-change');
    if (change < 0) { node.innerText = "Uang Kurang!"; node.style.color = "#ef4444"; }
    else { node.innerText = formatMataUang(change); node.style.color = "#10b981"; }
}

function prosesSelesaiBayar() {
    if (keranjangKasir.length === 0) return alert("Nota keranjang belanja kosong!");
    let bill = parseFloat(document.getElementById('cart-total-bill').innerText.replace(/[^0-9]/g, '')) || 0;
    let pay = ambilAngkaMentah('pay-amount');

    if (pay < bill) return alert("Uang pembayaran belum mencukupi tagihan!");

    let kalkulasiHppNota = 0;
    keranjangKasir.forEach(item => {
        const prod = databaseUang.produk.find(p => p.id === item.idProduk);
        if (prod) {
            prod.stok -= item.qty;
            kalkulasiHppNota += (prod.hargaBeli * item.qty);
        }
    });

    databaseUang.transaksi.push({
        id: Date.now(),
        tanggal: getIsoDateString(),
        jenis: 'pemasukan',
        nama: `Nota Kasir Penjualan`,
        nominal: bill,
        hppTotal: kalkulasiHppNota
    });

    keranjangKasir = [];
    document.getElementById('pay-amount').value = '';
    document.getElementById('cart-discount').value = '0';
    simpanKeMemori();
    renderSeluruhSistem();
    alert("🎉 Pembayaran Sukses! Stok berkurang.");
}

// ================= GRAPH PERIODIK SYSTEM =================
function ubahPeriodeGrafik(periode, element) {
    periodeGrafikAktif = periode;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    renderGrafikBisnis();
}

function renderGrafikBisnis() {
    const canvas = document.getElementById('chart-analisis-bisnis');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartBisnisInstance) chartBisnisInstance.destroy();

    let dataOmset = [0, 0, 0, 0]; let dataLaba = [0, 0, 0, 0]; let labelGrafik = [];
    let hariIni = getIsoDateString(); let mgg = dapatkanBatasMingguIni();
    let bulanIni = hariIni.slice(0, 7); let tahunIni = hariIni.slice(0, 4);

    if (periodeGrafikAktif === "hari") {
        labelGrafik = ['00-06', '06-12', '12-18', '18-24'];
        databaseUang.transaksi.forEach(t => {
            if (t.tanggal === hariIni) {
                let jam = new Date(t.id).getHours();
                let idx = jam < 6 ? 0 : jam < 12 ? 1 : jam < 18 ? 2 : 3;
                if (t.jenis === 'pemasukan') { dataOmset[idx] += t.nominal; dataLaba[idx] += (t.nominal - t.hppTotal); }
            }
        });
    } else if (periodeGrafikAktif === "minggu") {
        labelGrafik = ['Sen-Sel', 'Rab-Kam', 'Jum-Sab', 'Minggu'];
        databaseUang.transaksi.forEach(t => {
            if (t.tanggal >= mgg.mulai && t.tanggal <= mgg.akhir) {
                let d = new Date(t.id).getDay();
                let idx = d === 1 || d === 2 ? 0 : d === 3 || d === 4 ? 1 : d === 5 || d === 6 ? 2 : 3;
                if (t.jenis === 'pemasukan') { dataOmset[idx] += t.nominal; dataLaba[idx] += (t.nominal - t.hppTotal); }
            }
        });
    } else if (periodeGrafikAktif === "bulan") {
        labelGrafik = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
        databaseUang.transaksi.forEach(t => {
            if (t.tanggal && t.tanggal.slice(0, 7) === bulanIni) {
                let tgl = new Date(t.id).getDate();
                let idx = tgl <= 7 ? 0 : tgl <= 14 ? 1 : tgl <= 21 ? 2 : 3;
                if (t.jenis === 'pemasukan') { dataOmset[idx] += t.nominal; dataLaba[idx] += (t.nominal - t.hppTotal); }
            }
        });
    } else if (periodeGrafikAktif === "tahun") {
        labelGrafik = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Okt-Des'];
        databaseUang.transaksi.forEach(t => {
            if (t.tanggal && t.tanggal.slice(0, 4) === tahunIni) {
                let bln = new Date(t.id).getMonth();
                let idx = bln < 3 ? 0 : bln < 6 ? 1 : bln < 9 ? 2 : 3;
                if (t.jenis === 'pemasukan') { dataOmset[idx] += t.nominal; dataLaba[idx] += (t.nominal - t.hppTotal); }
            }
        });
    }

    chartBisnisInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labelGrafik,
            datasets: [
                { label: 'Omset', data: dataOmset, borderColor: '#3b82f6', tension: 0.2, fill: false },
                { label: 'Untung Murni', data: dataLaba, borderColor: '#10b981', tension: 0.2, fill: false }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#f3f4f6' } } } }
    });
}

// ================= MONITORING RENDER ENGINE =================
function renderSeluruhSistem() {
    const adminElements = document.querySelectorAll('.admin-only');
    if (currentUserRole === 'admin') {
        adminElements.forEach(el => el.style.display = 'block');
        document.getElementById('user-badge').innerText = "👑 Admin";
    } else {
        adminElements.forEach(el => el.style.display = 'none');
        document.getElementById('user-badge').innerText = "🧑‍💼 Kasir";
    }

    let tOmset = 0; let tHpp = 0;
    let omsetHariIni = 0; let omsetBulanIni = 0; let omsetTahunIni = 0;
    let hariIni = getIsoDateString();
    let bulanIni = hariIni.slice(0, 7);
    let tahunIni = hariIni.slice(0, 4);

    const ledger = document.getElementById('ledger-body');
    if (ledger) ledger.innerHTML = '';

    databaseUang.transaksi.forEach(t => {
        if (t.jenis === 'pemasukan') {
            tOmset += t.nominal;
            tHpp += t.hppTotal;
            if(t.tanggal === hariIni) omsetHariIni += t.nominal;
            if(t.tanggal && t.tanggal.slice(0, 7) === bulanIni) omsetBulanIni += t.nominal;
            if(t.tanggal && t.tanggal.slice(0, 4) === tahunIni) omsetTahunIni += t.nominal;
        }

        if (ledger) {
            let tr = document.createElement('tr');
            tr.innerHTML = `<td><span class="badge text-success">Pemasukan</span></td><td>${t.nama}<br><small>${t.tanggal}</small></td><td>${formatMataUang(t.nominal)}</td><td>-</td>`;
            ledger.appendChild(tr);
        }
    });

    let tBiayaTotal = databaseUang.hutang.cicilan; // Otomatis memasukkan beban utang bulanan ke operasional
    let tLabaBersih = tOmset - (tHpp + tBiayaTotal);

    document.getElementById('acc-omset').innerText = formatMataUang(tOmset);
    document.getElementById('acc-hpp').innerText = formatMataUang(tHpp);
    document.getElementById('acc-biaya').innerText = formatMataUang(tBiayaTotal);
    document.getElementById('acc-laba').innerText = formatMataUang(tLabaBersih);
    document.getElementById('txt-total-hutang').innerText = formatMataUang(databaseUang.hutang.total);

    // Render Progress Bar Target
    renderTargetProgressBar('hari', omsetHariIni, databaseUang.target.hari);
    renderTargetProgressBar('bulan', omsetBulanIni, databaseUang.target.bulan);
    renderTargetProgressBar('tahun', omsetTahunIni, databaseUang.target.tahun);

    // Update Status Toko Global
    let statusGlobal = document.getElementById('status-global');
    if (tLabaBersih > 0) { statusGlobal.innerText = "Surplus Profit"; statusGlobal.className = "badge text-success"; }
    else { statusGlobal.innerText = "Beban Tinggi"; statusGlobal.className = "badge text-danger"; }

    // Render Etalase Jualan Kasir
    const catalog = document.getElementById('cashier-catalog-container');
    if (catalog) catalog.innerHTML = '';

    // Render Tabel Penghapusan Barang (Admin)
    const tabelHapus = document.getElementById('tabel-kelola-barang');
    if (tabelHapus) tabelHapus.innerHTML = '';

    databaseUang.produk.forEach(p => {
        if (catalog) {
            let div = document.createElement('div');
            div.className = "product-card";
            div.setAttribute('data-nama', p.nama.toLowerCase());
            div.setAttribute('data-id', p.id.toString());
            div.onclick = () => tambahKeKeranjang(p.id);
            div.innerHTML = `<div class="img-frame">📦</div><div class="prod-info"><h4>${p.nama}</h4><span class="text-success">${formatMataUang(p.hargaJual)}</span><br><small>Stok: ${p.stok}</small></div>`;
            catalog.appendChild(div);
        }
        if (tabelHapus) {
            let tr = document.createElement('tr');
            tr.innerHTML = `<td>${p.id}</td><td><strong>${p.nama}</strong></td><td>${formatMataUang(p.hargaBeli)}</td><td>${formatMataUang(p.hargaJual)}</td><td><strong>${p.stok} unit</strong></td><td><button onclick="hapusBarangMaster(${p.id})" class="btn-delete">🗑️ Hapus Permanen</button></td>`;
            tabelHapus.appendChild(tr);
        }
    });

    renderGrafikBisnis();
    renderKeranjangBelanja();
}

function renderTargetProgressBar(id, realisasi, target) {
    let pct = target > 0 ? Math.min(100, (realisasi / target) * 100) : 0;
    document.getElementById(`progress-${id}`).style.width = `${pct}%`;
    document.getElementById(`label-target-${id}`).innerText = `${formatMataUang(realisasi)} / ${formatMataUang(target)} (${pct.toFixed(0)}%)`;
}

// ================= UTILITIES =================
function handleLiveSearch() {
    let kw = document.getElementById('scan-barcode').value.toLowerCase().trim();
    document.querySelectorAll('.product-card').forEach(card => {
        let nama = card.getAttribute('data-nama');
        let id = card.getAttribute('data-id');
        if (nama.includes(kw) || id.includes(kw)) card.style.display = 'flex';
        else card.style.display = 'none';
    });
}

function maskerRupiah(el) {
    let raw = el.value.replace(/[^0-9]/g, '');
    el.value = raw ? 'Rp ' + parseInt(raw, 10).toLocaleString('id-ID') : '';
}

function ambilAngkaMentah(id) {
    const el = document.getElementById(id);
    return el ? (parseFloat(el.value.replace(/[^0-9]/g, '')) || 0) : 0;
}

function formatMataUang(angka) {
    return 'Rp ' + Math.round(angka).toLocaleString('id-ID');
}
