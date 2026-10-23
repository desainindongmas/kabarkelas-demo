import { useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  FileCheck2,
  Flag,
  GraduationCap,
  Layers3,
  Play,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Brand, Button, Modal } from "./ui";
import "./visitor.css";

export type VisitorPage = "start" | "flow" | "needs" | "order";

const pages: { id: VisitorPage; label: string; short: string }[] = [
  { id: "start", label: "Kenali KabarKelas", short: "Kenali" },
  { id: "flow", label: "Alur penggunaan", short: "Alur" },
  { id: "needs", label: "Hitung kebutuhan", short: "Hitung" },
  { id: "order", label: "Pemesanan", short: "Pesan" },
];

const tourSteps = [
  {
    label: "Kegiatan sehari-hari",
    title: "Mulai dari pekerjaan yang ingin dibereskan.",
    description:
      "Guru mencatat kehadiran dan nilai. Admin mengelola administrasi dan SPP manual. Keluarga mengikuti perkembangan anak. Semua bekerja dalam ruang sesuai tanggung jawabnya.",
    icon: ClipboardCheck,
    example: ["Pilih peran", "Coba satu pekerjaan", "Lihat hasilnya"],
    note: "Standard sudah mencakup kegiatan harian, rapor, portal keluarga, dan penjemputan QR.",
  },
  {
    label: "Pengawasan pada Pro",
    title: "Peringatan dilanjutkan dengan tindakan yang jelas.",
    description:
      "Pada Pro dan Yayasan, EWS membantu melihat pola risiko. Buka bukti, tetapkan penanggung jawab dan tenggat, lalu catat hasil evaluasi pendampingan.",
    icon: Activity,
    example: ["Telusuri bukti", "Tetapkan PIC dan tenggat", "Evaluasi hasil"],
    note: "EWS hanya tersedia pada Pro/Yayasan. Admin dan Security tetap tidak memperoleh akses akademik siswa.",
  },
  {
    label: "Pengelolaan Yayasan",
    title: "Tahu unit mana yang perlu dibantu dan apa tindak lanjutnya.",
    description:
      "Pengurus melihat ringkasan lintas sekolah, menetapkan target dan arahan, lalu memantau progres, bukti penyelesaian, serta kebutuhan tiap unit.",
    icon: Building2,
    example: ["Prioritas antarunit", "Arahan dan progres", "Laporan rapat"],
    note: "Yayasan melihat data agregat. Rincian siswa tetap berada pada peran sekolah yang berwenang.",
  },
  {
    label: "Pilih sesuai kebutuhan",
    title: "Coba demonya, hitung biayanya, lalu susun pengajuan.",
    description:
      "Masukkan jumlah siswa sebenarnya dan kebutuhan sekolah. Untuk Yayasan, hitung per unit. Tinjau rincian biaya tahunan dan ringkasan sebelum melanjutkan pemesanan.",
    icon: Calculator,
    example: ["Jelajahi demo", "Hitung kebutuhan", "Tinjau pemesanan"],
    note: "Data dalam demo adalah contoh. Mengganti paket percobaan tidak menghapus data atau memperluas hak peran.",
  },
];

const workSteps = [
  {
    icon: Layers3,
    title: "Siapkan data sekolah",
    description: "Lengkapi profil, impor data siswa, lalu atur kelas, mata pelajaran, dan modul yang diperlukan.",
    output: "Data awal tertata",
  },
  {
    icon: Users,
    title: "Bagi tanggung jawab",
    description: "Tentukan guru pengampu, wali kelas, Admin, petugas Security, dan anak yang terhubung ke keluarga.",
    output: "Setiap peran mendapat ruang kerja",
  },
  {
    icon: ClipboardCheck,
    title: "Jalankan kegiatan harian",
    description: "Catat absensi dan nilai, kelola tugas serta materi, dan lakukan pencatatan administrasi sekolah.",
    output: "Pekerjaan harian tercatat",
  },
  {
    icon: FileCheck2,
    title: "Bagikan hasil dan layanan",
    description: "Periksa kelengkapan rapor, terbitkan PDF, catat SPP manual, dan verifikasi penjemput dengan QR.",
    output: "Sekolah dan keluarga terhubung",
  },
  {
    icon: Activity,
    title: "Pantau dan tangani risiko",
    description: "Pada Pro/Yayasan, telusuri penyebab peringatan EWS, tetapkan PIC dan tenggat, lalu evaluasi hasilnya.",
    output: "Khusus Pro dan Yayasan",
  },
  {
    icon: Flag,
    title: "Koordinasikan seluruh unit",
    description: "Pada Yayasan, bandingkan ringkasan sekolah, beri arahan, pantau bukti, dan susun bahan rapat bersama.",
    output: "Khusus Yayasan",
  },
];

const packages = [
  { name: "Standard", title: "Kegiatan sekolah sehari-hari beres.", copy: "Absensi, nilai, tugas, rapor, administrasi, SPP manual, portal keluarga, dan QR penjemputan.", tag: "Operasional satu sekolah" },
  { name: "Pro", title: "Masalah lebih cepat terlihat dan penanganannya terpantau.", copy: "Seluruh Standard, ditambah EWS, analisis perkembangan, serta pemantauan tindak lanjut dan evaluasinya.", tag: "Pengawasan dan tindak lanjut" },
  { name: "Yayasan", title: "Semua sekolah terkendali, setiap arahan jelas tindak lanjutnya.", copy: "Pro untuk unit terdaftar, ditambah target, arahan, kebutuhan, progres, dan laporan rapat lintas sekolah.", tag: "Pengelolaan beberapa unit" },
];

export function VisitorJourney({
  page,
  onNavigate,
  onExplore,
  children,
}: {
  page: VisitorPage;
  onNavigate: (page: VisitorPage) => void;
  onExplore: () => void;
  children?: ReactNode;
}) {
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const step = tourSteps[tourStep];
  const StepIcon = step.icon;
  const activeIndex = pages.findIndex((item) => item.id === page);
  const navigate = (next: VisitorPage) => {
    setTourOpen(false);
    onNavigate(next);
  };
  const explore = () => {
    setTourOpen(false);
    onExplore();
  };
  const openTour = () => {
    setTourStep(0);
    setTourOpen(true);
  };

  return (
    <div className="visitor-shell">
      <a className="visitor-skip" href="#visitor-main" onClick={(event) => {
        event.preventDefault();
        const main = document.getElementById("visitor-main");
        main?.focus();
        main?.scrollIntoView({ block: "start" });
      }}>Lewati ke isi halaman</a>
      <header className="visitor-header">
        <button className="visitor-brand" aria-label="Kembali ke pengenalan KabarKelas" onClick={() => navigate("start")}><Brand /></button>
        <nav className="visitor-header-nav" aria-label="Panduan pengunjung">
          <button onClick={openTour}><Play size={15} /> Tur singkat</button>
          <button onClick={() => navigate("flow")} aria-current={page === "flow" ? "page" : undefined}>Cara kerja</button>
          <Button variant="secondary" onClick={explore}>Jelajahi demo <ArrowRight size={15} /></Button>
        </nav>
      </header>

      <nav className="visitor-steps" aria-label="Tahapan mengenal dan memesan KabarKelas">
        <ol>
          {pages.map((item, index) => (
            <li key={item.id} className={index === activeIndex ? "active" : index < activeIndex ? "passed" : ""}>
              <button onClick={() => navigate(item.id)} aria-label={item.label} aria-current={page === item.id ? "step" : undefined}>
                <span className="visitor-step-number">{index < activeIndex ? <Check size={13} /> : index + 1}</span>
                <span className="visitor-step-label">{item.label}</span>
                <span className="visitor-step-short">{item.short}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <main id="visitor-main" className="visitor-main" tabIndex={-1}>
        {page === "start" ? (
          <>
            <section className="visitor-hero">
              <div className="visitor-hero-copy">
                <span className="visitor-eyebrow">RUANG TUMBUH BERSAMA SEKOLAH</span>
                <h1>Kenali manfaatnya.<br /><span>Coba pekerjaanmu.</span><br />Pilih yang dibutuhkan.</h1>
                <p>KabarKelas membantu sekolah menata kegiatan harian, mengikuti perkembangan siswa, dan memastikan setiap tindak lanjut berjalan.</p>
                <div className="visitor-hero-actions">
                  <Button onClick={openTour}><Play size={17} /> Mulai tur singkat</Button>
                  <Button variant="secondary" onClick={explore}>Jelajahi demo <ArrowRight size={17} /></Button>
                </div>
                <button className="visitor-text-link" onClick={() => navigate("needs")}><Calculator size={16} /> Sudah tahu kebutuhanmu? Hitung kebutuhan</button>
                <div className="visitor-hero-assurances"><span><CheckCircle2 size={15} /> Data contoh sudah terisi</span><span><ShieldCheck size={15} /> Akses mengikuti peran</span></div>
              </div>
              <div className="visitor-work-preview" aria-label="Contoh alur pekerjaan sekolah">
                <div className="visitor-preview-top"><span className="visitor-preview-mark"><GraduationCap size={22} /></span><div><small>CONTOH ALUR KERJA</small><strong>Satu langkah, hasilnya terlihat.</strong></div></div>
                <div className="visitor-preview-row"><span><ClipboardCheck size={20} /></span><div><strong>Catat kegiatan kelas</strong><p>Kehadiran, nilai, dan tugas dalam satu alur.</p></div><CheckCircle2 size={18} /></div>
                <div className="visitor-preview-row"><span><FileCheck2 size={20} /></span><div><strong>Tinjau dan bagikan rapor</strong><p>Periksa kelengkapan, lalu unduh hasilnya.</p></div><CheckCircle2 size={18} /></div>
                <div className="visitor-preview-row visitor-preview-pro"><span><Activity size={20} /></span><div><strong>Pantau tindak lanjut</strong><p>Pro/Yayasan: risiko, PIC, tenggat, evaluasi.</p></div><ArrowRight size={18} /></div>
                <div className="visitor-preview-foot"><Users size={17} /><p>Pilih peranmu di demo dan coba satu pekerjaan sampai selesai.</p></div>
              </div>
            </section>

            <section className="visitor-paths" aria-labelledby="visitor-path-title">
              <div className="visitor-section-title"><span className="visitor-eyebrow">MULAI DARI YANG KAMU PERLUKAN</span><h2 id="visitor-path-title">Dari mengenal sampai siap mengajukan.</h2></div>
              <div className="visitor-path-grid">
                <button onClick={() => navigate("flow")}><BookOpen size={23} /><strong>Pahami alur penggunaan</strong><span>Lihat urutan pekerjaan sekolah dan siapa yang menjalankannya.</span><b>Lihat alur <ArrowRight size={15} /></b></button>
                <button onClick={explore}><Play size={23} /><strong>Coba langsung sesuai peran</strong><span>Jelajahi data contoh dan ikuti skenario yang bisa diselesaikan.</span><b>Jelajahi demo <ArrowRight size={15} /></b></button>
                <button onClick={() => navigate("needs")}><Calculator size={23} /><strong>Hitung dan susun kebutuhan</strong><span>Masukkan siswa per sekolah, bandingkan paket, lalu tinjau ringkasannya.</span><b>Hitung kebutuhan <ArrowRight size={15} /></b></button>
              </div>
            </section>

            <section className="visitor-fit" aria-labelledby="visitor-fit-title"><div><span className="visitor-eyebrow">SESUAI TANGGUNG JAWAB</span><h2 id="visitor-fit-title">Satu sekolah, berbagai ruang kerja.</h2><p>Kepala Sekolah, Admin, Guru, Wali Murid, Siswa, Yayasan, dan Security mencoba ruang kerja yang berbeda. Memilih paket tidak mengubah hak akses peran.</p></div><Button variant="secondary" onClick={explore}>Pilih pengalaman demo <ArrowRight size={16} /></Button></section>
          </>
        ) : page === "flow" ? (
          <>
            <section className="visitor-page-intro"><span className="visitor-eyebrow">ALUR PENGGUNAAN</span><h1>Dari data awal sampai hasil yang bisa ditindaklanjuti.</h1><p>Mulai dari kegiatan satu sekolah. Tambahkan pengawasan Pro atau pengelolaan Yayasan sesuai kebutuhan.</p></section>
            <section className="visitor-workflow" aria-label="Urutan penggunaan KabarKelas">
              {workSteps.map((item, index) => <article key={item.title}><span className="visitor-flow-number">{String(index + 1).padStart(2, "0")}</span><div className="visitor-flow-icon"><item.icon size={23} /></div><div><h2>{item.title}</h2><p>{item.description}</p><span className="visitor-output"><CheckCircle2 size={13} /> {item.output}</span></div></article>)}
            </section>
            <section className="visitor-packages" aria-labelledby="visitor-package-title"><div className="visitor-section-title"><span className="visitor-eyebrow">PILIH MANFAAT YANG DIBUTUHKAN</span><h2 id="visitor-package-title">Kegiatan harian, pengawasan, atau pengelolaan lintas unit.</h2></div><div className="visitor-package-grid">{packages.map((item) => <article key={item.name} className={item.name === "Pro" ? "featured" : ""}><span className="visitor-package-name">{item.name}</span><h3>{item.title}</h3><p>{item.copy}</p><small>{item.tag}</small></article>)}</div><p className="visitor-package-note"><ShieldCheck size={17} /> Ekspor, kontrol akses per peran, dan keamanan QR tersedia pada semua paket sesuai kewenangan pengguna.</p></section>
            <section className="visitor-next"><div><h2>Sudah ada gambaran kebutuhan sekolahmu?</h2><p>Coba pekerjaan di demo atau lanjutkan ke perhitungan biaya tahunan.</p></div><div><Button variant="secondary" onClick={explore}>Jelajahi demo</Button><Button onClick={() => navigate("needs")}>Hitung kebutuhan <ArrowRight size={16} /></Button></div></section>
          </>
        ) : children}
      </main>

      <footer className="visitor-footer"><Brand compact /><p>Demo menggunakan data contoh. Pemilihan peran terbuka untuk mencoba pengalaman KabarKelas.</p><button onClick={() => navigate("start")}>Kembali ke pengenalan</button></footer>

      {tourOpen && <Modal title="Tur singkat KabarKelas" subtitle="Empat langkah untuk mengenal manfaat dan menentukan kebutuhan." onClose={() => setTourOpen(false)} wide>
        <div className="visitor-tour">
          <div className="visitor-tour-progress" aria-label={`Langkah ${tourStep + 1} dari ${tourSteps.length}`}><span>LANGKAH {tourStep + 1} DARI {tourSteps.length}</span><div>{tourSteps.map((_, index) => <span key={index} className={index <= tourStep ? "active" : ""} />)}</div></div>
          <div className="visitor-tour-body" aria-live="polite"><span className="visitor-tour-icon"><StepIcon size={28} /></span><span className="visitor-eyebrow">{step.label}</span><h3>{step.title}</h3><p>{step.description}</p><ol>{step.example.map((item) => <li key={item}><CheckCircle2 size={16} />{item}</li>)}</ol><small>{step.note}</small></div>
          <div className="visitor-tour-actions"><Button variant="ghost" onClick={() => setTourOpen(false)}>Lewati tur</Button><div>{tourStep > 0 && <Button variant="secondary" onClick={() => setTourStep((value) => value - 1)}><ChevronLeft size={16} /> Kembali</Button>}{tourStep < tourSteps.length - 1 ? <Button onClick={() => setTourStep((value) => value + 1)}>Langkah berikutnya <ArrowRight size={16} /></Button> : <><Button variant="secondary" onClick={explore}>Jelajahi demo</Button><Button onClick={() => navigate("needs")}>Hitung kebutuhan <ArrowRight size={16} /></Button></>}</div></div>
        </div>
      </Modal>}
    </div>
  );
}
