import { useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  Flag,
  GraduationCap,
  Plus,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  useApp,
  type Row,
  currency,
  date,
  avg,
  number,
  isPro,
  todayWIB,
  roleResponsibilities,
  canAccessPage,
} from "./model";
import {
  Badge,
  Button,
  ClassSelect,
  Empty,
  FormModal,
  Metric,
  PageHead,
  Panel,
  type Field,
  tone,
} from "./ui";
import { api } from "./App";
import { exportExcel, narrativePDF } from "./export";
const opts = (list: string[]) => list.map((value) => ({ value, label: value }));

export function TodayWork() {
  const { data, user, go } = useApp();
  const d = todayWIB(),
    items: {
      label: string;
      detail: string;
      count: number;
      page: string;
      id?: string;
    }[] = [];
  const add = (
    label: string,
    detail: string,
    count: number,
    page: string,
    id?: string,
  ) => {
    if (count && canAccessPage(user, page, data.settings[0]))
      items.push({ label, detail, count, page, id });
  };
  if (user.role === "principal") {
    add(
      "Rapor menunggu persetujuan",
      "Status Review, siap diperiksa",
      data.reports.filter((r) => r.status === "Review").length,
      "reports",
      "Review",
    );
    add(
      "Pendampingan melewati tenggat",
      "Tinjau hasil dan jadwalkan evaluasi",
      data.interventions.filter((i) => i.status !== "Selesai" && i.due < d)
        .length,
      "interventions",
      "overdue",
    );
    add(
      "Pengajuan izin guru",
      "Perlu keputusan kepala sekolah",
      data.leaveRequests.filter((i) => i.status === "Menunggu").length,
      "staff-leave",
    );
    add(
      "Arahan yayasan belum selesai",
      "Laporkan progres unit",
      data.foundationTasks.filter((i) => i.status !== "Selesai").length,
      "unit-work",
    );
  } else if (user.role === "admin") {
    add(
      "Tagihan jatuh tempo",
      "Periksa penerimaan dan sisa tagihan",
      data.invoices.filter((i) => i.status !== "Lunas" && i.due <= d).length,
      "finance",
      "overdue",
    );
    add(
      "Calon siswa siap masuk kelas",
      "Pindahkan data tanpa mengetik ulang",
      data.admissions.filter(
        (i) => i.status === "Diterima" && !i.convertedStudentId,
      ).length,
      "admissions",
      "Diterima",
    );
    add(
      "Konfirmasi gerbang",
      "Security menunggu keputusan pengecualian",
      data.gateIncidents.filter((i) => i.status === "Menunggu").length,
      "gate-incidents",
    );
    add(
      "Biodata perlu dilengkapi",
      "Kontak wali atau alamat belum terisi",
      data.students.filter((i) => !i.parent || !i.phone || !i.address).length,
      "students",
    );
  } else if (user.role === "teacher") {
    const missing = data.students.filter(
      (s) => !data.attendance.some((a) => a.studentId === s.id && a.date === d),
    );
    add(
      "Absensi hari ini belum diisi",
      "Isi sekaligus untuk kelas yang diajar",
      missing.length,
      "attendance",
    );
    const assignments = new Set(data.assignments.map((a) => a.id));
    add(
      "Pengumpulan menunggu penilaian",
      "Tugas pada mapel yang ditugaskan",
      data.submissions.filter(
        (s) =>
          assignments.has(s.assignmentId) &&
          (s.score == null || s.status === "Dikumpulkan"),
      ).length,
      "assignments",
    );
    if (user.isHomeroom) {
      add(
        "Pendampingan perlu evaluasi",
        "Khusus siswa kelas perwalian",
        data.interventions.filter((i) => i.status !== "Selesai" && i.due <= d)
          .length,
        "interventions",
      );
      add(
        "Rapor kelas masih draf",
        "Periksa kelengkapan dan validasi",
        data.reports.filter(
          (r) => r.classId === user.homeroomClassId && r.status === "Draf",
        ).length,
        "reports",
        "Draf",
      );
    }
  } else if (["parent", "student"].includes(user.role)) {
    const pending = data.assignments.filter(
      (a) => !data.submissions.some((s) => s.assignmentId === a.id),
    );
    add(
      "Tugas belum dikumpulkan",
      "Mulai dari tenggat yang paling dekat",
      pending.length,
      "assignments",
    );
    if (user.role === "parent")
      add(
        "Tagihan perlu diperiksa",
        "Pembayaran dicatat manual oleh sekolah",
        data.invoices.filter((i) => i.status !== "Lunas" && i.due <= d).length,
        "finance",
      );
    else
      add(
        "Kuis dapat dikerjakan",
        "Latihan untuk memeriksa pemahaman",
        data.quizzes.length,
        "quizzes",
      );
    add(
      "Rapor sudah tersedia",
      "Lihat capaian dan catatan wali kelas",
      data.reports.filter((r) => r.status === "Terbit").length,
      "reports",
    );
  }
  const horizon = Number(data.settings[0]?.followupDays || 3),
    until = new Date(Date.now() + horizon * 86400000).toLocaleDateString(
      "en-CA",
      { timeZone: "Asia/Jakarta" },
    );
  if (isPro(data.settings[0]) && ["principal", "teacher"].includes(user.role)) {
    const soon = data.interventions.filter(
      (i) => i.status !== "Selesai" && i.due > d && i.due <= until,
    );
    add(
      "Evaluasi mendekati tenggat",
      `Pengingat ${horizon} hari sebelum evaluasi`,
      soon.length,
      "interventions",
    );
    const deadline = data.settings[0]?.reportDue;
    if (deadline && deadline <= until)
      add(
        deadline < d ? "Rapor melewati tenggat" : "Rapor mendekati tenggat",
        `Tenggat ${date(deadline, true)} · pengingat ${horizon} hari`,
        data.reports.filter(
          (r) =>
            r.status !== "Terbit" &&
            (user.role !== "teacher" || r.classId === user.homeroomClassId),
        ).length,
        "reports",
        "Draf",
      );
  }
  if (!items.length)
    return (
      <Panel title="Pekerjaan utama sudah tertata">
        <div className="work-clear">
          <CheckCircle2 size={22} />
          <p>
            Belum ada pekerjaan yang membutuhkan tindakan segera dari peran ini.
          </p>
        </div>
      </Panel>
    );
  return (
    <Panel
      title="Pekerjaan yang perlu ditangani"
      subtitle="Daftar ini mengikuti tanggung jawab dan data yang boleh diakses."
    >
      <div className="work-grid">
        {items.slice(0, 6).map((item) => (
          <button
            key={item.label}
            className="work-item"
            onClick={() => go(item.page, item.id)}
          >
            <span className="work-count">{item.count}</span>
            <div>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </div>
            <ArrowRight size={17} />
          </button>
        ))}
      </div>
    </Panel>
  );
}

export function Board({
  view = "overview",
}: {
  view?: "overview" | "comparison" | "actions" | "needs" | "meeting";
}) {
  const { overview, schools, data, go, selectedId, reload, toast } = useApp();
  const [unit, setUnit] = useState(selectedId || "all"),
    [status, setStatus] = useState("all"),
    [form, setForm] = useState<{ kind: string; row: Partial<Row> } | null>(
      null,
    );
  const units = overview.filter((s) => unit === "all" || s.id === unit),
    tasks = data.foundationTasks.filter(
      (t) =>
        (unit === "all" || t.schoolId === unit) &&
        (status === "all" || t.status === status),
    ),
    needs = data.unitNeeds.filter(
      (t) =>
        (unit === "all" || t.schoolId === unit) &&
        (status === "all" || t.status === status),
    );
  const schoolOpts = schools.map((s) => ({ value: s.id, label: s.name }));
  const schoolName = (id: string) =>
    overview.find((s) => s.id === id)?.name || id;
  const riskSummary = (s: Row) => s.riskCounts
    ? `${s.riskCounts.high ?? 0} tinggi · ${s.riskCounts.medium ?? 0} sedang · ${s.riskCounts.low ?? 0} rendah`
    : "Ringkasan risiko belum tersedia.";
  const handlingSummary = (s: Row) => s.handlingSummary
    ? `${s.handlingSummary.total ?? 0} pendampingan · ${s.handlingSummary.open ?? 0} aktif · ${s.handlingSummary.overdue ?? 0} lewat tenggat · ${s.handlingSummary.evaluated ?? 0} dievaluasi`
    : "Ringkasan pendampingan belum tersedia.";
  const outcomeSummary = (s: Row) => s.handlingSummary
    ? `${s.handlingSummary.improved ?? 0} membaik · ${s.handlingSummary.needsFollowup ?? 0} perlu tindak lanjut · ${s.handlingSummary.unchanged ?? 0} belum berubah`
    : "Hasil evaluasi belum tersedia.";
  const priorityReason = (s: Row) => (s.issues || [])
    .map((issue: Row) => `${issue.metric} ${issue.value}% dari target ${issue.target}%`)
    .join(" · ") || "Indikator operasional mencapai target unit.";
  const nextTask = (s: Row) => tasks
    .filter((task) => task.schoolId === s.id && task.status !== "Selesai")
    .sort((a, b) => String(a.due || "9999").localeCompare(String(b.due || "9999")))[0];
  const urgent = (s: Row) => s.overdueTasks || s.riskCounts?.high || s.handlingSummary?.overdue;
  const needsAttention = (s: Row) => urgent(s) || s.issues?.length || s.handlingSummary?.needsFollowup;
  const aggregateSummary = (s: Row) => (
    <div className="unit-risk-summary">
      <strong>Risiko siswa · agregat</strong>
      <p>{riskSummary(s)}</p>
      <strong>Efektivitas pendampingan</strong>
      <p>{handlingSummary(s)}</p>
      <p>{outcomeSummary(s)}</p>
    </div>
  );
  const followupSummary = (s: Row) => {
    const task = nextTask(s);
    return task ? (
      <div className="unit-followup-summary">
        <strong>Arahan berikutnya: {task.title}</strong>
        <div className="task-owner">
          <span>PIC {task.pic || "Belum ditetapkan"}</span>
          <span>Tenggat {task.due ? date(task.due, true) : "Belum ditetapkan"}</span>
        </div>
        <p><strong>Progres:</strong> {task.response || "Belum ada laporan dari unit."}</p>
        {task.evidence && <p><strong>Bukti:</strong> {task.evidence}</p>}
      </div>
    ) : <p className="unit-followup-summary">Belum ada arahan terbuka untuk unit ini.</p>;
  };
  const save = async (path: string, v: Partial<Row>) => {
    await api(path, v);
    await reload();
    toast("Perubahan lintas unit tersimpan.");
  };
  const meeting = () =>
    narrativePDF("Laporan rapat yayasan", [
      {
        title: "Dasar laporan",
        lines: [
          `Dibuat ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB. Data dummy untuk demonstrasi.`,
          `Perbandingan menggunakan target dan persentase; nilai mentah lintas kurikulum tidak diperingkat.`,
        ],
      },
      ...units.map((s) => ({
        title: s.name,
        lines: [
          `Periode ${s.period}. ${s.students} siswa, ${s.teachers} guru.`,
          `Kehadiran ${s.attendance}% / target ${s.target.attendance}%. Rapor terbit ${s.reportRate}% / target ${s.target.reportRate}%.`,
          `Penerimaan SPP jatuh tempo ${s.collectionRate}% / target ${s.target.collectionRate}%. Kelengkapan data ${s.dataCompleteness}%.`,
          `Risiko siswa (agregat): ${riskSummary(s)}.`,
          `Pendampingan: ${handlingSummary(s)}. Hasil: ${outcomeSummary(s)}.`,
          `Dasar prioritas: ${priorityReason(s)}`,
          `Pembaruan terakhir ${date(s.lastUpdated)}.`,
          ...tasks
            .filter((t) => t.schoolId === s.id)
            .map(
              (t) =>
                `Tindak lanjut: ${t.title} | ${t.status} | PIC ${t.pic} | Tenggat ${date(t.due)} | Progres ${t.response || "Belum ada"} | Bukti ${t.evidence || "Belum ada"}`,
            ),
          ...needs
            .filter((n) => n.schoolId === s.id)
            .map(
              (n) =>
                `Kebutuhan: ${n.title} | ${currency(n.amount)} | ${n.status} | Pemenuhan ${n.fulfillment} | ${n.decisionNote || "Menunggu keputusan"}`,
            ),
        ],
      })),
    ]);
  return (
    <>
      <PageHead
        eyebrow="KENDALI LINTAS UNIT"
        title={
          view === "overview"
            ? "Prioritas yayasan"
            : view === "comparison"
              ? "Perbandingan unit pendidikan"
              : view === "actions"
                ? "Tindak lanjut unit"
                : view === "needs"
                  ? "Kebutuhan & persetujuan"
                  : "Laporan rapat yayasan"
        }
        description="Pahami prioritas, tetapkan penanggung jawab, dan pantau bukti penyelesaian setiap unit."
        action={
          <>
            <select
              aria-label="Filter unit"
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                setStatus("all");
              }}
            >
              <option value="all">Semua unit</option>
              {schoolOpts.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {view === "actions" && (
              <Button
                onClick={() =>
                  setForm({
                    kind: "task",
                    row: {
                      schoolId: unit === "all" ? schools[0].id : unit,
                      priority: "Tinggi",
                      category: "Operasional",
                      pic: "Kepala Unit",
                      due: todayWIB(),
                    },
                  })
                }
              >
                <Plus size={16} />
                Beri arahan
              </Button>
            )}
            {view === "meeting" && (
              <Button onClick={meeting}>
                <Download size={16} />
                Unduh laporan rapat
              </Button>
            )}
          </>
        }
      />
      {view === "comparison" && (
        <Panel
          title="Perbandingan persentase dan tren"
          subtitle="Kondisi data setiap unit dan targetnya. Rata-rata nilai mentah lintas kurikulum tidak diperingkat."
          action={
            <Button
              variant="secondary"
              onClick={() =>
                exportExcel(
                  units.map((s) => ({
                    Unit: s.name,
                    Siswa: s.students,
                    Kehadiran: s.attendance,
                    KehadiranSebelumnya: s.previousAttendance,
                    RaporTerbit: s.reportRate,
                    PenerimaanSPPJatuhTempo: s.collectionRate,
                    KelengkapanData: s.dataCompleteness,
                    RisikoTinggi: s.riskCounts?.high ?? "",
                    RisikoSedang: s.riskCounts?.medium ?? "",
                    RisikoRendah: s.riskCounts?.low ?? "",
                    TotalPendampingan: s.handlingSummary?.total ?? "",
                    PendampinganAktif: s.handlingSummary?.open ?? "",
                    PendampinganLewatTenggat: s.handlingSummary?.overdue ?? "",
                    PendampinganDievaluasi: s.handlingSummary?.evaluated ?? "",
                    HasilMembaik: s.handlingSummary?.improved ?? "",
                    PerluTindakLanjut: s.handlingSummary?.needsFollowup ?? "",
                    HasilBelumBerubah: s.handlingSummary?.unchanged ?? "",
                    DasarPrioritas: priorityReason(s),
                    ArahanBerikutnya: nextTask(s)?.title || "",
                    PIC: nextTask(s)?.pic || "",
                    Tenggat: nextTask(s)?.due || "",
                    Progres: nextTask(s)?.response || "",
                    PembaruanTerakhir: s.lastUpdated,
                  })),
                  "Perbandingan-unit",
                )
              }
            >
              Ekspor perbandingan
            </Button>
          }
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Kehadiran</th>
                  <th>Tren (poin)</th>
                  <th>Rapor terbit</th>
                  <th>SPP jatuh tempo</th>
                  <th>Data lengkap</th>
                  <th>Risiko siswa · agregat</th>
                  <th>Efektivitas pendampingan</th>
                  <th>Pembaruan</th>
                </tr>
              </thead>
              <tbody>
                {units.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      <small className="block">{s.students} siswa</small>
                    </td>
                    <td>{s.attendance}%</td>
                    <td>
                      {s.attendance - s.previousAttendance >= 0 ? "+" : ""}
                      {s.attendance - s.previousAttendance}
                    </td>
                    <td>{s.reportRate}%</td>
                    <td>{s.collectionRate}%</td>
                    <td>{s.dataCompleteness}%</td>
                    <td>{riskSummary(s)}</td>
                    <td>
                      {handlingSummary(s)}
                      <small className="block">{outcomeSummary(s)}</small>
                    </td>
                    <td>
                      {date(s.lastUpdated, true)}
                      {s.staleDays > 3 && (
                        <Badge tone="amber">Perlu diperbarui</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {view === "overview" && (
        <>
          <div className="board-hero">
            <div>
              <span className="eyebrow">YANG PERLU DIPUTUSKAN MINGGU INI</span>
              <h2>
                {units.filter(needsAttention).length}{" "}
                unit membutuhkan perhatian
              </h2>
              <p>
                {
                  tasks.filter(
                    (t) => t.status !== "Selesai" && t.due < todayWIB(),
                  ).length
                }{" "}
                tindak lanjut melewati tenggat ·{" "}
                {needs.filter((n) => n.status === "Diajukan").length} kebutuhan
                menunggu keputusan
              </p>
            </div>
            <Button variant="secondary" onClick={() => go("board-actions")}>
              Tinjau tindak lanjut
              <ArrowRight size={17} />
            </Button>
          </div>
          <div className="metrics four">
            <Metric
              label="Unit pendidikan"
              value={units.length}
              icon={GraduationCap}
            />
            <Metric
              label="Total siswa"
              value={units.reduce((a, s) => a + s.students, 0)}
              icon={Users}
            />
            <Metric
              label="Rapor terbit"
              value={`${Math.round(
                (units.reduce((a, s) => a + s.reportsPublished, 0) /
                  Math.max(
                    units.reduce((a, s) => a + s.students, 0),
                    1,
                  )) *
                  100,
              )}%`}
              icon={FileCheck2}
              tone="blue"
            />
            <Metric
              label="Arahan selesai"
              value={`${tasks.filter((t) => t.status === "Selesai").length}/${tasks.length}`}
              icon={CheckCircle2}
              tone="amber"
            />
          </div>
          <div className="unit-grid">
            {units.map((s) => (
              <Panel key={s.id}>
                <div className="unit-card-head">
                  <div>
                    <small>
                      {s.city} · {s.period}
                    </small>
                    <h3>{s.name}</h3>
                  </div>
                  <Badge
                    tone={
                      urgent(s)
                        ? "red"
                        : needsAttention(s)
                          ? "amber"
                          : "green"
                    }
                  >
                    {urgent(s)
                      ? "Prioritas penanganan"
                      : needsAttention(s)
                        ? "Perlu perhatian"
                        : "Terkendali"}
                  </Badge>
                </div>
                <div className="unit-indicators">
                  {[
                    ["Kehadiran", s.attendance, s.target.attendance],
                    ["Rapor terbit", s.reportRate, s.target.reportRate],
                    [
                      "SPP jatuh tempo",
                      s.collectionRate,
                      s.target.collectionRate,
                    ],
                  ].map(([label, value, target]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong
                        className={
                          Number(value) < Number(target)
                            ? "text-red"
                            : "text-teal"
                        }
                      >
                        {value}%
                      </strong>
                      <small>target {target}%</small>
                      <div className="progress-track">
                        <i style={{ width: value + "%" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="unit-context">
                  Kehadiran{" "}
                  {s.attendance - s.previousAttendance >= 0 ? "+" : ""}
                  {s.attendance - s.previousAttendance} poin dari semester
                  sebelumnya. Kelengkapan data {s.dataCompleteness}%.
                </p>
                <p className="unit-priority-reason"><strong>Dasar prioritas:</strong> {priorityReason(s)}</p>
                {aggregateSummary(s)}
                {followupSummary(s)}
                <small className="data-freshness">
                  Pembaruan sumber {date(s.lastUpdated, true)} · Data dummy
                </small>
                <div className="operation-actions">
                  <Button
                    variant="secondary"
                    onClick={() => go("board-actions", s.id)}
                  >
                    Tindak lanjut
                    <ArrowRight size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setForm({
                        kind: "target",
                        row: { ...s.target, schoolId: s.id },
                      })
                    }
                  >
                    Atur target
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
          <div className="callout blue">
            <ShieldCheck size={22} />
            <p>
              Persentase, target, dan tren dipakai agar perbandingan lebih adil.
              Identitas siswa dan rincian tagihan individu tidak dimuat untuk
              Yayasan.
            </p>
          </div>
        </>
      )}
      {view === "actions" && (
        <>
          <div className="filter-pills">
            {["all", "Direncanakan", "Berjalan", "Selesai"].map((s) => (
              <button
                className={status === s ? "active" : ""}
                key={s}
                onClick={() => setStatus(s)}
              >
                {s === "all" ? "Semua" : s}
              </button>
            ))}
          </div>
          <div className="card-grid">
            {tasks.map((t) => (
              <Panel key={t.id}>
                <div className="operation-actions">
                  <Badge tone={tone(t.status)}>{t.status}</Badge>
                  {t.status !== "Selesai" && t.due < todayWIB() && (
                    <Badge tone="red">Lewat tenggat</Badge>
                  )}
                </div>
                <small className="data-freshness">
                  {schoolName(t.schoolId)}
                </small>
                <h3 className="card-title">{t.title}</h3>
                <p className="card-copy">{t.instruction}</p>
                <div className="task-owner">
                  <span>PIC {t.pic}</span>
                  <span>Tenggat {date(t.due, true)}</span>
                </div>
                <div className="task-response">
                  <strong>Progres dari unit</strong>
                  <p>{t.response || "Belum ada laporan."}</p>
                  {t.evidence && (
                    <p>
                      <strong>Bukti:</strong> {t.evidence}
                    </p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setForm({ kind: "task", row: t })}
                >
                  Perbarui arahan / tenggat
                </Button>
              </Panel>
            ))}
          </div>
          {!tasks.length && <Empty title="Tidak ada arahan pada filter ini" />}
        </>
      )}
      {view === "needs" && (
        <>
          <div className="filter-pills">
            {["all", "Diajukan", "Disetujui", "Ditolak"].map((s) => (
              <button
                key={s}
                className={status === s ? "active" : ""}
                onClick={() => setStatus(s)}
              >
                {s === "all" ? "Semua pengajuan" : s}
              </button>
            ))}
          </div>
          <div className="card-grid">
            {needs.map((n) => (
              <Panel key={n.id}>
                <Badge
                  tone={
                    n.status === "Diajukan"
                      ? "amber"
                      : n.status === "Ditolak"
                        ? "red"
                        : "green"
                  }
                >
                  {n.status}
                </Badge>
                <small className="data-freshness">
                  {schoolName(n.schoolId)} · {date(n.created, true)}
                </small>
                <h3 className="card-title">{n.title}</h3>
                <strong className="need-amount">{currency(n.amount)}</strong>
                <p className="card-copy">{n.reason}</p>
                {n.status === "Diajukan" ? (
                  <Button
                    onClick={() =>
                      setForm({
                        kind: "decision",
                        row: { ...n, status: "Disetujui" },
                      })
                    }
                  >
                    Tinjau kebutuhan
                  </Button>
                ) : (
                  <div className="task-response">
                    <p>{n.decisionNote}</p>
                    <Badge tone="blue">{n.fulfillment}</Badge>
                    <p>
                      {n.fulfillmentNote ||
                        "Menunggu laporan pemenuhan dari unit."}
                    </p>
                  </div>
                )}
              </Panel>
            ))}
          </div>
          {!needs.length && <Empty />}
        </>
      )}
      {view === "meeting" && (
        <Panel
          title="Bahan rapat siap ditinjau"
          subtitle="Laporan dibuat dari kondisi data dan tindak lanjut yang tersimpan."
        >
          <div className="meeting-preview">
            {units.map((s) => (
              <article key={s.id}>
                <h3>{s.name}</h3>
                <p>
                  {priorityReason(s)}
                </p>
                <p>
                  {
                    tasks.filter(
                      (t) => t.schoolId === s.id && t.status !== "Selesai",
                    ).length
                  }{" "}
                  arahan belum selesai ·{" "}
                  {
                    needs.filter(
                      (n) => n.schoolId === s.id && n.status === "Diajukan",
                    ).length
                  }{" "}
                  kebutuhan menunggu keputusan
                </p>
                {aggregateSummary(s)}
                {followupSummary(s)}
                <small>
                  Pembaruan sumber {date(s.lastUpdated)}. Identitas siswa tidak
                  disertakan.
                </small>
              </article>
            ))}
            <Button onClick={meeting}>
              <Download size={16} />
              Unduh PDF untuk rapat
            </Button>
          </div>
        </Panel>
      )}
      {form && (
        <FormModal
          title={
            form.kind === "task"
              ? "Arahan untuk kepala unit"
              : form.kind === "target"
                ? "Target unit (%)"
                : "Keputusan kebutuhan"
          }
          initial={form.row}
          fields={
            form.kind === "task"
              ? [
                  {
                    key: "schoolId",
                    label: "Unit",
                    options: schoolOpts,
                    required: true,
                  },
                  { key: "title", label: "Judul arahan", required: true },
                  { key: "pic", label: "Penanggung jawab", required: true },
                  {
                    key: "due",
                    label: "Tenggat",
                    type: "date",
                    required: true,
                  },
                  {
                    key: "priority",
                    label: "Prioritas",
                    options: opts(["Tinggi", "Sedang"]),
                    required: true,
                  },
                  {
                    key: "instruction",
                    label: "Arahan / hasil yang diharapkan",
                    type: "textarea",
                    required: true,
                  },
                ]
              : form.kind === "target"
                ? ["attendance", "reportRate", "collectionRate"].map(
                    (key, i) => ({
                      key,
                      label: ["Kehadiran", "Rapor terbit", "Penerimaan SPP"][i],
                      type: "number",
                      min: 1,
                      max: 100,
                      required: true,
                    }),
                  )
                : [
                    {
                      key: "status",
                      label: "Keputusan",
                      options: opts(["Disetujui", "Ditolak"]),
                      required: true,
                    },
                    {
                      key: "decisionNote",
                      label: "Catatan keputusan",
                      type: "textarea",
                      required: true,
                    },
                  ]
          }
          onClose={() => setForm(null)}
          onSave={(v) =>
            save(
              form.kind === "task"
                ? "/api/foundation-tasks"
                : form.kind === "target"
                  ? "/api/school-targets"
                  : "/api/unit-needs",
              v,
            )
          }
        />
      )}
    </>
  );
}

export function UnitWork() {
  const { data, reload, toast } = useApp();
  const [tab, setTab] = useState("tasks"),
    [form, setForm] = useState<{ kind: string; row: Partial<Row> } | null>(
      null,
    );
  const submit = async (v: Partial<Row>) => {
    await api(
      form?.kind === "task" ? "/api/foundation-tasks" : "/api/unit-needs",
      v,
    );
    await reload();
    toast("Laporan unit tersimpan dan dapat dibaca Yayasan.");
  };
  return (
    <>
      <PageHead
        title="Koordinasi unit & yayasan"
        description="Kerjakan arahan, ajukan kebutuhan, dan laporkan hasil pemenuhan."
        action={
          tab === "needs" ? (
            <Button
              onClick={() =>
                setForm({ kind: "need", row: { category: "Sarana" } })
              }
            >
              <Plus size={16} />
              Ajukan kebutuhan
            </Button>
          ) : undefined
        }
      />
      <div className="tabs">
        <button
          className={tab === "tasks" ? "active" : ""}
          onClick={() => setTab("tasks")}
        >
          Arahan yayasan
        </button>
        <button
          className={tab === "needs" ? "active" : ""}
          onClick={() => setTab("needs")}
        >
          Pengajuan kebutuhan
        </button>
      </div>
      <div className="card-grid">
        {(tab === "tasks" ? data.foundationTasks : data.unitNeeds).map((r) => (
          <Panel key={r.id}>
            <Badge tone={tone(r.status)}>{r.status}</Badge>
            <h3 className="card-title">{r.title}</h3>
            <p className="card-copy">{r.instruction || r.reason}</p>
            {tab === "tasks" ? (
              <>
                <div className="task-owner">
                  <span>PIC {r.pic}</span>
                  <span>{date(r.due, true)}</span>
                </div>
                <p className="card-copy">
                  {r.response || "Belum ada progres."}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => setForm({ kind: "task", row: r })}
                >
                  Laporkan progres & bukti
                </Button>
              </>
            ) : (
              <>
                <strong className="need-amount">{currency(r.amount)}</strong>
                <p className="card-copy">
                  {r.decisionNote || "Menunggu keputusan Yayasan."}
                </p>
                {r.status === "Disetujui" && (
                  <>
                    <Badge tone="blue">{r.fulfillment}</Badge>
                    <Button
                      variant="secondary"
                      onClick={() => setForm({ kind: "fulfill", row: r })}
                    >
                      Laporkan pemenuhan
                    </Button>
                  </>
                )}
                {r.status === "Diajukan" && (
                  <Button
                    variant="secondary"
                    onClick={() => setForm({ kind: "need", row: r })}
                  >
                    Perbarui pengajuan
                  </Button>
                )}
              </>
            )}
          </Panel>
        ))}
      </div>
      {form && (
        <FormModal
          title={
            form.kind === "task"
              ? "Progres tindak lanjut"
              : form.kind === "fulfill"
                ? "Pemenuhan kebutuhan"
                : "Pengajuan kebutuhan unit"
          }
          initial={form.row}
          fields={
            form.kind === "task"
              ? [
                  {
                    key: "status",
                    label: "Status",
                    options: opts(["Direncanakan", "Berjalan", "Selesai"]),
                    required: true,
                  },
                  {
                    key: "response",
                    label: "Progres / hasil",
                    type: "textarea",
                    required: true,
                  },
                  {
                    key: "evidence",
                    label: "Bukti penyelesaian (wajib saat selesai)",
                    type: "textarea",
                  },
                ]
              : form.kind === "fulfill"
                ? [
                    {
                      key: "fulfillment",
                      label: "Status pemenuhan",
                      options: opts(["Belum dimulai", "Diproses", "Terpenuhi"]),
                      required: true,
                    },
                    {
                      key: "fulfillmentNote",
                      label: "Bukti / hasil pelaksanaan",
                      type: "textarea",
                      required: true,
                    },
                  ]
                : [
                    { key: "title", label: "Kebutuhan", required: true },
                    {
                      key: "category",
                      label: "Kategori",
                      options: opts([
                        "Sarana",
                        "Pengembangan guru",
                        "Program siswa",
                        "Operasional",
                      ]),
                      required: true,
                    },
                    {
                      key: "amount",
                      label: "Usulan anggaran (Rp)",
                      type: "number",
                      min: 1,
                      required: true,
                    },
                    {
                      key: "reason",
                      label: "Alasan & manfaat",
                      type: "textarea",
                      required: true,
                    },
                  ]
          }
          onClose={() => setForm(null)}
          onSave={submit}
        />
      )}
    </>
  );
}

export { Pricing as Packages } from "./Pricing";

export function ProAnalysis() {
  const { data, user, go, reload, toast } = useApp();
  const [period, setPeriod] = useState("Semua"),
    [cls, setCls] = useState("all"),
    [name, setName] = useState(""),
    [saving, setSaving] = useState(false);
  const pro = isPro(data.settings[0]),
    admin = user.role === "admin";
  const rows = data.termSnapshots.filter(
    (r) =>
      (period === "Semua" || r.period === period) &&
      (cls === "all" || r.classId === cls),
  );
  const exportRows = admin
    ? data.invoices.map((i) => ({
        Tagihan: i.title,
        Nominal: i.amount,
        Terbayar: i.paidAmount ?? (i.status === "Lunas" ? i.amount : 0),
        Sisa:
          i.amount - (i.paidAmount ?? (i.status === "Lunas" ? i.amount : 0)),
        Status: i.status,
      }))
    : rows.map((r) => ({
        Periode: r.period,
        Kelas: data.classes.find((c) => c.id === r.classId)?.name,
        Kehadiran: r.attendance,
        Nilai: r.average,
        RaporTerbit: r.reportRate,
        Sumber: r.source,
      }));
  return (
    <>
      <PageHead
        title={admin ? "Analisis administrasi" : "Analisis perkembangan"}
        description="Bandingkan periode, periksa pekerjaan melewati tenggat, dan simpan tampilan laporan."
        action={
          pro ? (
            <Button
              variant="secondary"
              onClick={() => exportExcel(exportRows, "Analisis-KabarKelas")}
            >
              Ekspor tampilan
            </Button>
          ) : undefined
        }
      />
      {!pro ? (
        <Panel title="Analisis lanjutan tersedia pada Pro">
          <div className="package-value">
            <p>
              Absensi, nilai, rapor dan ekspor tetap tersedia di Standard.
              EWS, analisis lintas semester dan pemantauan hasil tindak lanjut
              tersedia khusus Pro dan Yayasan.
            </p>
            {["principal", "admin"].includes(user.role) ? (
              <Button onClick={() => go("packages")}>Bandingkan paket</Button>
            ) : (
              <p>Pengaturan paket dikelola kepala sekolah dan Admin.</p>
            )}
          </div>
        </Panel>
      ) : (
        <>
          <Panel
            title="Tampilan laporan"
            action={
              <div className="operation-actions">
                {!admin && (
                  <>
                    <select
                      aria-label="Periode analisis"
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                    >
                      {opts([
                        "Semua",
                        "2025/2026 Ganjil",
                        "2025/2026 Genap",
                        "2026/2027 Ganjil",
                      ]).map((o) => (
                        <option key={o.value}>{o.value}</option>
                      ))}
                    </select>
                    <ClassSelect value={cls} onChange={setCls} />
                  </>
                )}
                <select
                  aria-label="Tampilan tersimpan"
                  value=""
                  onChange={(e) => {
                    const v = data.savedReports.find(
                      (r) => r.id === e.target.value,
                    );
                    if (v) {
                      setPeriod(v.period);
                      setCls(v.classId);
                    }
                  }}
                >
                  <option value="">Buka tampilan tersimpan</option>
                  {data.savedReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            <div className="operation-actions saved-report-form">
              <input
                aria-label="Nama tampilan laporan"
                placeholder="Nama tampilan, misalnya evaluasi semester"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button
                disabled={saving || !name.trim()}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await api("/api/saved-reports", {
                      name,
                      period,
                      classId: cls,
                    });
                    await reload();
                    setName("");
                    toast("Tampilan laporan tersimpan.");
                  } catch (e) {
                    toast((e as Error).message, true);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Simpan tampilan
              </Button>
            </div>
          </Panel>
          {admin ? (
            <div className="metrics three">
              <Metric
                label="Penerimaan tercatat"
                value={currency(
                  data.payments.reduce((a, p) => a + p.amount, 0),
                )}
                icon={Wallet}
              />
              <Metric
                label="Tagihan melewati jatuh tempo"
                value={
                  data.invoices.filter(
                    (i) => i.status !== "Lunas" && i.due < todayWIB(),
                  ).length
                }
                icon={CalendarDays}
                tone="amber"
              />
              <Metric
                label="Konfirmasi gerbang menunggu"
                value={
                  data.gateIncidents.filter((i) => i.status === "Menunggu")
                    .length
                }
                icon={ShieldCheck}
                tone="blue"
              />
            </div>
          ) : (
            <Panel
              title="Tren kelas per semester"
              subtitle="Semester berjalan belum mencakup satu semester penuh. Data historis pada demo merupakan skenario dummy."
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Periode</th>
                      <th>Kelas</th>
                      <th>Kehadiran</th>
                      <th>Rata-rata nilai</th>
                      <th>Rapor terbit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.period}</td>
                        <td>
                          {data.classes.find((c) => c.id === r.classId)?.name}
                        </td>
                        <td>{r.attendance}%</td>
                        <td>{r.average}/100</td>
                        <td>{r.reportRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
          <TodayWork />
        </>
      )}
    </>
  );
}
export function Workflow() {
  const { data, reload, toast, go } = useApp();
  const [v, setV] = useState(data.settings[0]),
    [busy, setBusy] = useState(false);
  if (!isPro(v)) return <ProAnalysis />;
  return (
    <>
      <PageHead
        title="Alur persetujuan & pengingat"
        description="Tetapkan tahap persetujuan rapor dan tenggat evaluasi. Pengingat tampil saat aplikasi dibuka."
      />
      <Panel title="Pengaturan akademik Pro">
        <form
          className="workflow-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api("/api/workflow", {
                approvalMode: v.approvalMode,
                reportDue: v.reportDue,
                followupDays: Number(v.followupDays),
              });
              await reload();
              toast("Alur persetujuan dan pengingat tersimpan.");
            } catch (e) {
              toast((e as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Persetujuan rapor
            <select
              value={v.approvalMode}
              onChange={(e) => setV({ ...v, approvalMode: e.target.value })}
            >
              <option value="single">
                Satu tahap: kepala sekolah atau wali kelas
              </option>
              <option value="two-step">
                Dua tahap: validasi wali kelas, lalu kepala sekolah
              </option>
            </select>
          </label>
          <label>
            Tenggat penerbitan rapor
            <input
              required
              type="date"
              value={v.reportDue}
              onChange={(e) => setV({ ...v, reportDue: e.target.value })}
            />
          </label>
          <label>
            Pengingat sebelum tenggat (hari)
            <input
              required
              type="number"
              min={1}
              max={30}
              value={v.followupDays}
              onChange={(e) =>
                setV({ ...v, followupDays: Number(e.target.value) })
              }
            />
          </label>
          <div className="callout blue">
            Pada alur dua tahap, tombol terbit hanya tersedia bagi kepala
            sekolah setelah validasi wali kelas tersimpan. Tidak ada pesan
            keluar aplikasi.
          </div>
          <Button disabled={busy}>Simpan alur</Button>
        </form>
      </Panel>
    </>
  );
}
