import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Download, FileCheck2, LoaderCircle, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { quoteFoundation, quoteSchool, type FoundationUnitQuote } from "../shared/pricing.mjs";
import { currency, number } from "./model";
import { Button } from "./ui";
import "./buyer-flow.css";

export type BuyerNeeds = {
  plan: "Standard" | "Pro" | "Yayasan";
  students: number;
  units: number[];
  wantsEws: boolean;
};

export type BuyerQuote = {
  annual: number | null;
  students: number;
  customQuote: boolean;
  managementAnnual?: number;
  proAnnual?: number | null;
  units?: FoundationUnitQuote[];
};

export type PurchaseDraft = {
  id: string;
  reference: string;
  status: "draft";
  createdAt: string;
  needs: BuyerNeeds;
  quote: BuyerQuote;
  contact: { name: string; organization: string; email: string; phone: string };
  note: string;
};

const validCount = (value: number) => Number.isSafeInteger(value) && value > 0;
const needsKey = (needs: BuyerNeeds) => JSON.stringify({ ...needs, students: needs.plan === "Yayasan" ? needs.units.reduce((sum, count) => sum + count, 0) : needs.students, units: needs.plan === "Yayasan" ? needs.units : [needs.students] });
let sessionPreparation: Promise<{ ready: true; latest: PurchaseDraft | null }> | null = null;
export async function waitForBuyerSession() {
  // A first Netlify response can establish the visitor workspace cookie. Finish
  // that response before demo bootstrap starts another workspace request.
  try { await sessionPreparation; } catch { /* Bootstrap can retry independently. */ }
}
function prepareBuyerSession() {
  if (!sessionPreparation) sessionPreparation = (async () => {
    const response = await fetch("/api/purchase-drafts/session");
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.ready !== true)
      throw new Error(body?.error || "Formulir belum siap. Coba siapkan kembali sebelum menyimpan draf.");
    return body as { ready: true; latest: PurchaseDraft | null };
  })().finally(() => { sessionPreparation = null; });
  return sessionPreparation;
}

export function buyerQuote(needs: BuyerNeeds): BuyerQuote | null {
  if (needs.plan === "Yayasan") {
    if (needs.units.length < 2 || needs.units.length > 100 || !needs.units.every(validCount)) return null;
    const quote = quoteFoundation(needs.units);
    return Number.isSafeInteger(quote.students) ? quote : null;
  }
  if (!validCount(needs.students)) return null;
  const quote = quoteSchool(needs.students);
  return {
    students: quote.students,
    annual: needs.plan === "Pro" ? quote.proAnnual : quote.standardAnnual,
    customQuote: quote.customQuote,
  };
}

const planPromises = {
  Standard: "Kegiatan sekolah sehari-hari beres.",
  Pro: "Masalah lebih cepat terlihat dan penanganannya terpantau.",
  Yayasan: "Semua sekolah terkendali, setiap arahan jelas tindak lanjutnya.",
};

function QuoteSummary({ needs, quote }: { needs: BuyerNeeds; quote: BuyerQuote }) {
  const breakdown = needs.plan === "Yayasan" ? quote.units || buyerQuote(needs)?.units : undefined;
  return (
    <section className="buyer-quote" aria-label="Ringkasan estimasi kebutuhan">
      <div className="buyer-quote-top"><span className="buyer-kicker">PAKET {needs.plan.toUpperCase()}</span><span className="buyer-quote-pill">Tagihan tahunan</span></div>
      <h2>{planPromises[needs.plan]}</h2>
      <p className="buyer-quote-count">{number(quote.students)} siswa aktif{needs.plan === "Yayasan" ? ` di ${needs.units.length} unit` : " di satu sekolah"}</p>
      <div className="buyer-annual" aria-live="polite">
        <strong>{quote.annual === null ? "Penawaran khusus" : currency(quote.annual)}</strong>
        {quote.annual !== null && <span>/ tahun</span>}
      </div>
      {quote.annual !== null ? <div className="buyer-averages">
        <span>{currency(quote.annual / quote.students)} per siswa/tahun</span>
        <small>{currency(quote.annual / quote.students / 12)} setara per siswa/bulan · ditagihkan tahunan</small>
      </div> : <p className="buyer-custom-note">Ada sekolah dengan lebih dari 2.000 siswa. Rincian kebutuhan dapat disimpan untuk meminta penawaran khusus; total biaya belum ditentukan.</p>}
      {needs.plan === "Yayasan" && <>
        <div className="buyer-unit-breakdown">
          <div><span>Pro seluruh unit</span><strong>{quote.proAnnual == null ? "Penawaran khusus" : currency(quote.proAnnual)}</strong></div>
          <div><span>Pengelolaan Yayasan</span><strong>{currency(quote.managementAnnual || needs.units.length * 1_500_000)}</strong></div>
        </div>
        <p className="buyer-muted">Biaya Pro dihitung satu kali per unit. Jika seluruh unit sudah berlangganan Pro, tambahan pengelolaan Yayasan adalah {currency(quote.managementAnnual || needs.units.length * 1_500_000)}/tahun.</p>
        <details className="buyer-unit-details"><summary>Lihat rincian {needs.units.length} unit</summary><div className="buyer-table-wrap"><table><thead><tr><th>Unit</th><th>Siswa</th><th>Pro/tahun</th><th>Pengelolaan</th><th>Total/tahun</th></tr></thead><tbody>{breakdown?.map((unit) => <tr key={unit.unit}><th>Unit {unit.unit}</th><td>{number(unit.students)}</td><td>{unit.proAnnual === null ? "Khusus" : currency(unit.proAnnual)}</td><td>{currency(unit.managementAnnual)}</td><td>{unit.annual === null ? "Khusus" : currency(unit.annual)}</td></tr>)}</tbody></table></div></details>
      </>}
      <ul className="buyer-inclusions">
        <li><CheckCircle2 size={16} /> Absensi, nilai, tugas, rapor dan administrasi sekolah</li>
        <li><CheckCircle2 size={16} /> SPP manual, portal keluarga dan penjemputan QR</li>
        {needs.plan !== "Standard" && <li><CheckCircle2 size={16} /> EWS, bukti risiko, PIC, tenggat dan evaluasi</li>}
        {needs.plan === "Yayasan" && <li><CheckCircle2 size={16} /> Perbandingan unit, arahan, kebutuhan dan laporan rapat</li>}
      </ul>
      <p className="buyer-muted">Estimasi mengikuti harga simulasi demo. Belum merupakan penawaran resmi atau pembayaran.</p>
    </section>
  );
}

export function NeedsCalculator({ value, onChange, onContinue }: {
  value: BuyerNeeds;
  onChange: (next: BuyerNeeds) => void;
  onContinue: () => void;
}) {
  const quote = buyerQuote(value);
  const recommended = value.plan === "Yayasan" ? "Yayasan" : value.wantsEws ? "Pro" : "Standard";
  const mismatch = value.plan === "Standard" && value.wantsEws;
  const update = (partial: Partial<BuyerNeeds>) => onChange({ ...value, ...partial });
  const selectPlan = (plan: BuyerNeeds["plan"]) => update({ plan, units: value.units.length >= 2 ? value.units : [value.students || 500, 500] });
  const school = value.plan !== "Yayasan" && validCount(value.students) ? quoteSchool(value.students) : null;
  const difference = school?.proAnnual != null && school.standardAnnual != null ? school.proAnnual - school.standardAnnual : null;
  return (
    <div className="buyer-flow">
      <div className="buyer-page-intro"><span className="buyer-kicker">HITUNG KEBUTUHAN</span><h1>Pilih manfaatnya, lihat biaya tahunannya.</h1><p>Gunakan jumlah siswa aktif yang sebenarnya. Jumlah guru dan wali murid tidak menambah biaya tersendiri.</p></div>
      <div className="buyer-calculator-grid">
        <section className="buyer-card buyer-needs-form" aria-labelledby="buyer-needs-title">
          <h2 id="buyer-needs-title">Apa yang ingin dibantu?</h2>
          <p className="buyer-muted">Pekerjaan harian sekolah sudah tersedia pada seluruh paket.</p>
          <div className="buyer-base-need"><CheckCircle2 size={20} /><div><strong>Rapikan kegiatan sekolah sehari-hari</strong><span>Data, absensi, nilai, tugas, rapor, SPP manual dan portal keluarga.</span></div></div>
          <label className="buyer-choice"><input type="checkbox" checked={value.wantsEws} onChange={(event) => update({ wantsEws: event.target.checked, plan: value.plan === "Yayasan" ? "Yayasan" : event.target.checked ? "Pro" : "Standard" })} /><span><strong>Butuh EWS dan pemantauan tindak lanjut</strong><small>Telusuri risiko, tentukan PIC serta tenggat, lalu evaluasi hasilnya.</small></span></label>
          <label className="buyer-choice"><input type="checkbox" checked={value.plan === "Yayasan"} onChange={(event) => selectPlan(event.target.checked ? "Yayasan" : value.wantsEws ? "Pro" : "Standard")} /><span><strong>Kelola lebih dari satu sekolah</strong><small>Bandingkan unit dan pantau arahan, kebutuhan, progres serta bukti.</small></span></label>
          <div className="buyer-recommendation"><ShieldCheck size={19} /><p>Dari kebutuhan ini, <strong>{recommended}</strong> cocok untuk dicoba. Kamu tetap dapat meninjau pilihan paket.</p></div>
          <label className="buyer-field">Paket yang dipilih<select aria-label="Paket yang dipilih" value={value.plan} onChange={(event) => selectPlan(event.target.value as BuyerNeeds["plan"])}><option value="Standard">Standard</option><option value="Pro">Pro</option><option value="Yayasan">Yayasan</option></select></label>
          {mismatch && <p role="alert" className="buyer-error">Standard tidak menyertakan EWS. Pilih Pro/Yayasan atau hapus kebutuhan EWS sebelum melanjutkan.</p>}
          {value.plan !== "Yayasan" ? <label className="buyer-field">Jumlah siswa aktif<input type="number" inputMode="numeric" min="1" step="1" value={value.students || ""} onChange={(event) => update({ students: Number(event.target.value) })} aria-invalid={!validCount(value.students)} aria-describedby="buyer-price-terms" /></label> : <fieldset className="buyer-unit-fields"><legend>Siswa aktif per unit</legend><p className="buyer-muted">Minimum dua unit. Setiap sekolah dihitung dari jumlah siswanya sendiri.</p>{value.units.map((students, index) => <div className="buyer-unit-input" key={index}><label className="buyer-field">Jumlah siswa Unit {index + 1}<input type="number" inputMode="numeric" min="1" step="1" value={students || ""} onChange={(event) => update({ units: value.units.map((count, i) => i === index ? Number(event.target.value) : count) })} aria-invalid={!validCount(students)} /></label><Button type="button" variant="ghost" aria-label={`Hapus Unit ${index + 1}`} disabled={value.units.length <= 2} onClick={() => update({ units: value.units.filter((_, i) => i !== index) })}><Trash2 size={16} /></Button></div>)}<Button type="button" variant="secondary" disabled={value.units.length >= 100} onClick={() => update({ units: [...value.units, 500] })}><Plus size={16} /> Tambah unit</Button></fieldset>}
          {!quote && <p className="buyer-error" role="alert">Isi jumlah siswa dengan bilangan bulat positif untuk setiap sekolah.</p>}
          <div className="buyer-price-terms" id="buyer-price-terms"><strong>Yang perlu diketahui</strong><p>Hingga 200 siswa berlaku biaya minimum: Standard Rp3.500.000 dan Pro Rp5.500.000 per sekolah/tahun. Di antara titik harga, biaya naik proporsional, lalu total tahunan dibulatkan ke Rp1.000 terdekat. Di atas 2.000 siswa memerlukan penawaran khusus.</p><p>Yayasan menjumlahkan Pro setiap unit + Rp1.500.000/unit/tahun. Angka bulanan hanya pembanding; penagihan tetap tahunan.</p></div>
        </section>
        <div className="buyer-summary-column">
          {quote ? <QuoteSummary needs={value} quote={quote} /> : <div className="buyer-card buyer-awaiting"><Building2 size={32} /><h2>Estimasimu akan muncul di sini.</h2><p>Lengkapi jumlah siswa aktif untuk melihat total biaya dan rata-rata per siswa.</p></div>}
          {difference !== null && school && <div className="buyer-upgrade-note"><strong>Tambahan untuk Pro: {currency(difference)}/tahun</strong><p>Setara {currency(difference / school.students / 12)} per siswa per bulan untuk EWS, pemantauan tindak lanjut dan analisis perkembangan.</p></div>}
          <Button className="buyer-continue" disabled={!quote || mismatch} onClick={onContinue}>Lanjut ke pemesanan <ArrowRight size={17} /></Button>
          <p className="buyer-muted buyer-center-note">Kebutuhan dan pilihan paket tetap tersimpan ketika berpindah langkah. Belum ada pembayaran.</p>
        </div>
      </div>
    </div>
  );
}

function downloadDraft(draft: PurchaseDraft) {
  const quote = draft.quote;
  const lines = [
    "KabarKelas — Draf permintaan pemesanan", `Referensi: ${draft.reference}`, "Status: Draf tersimpan; belum dikirim ke tim KabarKelas.",
    `Dibuat: ${new Date(draft.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`, "",
    `Paket: ${draft.needs.plan}`, `Jumlah siswa aktif: ${quote.students}`, ...(draft.needs.plan === "Yayasan" ? draft.needs.units.map((students, i) => `Unit ${i + 1}: ${students} siswa`) : []),
    `Estimasi total tahunan: ${quote.annual === null ? "Memerlukan penawaran khusus" : currency(quote.annual)}`,
    ...(quote.annual === null ? [] : [`Rata-rata per siswa/tahun: ${currency(quote.annual / quote.students)}`, `Setara per siswa/bulan: ${currency(quote.annual / quote.students / 12)}; ditagihkan tahunan.`]),
    ...(draft.needs.plan === "Yayasan" ? [`Pengelolaan Yayasan: ${currency(quote.managementAnnual || draft.needs.units.length * 1_500_000)}/tahun. Biaya Pro tidak dihitung dua kali.`] : []),
    "", `Penanggung jawab: ${draft.contact.name}`, `Sekolah/yayasan: ${draft.contact.organization}`, `Email: ${draft.contact.email}`, `Telepon: ${draft.contact.phone || "Tidak dicantumkan"}`, `Catatan: ${draft.note || "—"}`, "",
    "Harga merupakan simulasi demo, bukan penawaran resmi atau pembayaran. Draf ini belum mengaktifkan langganan dan belum dikirim kepada penyedia layanan.",
  ];
  const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `Draf-KabarKelas-${draft.reference.replace(/[^A-Za-z0-9-]/g, "")}.txt`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function OrderRequest({ needs, onBack, onComplete }: {
  needs: BuyerNeeds;
  onBack: () => void;
  onComplete?: (draft: PurchaseDraft) => void;
}) {
  const quote = buyerQuote(needs);
  const [contact, setContact] = useState({ name: "", organization: "", email: "", phone: "" });
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<PurchaseDraft | null>(null);
  const [latest, setLatest] = useState<PurchaseDraft | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState("");
  const [initializationAttempt, setInitializationAttempt] = useState(0);
  const request = useRef({ body: "", id: "" });
  const result = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    setInitializing(true); setInitializationError("");
    (async () => {
      try {
        const body = await prepareBuyerSession();
        if (active) setLatest(body.latest || null);
      } catch (e) { if (active) setInitializationError((e as Error).message); }
      finally { if (active) setInitializing(false); }
    })();
    return () => { active = false; };
  }, [initializationAttempt]);
  useEffect(() => { if (draft) result.current?.focus(); }, [draft]);
  const mismatch = needs.plan === "Standard" && needs.wantsEws;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || initializing || initializationError || !quote || mismatch || !consent) return;
    const canonicalNeeds = needs.plan === "Yayasan" ? { ...needs, students: needs.units.reduce((sum, students) => sum + students, 0) } : { ...needs, units: [needs.students] };
    const payload = { contact: Object.fromEntries(Object.entries(contact).map(([key, value]) => [key, value.trim()])), needs: canonicalNeeds, note: note.trim(), consent: true };
    const serialized = JSON.stringify(payload);
    if (request.current.body !== serialized) request.current = { body: serialized, id: crypto.randomUUID() };
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/purchase-drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: request.current.id, ...payload }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Draf belum berhasil disimpan. Periksa koneksi lalu coba lagi.");
      if (!body?.id || !body?.reference || body.status !== "draft") throw new Error("Jawaban penyimpanan belum lengkap. Coba kembali dengan data yang sama.");
      setDraft(body as PurchaseDraft); onComplete?.(body as PurchaseDraft);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  if (draft) return <div className="buyer-flow" ref={result} tabIndex={-1}>
    <section className="buyer-saved" aria-labelledby="buyer-saved-title"><span className="buyer-saved-icon"><FileCheck2 size={31} /></span><span className="buyer-kicker">DRAF PEMESANAN</span><h1 id="buyer-saved-title">Draf tersimpan; belum dikirim ke tim KabarKelas.</h1><p>Referensi <strong>{draft.reference}</strong>. Ringkasan ini tersimpan untuk kunjunganmu dan belum mengaktifkan langganan atau memproses pembayaran.</p>{needsKey(draft.needs) !== needsKey(needs) && <p className="buyer-draft-difference">Yang ditampilkan adalah draf tersimpan: paket {draft.needs.plan}, {number(draft.quote.students)} siswa. Kebutuhan baru yang sedang kamu hitung tetap tersimpan dan belum menggantikan draf ini.</p>}<div className="buyer-actions"><Button onClick={() => downloadDraft(draft)}><Download size={17} /> Unduh ringkasan pemesanan</Button><Button variant="secondary" onClick={onBack}><ArrowLeft size={16} /> Hitung kebutuhan lain</Button></div></section>
    <div className="buyer-calculator-grid"><QuoteSummary needs={draft.needs} quote={draft.quote} /><section className="buyer-card"><h2>Informasi yang tercatat</h2><dl className="buyer-contact-summary"><div><dt>Penanggung jawab</dt><dd>{draft.contact.name}</dd></div><div><dt>Sekolah/yayasan</dt><dd>{draft.contact.organization}</dd></div><div><dt>Email</dt><dd>{draft.contact.email}</dd></div><div><dt>Telepon</dt><dd>{draft.contact.phone || "Tidak dicantumkan"}</dd></div><div><dt>Catatan</dt><dd>{draft.note || "Tidak ada catatan tambahan."}</dd></div></dl><div className="buyer-privacy"><ShieldCheck size={19} /><p>Unduh ringkasan untuk menyimpan salinan. Draf belum dikirim melalui email, WhatsApp, atau kanal penjualan lainnya.</p></div></section></div>
  </div>;
  return <div className="buyer-flow">
    <div className="buyer-page-intro"><span className="buyer-kicker">PEMESANAN</span><h1>Tinjau kebutuhan, siapkan pengajuannya.</h1><p>Periksa paket dan jumlah siswa sebelum mengisi kontak. Tahap ini menyimpan draf permintaan; tidak ada pembayaran atau pengiriman otomatis.</p></div>
    <div className="buyer-calculator-grid">
      <div>{quote ? <QuoteSummary needs={needs} quote={quote} /> : <section className="buyer-card"><h2>Kebutuhan belum lengkap</h2><p>Isi jumlah siswa aktif terlebih dahulu agar ringkasan pemesanan sesuai kebutuhanmu.</p></section>}<Button className="buyer-edit-needs" variant="secondary" onClick={onBack}><ArrowLeft size={16} /> Ubah kebutuhan dan paket</Button></div>
      <form className="buyer-card buyer-order-form" onSubmit={submit} aria-label="Formulir draf pemesanan">
        <h2>Siapa yang dapat dihubungi?</h2>
        <p className="buyer-muted">Isi kontak penanggung jawab yang berwenang untuk sekolah atau yayasan.</p>
        {initializing && <p className="buyer-preparing" role="status"><LoaderCircle size={16} className="spin" /> Menyiapkan formulir pemesanan…</p>}
        {initializationError && <div className="buyer-error" role="alert"><p>{initializationError}</p><Button type="button" variant="secondary" onClick={() => setInitializationAttempt((attempt) => attempt + 1)}>Coba siapkan formulir lagi</Button></div>}
        {latest && !initializing && <div className="buyer-recovery"><p>Draf terakhir <strong>{latest.reference}</strong> masih tersedia: paket {latest.needs.plan}, {number(latest.quote.students)} siswa. {needsKey(latest.needs) === needsKey(needs) ? "Kebutuhannya cocok dengan pilihan saat ini." : "Kebutuhannya berbeda dari pilihan saat ini."} Membukanya tidak mengubah kebutuhan yang sedang kamu hitung.</p><Button type="button" variant="secondary" onClick={() => { setDraft(latest); onComplete?.(latest); }}>Buka draf terakhir</Button></div>}
        <label className="buyer-field">Nama penanggung jawab<input autoComplete="name" required minLength={2} maxLength={100} disabled={busy} value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} /></label>
        <label className="buyer-field">Nama sekolah atau yayasan<input autoComplete="organization" required minLength={2} maxLength={140} disabled={busy} value={contact.organization} onChange={(event) => setContact({ ...contact, organization: event.target.value })} /></label>
        <label className="buyer-field">Email untuk tindak lanjut<input type="email" autoComplete="email" required maxLength={180} disabled={busy} value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} /></label>
        <label className="buyer-field">Nomor telepon (opsional)<input type="tel" autoComplete="tel" maxLength={40} disabled={busy} value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} /></label>
        <label className="buyer-field">Catatan kebutuhan (opsional)<textarea rows={4} maxLength={1200} disabled={busy} placeholder="Misalnya jenjang sekolah, rencana mulai, atau hal yang ingin ditanyakan." value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <label className="buyer-choice buyer-consent"><input type="checkbox" required disabled={busy} checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Saya setuju informasi ini disimpan sebagai draf permintaan pemesanan untuk kebutuhan sekolah/yayasan saya.</span></label>
        <div className="buyer-privacy"><ShieldCheck size={19} /><p>Kontak baru disimpan saat kamu menekan tombol di bawah. Draf ini belum dikirim ke tim KabarKelas. Tidak ada pembayaran atau aktivasi paket pada langkah ini.</p></div>
        {mismatch && <p className="buyer-error" role="alert">Paket Standard belum mencakup kebutuhan EWS yang dipilih. Ubah kebutuhan atau pilih Pro/Yayasan.</p>}
        {error && <p className="buyer-error" role="alert">{error}</p>}
        <Button type="submit" className="buyer-submit" disabled={busy || initializing || !!initializationError || !consent || !quote || mismatch}>{busy ? <><LoaderCircle size={17} className="spin" /> Menyimpan draf…</> : <><FileCheck2 size={17} /> Simpan draf pemesanan</>}</Button>
        <p className="buyer-muted">Data isian tetap ada jika penyimpanan gagal, sehingga kamu dapat mencoba lagi.</p>
      </form>
    </div>
  </div>;
}
