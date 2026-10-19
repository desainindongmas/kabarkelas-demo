import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  FileCheck2,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";
import {
  avg,
  isPro,
  todayWIB,
  canIntervene,
  canReviewReport,
  date,
  number,
  gradeDisplay,
  risk,
  useApp,
  type Row,
} from "./model";
import {
  Avatar,
  Badge,
  Button,
  ClassSelect,
  Empty,
  ExportButton,
  FormModal,
  LinkButton,
  Metric,
  Modal,
  PageHead,
  Pagination,
  Panel,
  SearchBox,
  tone,
  type Field,
} from "./ui";
import { api } from "./App";
import { exportExcel, reportPDF } from "./export";
export function Students() {
  const { data, user, go, save, remove, toast } = useApp();
  const pro = isPro(data.settings[0]);
  const [query, setQuery] = useState(""),
    [cls, setCls] = useState("all"),
    [level, setLevel] = useState("all"),
    [page, setPage] = useState(1),
    [add, setAdd] = useState(false);
  if (user.role === "admin") return <AdministrativeStudents />;
  const rows = data.students.filter(
    (s) =>
      (cls === "all" || s.classId === cls) &&
      (s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.nisn.includes(query)) &&
      (!pro || level === "all" || risk(s, data).level === level),
  );
  return (
    <>
      <PageHead
        eyebrow="KENALI SETIAP CERITA"
        title="Student 360"
        description="Satu pandangan utuh untuk setiap perjalanan belajar siswa."
        action={
          <>
            <ExportButton
              onClick={() =>
                exportExcel(
                  rows.map((s) => ({
                    Nama: s.name,
                    NISN: s.nisn,
                    Kelas: data.classes.find((c) => c.id === s.classId)?.name,
                    Kehadiran: s.attendance + "%",
                    Nilai: avg(data.grades.filter((g) => g.studentId === s.id).map((g) => g.score)),
                    ...(pro ? {Risiko: risk(s, data).level} : {}),
                  })),
                  "Data-Siswa-KabarKelas",
                )
              }
            />
            {user.role === "admin" && (
              <Button onClick={() => setAdd(true)}>
                <Plus size={16} />
                Tambah siswa
              </Button>
            )}
          </>
        }
      />
      <div className="metrics three">
        <Metric
          label="Siswa aktif"
          value={data.students.length}
          icon={Users}
          note="dalam sekolah ini"
        />
        {pro ? <Metric
          label="Perlu pendampingan"
          value={
            data.students.filter((s) => risk(s, data).level !== "Rendah").length
          }
          icon={Activity}
          tone="amber"
          note="terdeteksi melalui Early Warning"
        /> : <Metric label="Kelas aktif" value={data.classes.length} icon={BookOpen} tone="blue" note="untuk kegiatan belajar" />}
        <Metric
          label="Rata-rata kehadiran"
          value={`${avg(data.students.map((s) => s.attendance))}%`}
          icon={ClipboardCheck}
          tone="blue"
          note="semester ganjil 2026/2027"
        />
      </div>
      <Panel>
        <div className="table-toolbar">
          <SearchBox
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder="Cari nama atau NISN siswa…"
          />
          <div className="toolbar-right">
            <ClassSelect
              value={cls}
              onChange={(v) => {
                setCls(v);
                setPage(1);
              }}
            />
            {pro && <select
              aria-label="Filter tingkat risiko"
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Semua risiko</option>
              {["Tinggi", "Sedang", "Rendah"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>}
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nama siswa</th>
                <th>Kelas</th>
                <th>Rata-rata nilai</th>
                <th>Kehadiran</th>
                {pro && <th>Status risiko</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.slice((page - 1) * 12, page * 12).map((s) => {
                const r = pro ? risk(s, data) : null;
                const score = avg(data.grades.filter((g) => g.studentId === s.id).map((g) => g.score));
                return (
                  <tr
                    key={s.id}
                    className="clickable-row"
                    onClick={() => go("students", s.id)}
                  >
                    <td>
                      <div className="person">
                        <Avatar photo={s.photo} />
                        <div>
                          <strong>{s.name}</strong>
                          <small>NISN {s.nisn}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {data.classes.find((c) => c.id === s.classId)?.name}
                    </td>
                    <td>
                      <strong>{score}</strong>
                      <span className="muted"> /100</span>
                    </td>
                    <td>
                      <div className="attendance-mini">
                        <span>{s.attendance}%</span>
                        <div>
                          <i
                            style={{
                              width: s.attendance + "%",
                              background:
                                s.attendance < 80 ? "#e78b75" : "#1a9c8a",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    {r && <td>
                      <Badge
                        tone={r.level === "Rendah" ? "green" : tone(r.level)}
                      >
                        {r.level === "Rendah"
                          ? "Berkembang baik"
                          : `Risiko ${r.level.toLowerCase()}`}
                      </Badge>
                    </td>}
                    <td>
                      <ArrowUpRight size={17} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty
            title="Siswa tidak ditemukan"
            description="Coba kata kunci lain atau ubah filter kelas."
          />
        )}
        <Pagination page={page} total={rows.length} onChange={setPage} />
      </Panel>
      {add && (
        <FormModal
          title="Tambah siswa"
          onClose={() => setAdd(false)}
          fields={[
            { key: "name", label: "Nama lengkap", required: true },
            { key: "nisn", label: "NISN (10 digit)", required: true },
            {
              key: "classId",
              label: "Kelas",
              required: true,
              options: data.classes.map((c) => ({
                value: c.id,
                label: c.name,
              })),
            },
            {
              key: "gender",
              label: "Jenis kelamin",
              required: true,
              options: [
                { value: "P", label: "Perempuan" },
                { value: "L", label: "Laki-laki" },
              ],
            },
            {
              key: "birth",
              label: "Tanggal lahir",
              type: "date",
              required: true,
            },
            { key: "parent", label: "Nama orang tua", required: true },
            {
              key: "phone",
              label: "Telepon orang tua",
              type: "tel",
              required: true,
            },
            { key: "address", label: "Alamat", required: true },
          ]}
          onSave={async (v) => {
            await save("students", {
              ...v,
              photo: v.gender === "L" ? 0 : 1,
              attendance: 100,
              history: [80, 80, 80, 80, 80, 80],
              overdue: 0,
              status: "Aktif",
              nis: "2026" + Date.now().toString().slice(-4),
            });
          }}
        />
      )}
    </>
  );
}
export function InterventionForm({
  studentId,
  onClose,
  initial,
}: {
  studentId: string;
  onClose: () => void;
  initial?: Row;
}) {
  const { data, save } = useApp();
  if (!isPro(data.settings[0])) return null;
  return (
    <FormModal
      title={initial ? "Perbarui pendampingan" : "Rencanakan pendampingan"}
      initial={
        initial || {
          studentId,
          pic: data.teachers[0]?.name,
          status: "Direncanakan",
          due: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        }
      }
      onClose={onClose}
      fields={[
        {
          key: "title",
          label: "Rencana tindak lanjut",
          required: true,
          placeholder: "Contoh: Pendampingan aljabar 2 minggu",
        },
        {
          key: "pic",
          label: "Penanggung jawab",
          required: true,
          options: data.teachers.map((t) => ({ value: t.name, label: t.name })),
        },
        { key: "due", label: "Target evaluasi", type: "date", required: true },
        {
          key: "expectedOutcome",
          label: "Hasil yang diharapkan",
          type: "textarea",
        },
        {
          key: "status",
          label: "Status",
          required: true,
          options: ["Direncanakan", "Berjalan", "Selesai"].map((s) => ({
            value: s,
            label: s,
          })),
        },
        {
          key: "outcome",
          label: "Hasil evaluasi (wajib saat selesai)",
          options: ["Membaik", "Belum berubah", "Perlu lanjutan"].map(
            (value) => ({ value, label: value }),
          ),
        },
        {
          key: "evaluationNote",
          label: "Catatan evaluasi (wajib saat selesai)",
          type: "textarea",
        },
        {
          key: "note",
          label: "Catatan / hasil evaluasi",
          type: "textarea",
          required: true,
        },
      ]}
      onSave={(v) =>
        save("interventions", {
          ...v,
          studentId,
          created: initial?.created || new Date().toISOString(),
        })
      }
    />
  );
}
export function EarlyWarning() {
  const { data, user, go, reload } = useApp();
  const [query, setQuery] = useState(""),
    [cls, setCls] = useState("all"),
    [level, setLevel] = useState("all"),
    [page, setPage] = useState(1),
    [intervene, setIntervene] = useState(""),
    [rules, setRules] = useState(false);
  if (!isPro(data.settings[0])) return <Empty title="EWS tersedia pada Pro dan Yayasan" description="Kegiatan sekolah tetap dapat dikelola melalui nilai, kehadiran, tugas, dan rapor." />;
  const rows = data.students
    .map(
      (s) => ({ ...s, ...risk(s, data) }) as typeof s & ReturnType<typeof risk>,
    )
    .filter((s) => s.level !== "Rendah")
    .sort((a, b) => b.reasons.length - a.reasons.length);
  const filtered = rows.filter(
    (s) =>
      (cls === "all" || s.classId === cls) &&
      (level === "all" || s.level === level) &&
      s.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHead
        eyebrow="LEBIH AWAL TAHU, LEBIH TEPAT MEMBANTU"
        title="Early Warning System"
        description="Temukan sinyal, pahami penyebab, dan hadirkan pendampingan yang tepat."
        action={
          user.role === "principal" ? (
            <Button
              variant="secondary"
              onClick={() =>
                isPro(data.settings[0]) ? setRules(true) : go("packages")
              }
            >
              <Activity size={16} />
              {isPro(data.settings[0])
                ? "Aturan EWS"
                : "Aturan dasar · lihat Pro"}
            </Button>
          ) : undefined
        }
      />
      <div className="callout amber ews-callout">
        <ShieldCheck size={24} />
        <div>
          <strong>
            Peringatan adalah awal percakapan, bukan label untuk siswa.
          </strong>
          <p>
            Indikator membantu menentukan prioritas. Pertimbangkan kondisi dan
            cerita setiap siswa sebelum mengambil tindakan.
          </p>
          <p><strong>Alurnya:</strong> Risiko terdeteksi → telusuri bukti nilai, kehadiran, dan tugas → tetapkan PIC serta tenggat → evaluasi hasil pendampingan.</p>
        </div>
        <Badge tone="amber">Otomatis dari data</Badge>
      </div>
      <div className="metrics three">
        <Metric
          label="Risiko tinggi"
          value={rows.filter((r) => r.level === "Tinggi").length}
          icon={Activity}
          tone="red"
          note="3 atau lebih indikator aktif"
          onClick={() => {
            setLevel("Tinggi");
            setPage(1);
          }}
        />
        <Metric
          label="Perlu perhatian"
          value={rows.filter((r) => r.level === "Sedang").length}
          icon={Users}
          tone="amber"
          note="1–2 indikator terdeteksi"
          onClick={() => {
            setLevel("Sedang");
            setPage(1);
          }}
        />
        <Metric
          label="Pendampingan aktif"
          value={
            data.interventions.filter((i) => i.status !== "Selesai").length
          }
          icon={ShieldCheck}
          tone="teal"
          note="rencana yang sedang dijalankan"
          onClick={canIntervene(user) ? () => go("interventions") : undefined}
        />
      </div>
      <Panel
        title="Prioritas pendampingan"
        subtitle="Diurutkan berdasarkan jumlah indikator yang terdeteksi."
        action={
          <ExportButton
            onClick={() =>
              exportExcel(
                filtered.map((s) => ({
                  Nama: s.name,
                  Kelas: data.classes.find((c) => c.id === s.classId)?.name,
                  Risiko: s.level,
                  Indikator: s.reasons.join("; "),
                })),
                "Early-Warning",
              )
            }
          />
        }
      >
        <div className="table-toolbar">
          <SearchBox
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder="Cari siswa dalam perhatian…"
          />
          <div className="toolbar-right">
            <ClassSelect
              value={cls}
              onChange={(v) => {
                setCls(v);
                setPage(1);
              }}
            />
            <select
              value={level}
              aria-label="Filter risiko"
              onChange={(e) => {
                setLevel(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Semua risiko</option>
              <option>Tinggi</option>
              <option>Sedang</option>
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Indikator yang terdeteksi</th>
                <th>Risiko</th>
                <th>Tindak lanjut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.slice((page - 1) * 10, page * 10).map((s) => (
                <tr key={s.id}>
                  <td>
                    <button
                      className="person person-button"
                      onClick={() => go("students", s.id)}
                    >
                      <Avatar photo={s.photo} />
                      <div>
                        <strong>{s.name}</strong>
                        <small>
                          {data.classes.find((c) => c.id === s.classId)?.name}
                        </small>
                      </div>
                    </button>
                  </td>
                  <td>
                    <div className="risk-reasons">
                      {s.reasons.slice(0, 2).map((r) => (
                        <span key={r}>{r}</span>
                      ))}
                      {s.reasons.length > 2 && (
                        <small>+{s.reasons.length - 2} indikator lainnya</small>
                      )}
                    </div>
                  </td>
                  <td>
                    <Badge tone={tone(s.level)}>{s.level}</Badge>
                  </td>
                  <td>
                    {data.interventions.some((i) => i.studentId === s.id) ? (
                      <Badge tone="blue">Dalam pendampingan</Badge>
                    ) : canIntervene(user) &&
                      (user.role !== "teacher" ||
                        s.classId === user.homeroomClassId) ? (
                      <Button
                        variant="secondary"
                        onClick={() => setIntervene(s.id)}
                      >
                        <Plus size={14} />
                        Buat rencana
                      </Button>
                    ) : (
                      <span className="muted">Belum ada rencana</span>
                    )}
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      aria-label={`Lihat bukti ${s.name}`}
                      onClick={() => go("students", s.id)}
                    >
                      Lihat bukti
                      <ArrowUpRight size={17} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty title="Tidak ada peringatan pada filter ini" />
        )}
        <Pagination
          page={page}
          total={filtered.length}
          size={10}
          onChange={setPage}
        />
      </Panel>
      {intervene && (
        <InterventionForm
          studentId={intervene}
          onClose={() => setIntervene("")}
        />
      )}
      {rules && (
        <FormModal
          title="Aturan peringatan akademik"
          initial={data.settings[0]}
          fields={[
            {
              key: "ewsAttendance",
              label: "Kehadiran di bawah (%)",
              type: "number",
              min: 1,
              max: 100,
              required: true,
            },
            {
              key: "ewsDrop",
              label: "Penurunan nilai di atas (poin)",
              type: "number",
              min: 1,
              max: 100,
              required: true,
            },
            {
              key: "ewsOverdue",
              label: "Tugas belum selesai minimal",
              type: "number",
              min: 1,
              max: 50,
              required: true,
            },
          ]}
          onClose={() => setRules(false)}
          onSave={async (v) => {
            await api("/api/ews-rules", v);
            await reload();
          }}
        />
      )}{" "}
    </>
  );
}
export function StudentDetail() {
  const { selectedId, data, user, go, save, remove, school, toast } = useApp();
  const pro = isPro(data.settings[0]);
  const student = data.students.find((s) => s.id === selectedId);
  const [tab, setTab] = useState("Ringkasan"),
    [intervene, setIntervene] = useState(false),
    [editInter, setEditInter] = useState<Row | undefined>(),
    [note, setNote] = useState(false),
    [del, setDel] = useState(false);
  useEffect(() => {
    if (!pro && tab === "Pendampingan") setTab("Ringkasan");
  }, [pro, tab]);
  if (!student)
    return (
      <Empty
        title="Siswa tidak ditemukan"
        action={
          <Button onClick={() => go("students")}>Kembali ke daftar</Button>
        }
      />
    );
  if (user.role === "admin") return <AdministrativeProfile student={student} />;
  const s = student,
    r = risk(s, data),
    grades = data.grades.filter((g) => g.studentId === s.id),
    interventions = pro ? data.interventions.filter((i) => i.studentId === s.id) : [],
    attendance = data.attendance.filter((a) => a.studentId === s.id),
    report = data.reports.find((a) => a.studentId === s.id),
    submissions = data.submissions.filter((a) => a.studentId === s.id),
    assignments = data.assignments.filter((a) => a.classId === s.classId);
  const pendingTasks = assignments.filter(
    (a) => !submissions.some((submission) => submission.assignmentId === a.id),
  );
  const trend = ["Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    .slice(0, 4)
    .map((month, i) => ({ month, Nilai: s.history?.[i] || 0 }));
  return (
    <>
      <button className="back-link" onClick={() => go("students")}>
        <ArrowLeft size={15} />
        Kembali ke Student 360
      </button>
      <div className="student-hero">
        <Avatar photo={s.photo} size={88} />
        <div className="student-hero-info">
          <div className="eyebrow">STUDENT 360</div>
          <h1>
            {s.name}
            <Badge tone="green">Aktif</Badge>
          </h1>
          <p>
            {data.classes.find((c) => c.id === s.classId)?.name} <span>•</span>{" "}
            NISN {s.nisn} <span>•</span> Tahun ajaran 2026/2027
          </p>
        </div>
        <div className="hero-actions">
          <Button onClick={() => reportPDF(s, data, school)}>
            <Download size={16} />
            Unduh rapor
          </Button>
        </div>
      </div>
      {pro && <div
        className={`student-ews ${r.level === "Rendah" ? "healthy" : r.level === "Tinggi" ? "risk-high" : "risk-medium"}`}
      >
        <div className="ews-title">
          <span className="ews-symbol">
            <Activity size={23} />
          </span>
          <div>
            <small>EARLY WARNING SYSTEM</small>
            <h3>
              {r.level === "Tinggi"
                ? "Butuh perhatian dan pendampingan segera"
                : r.level === "Sedang"
                  ? "Ada sinyal yang perlu kita perhatikan"
                  : "Perkembangan berada di jalur yang baik"}
            </h3>
            <p>
              {r.level === "Rendah"
                ? "Tidak ada indikator risiko aktif. Terus dukung konsistensi dan potensi siswa."
                : "Mari pahami situasinya dan buat rencana bersama guru serta orang tua."}
            </p>
          </div>
          <Badge tone={tone(r.level)}>Risiko {r.level.toLowerCase()}</Badge>
        </div>
        {r.reasons.length > 0 && (
          <div className="ews-body">
            <div className="ews-indicators">
              {r.reasons.map((reason, i) => (
                <span key={reason}>
                  <i>{i + 1}</i>
                  {reason}
                </span>
              ))}
            </div>
            {canIntervene(user) &&
              (user.role !== "teacher" ||
                s?.classId === user.homeroomClassId) && (
                <Button onClick={() => setIntervene(true)}>
                  <Plus size={16} />
                  Rencanakan pendampingan
                </Button>
              )}
          </div>
        )}
      </div>}
      <div className="metrics four compact">
        <Metric
          label="Rata-rata nilai"
          value={
            <>
              {avg(grades.map((g) => g.score))}
              <em>/100</em>
            </>
          }
          icon={BookOpen}
          note={`${grades.length} mata pelajaran`}
        />
        <Metric
          label="Kehadiran"
          value={`${s.attendance}%`}
          icon={ClipboardCheck}
          tone="blue"
          note={`${attendance.filter((a) => a.status === "Hadir").length} hari hadir tercatat`}
        />
        <Metric
          label="Tugas tertunda"
          value={pendingTasks.length}
          icon={Clock3}
          tone="amber"
          note="perlu diselesaikan"
        />
        {pro ? <Metric
          label="Pendampingan aktif"
          value={interventions.filter((i) => i.status !== "Selesai").length}
          icon={ShieldCheck}
          tone="purple"
          note="bersama guru & wali kelas"
        /> : <Metric label="Mata pelajaran" value={grades.length} icon={FileCheck2} tone="purple" note="dengan nilai tercatat" />}
      </div>
      <div className="tabs">
        {[
          "Ringkasan",
          "Akademik",
          "Kehadiran",
          "Tugas",
          "Pendampingan",
          "Profil",
        ]
          .filter(
            (t) =>
              (t !== "Pendampingan" || (pro && canIntervene(user))) &&
              (t !== "Profil" || user.role !== "teacher" || user.isHomeroom),
          )
          .map((t) => (
            <button
              className={tab === t ? "active" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
      </div>
      {tab === "Ringkasan" && (
        <>
          {pro ? <div className="student-grid">
            <Panel
              title="Perjalanan akademik"
              subtitle="Rata-rata nilai dari waktu ke waktu"
            >
              <div className="detail-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trend}
                    margin={{ left: -20, right: 20, top: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="studentFill" x2="0" y2="1">
                        <stop stopColor="#3e9c91" stopOpacity={0.18} />
                        <stop offset="1" stopColor="#3e9c91" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#edf0f2" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      domain={[40, 100]}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Area
                      dataKey="Nilai"
                      type="monotone"
                      stroke="#11998c"
                      strokeWidth={3}
                      fill="url(#studentFill)"
                      dot={{ r: 4, fill: "#fff" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel
              title={
                <>
                  <Sparkles size={17} />
                  Catatan perkembangan
                </>
              }
              subtitle="Ringkasan dari nilai dan kehadiran"
            >
              <div className="smart-insight">
                <p>
                  <strong>{s.name.split(" ")[0]}</strong>{" "}
                  {r.drop > 10
                    ? "menunjukkan penurunan nilai yang perlu didampingi secara bertahap."
                    : "menunjukkan perkembangan yang konsisten pada semester ini."}{" "}
                  {s.attendance < 80
                    ? "Kehadiran perlu menjadi prioritas bersama."
                    : "Kehadiran mendukung keberlangsungan proses belajar."}
                </p>
                <div>
                  <Target size={18} />
                  <p>
                    <strong>Fokus pendampingan</strong>
                    <br />
                    {grades
                      .filter((g) => g.score < 75)
                      .map((g) => g.subject)
                      .join(", ") ||
                      "Pertahankan konsistensi dan eksplorasi potensi baru."}
                  </p>
                </div>
                <small>
                  Selalu tinjau bersama wali kelas sebelum dibagikan.
                </small>
              </div>
            </Panel>
          </div> : <Panel title="Ringkasan belajar" subtitle="Nilai, kehadiran, dan tugas yang telah dicatat.">
            <p className="card-copy">{s.name.split(" ")[0]} memiliki {grades.length} mata pelajaran dengan rata-rata nilai {avg(grades.map((g) => g.score))}/100. Kehadiran tercatat {s.attendance}% dan {pendingTasks.length} tugas belum selesai.</p>
            <div className="operation-actions"><Button variant="secondary" onClick={() => setTab("Akademik")}>Lihat nilai</Button><Button variant="secondary" onClick={() => setTab("Tugas")}>Buka tugas</Button></div>
          </Panel>}
          <div className="student-grid">
            <Panel
              title="Peta kompetensi"
              subtitle="Capaian lintas mata pelajaran"
            >
              <div className="radar-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    data={grades
                      .slice(0, 6)
                      .map((g) => ({ subject: g.subject, score: g.score }))}
                  >
                    <PolarGrid stroke="#e7eeee" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 10, fill: "#687c82" }}
                    />
                    <Radar
                      dataKey="score"
                      stroke="#11998c"
                      fill="#11998c"
                      fillOpacity={0.18}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel
              title="Catatan wali kelas"
              subtitle={data.classes.find((c) => c.id === s.classId)?.homeroom}
              action={
                canReviewReport(user, s.classId) ? (
                  <Button variant="ghost" onClick={() => setNote(true)}>
                    Edit catatan
                  </Button>
                ) : undefined
              }
            >
              <blockquote>
                {report?.note || "Belum ada catatan wali kelas."}
              </blockquote>
              <div className="mini-parent">
                <Avatar
                  photo={s.parent?.startsWith("Bapak") ? 11 : 9}
                  size={42}
                />
                <div>
                  <small>ORANG TUA / WALI</small>
                  <strong>{s.parent}</strong>
                  <span>{s.phone}</span>
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}
      {tab === "Akademik" && (
        <Panel
          title="Capaian akademik"
          action={
            <ExportButton
              onClick={() =>
                exportExcel(
                  grades.map((g) => ({
                    Mapel: g.subject,
                    Harian: g.daily,
                    UTS: g.midterm,
                    UAS: g.final,
                    Akhir: g.score,
                    Deskripsi: g.description,
                  })),
                  "Nilai-" + s.name,
                )
              }
            />
          }
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mata pelajaran</th>
                  <th>Harian</th>
                  <th>UTS</th>
                  <th>UAS</th>
                  <th>Nilai akhir</th>
                  <th>Kompetensi</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <strong>{g.subject}</strong>
                    </td>
                    <td>{g.daily}</td>
                    <td>{g.midterm}</td>
                    <td>{g.final}</td>
                    <td>
                      <Badge tone={g.score < 75 ? "red" : "green"}>
                        {gradeDisplay(g.score, data.settings[0])}
                      </Badge>
                    </td>
                    <td className="description-cell">{g.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {tab === "Kehadiran" && (
        <Panel
          title="Riwayat kehadiran"
          subtitle="Data kehadiran harian yang telah dicatat."
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {[...attendance]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((a) => (
                    <tr key={a.id}>
                      <td>{date(a.date)}</td>
                      <td>
                        <Badge tone={tone(a.status)}>{a.status}</Badge>
                      </td>
                      <td>{a.note || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {tab === "Tugas" && (
        <div className="card-grid">
          {assignments.map((a) => {
            const sub = submissions.find((s) => s.assignmentId === a.id);
            return (
              <Panel key={a.id} title={a.title} subtitle={a.subject}>
                <p className="card-copy">{a.description}</p>
                <div className="card-bottom">
                  <Badge tone={sub ? tone(sub.status) : "amber"}>
                    {sub?.status || "Belum dikumpulkan"}
                  </Badge>
                  <span>
                    {sub?.score ? `Nilai ${sub.score}` : date(a.due, true)}
                  </span>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
      {pro && tab === "Pendampingan" && canIntervene(user) && (
        <Panel
          title="Rencana & hasil pendampingan"
          action={
            canIntervene(user) &&
            (user.role !== "teacher" || s.classId === user.homeroomClassId) ? (
              <Button onClick={() => setIntervene(true)}>
                <Plus size={15} />
                Tambah rencana
              </Button>
            ) : undefined
          }
        >
          {!interventions.length ? (
            <Empty title="Belum ada rencana pendampingan" />
          ) : (
            interventions.map((i) => (
              <div className="intervention-line" key={i.id}>
                <span className="timeline-icon">
                  <ShieldCheck size={19} />
                </span>
                <div>
                  <Badge tone={tone(i.status)}>{i.status}</Badge>
                  <h3>{i.title}</h3>
                  <p>{i.note}</p>
                  <small>
                    PIC: {i.pic} <span>•</span> Tenggat evaluasi {date(i.due)}
                  </small>
                  <p><strong>Target:</strong> {i.expectedOutcome || "Belum dicatat"}</p>
                  {i.status === "Selesai" && <div className="evaluation-result"><Badge tone={i.outcome === "Membaik" ? "green" : "amber"}>{i.outcome || "Sudah dievaluasi"}</Badge><p>{i.evaluationNote || "Belum ada catatan evaluasi"}</p><small>Kehadiran {i.baselineAttendance ?? "—"}% → {i.afterAttendance ?? "—"}% · Nilai {i.baselineScore ?? "—"} → {i.afterScore ?? "—"} · Tugas tertunda {i.baselineOverdue ?? "—"} → {i.afterOverdue ?? "—"}</small></div>}
                </div>
                {canIntervene(user) &&
                  (user.role !== "teacher" ||
                    s?.classId === user.homeroomClassId) && (
                    <Button variant="secondary" onClick={() => setEditInter(i)}>
                      Perbarui
                    </Button>
                  )}
              </div>
            ))
          )}
        </Panel>
      )}
      {tab === "Profil" && (
        <Panel
          title="Identitas siswa"
          action={
            user.role === "admin" ? (
              <Button variant="danger" onClick={() => setDel(true)}>
                <Trash2 size={16} />
                Hapus siswa
              </Button>
            ) : undefined
          }
        >
          <div className="profile-fields">
            {[
              ["Nama lengkap", s.name],
              ["NISN", s.nisn],
              ["NIS", s.nis],
              ["Jenis kelamin", s.gender === "P" ? "Perempuan" : "Laki-laki"],
              ["Tanggal lahir", date(s.birth)],
              ["Alamat", s.address],
              ["Orang tua / wali", s.parent],
              ["Telepon", s.phone],
              ["Email", s.email],
              ["Tanggal masuk", date(s.enrolled)],
            ].map(([k, v]) => (
              <div key={k}>
                <small>{k}</small>
                <strong>{v || "—"}</strong>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {pro && intervene && (
        <InterventionForm
          studentId={s.id}
          onClose={() => setIntervene(false)}
        />
      )}{" "}
      {pro && editInter && (
        <InterventionForm
          studentId={s.id}
          initial={editInter}
          onClose={() => setEditInter(undefined)}
        />
      )}{" "}
      {note && (
        <FormModal
          title="Catatan wali kelas"
          initial={report}
          fields={[
            {
              key: "note",
              label: "Catatan perkembangan",
              type: "textarea",
              required: true,
            },
          ]}
          onClose={() => setNote(false)}
          onSave={(v) =>
            save("reports", { ...v, studentId: s.id, classId: s.classId })
          }
        />
      )}{" "}
      {del && (
        <Modal title="Hapus data siswa?" onClose={() => setDel(false)}>
          <p className="modal-copy">
            Data akademik, absensi, rapor, dan tagihan {s.name} akan ikut
            dihapus.
          </p>
          <footer>
            <Button variant="secondary" onClick={() => setDel(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await remove("students", s.id);
                  go("students");
                } catch (e) {
                  toast((e as Error).message, true);
                }
              }}
            >
              Hapus siswa
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}
export function Interventions() {
  const { data, user, go, selectedId } = useApp();
  const [filter, setFilter] = useState("all"),
    [overdue, setOverdue] = useState(selectedId === "overdue"),
    [edit, setEdit] = useState<Row | undefined>(),
    [add, setAdd] = useState(false),
    [student, setStudent] = useState(data.students[0]?.id || "");
  if (!isPro(data.settings[0])) return <Empty title="Pendampingan EWS tersedia pada Pro dan Yayasan" description="Gunakan kehadiran, nilai, tugas, dan rapor untuk kegiatan sekolah sehari-hari." />;
  const rows = data.interventions.filter(
    (i) =>
      (filter === "all" || i.status === filter) &&
      (!overdue || (i.status !== "Selesai" && i.due < todayWIB())) &&
      (user.role !== "teacher" ||
        data.students.find((s) => s.id === i.studentId)?.classId ===
          user.homeroomClassId),
  );
  return (
    <>
      <PageHead
        eyebrow="DARI INSIGHT MENJADI TINDAKAN"
        title="Pendampingan siswa"
        description="Rencana yang terarah, progres yang terlihat, dan hasil yang tercatat."
        action={
          canIntervene(user) ? (
            <Button onClick={() => setAdd(true)}>
              <Plus size={16} />
              Rencana baru
            </Button>
          ) : undefined
        }
      />
      <div className="intervention-summary">
        <Badge tone="green">
          {
            data.interventions.filter(
              (i) => i.status === "Selesai" && i.outcome === "Membaik",
            ).length
          }{" "}
          pendampingan dievaluasi membaik
        </Badge>
        <label>
          <input
            type="checkbox"
            checked={overdue}
            onChange={(e) => setOverdue(e.target.checked)}
          />
          Hanya yang melewati tenggat
        </label>
      </div>
      <div className="tabs">
        {["all", "Direncanakan", "Berjalan", "Selesai"].map((f) => (
          <button
            className={filter === f ? "active" : ""}
            key={f}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Semua rencana" : f}
            <span>
              {
                data.interventions.filter((i) => f === "all" || i.status === f)
                  .length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="card-grid">
        {rows.map((i) => {
          const s = data.students.find((s) => s.id === i.studentId);
          return (
            <Panel key={i.id}>
              <div className="intervention-card-top">
                <span className="heading-icon teal">
                  <ShieldCheck size={20} />
                </span>
                <Badge tone={tone(i.status)}>{i.status}</Badge>
              </div>
              <h3 className="card-title">{i.title}</h3>
              <button
                className="person person-button"
                onClick={() => go("students", i.studentId)}
              >
                <Avatar photo={s?.photo} size={32} />
                <div>
                  <strong>{s?.name}</strong>
                  <small>
                    {data.classes.find((c) => c.id === s?.classId)?.name}
                  </small>
                </div>
                <ArrowUpRight size={14} />
              </button>
              <p className="card-copy">{i.note}</p>
              <p className="card-copy">
                <strong>Target:</strong> {i.expectedOutcome || "Belum dicatat"}
              </p>
              {i.status !== "Selesai" && i.due < todayWIB() && (
                <Badge tone="red">Evaluasi melewati tenggat</Badge>
              )}
              {i.status === "Selesai" && (
                <div className="evaluation-result">
                  <Badge tone={i.outcome === "Membaik" ? "green" : "amber"}>
                    {i.outcome || "Sudah dievaluasi"}
                  </Badge>
                  <p>{i.evaluationNote}</p>
                  <div>
                    <span>
                      Kehadiran {i.baselineAttendance ?? "—"}% →{" "}
                      {i.afterAttendance ?? "—"}%
                    </span>
                    <span>
                      Nilai {i.baselineScore ?? "—"} → {i.afterScore ?? "—"}
                    </span>
                    <span>
                      Tugas tertunda {i.baselineOverdue ?? "—"} →{" "}
                      {i.afterOverdue ?? "—"}
                    </span>
                  </div>
                  <small>
                    Snapshot nilai dan kehadiran saat evaluasi tersimpan, bukan
                    klaim hubungan sebab-akibat.
                  </small>
                </div>
              )}
              <div className="intervention-meta">
                <span>
                  <UserRound size={14} />
                  {i.pic}
                </span>
                <span>
                  <CalendarDays size={14} />
                  Evaluasi {date(i.due, true)}
                </span>
              </div>
              {canIntervene(user) &&
                (user.role !== "teacher" ||
                  s?.classId === user.homeroomClassId) && (
                  <Button
                    variant="secondary"
                    className="full-width"
                    onClick={() => setEdit(i)}
                  >
                    Perbarui perkembangan <ArrowRight size={15} />
                  </Button>
                )}
            </Panel>
          );
        })}
      </div>
      {!rows.length && <Empty title="Belum ada rencana pada status ini" />}
      {edit && (
        <InterventionForm
          studentId={edit.studentId}
          initial={edit}
          onClose={() => setEdit(undefined)}
        />
      )}{" "}
      {add && (
        <Modal
          title="Pilih siswa yang akan didampingi"
          onClose={() => setAdd(false)}
        >
          <div className="modal-copy">
            <label>
              Siswa
              <select
                value={student}
                onChange={(e) => setStudent(e.target.value)}
              >
                {data.students
                  .filter(
                    (s) =>
                      user.role !== "teacher" ||
                      s.classId === user.homeroomClassId,
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <footer>
            <Button
              onClick={() => {
                setAdd(false);
                setEdit({
                  id: "",
                  studentId: student,
                  title: "",
                  pic: data.teachers[0]?.name,
                  due: new Date(Date.now() + 7 * 86400000)
                    .toISOString()
                    .slice(0, 10),
                  status: "Direncanakan",
                  note: "",
                });
              }}
            >
              Lanjutkan <ArrowRight size={16} />
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}

function AdministrativeStudents() {
  const { data, go, save } = useApp();
  const [query, setQuery] = useState(""),
    [cls, setCls] = useState("all"),
    [page, setPage] = useState(1),
    [form, setForm] = useState<Partial<Row> | null>(null);
  const rows = data.students.filter(
    (s) =>
      (cls === "all" || s.classId === cls) &&
      `${s.name} ${s.nisn}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHead
        title="Data siswa"
        description="Biodata, kelas, dan kontak wali untuk administrasi sekolah."
        action={
          <>
            <ExportButton
              onClick={() =>
                exportExcel(
                  rows.map((s) => ({
                    Nama: s.name,
                    NISN: s.nisn,
                    Kelas: data.classes.find((c) => c.id === s.classId)?.name,
                    Wali: s.parent,
                    Telepon: s.phone,
                    Alamat: s.address,
                  })),
                  "Data-administrasi-siswa",
                )
              }
            />
            <Button
              onClick={() =>
                setForm({
                  gender: "P",
                  classId: data.classes[0]?.id,
                  status: "Aktif",
                })
              }
            >
              <Plus size={16} />
              Tambah siswa
            </Button>
          </>
        }
      />
      <Panel
        title={`${rows.length} siswa`}
        action={
          <div className="operation-actions">
            <SearchBox
              value={query}
              onChange={(v) => {
                setQuery(v);
                setPage(1);
              }}
              placeholder="Cari nama atau NISN…"
            />
            <ClassSelect
              value={cls}
              onChange={(v) => {
                setCls(v);
                setPage(1);
              }}
            />
          </div>
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Kelas</th>
                <th>Wali</th>
                <th>Telepon</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice((page - 1) * 12, page * 12).map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="person">
                      <Avatar photo={s.photo} />
                      <div>
                        <strong>{s.name}</strong>
                        <small>NISN {s.nisn}</small>
                      </div>
                    </div>
                  </td>
                  <td>{data.classes.find((c) => c.id === s.classId)?.name}</td>
                  <td>{s.parent || "Belum diisi"}</td>
                  <td>{s.phone || "Belum diisi"}</td>
                  <td>
                    <Button
                      variant="ghost"
                      onClick={() => go("students", s.id)}
                    >
                      Biodata
                    </Button>
                    <Button variant="ghost" onClick={() => setForm(s)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={rows.length} onChange={setPage} />
      </Panel>
      {form && (
        <FormModal
          title={form.id ? "Edit biodata siswa" : "Tambah siswa"}
          initial={form}
          fields={studentFields(data.classes)}
          onClose={() => setForm(null)}
          onSave={(v) =>
            save("students", { ...v, photo: v.gender === "P" ? 1 : 0 })
          }
        />
      )}
    </>
  );
}
function studentFields(classes: Row[]): Field[] {
  return [
    { key: "name", label: "Nama lengkap", required: true },
    { key: "nisn", label: "NISN (10 digit)", required: true },
    {
      key: "classId",
      label: "Kelas",
      options: classes.map((c) => ({ value: c.id, label: c.name })),
      required: true,
    },
    {
      key: "gender",
      label: "Jenis kelamin",
      options: [
        { value: "L", label: "Laki-laki" },
        { value: "P", label: "Perempuan" },
      ],
      required: true,
    },
    { key: "parent", label: "Nama wali", required: true },
    { key: "phone", label: "Telepon wali", type: "tel", required: true },
    { key: "address", label: "Alamat", type: "textarea", required: true },
  ];
}
function AdministrativeProfile({ student: s }: { student: Row }) {
  const { data, save, go, remove } = useApp();
  const [edit, setEdit] = useState(false),
    [del, setDel] = useState(false);
  return (
    <>
      <button className="back-link" onClick={() => go("students")}>
        <ArrowLeft size={16} />
        Kembali ke data siswa
      </button>
      <div className="student-hero">
        <Avatar photo={s.photo} size={80} />
        <div className="student-hero-info">
          <div className="eyebrow">BIODATA SISWA</div>
          <h1>{s.name}</h1>
          <p>
            NISN {s.nisn} · {data.classes.find((c) => c.id === s.classId)?.name}
          </p>
        </div>
        <Button onClick={() => setEdit(true)}>Edit biodata</Button>
      </div>
      <Panel title="Identitas & kontak wali">
        <dl className="identity-grid">
          {[
            ["Jenis kelamin", s.gender === "P" ? "Perempuan" : "Laki-laki"],
            ["Wali murid", s.parent],
            ["Telepon wali", s.phone],
            ["Alamat", s.address],
            ["Status", s.status || "Aktif"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "Belum diisi"}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Button variant="danger" onClick={() => setDel(true)}>
        Hapus siswa
      </Button>
      {edit && (
        <FormModal
          title="Edit biodata siswa"
          initial={s}
          fields={studentFields(data.classes)}
          onClose={() => setEdit(false)}
          onSave={(v) => save("students", v)}
        />
      )}
      {del && (
        <Modal
          title="Hapus data siswa?"
          subtitle="Biodata dan data terkait siswa akan dihapus dari demo."
          onClose={() => setDel(false)}
        >
          <footer>
            <Button variant="secondary" onClick={() => setDel(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await remove("students", s.id);
                go("students");
              }}
            >
              Hapus siswa
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}
