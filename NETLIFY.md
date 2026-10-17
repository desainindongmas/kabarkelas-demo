# Deploy KabarKelas dari Git

1. Import repository `desainindongmas/kabarkelas-demo` di Netlify, branch `main`, base directory kosong.
2. Gunakan konfigurasi `netlify.toml`: build `npm run build`, publish `dist`, functions `netlify/functions`, Node.js 24 dan `AWS_LAMBDA_JS_RUNTIME=nodejs24.x`.
3. Deploy. Function `api` harus terpasang. Blobs store `kabarkelas-demo-v1` dibuat melalui identitas situs yang disediakan Netlify. Tidak perlu menyalin API key ke frontend atau repository.

## Pemeriksaan

- Buka situs HTTPS: dashboard akademik dan EWS tampil, lalu coba **Ganti peran**.
- Admin melihat dashboard administrasi tanpa menu EWS/nilai siswa. Guru + wali kelas memiliki akses tambahan khusus X IPA 1.
- Simpan biodata sebagai Admin atau nilai sebagai Guru, lalu reload: perubahan tetap tersedia untuk browser itu.
- SPP dicatat Admin sebagai tunai/transfer manual; Wali Murid membaca riwayat dan mengunduh kuitansi.
- Rapor massal menghasilkan ZIP berisi PDF di browser. Tidak ada `report-worker-background` pada versi ini; hapus konfigurasi Functions lama yang dipasang manual bila ada.
- Browser baru mendapat data dummy terpisah. Ini perilaku demo publik yang disengaja.

## API dan penyimpanan

`app.mjs` melayani server lokal dan function Netlify yang sama. Entry point menggunakan Web Request API v2 untuk mempertahankan konfigurasi Blobs dari platform, termasuk `uncachedEdgeURL`. Adapter mempertahankan kedua cookie sesi/ruang pengunjung. Setiap eksekusi memulihkan database SQLite sementara dari snapshot Blobs, dan menyimpan perubahan menggunakan ETag compare-and-set. Kesalahan konflik 409 meminta pengguna memuat ulang sebelum mengulangi perubahan.

Migrasi menambahkan data operasional pada ruang demo versi sebelumnya tanpa mereset biodata/nilai yang telah diubah. Role wali kelas lama dinormalisasi menjadi Guru + wali kelas, dan super admin lama menjadi Yayasan. Data chat/integrasi lama tidak lagi diekspos maupun dipakai. Backup baru hanya memasukkan koleksi yang masih didukung.

PDF, ZIP dan Excel dibuat pada perangkat pengguna. Tidak ada polling, background function, payment gateway, email, WhatsApp atau panggilan model AI. Pengumuman dan pengingat berada dalam aplikasi. Functions, Blobs, bandwidth, dan build tetap mengikuti kuota akun Netlify; pantau usage untuk menjaga pemakaian free tier.

## Jika bootstrap gagal

Periksa **Deploy log** dan **Functions → api → log**. Pastikan deploy berasal dari commit terbaru, Node/Functions runtime 24 tidak ditimpa pengaturan UI, dan Blobs tersedia pada situs. Entry point mengembalikan error JSON aman ketika konfigurasi Blobs tidak tersedia. `/api/bootstrap` memerlukan cookie sesi demo; membuka endpoint dari browser baru sebelum sesi dibuat menghasilkan 401.

Tes lokal memanggil default export Web API Function dengan konteks Netlify terinjeksi dan emulator Blobs resmi: cookie, persistensi, isolasi pengunjung, konflik penyimpanan dan hak akses. Regresi adapter Lambda lama juga diuji. Pemeriksaan lokal tidak membuktikan deploy di akun Netlify pengguna sudah aktif; periksa commit yang ditampilkan pada deploy setelah push.
