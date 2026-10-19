import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Play, ShieldCheck, X } from "lucide-react";
import {
  useApp,
  roleNames,
  rolePhotos,
  roleResponsibilities,
  isPro,
  isFoundation,
  type Row,
} from "./model";
import { Avatar, Brand, Button } from "./ui";
export function DemoWelcome({
  onChoose,
  onSkip,
}: {
  onChoose: (role: string, homeroom?: boolean, plan?: string) => Promise<void>;
  onSkip: (plan: string) => Promise<void>;
}) {
  const { data, toast } = useApp();
  const [plan, setPlan] = useState(data.settings[0]?.plan || "Pro");
  const [busy, setBusy] = useState(false);
  const choose = async (role: string, h = false) => {
    setBusy(true);
    try {
      await onChoose(role, h, plan);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="welcome-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Pilih pengalaman demo"
    >
      <div className="welcome-shell">
        <div className="welcome-intro">
          <Brand />
          <span className="eyebrow">
            COBA PEKERJAAN SEKOLAH DALAM BEBERAPA MENIT
          </span>
          <h1>Rasakan manfaatnya dari peranmu.</h1>
          <p>
            Pilih satu pengalaman, selesaikan satu pekerjaan, lalu lihat
            hasilnya. Seluruh identitas dan skenario menggunakan data dummy.
          </p>
          <div className="welcome-promises">
            <span>
              <CheckCircle2 size={17} />
              Data sudah terisi
            </span>
            <span>
              <CheckCircle2 size={17} />
              Hasil bisa diunduh
            </span>
            <span>
              <ShieldCheck size={17} />
              Akses sesuai tanggung jawab
            </span>
          </div>
          <label className="welcome-plan-select">
            Paket demo awal
            <select value={plan} disabled={busy} onChange={(event) => setPlan(event.target.value)}>
              <option>Standard</option><option>Pro</option><option>Yayasan</option>
            </select>
          </label>
          <p className="welcome-plan-note">
            {plan === "Standard" ? "Standard: kegiatan sekolah sehari-hari beres. EWS tersedia pada Pro dan Yayasan."
              : plan === "Pro" ? "Pro: telusuri risiko, tetapkan PIC dan tenggat, lalu evaluasi hasil penanganan."
              : "Yayasan: lihat prioritas, arahan dan perkembangan seluruh unit."}
            {" "}Berganti paket mempertahankan data percobaan dan hak tiap peran.
          </p>
          <Button variant="ghost" disabled={busy} onClick={async () => {
            setBusy(true);
            try { await onSkip(plan); }
            catch (e) { toast((e as Error).message, true); }
            finally { setBusy(false); }
          }}>
            Jelajahi tanpa panduan
            <ArrowRight size={16} />
          </Button>
        </div>
        <div className="welcome-roles">
          {Object.entries(roleNames).map(([role, name]) => (
            <button key={role} disabled={busy || (role === "foundation" && plan !== "Yayasan")} onClick={() => choose(role)}>
              <Avatar photo={rolePhotos[role]} size={45} />
              <div>
                <strong>{name}</strong>
                <small>{role === "foundation" && plan !== "Yayasan" ? "Pilih paket Yayasan untuk mencoba pengelolaan lintas unit." : roleResponsibilities[role]}</small>
              </div>
              <ArrowRight size={16} />
            </button>
          ))}
          <button disabled={busy} onClick={() => choose("teacher", true)}>
            <Avatar photo={rolePhotos.teacher} size={45} />
            <div>
              <strong>Guru + wali kelas</strong>
              <small>
                P5 dan rapor kelas perwalian; pada Pro/Yayasan termasuk pendampingan dan evaluasi hasil.
              </small>
            </div>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
const scenarios: Record<
  string,
  { title: string; page: string; id?: string; event: string; hint: string; status?: string }[]
> = {
  principal: [
    {
      title: "Tinjau siswa yang perlu diprioritaskan",
      page: "ews",
      event: "route:ews",
      hint: "Buka penyebab dan pilih rencana pendampingan.",
    },
    {
      title: "Simpan satu rencana pendampingan",
      page: "interventions",
      event: "/api/interventions",
      hint: "Tetapkan PIC, target evaluasi dan hasil yang diharapkan.",
    },
    {
      title: "Evaluasi hasil pendampingan",
      page: "interventions",
      event: "/api/interventions",
      status: "Selesai",
      hint: "Buka rencana, catat hasil dan bukti evaluasi, lalu tandai selesai.",
    },
    {
      title: "Unduh rapor sebagai hasil nyata",
      page: "reports",
      event: "download:report",
      hint: "Tinjau satu rapor lalu unduh PDF.",
    },
  ],
  admin: [
    {
      title: "Buat tagihan satu kelas",
      page: "finance",
      event: "/api/invoices/batch",
      hint: "Gunakan Buat tagihan kelas; gunakan judul yang belum ada.",
    },
    {
      title: "Catat penerimaan pembayaran",
      page: "finance",
      event: "/api/invoices",
      hint: "Pilih satu tagihan, lalu catat nominal yang diterima.",
    },
    {
      title: "Unduh kuitansi transaksi",
      page: "finance",
      event: "download:receipt",
      hint: "Buka riwayat penerimaan dan unduh kuitansi.",
    },
  ],
  teacher: [
    {
      title: "Simpan absensi kelas hari ini",
      page: "attendance",
      event: "/api/academic-batch#attendance",
      hint: "Pilih kelas dan tanggal, isi status, lalu simpan sekaligus.",
    },
    {
      title: "Simpan nilai pada mapel yang diajar",
      page: "grades",
      event: "/api/academic-batch#grades",
      hint: "Ubah satu nilai lalu simpan perubahan.",
    },
    {
      title: "Unduh rapor untuk ditinjau",
      page: "reports",
      event: "download:report",
      hint: "Tinjau rapor pada kelas yang diajar dan unduh PDF.",
    },
  ],
  parent: [
    {
      title: "Tinjau perkembangan anak",
      page: "grades",
      event: "route:grades",
      hint: "Periksa capaian dan mata pelajaran yang perlu dibantu.",
    },
    {
      title: "Tinjau tugas yang perlu diselesaikan",
      page: "assignments",
      event: "route:assignments",
      hint: "Lihat tenggat dan petunjuk tugas anak.",
    },
    {
      title: "Unduh kartu penjemput",
      page: "pickup",
      event: "download:qr",
      hint: "Buka Kartu QR pada penjemput yang aktif, lalu unduh.",
    },
  ],
  student: [
    {
      title: "Kumpulkan jawaban tugas",
      page: "assignments",
      event: "/api/submissions",
      hint: "Buka tugas, isi jawaban, lalu kumpulkan.",
    },
    {
      title: "Selesaikan satu kuis",
      page: "quizzes",
      event: "/api/quiz/",
      hint: "Jawab soal dan lihat hasil penilaian server.",
    },
    {
      title: "Unduh rapor yang sudah terbit",
      page: "reports",
      event: "download:report",
      hint: "Buka rapor, tinjau capaianmu, lalu unduh PDF.",
    },
  ],
  foundation: [
    {
      title: "Tinjau prioritas unit",
      page: "dashboard",
      event: "route:dashboard",
      hint: "Bandingkan target dan tren, kemudian pilih unit yang perlu dibantu.",
    },
    {
      title: "Beri arahan kepada kepala unit",
      page: "board-actions",
      event: "/api/foundation-tasks",
      hint: "Tetapkan PIC, tenggat dan hasil yang diharapkan.",
    },
    {
      title: "Unduh bahan rapat yayasan",
      page: "meeting",
      event: "download:meeting",
      hint: "Laporan mencakup kondisi unit, arahan, bukti dan kebutuhan.",
    },
  ],
  security: [
    {
      title: "Verifikasi kartu QR dummy",
      page: "gate-scan",
      event: "/api/pickup/verify",
      hint: "Gunakan kartu dummy atau pindai kartu. Cocokkan identitas pada hasilnya.",
    },
    {
      title: "Catat kedatangan / kepulangan",
      page: "gate-scan",
      event: "/api/pickupLogs",
      hint: "Catat masuk dahulu, lalu pulang sesuai kondisi nyata siswa.",
    },
    {
      title: "Laporkan kejadian untuk konfirmasi",
      page: "gate-incidents",
      event: "/api/gate-incidents",
      hint: "Isi kronologi. Pengecualian hanya dapat diputuskan Admin.",
    },
  ],
};
export function DemoTour() {
  const { user, data, go } = useApp();
  const plan = data.settings[0]?.plan || "Pro";
  const [active, setActive] = useState(false),
    [step, setStep] = useState(0);
  const standardPrincipal = [
    { title: "Tinjau kehadiran harian", page: "attendance", event: "route:attendance", hint: "Periksa catatan kehadiran kelas pada hari yang dipilih." },
    { title: "Periksa kelengkapan rapor", page: "reports", event: "route:reports", hint: "Tinjau capaian dan kelengkapan nilai sebelum rapor diterbitkan." },
    { title: "Unduh rapor sekolah", page: "reports", event: "download:report", hint: "Buka rapor terbit dan unduh PDF sebagai hasil pekerjaan." },
  ];
  const list: { title: string; page: string; id?: string; event: string; hint: string; status?: string }[] =
    user.role === "principal" && !isPro(data.settings[0]) ? standardPrincipal
      : user.role === "foundation" && !isFoundation(data.settings[0]) ? [] : scenarios[user.role] || [],
    item = list[step];
  useEffect(() => {
    setStep(0);
    setActive(false);
  }, [user.role, user.isHomeroom, plan]);
  useEffect(() => {
    const start = () => {
      if (!list.length) { go("packages"); return; }
      setStep(0);
      setActive(true);
    };
    window.addEventListener("kk:tour", start);
    return () => window.removeEventListener("kk:tour", start);
  }, [user.role, plan]);
  useEffect(() => {
    if (!active || !item) return;
    const action = (e: Event) => {
      const path = (e as CustomEvent).detail?.path || "";
      if (path.startsWith(item.event) && (!item.status || (e as CustomEvent).detail?.result?.status === item.status)) setStep((s) => s + 1);
    };
    window.addEventListener("kk:action", action);
    return () => window.removeEventListener("kk:action", action);
  }, [active, step, user.role]);
  if (!active) return null;
  return (
    <aside className="tour-dock" aria-label="Panduan skenario demo">
      <button
        className="icon-btn tour-close"
        aria-label="Tutup panduan demo"
        onClick={() => setActive(false)}
      >
        <X size={16} />
      </button>
      {item ? (
        <>
          <small>
            SKENARIO {roleNames[user.role].toUpperCase()} · {step + 1}/
            {list.length}
          </small>
          <strong>{item.title}</strong>
          <p>{item.hint}</p>
          <Button
            onClick={() => {
              go(item.page, item.id);
              window.dispatchEvent(
                new CustomEvent("kk:action", {
                  detail: { path: "route:" + item.page },
                }),
              );
            }}
          >
            Buka langkah ini
            <ArrowRight size={15} />
          </Button>
        </>
      ) : (
        <>
          <CheckCircle2 size={24} />
          <strong>Alur demo selesai</strong>
          <p>
            Tindakan penyimpanan dan unduhan telah dijalankan. Kamu dapat
            melanjutkan eksplorasi dengan data yang sama.
          </p>
          <Button onClick={() => setActive(false)}>Lanjut menjelajah</Button>
        </>
      )}
    </aside>
  );
}
