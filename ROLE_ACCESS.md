# Pembagian tanggung jawab KabarKelas

Hak akses diperiksa pada navigasi desktop/mobile, tombol, pencarian, URL hash langsung, koleksi bootstrap, kolom data, dan endpoint penulisan. Fitur harus tersedia pada paket sekaligus diizinkan bagi role. Memilih paket tidak mengubah kewenangan role atau mereset data. Pemilihan role terbuka hanya untuk demonstrasi; akun dan keanggotaan sekolah produksi belum diimplementasikan.

| Role | Menu dan tugas | Yang tidak tersedia |
|---|---|---|
| Kepala Sekolah | Pemantauan akademik dan Student 360, nilai/absensi, rapor dan persetujuan, izin guru, rekap, riwayat gerbang, paket; pada Pro/Yayasan: EWS, intervensi/evaluasi, analisis dan alur Pro; koordinasi lintas unit pada Yayasan | CRUD administrasi, pencatatan SPP, penerbitan kartu penjemput, pemindaian dan pencatatan gerbang |
| Admin Sekolah | Biodata, master sekolah, jadwal, seragam, absensi guru, tagihan/penerimaan/kuitansi manual, PPDB dan penempatan kelas, penjemput terdaftar, keputusan pengecualian gerbang, pengaturan, backup administrasi; analisis administrasi pada Pro/Yayasan | Nilai, absensi pembelajaran siswa, EWS akademik, intervensi, rapor, P5/tahfizh, pemindaian/pencatatan gerbang, keputusan Yayasan |
| Guru | Dua kelas dan mapel yang ditugaskan; input absensi dan nilai, tugas/kuis/materi, baca rapor, presensi/izin sendiri; pada Pro/Yayasan: pemantauan EWS dan analisis kelas | Administrasi, SPP, data gerbang, perubahan paket, keputusan izin, persetujuan rapor dan data kontak keluarga di luar kelas perwalian |
| Guru + wali kelas | Tambahan P5, tahfizh, catatan serta validasi rapor khusus kelas perwalian; pada Pro/Yayasan: rencana dan evaluasi pendampingan | Tambahan ini tidak memperluas perwalian ke seluruh kelas yang diajar. Pada Pro/Yayasan dua tahap, penerbitan akhir hanya oleh Kepala Sekolah |
| Wali Murid | Perkembangan, tugas dan rapor terbit anak terhubung, jadwal/materi/seragam, tagihan dan kuitansi, daftar penjemput serta kartu QR, riwayat gerbang anak; pada Pro/Yayasan: EWS anak terhubung | Siswa lain, penilaian/penerbitan rapor, pencatatan pembayaran, perubahan paket, kuis, pemindaian gerbang, catatan konseling internal |
| Siswa | Nilai, absensi, materi, jadwal, tugas/pengumpulan, kuis, rapor terbit dan perkembangan sendiri; pada Pro/Yayasan: EWS diri sendiri | Siswa lain, SPP, penjemput, data guru, pengaturan, perubahan paket, intervensi internal |
| Yayasan | Dengan paket Yayasan: agregat unit, target dan perbandingan persentase/tren, arahan/PIC/tenggat, progres/bukti dari unit, keputusan kebutuhan, laporan rapat PDF; pilihan paket demo | Biodata siswa, nilai dan tagihan individu, rincian penanganan risiko siswa, pengubahan akademik, administrasi unit, keputusan gerbang; paket Pro tidak membuka tata kelola Yayasan |
| Security | Dashboard gerbang, kamera/unggah/kode QR, verifikasi identitas penjemput, masuk/pulang, riwayat, laporan kejadian dan pelaksanaan izin Admin | Nilai, EWS, SPP, alamat/NISN/telepon keluarga, master sekolah, penerbitan kartu, perubahan izin penjemput, keputusan pengecualian, pengaturan, paket dan Yayasan |

Security hanya menerima identitas siswa minimum: id, nama, NIS, kelas, foto, dan status. Daftar seluruh penjemput tidak diberikan pada bootstrap Security. Hasil verifikasi satu kartu menampilkan nama dan hubungan penjemput serta masa berlaku; tidak mengembalikan nomor telepon atau informasi akademik.

## Batas paket dan sesi demo

Standard mencakup pekerjaan harian lengkap: nilai, absensi, tugas/kuis, rapor PDF/ZIP, SPP manual dan cicilan, PPDB, QR gerbang, ekspor dan backup dasar sesuai role. Standard tidak menyediakan EWS, kolom atau indikator risiko, tren risiko maupun alur pendampingan risiko. Koleksi dan kolom tersebut disaring dari bootstrap; membuka URL atau memanggil API langsung tetap mengikuti batas paket.

Pro dan Yayasan membuka EWS beserta aturan, kondisi saat ini, tren, bukti, PIC, tenggat dan evaluasi. Akses siswa tetap dibatasi kelas/mapel atau anak terhubung. Wali Murid dan Siswa tidak menerima catatan pendampingan internal. Admin dan Security tidak mendapat EWS pada paket mana pun. Role Yayasan hanya menerima agregat untuk pengawasan dan penanganan risiko; rincian individu tetap berada pada role unit yang berwenang.

Pro/Yayasan juga menyediakan analisis lintas semester, tampilan laporan tersimpan, persetujuan rapor satu atau dua tahap, serta pengingat dalam aplikasi. Kepala Sekolah mengatur aturan EWS dan alur persetujuan. Paket Yayasan mencakup Pro tiap unit serta tata kelola lintas unit, dengan minimal dua unit; role Yayasan memerlukan hak paket Yayasan secara terpisah dari nama role.

Pengunjung memilih paket pada pengenalan dan statusnya tetap tersimpan setelah reload. Endpoint sesi publik menerima pilihan paket opsional khusus demo. Setelah sesi dibuat, hanya Kepala Sekolah, Admin dan Yayasan dapat mengubah paket melalui endpoint perubahan paket demo. Guru, Wali Murid, Siswa dan Security tidak dapat melakukannya. Perubahan paket ketiga unit demo dilakukan atomik; pergantian paket mempertahankan data dan kewenangan role.

Harga merupakan simulasi proposal tahunan: interpolasi linear per segmen pada titik 200/500/1.000/2.000 siswa, biaya minimum hingga 200, dan penawaran khusus di atas 2.000. Biaya Yayasan adalah jumlah Pro setiap unit ditambah Rp1.500.000/unit/tahun, tanpa menghitung Pro dua kali. Angka harga, contoh perhitungan dan pembulatan tercantum di [README.md](README.md); tidak ada penagihan atau langganan nyata.

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

Admin dapat menonaktifkan P5, tahfizh atau PPDB sesuai kebutuhan sekolah. Menu, halaman dan aksi modul mengikuti pengaturan tersebut; data lama tetap disimpan. Pembatasan akses, QR, ekspor dan backup dasar sesuai role berlaku pada semua paket. Tidak ada AI, chat, payment gateway, email atau integrasi WhatsApp. Matriks izin ada di `shared/access.mjs`; cakupan pengujian meliputi hak role/paket, penyaringan bootstrap, endpoint langsung dan alur browser.
