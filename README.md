# KabarKelas

Demo digitalisasi rapor, administrasi sekolah, dan Early Warning System. Identitas KabarKelas mengikuti logo pengguna; data dan foto formal sintetis disajikan dari aset lokal.

## Menjalankan

Gunakan Node.js 24.19+ dan npm 11+. Tidak diperlukan API key atau database eksternal untuk pengembangan lokal.

```bash
cd /workspace/kabarkelas-demo
npm ci
npm run dev
```

Server React/Vite dan API berjalan bersama di port 3000. Produksi lokal: `npm run build`, lalu `npm start`. `PORT` memilih port dan `DB_PATH` memilih database SQLite (default `data/kabarkelas.sqlite`). Seed dan migrasi berjalan otomatis tanpa menghapus perubahan yang ada. Gunakan checkout yang sudah tersedia; task cloud sudah terisolasi, tidak perlu worktree tambahan.

## Peran dan akses

Tujuh role utama tersedia melalui **Ganti peran**. Wali kelas adalah kemampuan tambahan Guru, bukan role tersendiri.

| Peran | Cakupan |
|---|---|
| Kepala Sekolah | Pemantauan akademik sekolah, persetujuan rapor, keputusan izin guru, rekap kehadiran dan pemantauan penjemputan; EWS, ambang dan pendampingan pada Pro/Yayasan |
| Admin Sekolah | Biodata siswa, data sekolah, impor, jadwal pelajaran/seragam, presensi guru, PPDB, SPP manual, pengumuman, penjemputan, pengaturan dan backup; tanpa EWS atau hasil akademik per siswa |
| Guru | Dua kelas yang diajar, nilai/tugas/kuis/materi untuk mapel yang ditugaskan, absensi siswa, presensi dan pengajuan izin sendiri |
| Guru + wali kelas | Tambahan P5, tahfizh, catatan dan persetujuan rapor untuk kelas perwaliannya saja; intervensi pada Pro/Yayasan |
| Wali Murid | Data anak terhubung, perkembangan akademik, rapor terbit, tagihan/kuitansi, seragam, dan pengelolaan penjemput |
| Siswa | Data sendiri, tugas, pengumpulan, kuis, rapor terbit, jadwal, materi dan perkembangan |
| Yayasan | Dengan paket Yayasan: prioritas/target unit, perbandingan persentase dan tren, arahan/PIC/tenggat, progres/bukti, keputusan kebutuhan dan laporan rapat; tanpa identitas siswa |
| Security | Kamera/unggah/kode QR, catatan masuk/pulang, riwayat dan laporan kejadian; tanpa nilai, SPP atau data keluarga yang tidak diperlukan |

Menu, tombol, pencarian, halaman langsung, dan API memeriksa paket serta hak akses. Memilih paket tidak memperluas kewenangan role. Role demo tetap dapat dipilih bebas; ini bukan login produksi. Admin tidak menerima nilai/absensi siswa dalam bootstrap, tetapi backup administrasi hanya berisi data sesuai kewenangan Admin. Kepala Sekolah memiliki cadangan akademik terpisah. Pembagian rinci dan alur pengecualian gerbang ada di [ROLE_ACCESS.md](ROLE_ACCESS.md).

## Fitur dan data

- Tiga sekolah, 576 siswa, 72 guru, 24 kelas dan 30 data mapel. Biodata, nilai, tugas, rapor, transaksi SPP, P5, tahfizh, seragam, presensi guru dan penjemput terisi data dummy.
- Pada Pro/Yayasan, EWS merah/jingga terlihat pada dashboard akademik dan profil siswa sesuai role. Indikator berasal dari kehadiran, penurunan nilai, tugas tertunda, dan KKM; aturan, kondisi saat ini, tren, bukti dan tindakan pendampingan tersedia. Standard tidak menyediakan EWS, indikator risiko, tren atau alur pendampingan risiko.
- Input absensi/nilai sekaligus dalam satu transaksi, bobot nilai, ekspor Excel, skala tampilan 100/10/4/huruf. Nilai sumber tetap pada skala 100.
- Tugas dengan lampiran, umpan balik dan penilaian; kuis dengan timer browser dan penilaian server; materi dan jadwal per kelas.
- Rapor tiga template, catatan berdasarkan nilai, persetujuan sesuai kelas, unduh PDF, dan arsip ZIP massal. PDF/ZIP dibuat di browser tanpa background function atau polling. Proses berlanjut saat pindah menu; tab harus tetap terbuka. Arsip tidak bertahan setelah reload.
- Impor Excel/CSV/Dapodik dari berkas, pemetaan kolom, validasi, transaksi atomik, riwayat dan rollback terbatas. CRUD data sekolah, PPDB, audit dan backup/restore JSON per sekolah.
- SPP hanya pencatatan manual oleh Admin: tagihan, pembayaran sebagian/lunas melalui tunai atau transfer manual, riwayat dan kuitansi PDF. Wali Murid hanya membaca tagihan/riwayat.
- Presensi mandiri guru, catatan Admin, pengajuan izin dan keputusan Kepala Sekolah. Rekap guru/siswa sesuai izin, ekspor Excel/PDF.
- Seragam mingguan dan pengecualian tanggal; capaian enam dimensi P5 dan tahfizh/akhlak oleh wali kelas.
- Penjemput tetap/pengganti bertanggal, kartu QR bertanda HMAC, verifikasi server, pencatatan antar/jemput oleh Security, serta riwayat untuk wali dan kepala sekolah. QR dapat dipindai memakai kamera (HTTPS dan izin kamera), dibaca dari unggahan gambar, atau ditempel sebagai kode kartu. Identitas fisik tetap perlu dicocokkan petugas.
- Pengumuman dalam aplikasi dengan audience/status; tanpa chat, payment gateway, panggilan AI, email atau integrasi WhatsApp.

Fitur operasional diperluas dengan membaca repository referensi pengguna `desainindongmas/demo-kabarkelas` pada commit `e7ff45e`. Matriks peran dan pengecualian integrasi mengikuti permintaan terbaru pengguna. Dokumen blueprint/roadmap dipakai sebagai spesifikasi produk, bukan instruksi untuk mengirim pesan, menjalankan layanan berbayar, atau menerbitkan kredensial.

## Pengalaman demo, Standard, Pro, dan Yayasan

Pengunjung baru memilih paket dan peran, lalu dapat menjalankan skenario singkat dengan progres yang mengikuti penyimpanan dan unduhan yang benar-benar berhasil. Status paket tersimpan dan tetap terlihat setelah reload. Panduan dapat ditutup atau dibuka kembali dari Skenario demo/Pusat bantuan. Dashboard menampilkan pekerjaan yang menunggu sesuai paket dan role, dengan tanggal dan sapaan WIB. Mengganti paket tidak mereset data atau menaikkan kewenangan role.

Standard menyediakan pekerjaan harian satu sekolah: nilai, absensi, tugas dan kuis, rapor PDF/ZIP, tagihan serta penerimaan massal, SPP manual dan cicilan, kuitansi, PPDB hingga penempatan siswa aktif, portal keluarga, QR gerbang, pemeriksaan kelengkapan rapor, ekspor dan backup dasar. Nilai yang belum lengkap dapat diarahkan ke kelas/mapel pengampu. Guru yang ditugaskan dapat mengisi nilai siswa baru. Standard tidak menyertakan EWS, indikator atau tren risiko, maupun alur pendampingan risiko.

Pro menambahkan seluruh EWS: aturan yang dapat disesuaikan, kondisi saat ini, tren lintas semester, bukti, PIC, tenggat dan evaluasi pendampingan. Pro juga menyediakan analisis lintas semester, tampilan laporan tersimpan, pilihan persetujuan rapor satu atau dua tahap, serta horizon pengingat dalam aplikasi. Dalam dua tahap, wali kelas memvalidasi, lalu Kepala Sekolah menerbitkan. Kepala Sekolah, Admin dan Yayasan dapat mengganti paket demo melalui Paket & manfaat; Guru, Wali Murid, Siswa dan Security tidak dapat mengubahnya. Pergantian paket memperbarui ketiga unit demo secara atomik. Role Yayasan memerlukan paket Yayasan tersendiri; paket Pro saja tidak membuka tata kelola lintas unit. Tidak ada transaksi atau langganan nyata.

Harga berikut merupakan **simulasi demo/proposal tahunan**, bukan penawaran resmi yang telah ditandatangani.

| Jumlah siswa per sekolah | Standard / tahun | Pro / tahun |
|---|---:|---:|
| 200 | Rp3.500.000 | Rp5.500.000 |
| 500 | Rp5.500.000 | Rp8.500.000 |
| 1.000 | Rp8.500.000 | Rp13.500.000 |
| 2.000 | Rp14.000.000 | Rp22.000.000 |

Jumlah hingga 200 siswa memakai biaya minimum pada baris 200. Di antara titik harga, biaya dihitung dengan interpolasi linear per segmen, lalu total tahunan dibulatkan ke Rp1.000 terdekat. Rata-rata per bulan atau per siswa dihitung sesudah pembulatan tersebut, menggunakan jumlah siswa aktual. Lebih dari 2.000 siswa memerlukan penawaran khusus. Titik harga ini bukan batas impor atau kapasitas penyimpanan.

Contoh 350 siswa: Standard Rp4.500.000/tahun, Pro Rp7.000.000/tahun; selisih Rp2.500.000/tahun atau sekitar Rp595/siswa/bulan. Pada 500 siswa, selisih Rp3.000.000/tahun atau Rp500/siswa/bulan. Angka per siswa merupakan rata-rata biaya tahunan, bukan tarif penagihan terpisah.

Paket Yayasan memerlukan minimal dua unit. Total tahunan adalah jumlah biaya Pro setiap unit berdasarkan jumlah siswanya, ditambah Rp1.500.000/unit/tahun untuk tata kelola Yayasan. Biaya Pro yang sudah dimiliki unit diperhitungkan satu kali; tidak ditagihkan dua kali. Tiga unit yang masing-masing memiliki 500 siswa menghasilkan total Rp30.000.000/tahun untuk 1.500 siswa, setara Rp20.000/siswa/tahun. Kapasitas penyimpanan, biaya layanan dan pendampingan perlu disepakati dalam penawaran resmi. Tidak ada klaim penghematan waktu yang belum diukur.

Yayasan mencakup Pro untuk setiap unit dan tata kelola lintas unit: prioritas dan target, perbandingan persentase/tren, kelengkapan dan waktu pembaruan data, arahan dengan PIC/tenggat, progres serta bukti dari Kepala Sekolah, pengajuan/persetujuan kebutuhan dan pemenuhannya, serta bahan rapat PDF. Penanganan risiko pada role Yayasan hanya berupa agregat; identitas dan rincian siswa tidak dibuka. Tingkat penerimaan SPP memakai tagihan yang sudah jatuh tempo. Rata-rata nilai mentah lintas sekolah tidak diperingkat. Data dummy tiga unit memperagakan keterlambatan rapor, penurunan kehadiran, dan peningkatan hasil.

Pendampingan Pro/Yayasan memiliki target, PIC, tanggal evaluasi, snapshot indikator awal, hasil dan catatan evaluasi, serta snapshot saat penutupan. Penutupan wajib menyertakan hasil evaluasi. Snapshot menunjukkan kondisi yang tercatat; tidak membuktikan hubungan sebab-akibat. Wali Murid dan Siswa hanya melihat EWS anak terhubung atau dirinya sendiri sesuai hak akses; catatan internal tidak dibuka. Admin dan Security tidak memiliki EWS pada paket mana pun.

API sesi demo publik menerima pilihan paket opsional saat pengenalan. Mekanisme ini khusus demonstrasi, bukan pembelian atau otorisasi akun produksi. Setelah sesi dibuat, perubahan paket memerlukan role pengambil keputusan yang berwenang. Bootstrap Standard menyaring koleksi EWS dan kolom risiko; endpoint terkait juga memeriksa paket.

Migrasi `product-v3` menambahkan skenario dan alur baru pada ruang demo yang sudah ada. Biodata, nilai, dan pembayaran yang pernah diubah tidak direset. Riwayat semester lama merupakan skenario dummy; semester berjalan dihitung dari data saat dibuka. P5, tahfizh dan PPDB dapat diaktifkan sesuai jenis sekolah.

## Deploy Netlify melalui Git

Hubungkan `desainindongmas/kabarkelas-demo`, branch `main`. `netlify.toml` menetapkan build `npm run build`, publish `dist`, functions `netlify/functions`, dan Node 24. Deploy melalui Git agar function API dan redirect ikut terpasang. Jangan unggah `dist` saja. Lihat [NETLIFY.md](NETLIFY.md).

Satu Web API Function memakai Netlify Blobs bawaan situs untuk snapshot SQLite terkompresi per pengunjung. Cookie HttpOnly mempertahankan ruang demo; pergantian role/sekolah tetap menggunakan data pengunjung itu. Browser lain mendapatkan seed baru. Konflik penulisan ditolak dengan 409. `/tmp` hanya direktori kerja, bukan penyimpanan permanen.

Tidak ada integrasi pihak ketiga berbayar atau background function. Hosting, bandwidth, build, Functions, dan Blobs tetap memakai kuota akun Netlify; tidak ada jaminan biaya nol jika kuota terlampaui. Pantau pemakaian di Netlify.

## Validasi

```bash
npm run build
npm test
```

Tes memakai database sementara, server produksi port 3197 dan Chromium (`/usr/bin/chromium`, dapat diganti melalui `CHROMIUM_PATH`). Cakupan mencakup isolasi sekolah/pengunjung, izin role dan paket, penyaringan EWS Standard, perhitungan harga tahunan dan Yayasan, batch atomik, SPP manual, rapor, impor/backup, izin guru, QR (termasuk unggah gambar), tujuh role dan minimisasi kolom data, alur Yayasan, layar desktop/mobile, ZIP PDF browser, serta entry point Netlify dengan emulator Blobs resmi. `test-results/` berisi tangkapan layar lokal dan diabaikan Git.

Ini demo dengan identitas fiktif dan 12 foto sintetis yang dipakai ulang. Autentikasi pengguna nyata, otorisasi keanggotaan sekolah permanen, peninjauan keamanan, dan kebijakan retensi perlu disiapkan sebelum memakai data sekolah nyata. Kuis bukan sistem pengawasan ujian. Pengingat hanya tampil saat aplikasi dibuka; tidak ada pesan atau notifikasi keluar.
