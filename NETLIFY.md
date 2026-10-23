# Deploy KabarKelas dari Git

Situs produksi: https://kabarkelas-demo.netlify.app/.

1. Import repository `desainindongmas/kabarkelas-demo` di Netlify, branch `main`, base directory kosong.
2. Gunakan konfigurasi `netlify.toml`: build `npm run build`, publish `dist`, functions `netlify/functions`, Node.js 24 dan `AWS_LAMBDA_JS_RUNTIME=nodejs24.x`.
3. Deploy. Function `api` harus terpasang. Blobs store `kabarkelas-demo-v1` dibuat melalui identitas situs yang disediakan Netlify. Tidak perlu menyalin API key ke frontend atau repository.

## Pemeriksaan

Sebelum publish dari environment yang pernah dipakai sebelumnya, sinkronkan checkout dengan `main` di GitHub. Setelah push, cocokkan SHA commit pada deploy Netlify dengan commit terbaru di GitHub; referensi lokal yang belum di-fetch dapat masih menunjuk versi lama. Push berhasil belum membuktikan build dan publikasi di Netlify selesai.

- Buka situs HTTPS di browser baru: halaman pengenalan menawarkan tur singkat, jelajah demo, alur penggunaan, hitung kebutuhan dan pemesanan. Tur dapat dilewati atau diulang. Pilih jelajah untuk memilih paket dan peran, lalu pastikan status paket tetap tampil setelah reload.
- Hitung kebutuhan tanpa membuka ruang demo: 350 siswa dengan EWS merekomendasikan Pro Rp7.000.000/tahun; Yayasan tiga unit berisi 500 siswa/unit Rp30.000.000/tahun. Lanjutkan pemesanan, isi kontak dan persetujuan, simpan draf, unduh ringkasan, lalu reload untuk membuka draf terakhir. Browser lain tidak boleh membaca draf tersebut. Draf belum dikirim kepada tim KabarKelas; tujuan penjualan belum dikonfigurasi.
- Pada Standard, pekerjaan harian, rapor, SPP manual, QR, ekspor dan backup dasar tetap tersedia sesuai role; EWS, indikator/tren risiko dan alur pendampingan risiko tidak tampil maupun diterima dari API. Pada Pro/Yayasan, coba EWS memakai role akademik yang berwenang.
- Admin melihat dashboard administrasi tanpa menu EWS/nilai siswa. Guru + wali kelas memiliki akses tambahan khusus X IPA 1. Security hanya memiliki dashboard, pemindai QR, riwayat dan konfirmasi gerbang.
- Simpan biodata sebagai Admin atau nilai sebagai Guru, lalu reload: perubahan tetap tersedia untuk browser itu.
- SPP dicatat Admin sebagai tunai/transfer manual; Wali Murid membaca riwayat dan mengunduh kuitansi.
- Rapor massal menghasilkan ZIP berisi PDF di browser. Tidak ada `report-worker-background` pada versi ini; hapus konfigurasi Functions lama yang dipasang manual bila ada.
- Browser baru mendapat data dummy terpisah. Ini perilaku demo publik yang disengaja.
- Ubah paket sebagai Kepala Sekolah/Admin/Yayasan: data yang pernah disimpan tetap ada dan kewenangan role tidak bertambah. Perubahan paket ketiga unit demo harus atomik. Guru, Wali Murid, Siswa dan Security tidak boleh mengubah paket. Role Yayasan memerlukan paket Yayasan untuk tata kelola lintas unit; Pro saja tidak cukup.
- Periksa simulasi harga tahunan: 350 siswa Standard Rp4.500.000 dan Pro Rp7.000.000; 500 siswa Rp5.500.000 dan Rp8.500.000. Yayasan tiga unit berisi 500 siswa/unit berjumlah Rp30.000.000/tahun. Harga adalah simulasi proposal, bukan penawaran resmi yang ditandatangani atau pembayaran langganan.

## API dan penyimpanan

`app.mjs` melayani server lokal dan function Netlify yang sama. Entry point menggunakan Web Request API v2 untuk mempertahankan konfigurasi Blobs dari platform, termasuk `uncachedEdgeURL`. Adapter mempertahankan seluruh cookie sesi, ruang pengunjung dan pemilik draf. Setiap eksekusi memulihkan database SQLite sementara dari snapshot Blobs, dan menyimpan perubahan menggunakan ETag compare-and-set. Kesalahan konflik 409 meminta pengguna memuat ulang sebelum mengulangi perubahan.

`purchase-api.mjs` menyediakan `/api/purchase-drafts/session`, POST `/api/purchase-drafts`, dan GET `/api/purchase-drafts/:id`. Cookie HttpOnly `kk_buyer` membatasi akses pada draf milik pengunjung; tabel draf terpisah dari data sekolah dan backup akademik. API menghitung harga kanonis dari `shared/pricing.mjs`, memvalidasi kontak/persetujuan dan kesesuaian paket, serta memakai identitas permintaan untuk mencegah duplikasi saat penyimpanan dicoba ulang. Halaman publik menunda bootstrap demo sampai pengunjung memilih jelajah agar pembuatan ruang pertama tidak berlomba dengan sesi formulir. Menyimpan draf tidak membuat sesi akademik, mengirim pesan, memproses pembayaran, atau mengaktifkan paket.

Migrasi menambahkan data operasional pada ruang demo versi sebelumnya tanpa mereset biodata/nilai yang telah diubah. Migrasi product-v3 menambahkan arahan unit, target, kebutuhan, riwayat contoh semester, pengaturan paket dan kejadian gerbang. Role wali kelas lama dinormalisasi menjadi Guru + wali kelas, dan super admin lama menjadi Yayasan. Data chat/integrasi lama tidak lagi diekspos maupun dipakai. Backup baru hanya memasukkan koleksi yang masih didukung.

Paket tersimpan pada ruang demo pengunjung. Endpoint sesi publik menerima pilihan paket opsional untuk pengenalan; mekanisme ini hanya untuk demo internal, bukan otorisasi pembelian produksi. Endpoint perubahan paket memerlukan role Kepala Sekolah, Admin atau Yayasan dan memperbarui ketiga unit demo dalam satu transaksi. Bootstrap dan API memeriksa paket sekaligus role: Standard tidak mengirim koleksi EWS atau kolom risiko, Wali Murid/Siswa terbatas pada anak terhubung/diri sendiri, Admin/Security tidak mendapat EWS, dan role Yayasan hanya menangani agregat dengan paket Yayasan.

PDF, ZIP dan Excel dibuat pada perangkat pengguna. Tidak ada polling, background function, payment gateway, email, WhatsApp atau panggilan model AI. Pengumuman dan pengingat berada dalam aplikasi. Functions, Blobs, bandwidth, dan build tetap mengikuti kuota akun Netlify; pantau usage untuk menjaga pemakaian free tier.

## Jika bootstrap gagal

Periksa **Deploy log** dan **Functions → api → log**. Pastikan deploy berasal dari commit terbaru, Node/Functions runtime 24 tidak ditimpa pengaturan UI, dan Blobs tersedia pada situs. Entry point mengembalikan error JSON aman ketika konfigurasi Blobs tidak tersedia. `/api/bootstrap` memerlukan cookie sesi demo; membuka endpoint dari browser baru sebelum sesi dibuat menghasilkan 401.

Tes lokal memanggil default export Web API Function dengan konteks Netlify terinjeksi dan emulator Blobs resmi: cookie, persistensi, isolasi pengunjung, konflik penyimpanan dan hak akses. Cakupan paket mencakup penyaringan EWS Standard, batas role dan paket Yayasan, persistensi pilihan tanpa reset data, perubahan paket atomik, serta perhitungan harga tahunan dan pembulatan. Regresi adapter Lambda lama juga tercakup. Pemeriksaan lokal tidak membuktikan deploy di akun Netlify pengguna sudah aktif; periksa commit yang ditampilkan pada deploy setelah push.

## Kamera, QR, dan hak akses

Kamera memerlukan HTTPS dan izin perangkat. ZXing dimuat dari bundle lokal saat pemindai dipakai; tidak mengirim frame ke layanan eksternal. Unggah gambar dan kode kartu tersedia sebagai alternatif. Hasil pindai diverifikasi API; Security tidak dapat mengubah daftar penjemput atau menyetujui pengecualian sendiri. Admin memberi izin satu kali yang tanggal dan penggunaannya diperiksa server.

Uji role baru dengan Ganti peran. Bila dialog pengenalan belum muncul pada browser lama, gunakan Pusat bantuan untuk memulai skenario. Paket demo tidak memproses pembayaran. Harga tahunan menggunakan jumlah siswa aktual, interpolasi per segmen dan pembulatan total ke Rp1.000 sebelum menghitung rata-rata; lebih dari 2.000 siswa per unit memerlukan penawaran khusus. Yayasan minimal dua unit dan biaya Pro tiap unit hanya dihitung satu kali. Pengingat Pro/Yayasan hanya tampil saat aplikasi dibuka. Lihat [README.md](README.md) untuk harga serta contoh, dan [ROLE_ACCESS.md](ROLE_ACCESS.md) untuk cakupan ketujuh role, backup terpisah, dan batas API.
