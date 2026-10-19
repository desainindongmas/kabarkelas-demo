import { useState } from "react";
import { CheckCircle2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { quoteSchool, quoteFoundation } from "../shared/pricing.mjs";
import { api } from "./App";
import { currency, number, useApp } from "./model";
import { Badge, Button, PageHead, Panel } from "./ui";

const isStudentCount = (value: string) =>
  value.trim() !== "" && Number.isSafeInteger(Number(value)) && Number(value) > 0;

function Averages({ annual, students }: { annual: number; students: number }) {
  return (
    <div className="pricing-averages">
      <span>{currency(annual / students)} per siswa/tahun</span>
      <small>{currency(annual / students / 12)} setara per siswa/bulan · ditagihkan tahunan</small>
    </div>
  );
}

const plans = [
  {
    name: "Standard",
    promise: "Kegiatan sekolah sehari-hari beres.",
    features: [
      "Absensi, nilai, tugas, kuis dan materi",
      "Rapor, narasi berbasis data dan ekspor",
      "Administrasi, PPDB dan SPP manual",
      "Portal siswa dan keluarga",
      "Penjemputan QR dan kontrol akses per role",
    ],
  },
  {
    name: "Pro",
    promise: "Masalah lebih cepat terlihat dan penanganannya terpantau.",
    features: [
      "Seluruh fitur Standard",
      "EWS: risiko, alasan dan bukti pendukung",
      "Aturan risiko yang dapat disesuaikan",
      "Tindak lanjut dengan PIC dan tenggat",
      "Evaluasi hasil dan tren lintas semester",
      "Persetujuan rapor bertahap",
    ],
  },
  {
    name: "Yayasan",
    promise: "Semua sekolah terkendali, setiap arahan jelas tindak lanjutnya.",
    features: [
      "Fitur Pro di seluruh unit terdaftar",
      "Perbandingan pencapaian dan risiko unit",
      "Target, arahan, PIC dan tenggat",
      "Progres dan bukti hasil penanganan",
      "Persetujuan kebutuhan setiap unit",
      "Laporan rapat gabungan",
    ],
  },
];

export function Pricing() {
  const { user, data, reload, toast, go } = useApp();
  const [students, setStudents] = useState("500");
  const [units, setUnits] = useState(["500", "500", "500"]);
  const [busy, setBusy] = useState(false);
  const school = isStudentCount(students) ? quoteSchool(Number(students)) : null;
  const foundation = units.every(isStudentCount) ? quoteFoundation(units.map(Number)) : null;
  const active = data.settings[0]?.plan || "Pro";
  const canChange = ["principal", "admin", "foundation"].includes(user.role);
  const difference = school?.proAnnual != null && school.standardAnnual != null
    ? school.proAnnual - school.standardAnnual
    : null;

  const change = async (plan: string) => {
    setBusy(true);
    try {
      await api("/api/demo-plan", { plan });
      await reload();
      toast(`Paket demo ${plan} aktif. Data percobaan tetap tersimpan.`);
      if (plan === "Yayasan" && user.role === "foundation") go("dashboard");
    } catch (error) {
      toast((error as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        eyebrow={`Sedang mencoba ${active}`}
        title="Paket sesuai kebutuhan sekolah"
        description="Hitung biaya dari jumlah siswa sebenarnya, lalu coba manfaat setiap paket dengan data demo yang sama."
      />
      <div className="callout blue">
        <ShieldCheck size={22} />
        <p>
          <strong>Simulasi harga tahunan sesuai usulan; belum penawaran resmi.</strong>{" "}
          Tidak ada transaksi di demo. Jumlah siswa menentukan biaya, paket menentukan fitur.
          Guru dan wali murid tidak dikenai biaya tersendiri.
        </p>
      </div>

      <Panel title="Kalkulator sekolah" subtitle="Biaya tahunan berubah proporsional di antara contoh jumlah siswa.">
        <div className="pricing-inputs">
          <label className="pricing-field">
            Jumlah siswa aktif di sekolah
            <input
              type="number"
              min="1"
              step="1"
              value={students}
              onChange={(event) => setStudents(event.target.value)}
              aria-invalid={!school}
              aria-describedby="school-price-terms"
            />
          </label>
          <p className="pricing-note" id="school-price-terms">
            Hingga 200 siswa berlaku biaya minimum: Standard {currency(3_500_000)} dan Pro {currency(5_500_000)} per tahun.
            Total tahunan dibulatkan ke {currency(1_000)} terdekat, lalu dibagi jumlah siswa sebenarnya.
            Di atas 2.000 siswa memerlukan penawaran khusus.
          </p>
        </div>
        {!school && <p className="pricing-custom" role="alert">Masukkan jumlah siswa berupa bilangan bulat, minimal 1.</p>}
      </Panel>

      <div className="package-grid">
        {plans.map((plan, index) => {
          const isFoundation = plan.name === "Yayasan";
          const annual = isFoundation ? foundation?.annual : plan.name === "Pro" ? school?.proAnnual : school?.standardAnnual;
          const count = isFoundation ? foundation?.students : school?.students;
          const customQuote = isFoundation ? foundation?.customQuote : school?.customQuote;
          return (
            <Panel key={plan.name} className={plan.name === "Pro" ? "package-featured" : ""}>
              <Badge tone={index === 1 ? "green" : "blue"}>{plan.name}</Badge>
              <h2>{plan.promise}</h2>
              <div className="package-price" aria-live="polite">
                {annual != null ? currency(annual) : customQuote ? "Penawaran khusus" : "Isi jumlah siswa"}
                <small>{isFoundation ? `${units.length} unit · ${count == null ? "—" : number(count)} siswa` : `${school ? number(school.students) : "—"} siswa`} / tahun</small>
              </div>
              {annual != null && count != null && <Averages annual={annual} students={count} />}
              {isFoundation && foundation && (
                <p className="pricing-note">
                  {foundation.proAnnual == null ? "Pro per unit mengikuti penawaran khusus" : `Termasuk Pro seluruh unit ${currency(foundation.proAnnual)}`}
                  {` + pengelolaan Yayasan ${currency(foundation.managementAnnual)}/tahun. Minimum 2 unit.`}
                </p>
              )}
              <ul>
                {plan.features.map((feature) => <li key={feature}><CheckCircle2 size={16} />{feature}</li>)}
              </ul>
              {canChange ? (
                <Button
                  disabled={busy || active === plan.name}
                  variant={index === 1 ? "primary" : "secondary"}
                  onClick={() => change(plan.name)}
                >
                  {active === plan.name ? "Sedang dicoba" : `Coba ${plan.name} di demo`}
                </Button>
              ) : (
                <p className="pricing-note">Pilihan paket tersedia untuk Kepala Sekolah, Admin dan Yayasan.</p>
              )}
            </Panel>
          );
        })}
      </div>

      <Panel title="Apa manfaat tambahan Pro?">
        <div className="package-value pricing-comparison">
          <h3 aria-live="polite">
            {difference != null && school
              ? `Tambah ${currency(difference)} per tahun untuk Pro`
              : "EWS dan pemantauan tindak lanjut tersedia di Pro dan Yayasan"}
          </h3>
          {difference != null && school && <p>
            Setara {currency(difference / school.students / 12)} per siswa per bulan untuk EWS,
            pemantauan tindak lanjut dan analisis perkembangan lintas semester. Ditagihkan tahunan.
          </p>}
          <p><strong>Pola risiko terdeteksi → bukti ditelusuri → PIC dan tenggat ditetapkan → hasil penanganan dievaluasi.</strong></p>
          <p>
            Standard tetap lengkap untuk absensi, nilai, tugas, rapor dan administrasi sehari-hari.
            Pro membaca pola dari data tersebut dan membantu sekolah memastikan penanganannya berjalan.
            EWS memakai aturan dan perhitungan tren, tanpa integrasi AI.
          </p>
          <p>
            Mengganti paket tetap mengikuti batas role: Admin dan Security tidak mendapat EWS akademik siswa,
            guru hanya mengakses tanggung jawabnya, dan keluarga hanya anak yang terhubung.
            Keamanan QR, kontrol akses dan ekspor data tersedia pada semua paket.
          </p>
        </div>
      </Panel>

      <Panel title="Kalkulator Yayasan per unit" subtitle="Jumlahkan biaya Pro tiap sekolah, lalu tambahkan pengelolaan Rp1.500.000 per unit/tahun. Minimum dua unit.">
        <div className="pricing-inputs">
          <div className="pricing-units">
            {units.map((value, index) => (
              <div className="pricing-unit" key={index}>
                <label className="pricing-field">
                  Jumlah siswa Unit {index + 1}
                  <input type="number" min="1" step="1" value={value}
                    onChange={(event) => setUnits(units.map((unit, i) => i === index ? event.target.value : unit))}
                    aria-invalid={!isStudentCount(value)} />
                </label>
                <Button variant="ghost" disabled={units.length <= 2} aria-label={`Hapus Unit ${index + 1}`}
                  onClick={() => setUnits(units.filter((_, i) => i !== index))}>
                  <Trash2 size={16} /> Hapus
                </Button>
              </div>
            ))}
          </div>
          <div className="pricing-plan-actions">
            <Button variant="secondary" onClick={() => setUnits([...units, "500"])}><Plus size={16} /> Tambah unit</Button>
          </div>
          {!foundation ? (
            <p className="pricing-custom" role="alert">Masukkan jumlah siswa berupa bilangan bulat positif untuk setiap unit.</p>
          ) : (
            <>
              <div className="pricing-table-wrap">
                <table className="pricing-table">
                  <thead><tr><th>Unit</th><th>Siswa</th><th>Pro/tahun</th><th>Pengelolaan/tahun</th><th>Total/tahun</th></tr></thead>
                  <tbody>{foundation.units.map((unit) => <tr key={unit.unit}>
                    <th>Unit {unit.unit}</th><td>{number(unit.students)}</td>
                    <td>{unit.proAnnual == null ? "Penawaran khusus" : currency(unit.proAnnual)}</td>
                    <td>{currency(unit.managementAnnual)}</td>
                    <td>{unit.annual == null ? "Penawaran khusus" : currency(unit.annual)}</td>
                  </tr>)}</tbody>
                  <tfoot><tr><th>Semua unit</th><td>{number(foundation.students)}</td>
                    <td>{foundation.proAnnual == null ? "Penawaran khusus" : currency(foundation.proAnnual)}</td>
                    <td>{currency(foundation.managementAnnual)}</td>
                    <td>{foundation.annual == null ? "Penawaran khusus" : currency(foundation.annual)}</td>
                  </tr></tfoot>
                </table>
              </div>
              <div className="pricing-total" aria-live="polite">
                <strong>{foundation.annual == null ? "Total memerlukan penawaran khusus" : `${currency(foundation.annual)} / tahun`}</strong>
                {foundation.annual != null && <Averages annual={foundation.annual} students={foundation.students} />}
              </div>
              {foundation.customQuote && <p className="pricing-custom">
                Ada unit dengan lebih dari 2.000 siswa. Total Pro dan Yayasan belum dihitung sampai penawaran unit tersebut tersedia.
              </p>}
              <p className="pricing-note">
                Jika seluruh unit sudah berlangganan Pro, tambahan pengelolaan Yayasan hanya <strong>{currency(foundation.managementAnnual)}/tahun</strong>.
                Biaya Pro yang sudah dibayar tidak ditambahkan lagi; total gabungan di atas mencakup Pro sekali per unit.
              </p>
            </>
          )}
        </div>
      </Panel>

      <Panel title="Contoh harga untuk jumlah siswa" subtitle="Angka acuan tahunan, bukan paket kapasitas tetap. Jumlah di antaranya dihitung proporsional.">
        <div className="pricing-table-wrap">
          <table className="pricing-table">
            <thead><tr><th>Jumlah siswa</th><th>Standard/tahun</th><th>Pro/tahun</th></tr></thead>
            <tbody>{[200, 500, 1_000, 2_000].map((count) => {
              const quote = quoteSchool(count);
              return <tr key={count}><th>{number(count)}</th><td>{currency(quote.standardAnnual!)}</td><td>{currency(quote.proAnnual!)}</td></tr>;
            })}</tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
