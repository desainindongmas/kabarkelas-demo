import { useState } from "react";
import { Activity, ArrowRight, CheckCircle2, ClipboardCheck, Search, Users } from "lucide-react";
import { isPro, useApp } from "./model";
import { Badge, Button, Empty } from "./ui";

export function ProExample() {
  const { user, data, save, go, toast } = useApp();
  const [busy, setBusy] = useState(false);
  if (isPro(data.settings[0]) || !["principal", "admin"].includes(user.role)) return null;
  const tryPro = async () => {
    setBusy(true);
    try {
      await save("demo-plan", { plan: "Pro" }, true);
      toast("Sedang mencoba Pro. Data demo tetap tersimpan.");
      go(user.role === "principal" ? "ews" : "analytics");
    } catch (e) {
      toast((e as Error).message, true);
    } finally { setBusy(false); }
  };
  return (
    <aside className="pro-example" aria-label="Contoh fitur Pro">
      <div className="pro-example-intro">
        <Badge tone="blue">Contoh fitur Pro</Badge>
        <h2>Pola terlihat, penanganan terpantau.</h2>
        <p>Simulasi siswa fiktif untuk memperlihatkan alur EWS. Data sekolahmu di Standard tetap digunakan untuk pekerjaan sehari-hari.</p>
      </div>
      <ol className="pro-example-steps">
        <li><Activity size={19} /><strong>Pola risiko</strong><span>Kehadiran siswa contoh turun dan 3 tugas belum selesai.</span></li>
        <li><Search size={19} /><strong>Telusuri bukti</strong><span>Periksa catatan kehadiran, tugas, dan perkembangan nilai.</span></li>
        <li><Users size={19} /><strong>Tetapkan tindakan</strong><span>Wali kelas menjadi PIC, dengan target dan tenggat evaluasi.</span></li>
        <li><CheckCircle2 size={19} /><strong>Evaluasi hasil</strong><span>Catat perubahan dan bukti sebelum menutup pendampingan.</span></li>
      </ol>
      <div className="pro-example-action">
        <p>EWS akademik digunakan Kepala Sekolah dan guru sesuai penugasan. Akses Admin tetap pada administrasi.</p>
        <Button disabled={busy} onClick={tryPro}>Coba Pro tanpa menghapus data <ArrowRight size={16} /></Button>
      </div>
    </aside>
  );
}

export function FoundationPlanRequired() {
  const { save, toast, go } = useApp();
  const [busy, setBusy] = useState(false);
  return <Empty title="Pengelolaan lintas unit tersedia di Yayasan"
    description="Coba prioritas sekolah, target unit, arahan dengan PIC dan tenggat, serta progres dan bukti penyelesaiannya. Data percobaan tetap tersimpan saat berganti paket."
    action={<Button disabled={busy} onClick={async () => {
      setBusy(true);
      try { await save("demo-plan", { plan: "Yayasan" }, true); go("dashboard"); }
      catch (e) { toast((e as Error).message, true); }
      finally { setBusy(false); }
    }}><ClipboardCheck size={17} /> Coba paket Yayasan</Button>} />;
}
