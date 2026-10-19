# Pembagian tanggung jawab KabarKelas

Hak akses diperiksa pada navigasi desktop/mobile, tombol, pencarian, URL hash langsung, koleksi bootstrap, kolom data, dan endpoint penulisan. Memilih paket tidak mengubah kewenangan role. Pemilihan role terbuka hanya untuk demonstrasi; akun dan keanggotaan sekolah produksi belum diimplementasikan.

| Role | Menu dan tugas | Yang tidak tersedia |
|---|---|---|
| Kepala Sekolah | Prioritas akademik, Student 360, EWS, nilai/absensi untuk pemantauan, rapor dan persetujuan, intervensi serta evaluasi, izin guru, rekap, riwayat gerbang, koordinasi Yayasan, analisis, alur Pro, paket | CRUD administrasi, pencatatan SPP, penerbitan kartu penjemput, pemindaian dan pencatatan gerbang |
| Admin Sekolah | Biodata, master sekolah, jadwal, seragam, absensi guru, tagihan/penerimaan/kuitansi manual, PPDB dan penempatan kelas, penjemput terdaftar, keputusan pengecualian gerbang, pengaturan, backup administrasi, analisis administrasi | Nilai, absensi pembelajaran siswa, EWS akademik, intervensi, rapor, P5/tahfizh, pemindaian/pencatatan gerbang, keputusan Yayasan |
| Guru | Dua kelas dan mapel yang ditugaskan; input absensi dan nilai, tugas/kuis/materi, pemantauan EWS, baca rapor, presensi/izin sendiri, analisis kelas | Administrasi, SPP, data gerbang, paket, keputusan izin, persetujuan rapor dan data kontak keluarga di luar kelas perwalian |
| Guru + wali kelas | Tambahan rencana/evaluasi pendampingan, P5, tahfizh, catatan serta validasi rapor khusus kelas perwalian | Tambahan ini tidak memperluas perwalian ke seluruh kelas yang diajar. Pada Pro dua tahap, penerbitan akhir hanya oleh Kepala Sekolah |
| Wali Murid | Perkembangan, tugas dan rapor terbit anak terhubung, jadwal/materi/seragam, tagihan dan kuitansi, daftar penjemput serta kartu QR, riwayat gerbang anak | Siswa lain, penilaian/penerbitan rapor, pencatatan pembayaran, kuis, pemindaian gerbang, catatan konseling internal |
| Siswa | Nilai, absensi, materi, jadwal, tugas/pengumpulan, kuis, rapor terbit dan perkembangan sendiri | Siswa lain, SPP, penjemput, data guru, pengaturan, intervensi internal |
| Yayasan | Agregat unit, target dan perbandingan persentase/tren, arahan/PIC/tenggat, progres/bukti dari unit, keputusan kebutuhan, laporan rapat PDF, paket | Biodata siswa, nilai dan tagihan individu, pengubahan akademik, administrasi unit, keputusan gerbang |
| Security | Dashboard gerbang, kamera/unggah/kode QR, verifikasi identitas penjemput, masuk/pulang, riwayat, laporan kejadian dan pelaksanaan izin Admin | Nilai, EWS, SPP, alamat/NISN/telepon keluarga, master sekolah, penerbitan kartu, perubahan izin penjemput, keputusan pengecualian, pengaturan, paket dan Yayasan |

Security hanya menerima identitas siswa minimum: id, nama, NIS, kelas, foto, dan status. Daftar seluruh penjemput tidak diberikan pada bootstrap Security. Hasil verifikasi satu kartu menampilkan nama dan hubungan penjemput serta masa berlaku; tidak mengembalikan nomor telepon atau informasi akademik.

## Alur gerbang

1. Wali Murid atau Admin mengelola penjemput terdaftar. Wali hanya dapat mengubah daftar untuk anaknya.
2. Security memindai kartu melalui kamera, unggah gambar, atau kode kartu. Verifikasi server memeriksa tanda HMAC, sekolah, izin aktif dan tanggal penjemput pengganti.
3. Petugas mencocokkan identitas fisik. Catat Antar untuk masuk; Jemput untuk pulang. Waktu dan petugas ditentukan server. Catatan tidak dapat ditimpa dan duplikasi status ditolak.
4. QR tidak valid, identitas berbeda, penjemput belum terdaftar, atau kedatangan belum tercatat dilaporkan sebagai kejadian. Security tidak bisa meloloskan penjemput dengan catatan bebas.
5. Admin mengonfirmasi kepada wali dan memberi keputusan. Izin sekali berlaku pada tanggal kejadian dan hanya dapat digunakan satu kali oleh Security. Keputusan dan penggunaannya tersimpan.

Endpoint kartu dummy khusus Security hanya menyediakan contoh kartu identitas fiktif pertama untuk mencoba demo. Fitur ini dan pemilihan role terbuka harus diganti sebelum memakai identitas nyata.

## Cadangan dan modul

Admin mengekspor cadangan `KabarKelas-3` yang hanya berisi administrasi. Restore menambah/memperbarui data administrasi; tidak menghapus data baru, mengubah nilai/kehadiran/riwayat akademik, atau membaca koleksi akademik dari cadangan lama. Respons penyimpanan biodata juga tidak mengembalikan kolom akademik. Riwayat gerbang, keputusan kejadian/izin guru, audit, dan transaksi penerimaan tetap hanya baca saat restore; berkas cadangan tidak dapat dipakai untuk memalsukan tindakan role lain atau memakai ulang izin gerbang. Alasan izin guru internal tidak disertakan dalam cadangan Admin.

Kepala Sekolah dapat mengunduh cadangan akademik terpisah dari Rapor, termasuk pada Standard. Guru memiliki ekspor sesuai kelas/mapel yang ditugaskan. Security dan Yayasan tidak memiliki akses cadangan akademik maupun administrasi individu.

Admin dapat menonaktifkan P5, tahfizh atau PPDB sesuai kebutuhan sekolah. Menu, halaman dan aksi modul mengikuti pengaturan tersebut; data lama tetap disimpan. Matrik izin ada di `shared/access.mjs`; pengujian hak akses berada di `tests/product.test.mjs` dan alur browser di `tests/workflows.test.mjs`.
