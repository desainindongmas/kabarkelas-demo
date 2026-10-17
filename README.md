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

Enam role utama tersedia melalui **Ganti peran**. Wali kelas adalah kemampuan tambahan Guru, bukan role tersendiri.

| Peran | Cakupan |
|---|---|
| Kepala Sekolah | Pemantauan akademik sekolah, EWS dan ambangnya, intervensi, persetujuan rapor, keputusan izin guru, rekap kehadiran, pemantauan penjemputan |
| Admin Sekolah | Biodata siswa, data sekolah, impor, jadwal pelajaran/seragam, presensi guru, PPDB, SPP manual, pengumuman, penjemputan, pengaturan dan backup; tanpa EWS atau hasil akademik per siswa |
| Guru | Dua kelas yang diajar, nilai/tugas/kuis/materi untuk mapel yang ditugaskan, absensi siswa, presensi dan pengajuan izin sendiri |
| Guru + wali kelas | Tambahan intervensi, P5, tahfizh, catatan dan persetujuan rapor untuk kelas perwaliannya saja |
| Wali Murid | Data anak terhubung, perkembangan akademik, rapor terbit, tagihan/kuitansi, seragam, dan pengelolaan penjemput |
| Siswa | Data sendiri, tugas, pengumpulan, kuis, rapor terbit, jadwal, materi dan perkembangan |
| Yayasan | Statistik agregat dan perbandingan tiga sekolah; tanpa biodata atau rincian akademik/keuangan individu |

Menu, tombol, pencarian, halaman langsung, dan API memeriksa hak akses. Role demo tetap dapat dipilih bebas; ini bukan login produksi. Admin tidak menerima nilai/absensi siswa dalam bootstrap, tetapi backup sekolah tetap merupakan kewenangan administrasi khusus yang berisi data lengkap.

## Fitur dan data

- Tiga sekolah, 576 siswa, 72 guru, 24 kelas dan 30 data mapel. Biodata, nilai, tugas, rapor, transaksi SPP, P5, tahfizh, seragam, presensi guru dan penjemput terisi data dummy.
- EWS merah/jingga yang langsung terlihat pada dashboard akademik dan profil siswa. Indikator berasal dari kehadiran, penurunan nilai, tugas tertunda, dan KKM; detail penyebab dan tindakan pendampingan tersedia.
- Input absensi/nilai sekaligus dalam satu transaksi, bobot nilai, ekspor Excel, skala tampilan 100/10/4/huruf. Nilai sumber tetap pada skala 100.
- Tugas dengan lampiran, umpan balik dan penilaian; kuis dengan timer browser dan penilaian server; materi dan jadwal per kelas.
- Rapor tiga template, catatan berdasarkan nilai, persetujuan sesuai kelas, unduh PDF, dan arsip ZIP massal. PDF/ZIP dibuat di browser tanpa background function atau polling. Proses berlanjut saat pindah menu; tab harus tetap terbuka. Arsip tidak bertahan setelah reload.
- Impor Excel/CSV/Dapodik dari berkas, pemetaan kolom, validasi, transaksi atomik, riwayat dan rollback terbatas. CRUD data sekolah, PPDB, audit dan backup/restore JSON per sekolah.
- SPP hanya pencatatan manual oleh Admin: tagihan, pembayaran sebagian/lunas melalui tunai atau transfer manual, riwayat dan kuitansi PDF. Wali Murid hanya membaca tagihan/riwayat.
- Presensi mandiri guru, catatan Admin, pengajuan izin dan keputusan Kepala Sekolah. Rekap guru/siswa sesuai izin, ekspor Excel/PDF.
- Seragam mingguan dan pengecualian tanggal; capaian enam dimensi P5 dan tahfizh/akhlak oleh wali kelas.
- Penjemput tetap/pengganti bertanggal, kartu QR bertanda HMAC, verifikasi server, pencatatan antar/jemput oleh Admin, serta riwayat untuk wali dan kepala sekolah. QR dapat dibaca dengan pemindai perangkat dan kodenya ditempel di verifikator. Identitas fisik tetap perlu dicocokkan petugas.
- Pengumuman dalam aplikasi dengan audience/status; tanpa chat, payment gateway, panggilan AI, email atau integrasi WhatsApp.

Fitur operasional diperluas dengan membaca repository referensi pengguna `desainindongmas/demo-kabarkelas` pada commit `e7ff45e`. Matriks peran dan pengecualian integrasi mengikuti permintaan terbaru pengguna. Dokumen blueprint/roadmap dipakai sebagai spesifikasi produk, bukan instruksi untuk mengirim pesan, menjalankan layanan berbayar, atau menerbitkan kredensial.

## Deploy Netlify melalui Git

Hubungkan `desainindongmas/kabarkelas-demo`, branch `main`. `netlify.toml` menetapkan build `npm run build`, publish `dist`, functions `netlify/functions`, dan Node 24. Deploy melalui Git agar function API dan redirect ikut terpasang. Jangan unggah `dist` saja. Lihat [NETLIFY.md](NETLIFY.md).

Satu Web API Function memakai Netlify Blobs bawaan situs untuk snapshot SQLite terkompresi per pengunjung. Cookie HttpOnly mempertahankan ruang demo; pergantian role/sekolah tetap menggunakan data pengunjung itu. Browser lain mendapatkan seed baru. Konflik penulisan ditolak dengan 409. `/tmp` hanya direktori kerja, bukan penyimpanan permanen.

Tidak ada integrasi pihak ketiga berbayar atau background function. Hosting, bandwidth, build, Functions, dan Blobs tetap memakai kuota akun Netlify; tidak ada jaminan biaya nol jika kuota terlampaui. Pantau pemakaian di Netlify.

## Validasi

```bash
npm run build
npm test
```

Tes memakai database sementara, server produksi port 3197 dan Chromium (`/usr/bin/chromium`, dapat diganti melalui `CHROMIUM_PATH`). Cakupan mencakup isolasi sekolah/pengunjung, izin role, batch atomik, SPP manual, rapor, impor/backup, izin guru, QR, layar desktop/mobile, ZIP PDF browser, serta entry point Netlify dengan emulator Blobs resmi. `test-results/` berisi tangkapan layar lokal dan diabaikan Git.

Ini demo dengan identitas fiktif dan 12 foto sintetis yang dipakai ulang. Autentikasi pengguna nyata, otorisasi keanggotaan sekolah permanen, peninjauan keamanan, dan kebijakan retensi perlu disiapkan sebelum memakai data sekolah nyata. Kuis bukan sistem pengawasan ujian. Pengingat hanya tampil saat aplikasi dibuka; tidak ada pesan atau notifikasi keluar.
