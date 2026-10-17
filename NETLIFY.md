# Deploy KabarKelas dari Git

1. Di Netlify, pilih **Add new project → Import an existing project** dan hubungkan GitHub.
2. Pilih `desainindongmas/kabarkelas-demo`, branch `main`, dan biarkan base directory kosong.
3. Netlify membaca `netlify.toml`: build `npm run build`, publish `dist`, functions `netlify/functions`, Node.js 24.
4. Jalankan deploy. Tidak ada API key pihak ketiga yang diperlukan untuk fitur demo. Netlify menyediakan identitas akses Blobs kepada Functions melalui konteks eksekusi; aplikasi tidak menyimpan token tersebut dalam repository.

Setelah deploy, buka alamat situs Netlify dan periksa:

- Ringkasan memuat 192 siswa pada SMA Nusantara dan data tersedia untuk tiga sekolah.
- Pergantian role siswa/orang tua menampilkan Nadia Azzahra saja.
- Simpan nilai atau catatan pada Admin/Guru, lalu refresh: perubahan tetap ada pada browser itu.
- Generate rapor massal menampilkan progres hingga selesai; ZIP berisi PDF dapat diunduh.
- Pada dashboard Netlify, Functions `api` dan `report-worker-background` tersedia. Blobs store bernama `kabarkelas-demo-v1` dibuat saat akses pertama.

## Cara backend bekerja

`app.mjs` berisi API yang sama untuk server lokal dan Netlify. `server.mjs` menjalankannya dengan Express/Vite lokal. `netlify/functions/api.mjs` membungkusnya dengan `serverless-http`; setiap eksekusi membuka database kerja sendiri di `/tmp`, memulihkan snapshot dari Blobs, dan menyimpan perubahan dengan kondisi ETag.

Data Netlify terpisah untuk setiap cookie pengunjung agar demo publik tidak saling mengubah data. Antrean dan arsip rapor disimpan di Blobs. Background Function memproses PDF dan mencatat progres, sehingga tidak bergantung pada proses Express yang hidup terus-menerus. Antrean yang gagal dipanggil ditandai gagal agar dapat dicoba lagi. Cookie dibatasi ke HTTPS; uji situs melalui URL HTTPS Netlify.

Jika log menunjukkan runtime lama, pastikan tidak ada pengaturan UI yang menimpa Node 24 atau `AWS_LAMBDA_JS_RUNTIME=nodejs24.x`, lalu lakukan deploy ulang. Jika akses Blobs ditolak, periksa ketersediaan Blobs di situs/akun dan log Functions. Jangan menambahkan token ke frontend atau Git.

Ini tetap demo berisi identitas fiktif dan pemilihan role terbuka. Transaksi pembayaran, pesan eksternal, dan AI menggunakan simulasi seperti pada versi lokal. Penyimpanan, pemanggilan Functions, dan Background Functions mengikuti kuota akun Netlify.

## Bukti verifikasi sebelum push

Build frontend dan pengujian lokal mencakup alur aplikasi, izin peran, ekspor, serta penyimpanan. Pengujian adapter Netlify menggunakan SDK dan server emulator resmi Netlify Blobs, bukan database demo utama: pemulihan antar-eksekusi, cookie, isolasi pengunjung, konflik ETag, worker PDF, unduhan ZIP, dan kegagalan dispatch yang dapat dicoba lagi. Kedua Functions juga dibundel menggunakan `@netlify/zip-it-and-ship-it`, bundler yang dipakai Netlify, untuk runtime `nodejs24.x`.

Push GitHub bukan bukti deploy Netlify sudah berhasil. URL publik, izin Blobs akun, dan pemanggilan Background Function di infrastruktur Netlify perlu diperiksa pada deploy pertama.
