# KabarKelas

Demo web interaktif digitalisasi akademik, rapor, administrasi sekolah, dan Early Warning System. Dibangun berdasarkan Blueprint LaporanAkademisKu v1.0 dan Roadmap Versi Lanjutan, dengan identitas KabarKelas.

## Menjalankan

Gunakan Node.js 24.19 atau lebih baru. Tidak memerlukan API key atau database eksternal.

```bash
cd /workspace/kabarkelas-demo
npm ci
npm run dev
```

Server mendengarkan pada port `3000` di semua antarmuka. Untuk build produksi lokal:

```bash
npm run build
npm start
```

`PORT` mengatur port. `DB_PATH` mengatur lokasi SQLite (default `data/kabarkelas.sqlite`). Basis data diisi otomatis pada startup pertama. File SQLite dan PDF hasil antrean disimpan di direktori `data/`; proses server harus dimulai kembali ketika lingkungan dipulihkan. Gunakan checkout yang sudah ada: setiap task cloud terisolasi, tidak perlu membuat worktree baru.

## Deploy ke Netlify melalui GitHub

Hubungkan repository `desainindongmas/kabarkelas-demo` di Netlify dan pilih branch `main`. Konfigurasi berikut sudah tersedia di `netlify.toml`:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node.js dan Functions runtime: 24

API menggunakan Netlify Functions. Penyimpanan demo memakai Netlify Blobs bawaan situs, sehingga tidak memerlukan token database yang dimasukkan manual. Pastikan layanan Functions dan Blobs tersedia pada akun/situs Netlify yang dipakai. Rapor massal menggunakan Background Function `report-worker-background`.

Setiap browser pengunjung mendapat ruang demo tersendiri melalui cookie HttpOnly. Perubahan disimpan sebagai snapshot SQLite terkompresi di Blobs dan dipulihkan pada eksekusi berikutnya; `/tmp` hanya dipakai sementara. Pergantian role dan sekolah di browser yang sama mempertahankan perubahan. Browser/perangkat lain memulai data dummy baru. Penulisan bersamaan diperiksa melalui ETag dan mengembalikan HTTP 409 bila ada konflik, sehingga pengguna dapat memuat ulang sebelum mencoba lagi.

Jangan memakai unggahan folder `dist` saja untuk aplikasi ini: deploy dari Git diperlukan agar API, worker, dan redirect ikut terpasang. SQLite lokal, cookie sesi, kredensial, dan hasil PDF sementara tidak di-commit. Detail pemeriksaan deploy ada di [NETLIFY.md](NETLIFY.md).

## Isi demo

- 3 sekolah independen, 576 siswa, 72 guru, 24 kelas, dan 30 data mata pelajaran.
- Nilai, deskripsi kompetensi, tren, absensi harian, tugas, pengumpulan, bank kuis, jadwal, materi, dan rapor terisi untuk seluruh sekolah.
- Tagihan tiga bulan, riwayat pembayaran, intervensi, pengumuman, percakapan, pendaftaran siswa, konfigurasi, serta jejak aktivitas.
- 12 foto formal sintetis sesuai usia, gender, dan peran, dipakai kembali untuk populasi demo. Seluruh identitas fiktif.
- Simbol logo KabarKelas disiapkan dari referensi logo yang diberikan; wordmark menggunakan tipografi aplikasi. Aset logo berada di `public/assets/logo-mark.png`.

Tombol **Ganti peran** membuka delapan pengalaman: kepala sekolah, admin, guru, wali kelas, siswa, orang tua, yayasan, dan super admin. Sekolah dapat diganti melalui dialog yang sama pada peran pengelola. Siswa dan orang tua terhubung ke Nadia Azzahra. Guru dan wali kelas mengakses dua kelas yang ditugaskan. Super admin/yayasan memperoleh ringkasan lintas sekolah; identitas akademik tidak dimuat otomatis pada kedua peran tersebut.

## Alur yang dapat dicoba

| Modul | Perilaku demo |
|---|---|
| Command Center | Metrik berdasarkan data, grafik, filter kelas/periode, prioritas yang membuka detail |
| Student 360 | EWS di bagian pertama profil, nilai, kompetensi, absensi, tugas, catatan, riwayat intervensi, ekspor |
| Early Warning | Aturan kehadiran, penurunan nilai, tugas tertunda, dan KKM; filter risiko; tindakan langsung |
| Pendampingan | Buat rencana, tetapkan PIC/tanggal, perbarui status dan catat hasil evaluasi |
| Kehadiran | Input massal, semua hadir, simpan ulang tanggal yang sama, rekap siswa diperbarui |
| Nilai | Input Harian/UTS/UAS, bobot sekolah, perhitungan nilai akhir, salin nilai sebelumnya, navigasi Enter, ekspor Excel |
| Tugas & PR | Buat/duplikasi, instruksi, tenggat, pengumpulan teks/lampiran, tinjau, nilai, umpan balik |
| Kuis | Bank 5 soal aljabar, timer di browser, pilihan ganda, penilaian server, hasil dan pengulangan |
| Rapor | Pratinjau, draf deskripsi berbasis aturan, edit catatan, review, persetujuan, terbit, unduh PDF |
| Rapor massal | Antrean tersimpan di SQLite, progres, berlanjut setelah berpindah halaman, retry, unduh ZIP; pekerjaan tertunda dijalankan kembali saat server restart |
| Data sekolah | Tambah/edit/hapus siswa, guru, kelas, mapel; validasi NISN dan kelas yang berisi siswa |
| Impor | Excel/CSV/Dapodik, pemetaan kolom tersimpan per sekolah di browser, pratinjau, validasi duplikat, transaksi atomik, riwayat dan rollback terbatas |
| SPP | Buat tagihan, filter, pembayaran simulasi, kuitansi PDF, ekspor rekap |
| Komunikasi | Percakapan per siswa, pesan tersimpan, identitas pengirim ditentukan server |
| Pengumuman | Buat, baca, cari, dan edit pengumuman |
| Jadwal & materi | Jadwal per kelas/hari, modul teks, tambah materi, latihan dan kuis |
| PPDB | Pendaftaran, verifikasi, seleksi, keputusan penerimaan |
| Pengaturan | Identitas sekolah, tahun/semester, bobot, KKM, ambang EWS, tiga gaya PDF, warna/footer, hak akses, audit, ekspor/pemulihan backup JSON |
| Yayasan / SaaS | Ringkasan dan perbandingan tiga sekolah, berpindah ke command center unit; contoh metrik penggunaan berlabel simulasi |
| Pricing | Kapasitas 200–2.000 siswa, harga tahunan/per siswa, ROI dengan asumsi eksplisit, formulir permintaan tersimpan |

## Batas demo

Ini adalah aplikasi demonstrasi mandiri, bukan layanan SaaS produksi yang sudah diterapkan. Pemilihan peran memang terbuka agar pengunjung dapat mencoba semua pengalaman; endpoint sesi demo bukan autentikasi pengguna produksi. Pembatasan penulisan, relasi siswa/kelas, dan cakupan tenant diterapkan pada API, dengan cookie sesi HttpOnly, validasi server, audit, dan pembatasan permintaan dasar. SQLite diakses hanya oleh server; tidak ada klaim Supabase Row Level Security atau audit keamanan produksi.

Pembayaran tidak memindahkan uang. WhatsApp/email tidak mengirim pesan. Dapodik/Classroom/Forms tidak memanggil API eksternal; impor berkas benar-benar bekerja. Ringkasan cerdas/deskripsi adalah generator berbasis aturan, tanpa model AI eksternal. Metrik kapasitas platform adalah contoh berlabel simulasi. Kuis memiliki timer browser untuk demonstrasi, bukan pengawasan ujian. Modul LMS berupa teks, bukan hosting video; aplikasi responsif web, bukan aplikasi mobile native. PPDB belum mengirim dokumen ke penyedia verifikasi. Penjadwalan reminder, SSO, akuntansi eksternal, API publik/webhook, langganan berbayar, dan notifikasi push produksi memerlukan tahap implementasi dan penyedia terkait.

Untuk mengaktifkan layanan nyata diperlukan pilihan hosting/domain, identitas sekolah yang disetujui, template rapor/tanda tangan, kebijakan penilaian, dan akun sandbox penyedia pembayaran/notifikasi/integrasi. Masukkan kredensial hanya melalui konfigurasi rahasia server, bukan formulir demo atau chat. Tidak ada layanan yang dipublikasikan atau pesan yang dikirim oleh setup ini.

## Validasi

```bash
npm run build
npm test
```

Pengujian memakai basis data sementara, server produksi pada port `3197`, dan Chromium (`/usr/bin/chromium`, dapat diganti dengan `CHROMIUM_PATH`). Cakupan: isolasi tenant, izin peran, absensi, nilai, intervensi, tugas/kuis, pembayaran, impor/rollback, backup/restore, persetujuan/antrean PDF, persistensi setelah restart, layar desktop/mobile, serta alur browser siswa dan orang tua. Data pengujian tidak ditulis ke database demo utama. Tangkapan layar verifikasi berada di direktori lokal `test-results/` yang diabaikan Git.

Stack: React 19 + TypeScript, Vite, Express, SQLite bawaan Node, Recharts, Lucide, jsPDF, JSZip, dan SheetJS. Font disajikan dari aset lokal. `npm ci` menggunakan lockfile; tidak ada proses unduh foto/font saat menggunakan aplikasi.
