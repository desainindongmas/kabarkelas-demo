import { useReportJobs, createReportArchive } from "./reportQueue";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Copy,
  Download,
  FileCheck2,
  FileText,
  GraduationCap,
  Layers,
  LoaderCircle,
  Play,
  Plus,
  Save,
  Search,
  Send,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  avg,
  canEdit,
  canReviewReport,
  canPublishReport,
  isPro,
  todayWIB,
  canAccessPage,
  gradeDisplay,
  currency,
  date,
  number,
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
} from "./ui";
import { exportExcel, reportPDF, downloadJSON } from "./export";
import { api } from "./App";

export function Attendance() {
  const { data, user, reload, toast } = useApp();
  const editable = canEdit(user.role);
  const [cls, setCls] = useState(data.classes[0]?.id || ""),
    [day, setDay] = useState("2026-10-17"),
    [query, setQuery] = useState(""),
    [changes, setChanges] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false);
  const personal = ["parent", "student"].includes(user.role);
  const students = data.students.filter(
    (s) =>
      (personal || s.classId === cls) &&
      s.name.toLowerCase().includes(query.toLowerCase()),
  );
  const status = (id: string) =>
    changes[id] ||
    data.attendance.find((a) => a.studentId === id && a.date === day)?.status ||
    "Hadir";
  const saveAll = async () => {
    setBusy(true);
    try {
      await api("/api/academic-batch", {
        kind: "attendance",
        rows: students.map((s) => {
          const old = data.attendance.find(
            (a) => a.studentId === s.id && a.date === day,
          );
          return {
            ...old,
            id: old?.id || `${s.id}-attendance-${day}`,
            studentId: s.id,
            classId: s.classId,
            date: day,
            status: status(s.id),
          };
        }),
      });
      await reload();
      setChanges({});
      toast(`Kehadiran ${students.length} siswa berhasil disimpan`);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead
        eyebrow="HADIR ADALAH AWAL BELAJAR"
        title={personal ? "Riwayat kehadiran" : "Kehadiran siswa"}
        description="Catat setiap kehadiran, pahami setiap ketidakhadiran."
        action={
          editable ? (
            <Button disabled={busy} onClick={saveAll}>
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Save size={16} />
              )}
              Simpan kehadiran
            </Button>
          ) : (
            <ExportButton
              onClick={() =>
                exportExcel(
                  data.attendance
                    .filter((a) => students.some((s) => s.id === a.studentId))
                    .map((a) => ({
                      Tanggal: a.date,
                      Nama: data.students.find((s) => s.id === a.studentId)
                        ?.name,
                      Status: a.status,
                    })),
                  "Kehadiran",
                )
              }
            />
          )
        }
      />
      <div className="metrics four compact">
        {["Hadir", "Sakit", "Izin", "Alpa"].map((st, i) => (
          <Metric
            key={st}
            label={st}
            value={
              personal
                ? data.attendance.filter((a) => a.status === st).length
                : students.filter((s) => status(s.id) === st).length
            }
            icon={[CheckCircle2, ActivityIcon, CalendarDays, Clock3][i]}
            tone={["teal", "blue", "purple", "red"][i]}
            note={personal ? "hari tercatat" : "siswa hari ini"}
          />
        ))}
      </div>
      <Panel
        title={personal ? "Kehadiran harian" : "Daftar hadir kelas"}
        subtitle={
          editable
            ? "Pilih status siswa, lalu simpan. Tanggal yang sama memperbarui catatan sebelumnya."
            : "Rekap kehadiran yang telah dicatat oleh guru."
        }
      >
        <div className="table-toolbar">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Cari nama siswa…"
          />
          <div className="toolbar-right">
            {!personal && (
              <ClassSelect
                all={false}
                value={cls}
                onChange={(v) => {
                  setCls(v);
                  setChanges({});
                }}
              />
            )}
            <input
              type="date"
              aria-label="Tanggal kehadiran"
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                setChanges({});
              }}
            />
            {editable && (
              <Button
                variant="secondary"
                onClick={() =>
                  setChanges(
                    Object.fromEntries(students.map((s) => [s.id, "Hadir"])),
                  )
                }
              >
                <Check size={15} />
                Semua hadir
              </Button>
            )}
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{personal ? "Tanggal" : "Nama siswa"}</th>
                <th>{personal ? "Siswa" : "NISN"}</th>
                <th>Status kehadiran</th>
                {editable && <th>Rekap semester</th>}
              </tr>
            </thead>
            <tbody>
              {personal
                ? [...data.attendance]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 60)
                    .map((a) => (
                      <tr key={a.id}>
                        <td>{date(a.date)}</td>
                        <td>
                          {
                            data.students.find((s) => s.id === a.studentId)
                              ?.name
                          }
                        </td>
                        <td>
                          <Badge tone={tone(a.status)}>{a.status}</Badge>
                        </td>
                      </tr>
                    ))
                : students.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="person">
                          <Avatar photo={s.photo} />
                          <strong>{s.name}</strong>
                        </div>
                      </td>
                      <td className="mono">{s.nisn}</td>
                      <td>
                        {editable ? (
                          <div className="attendance-switch">
                            {["Hadir", "Sakit", "Izin", "Alpa"].map((st) => (
                              <button
                                className={
                                  status(s.id) === st
                                    ? `selected ${tone(st)}`
                                    : ""
                                }
                                key={st}
                                onClick={() =>
                                  setChanges({ ...changes, [s.id]: st })
                                }
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <Badge tone={tone(status(s.id))}>
                            {data.attendance.find(
                              (a) => a.studentId === s.id && a.date === day,
                            )?.status || "Belum dicatat"}
                          </Badge>
                        )}
                      </td>
                      {editable && <td>{s.attendance}%</td>}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!students.length && <Empty title="Siswa tidak ditemukan" />}
        {editable && (
          <div className="save-bar">
            <span>
              <ShieldIcon size={16} />
              {Object.keys(changes).length
                ? `${Object.keys(changes).length} perubahan belum disimpan`
                : "Pencatatan siap disimpan"}{" "}
              <span>•</span> {date(day)}
            </span>
            <Button disabled={busy} onClick={saveAll}>
              Simpan kehadiran
            </Button>
          </div>
        )}
      </Panel>
    </>
  );
}
const ActivityIcon = ClipboardCheck,
  ShieldIcon = CheckCircle2;
export function Grades() {
  const { data, user, reload, toast, selectedId } = useApp();
  const [cls, setCls] = useState(
      selectedId.split("~")[0] || data.classes[0]?.id || "",
    ),
    [subject, setSubject] = useState(
      selectedId.split("~")[1] || data.subjects[0]?.id || "",
    ),
    [query, setQuery] = useState(""),
    [changes, setChanges] = useState<Record<string, Partial<Row>>>({}),
    [busy, setBusy] = useState(false);
  const editable = canEdit(user.role),
    personal = ["parent", "student"].includes(user.role);
  const students = data.students.filter(
    (s) =>
      (personal || s.classId === cls) &&
      s.name.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = data.subjects.find((s) => s.id === subject);
  const existing = data.grades.filter(
    (g) =>
      students.some((s) => s.id === g.studentId) &&
      (personal || g.subjectId === subject),
  );
  const rows: Row[] = personal
    ? existing
    : students.map(
        (student) =>
          existing.find((g) => g.studentId === student.id) || {
            id: `${student.id}-${subject}`,
            studentId: student.id,
            subjectId: subject,
            subject: selected?.name,
            daily: 0,
            midterm: 0,
            final: 0,
            score: 0,
            description: "",
            missing: true,
          },
      );
  const weights = data.settings[0] || {};
  const changed = (g: Row) => ({ ...g, ...changes[g.id] });
  const setValue = (g: Row, key: string, value: number) => {
    const next = { ...changed(g), [key]: value };
    next.score = Math.round(
      (Number(next.daily) * (weights.weightDaily || 30) +
        Number(next.midterm) * (weights.weightMidterm || 30) +
        Number(next.final) * (weights.weightFinal || 40)) /
        100,
    );
    setChanges({ ...changes, [g.id]: next });
  };
  const saveAll = async () => {
    setBusy(true);
    try {
      await api("/api/academic-batch", {
        kind: "grades",
        rows: Object.values(changes),
      });
      await reload();
      setChanges({});
      toast("Nilai berhasil diperbarui. EWS telah dievaluasi ulang.");
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead
        eyebrow="CAPAIAN YANG BERMAKNA"
        title="Nilai & kompetensi"
        description="Setiap angka menyimpan proses. Kelola penilaian dengan lebih terarah."
        action={
          <>
            <ExportButton
              onClick={() =>
                exportExcel(
                  rows.map((g) => ({
                    Nama: data.students.find((s) => s.id === g.studentId)?.name,
                    Mapel: g.subject,
                    Harian: g.daily,
                    UTS: g.midterm,
                    UAS: g.final,
                    Akhir: g.score,
                  })),
                  "Rekap-Nilai",
                )
              }
            />
            {editable && (
              <Button
                disabled={busy || !Object.keys(changes).length}
                onClick={saveAll}
              >
                <Save size={16} />
                Simpan nilai
              </Button>
            )}
          </>
        }
      />
      <div className="metrics three">
        <Metric
          label="Rata-rata nilai"
          value={avg(rows.map((g) => changed(g).score))}
          icon={TrendingIcon}
          note="pada pilihan saat ini"
        />
        <Metric
          label="Tuntas KKM"
          value={
            rows.filter((g) => changed(g).score >= (selected?.kkm || 75)).length
          }
          icon={CheckCircle2}
          note={`KKM ${selected?.kkm || 75}`}
          tone="blue"
        />
        <Metric
          label="Perlu penguatan"
          value={
            rows.filter((g) => changed(g).score < (selected?.kkm || 75)).length
          }
          icon={BookOpen}
          note="rekomendasi remedial"
          tone="amber"
        />
      </div>
      <Panel
        title={personal ? "Capaian mata pelajaran" : "Lembar penilaian"}
        subtitle={
          editable
            ? `Bobot harian ${weights.weightDaily}% · UTS ${weights.weightMidterm}% · UAS ${weights.weightFinal}%`
            : "Nilai dan deskripsi capaian dari guru mata pelajaran."
        }
      >
        <div className="table-toolbar">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Cari nama siswa…"
          />
          <div className="toolbar-right">
            {!personal && (
              <>
                <ClassSelect
                  all={false}
                  value={cls}
                  onChange={(v) => {
                    setCls(v);
                    setChanges({});
                  }}
                />
                <select
                  aria-label="Mata pelajaran"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setChanges({});
                  }}
                >
                  {data.subjects
                    .filter(
                      (s) =>
                        user.role !== "teacher" ||
                        user.subjectIds.includes(s.id),
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </>
            )}
            {editable && (
              <Button
                variant="ghost"
                onClick={() => {
                  const next: Record<string, Partial<Row>> = {};
                  rows.forEach((g) => {
                    next[g.id] = {
                      ...g,
                      daily: g.previous,
                      midterm: g.previous,
                      final: g.previous,
                      score: g.previous,
                    };
                  });
                  setChanges(next);
                }}
              >
                <Copy size={15} />
                Salin nilai sebelumnya
              </Button>
            )}
          </div>
        </div>
        <div className="table-scroll">
          <table className="grade-table">
            <thead>
              <tr>
                <th>{personal ? "Mata pelajaran" : "Nama siswa"}</th>
                <th>Harian</th>
                <th>UTS</th>
                <th>UAS</th>
                <th>Nilai akhir</th>
                <th>Ketuntasan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => {
                const s = data.students.find((s) => s.id === g.studentId),
                  v = changed(g);
                return (
                  <tr key={g.id}>
                    <td>
                      {personal ? (
                        <strong>{g.subject}</strong>
                      ) : (
                        <div className="person">
                          <Avatar photo={s?.photo} size={34} />
                          <strong>{s?.name}</strong>
                        </div>
                      )}
                    </td>
                    {["daily", "midterm", "final"].map((key, i) => (
                      <td key={key}>
                        {editable ? (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            aria-label={`${["Harian", "UTS", "UAS"][i]} ${s?.name}`}
                            value={v[key]}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const inputs = Array.from(
                                  document.querySelectorAll<HTMLInputElement>(
                                    ".grade-table input",
                                  ),
                                );
                                inputs[
                                  inputs.indexOf(e.currentTarget) + 1
                                ]?.focus();
                              }
                            }}
                            onChange={(e) =>
                              setValue(
                                g,
                                key,
                                Math.min(
                                  100,
                                  Math.max(0, Number(e.target.value)),
                                ),
                              )
                            }
                          />
                        ) : (
                          gradeDisplay(v[key], data.settings[0])
                        )}
                      </td>
                    ))}
                    <td>
                      <strong
                        className={
                          v.score < (weights.kkm || 75)
                            ? "text-red"
                            : "text-teal"
                        }
                      >
                        {gradeDisplay(v.score, data.settings[0])}
                      </strong>
                    </td>
                    <td>
                      <Badge
                        tone={
                          v.score >= (weights.kkm || 75) ? "green" : "amber"
                        }
                      >
                        {v.score >= (weights.kkm || 75)
                          ? "Tuntas"
                          : "Perlu penguatan"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty title="Belum ada nilai pada pilihan ini" />}
        {editable && (
          <div className="save-bar">
            <span>
              <CheckCircle2 size={16} />
              {Object.keys(changes).length
                ? `${Object.keys(changes).length} nilai belum disimpan`
                : "Semua nilai tersimpan"}{" "}
              <span>•</span> Tekan Enter untuk berpindah kolom
            </span>
            <Button
              disabled={busy || !Object.keys(changes).length}
              onClick={saveAll}
            >
              Simpan nilai
            </Button>
          </div>
        )}
      </Panel>
    </>
  );
}
const TrendingIcon = GraduationCap;
export function Assignments() {
  const { data, user, go, save, toast } = useApp();
  const [cls, setCls] = useState("all"),
    [query, setQuery] = useState(""),
    [add, setAdd] = useState(false),
    [detail, setDetail] = useState<Row | undefined>(),
    [answer, setAnswer] = useState(""),
    [attachment, setAttachment] = useState<{
      name: string;
      url: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [grading, setGrading] = useState<Row | undefined>();
  const editable = canEdit(user.role);
  const rows = data.assignments.filter(
    (a) =>
      (cls === "all" || a.classId === cls) &&
      a.title.toLowerCase().includes(query.toLowerCase()),
  );
  const submit = async () => {
    if (!answer.trim() && !attachment) {
      toast("Isi jawaban atau lampirkan berkas terlebih dahulu.", true);
      return;
    }
    setBusy(true);
    try {
      const old = data.submissions.find(
        (s) => s.assignmentId === detail?.id && s.studentId === user.studentId,
      );
      await save("submissions", {
        ...old,
        id: old?.id || `${detail?.id}-${user.studentId}`,
        studentId: user.studentId,
        assignmentId: detail?.id,
        body: answer,
        attachment,
      });
      setDetail(undefined);
      setAnswer("");
      setAttachment(null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead
        eyebrow="BELAJAR DENGAN TUJUAN"
        title="Tugas & PR"
        description="Ruang untuk berlatih, bereksplorasi, dan menunjukkan pemahaman."
        action={
          editable ? (
            <Button onClick={() => setAdd(true)}>
              <Plus size={16} />
              Buat tugas
            </Button>
          ) : undefined
        }
      />
      <div className="section-toolbar">
        <div className="tabs compact-tabs">
          <button className="active">
            Tugas & PR <span>{rows.length}</span>
          </button>
          {canAccessPage(user, "quizzes") && (
            <button onClick={() => go("quizzes")}>
              Kuis online <span>{data.quizzes.length}</span>
            </button>
          )}
        </div>
        <div className="toolbar-right">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Cari tugas…"
          />
          <ClassSelect value={cls} onChange={setCls} />
        </div>
      </div>
      <div className="assignment-grid">
        {rows.map((a, i) => {
          const subs = data.submissions.filter((s) => s.assignmentId === a.id),
            own = subs.find((s) => s.studentId === user.studentId),
            total = data.students.filter((s) => s.classId === a.classId).length;
          return (
            <Panel key={a.id} className="assignment-card">
              <div className="assignment-top">
                <span className={`assignment-icon color-${i % 4}`}>
                  <BookOpen size={23} />
                </span>
                <Badge tone={a.due < "2026-10-17" ? "amber" : "blue"}>
                  {a.type || "Tugas"}
                </Badge>
              </div>
              <div className="eyebrow">
                {a.subject} <span>•</span>{" "}
                {data.classes.find((c) => c.id === a.classId)?.name}
              </div>
              <h3>{a.title}</h3>
              <p>{a.description.slice(0, 112)}…</p>
              <div className="assignment-date">
                <Clock3 size={14} />
                Tenggat {date(a.due, true)}
              </div>
              <div className="progress-track">
                <i
                  style={{
                    width: `${(subs.length / Math.max(total, 1)) * 100}%`,
                  }}
                />
              </div>
              <div className="assignment-progress">
                <span>
                  {editable
                    ? `${subs.length} dari ${total} dikumpulkan`
                    : own?.status || "Belum dikumpulkan"}
                </span>
                <span>
                  {own?.score != null
                    ? `Nilai ${own.score}`
                    : Math.round((subs.length / Math.max(total, 1)) * 100) +
                      "%"}
                </span>
              </div>
              <Button
                className="full-width"
                variant="secondary"
                onClick={() => {
                  setDetail(a);
                  setAnswer(own?.body || "");
                  setAttachment(own?.attachment || null);
                }}
              >
                {editable
                  ? "Tinjau pengumpulan"
                  : user.role === "student"
                    ? "Lihat & kerjakan tugas"
                    : "Lihat detail tugas"}
                <ArrowRight size={15} />
              </Button>
            </Panel>
          );
        })}
      </div>
      {!rows.length && <Empty title="Tidak ada tugas yang sesuai" />}
      {add && (
        <FormModal
          title="Buat tugas baru"
          initial={{
            classId: data.classes[0]?.id,
            subject: "Matematika",
            type: "Tugas",
            due: "2026-10-25",
          }}
          fields={[
            { key: "title", label: "Judul tugas", required: true },
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
              key: "subject",
              label: "Mata pelajaran",
              required: true,
              options: data.subjects
                .filter(
                  (s) =>
                    user.role !== "teacher" || user.subjectIds.includes(s.id),
                )
                .map((s) => ({
                  value: s.name,
                  label: s.name,
                })),
            },
            {
              key: "due",
              label: "Batas pengumpulan",
              required: true,
              type: "date",
            },
            {
              key: "type",
              label: "Jenis",
              options: ["Tugas", "PR", "Praktikum", "Proyek"].map((x) => ({
                value: x,
                label: x,
              })),
            },
            {
              key: "description",
              label: "Instruksi tugas",
              required: true,
              type: "textarea",
            },
          ]}
          onClose={() => setAdd(false)}
          onSave={(v) => save("assignments", { ...v, teacher: user.name })}
        />
      )}
      {detail && (
        <Modal
          title={detail.title}
          subtitle={`${detail.subject} · ${data.classes.find((c) => c.id === detail.classId)?.name} · Tenggat ${date(detail.due)}`}
          onClose={() => setDetail(undefined)}
          wide
        >
          <div className="assignment-detail">
            <div className="callout blue">
              <BookOpen size={21} />
              <p>{detail.description}</p>
            </div>
            {user.role === "student" ? (
              <>
                <label>
                  Jawabanmu
                  <textarea
                    rows={6}
                    placeholder="Tuliskan jawaban atau tautan hasil pekerjaanmu…"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                </label>
                <label className="upload-zone">
                  <Upload size={24} />
                  <strong>
                    {attachment?.name || "Lampirkan hasil pekerjaan"}
                  </strong>
                  <span>PDF atau gambar · maksimal 2 MB</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast("Ukuran berkas maksimal 2 MB.", true);
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () =>
                        setAttachment({
                          name: file.name,
                          url: String(reader.result),
                        });
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                <Button disabled={busy} onClick={submit}>
                  <Send size={16} />
                  Kumpulkan jawaban
                </Button>
              </>
            ) : (
              <>
                <div className="section-toolbar">
                  <h3>Pengumpulan siswa</h3>
                  {editable && (
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        await save("assignments", {
                          ...detail,
                          id: undefined,
                          title: detail.title + " (salinan)",
                        });
                        setDetail(undefined);
                      }}
                    >
                      <Copy size={15} />
                      Duplikasi tugas
                    </Button>
                  )}
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Siswa</th>
                        <th>Status</th>
                        <th>Nilai</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.students
                        .filter((s) => s.classId === detail.classId)
                        .map((s) => {
                          const sub = data.submissions.find(
                            (x) =>
                              x.assignmentId === detail.id &&
                              x.studentId === s.id,
                          );
                          return (
                            <tr key={s.id}>
                              <td>
                                <div className="person">
                                  <Avatar photo={s.photo} size={30} />
                                  <strong>{s.name}</strong>
                                </div>
                              </td>
                              <td>
                                <Badge tone={sub ? tone(sub.status) : "amber"}>
                                  {sub?.status || "Belum dikumpulkan"}
                                </Badge>
                              </td>
                              <td>{sub?.score ?? "—"}</td>
                              <td>
                                {sub && editable && (
                                  <Button
                                    variant="ghost"
                                    onClick={() => setGrading(sub)}
                                  >
                                    Tinjau & nilai
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
      {grading && (
        <Modal
          title="Tinjau jawaban siswa"
          onClose={() => setGrading(undefined)}
        >
          <div className="modal-copy">
            <p>{grading.body}</p>
            {grading.attachment && (
              <a
                className="btn secondary"
                href={grading.attachment.url}
                download={grading.attachment.name}
              >
                <Download size={16} />
                {grading.attachment.name}
              </a>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await save("submissions", { ...grading, status: "Dinilai" });
                setGrading(undefined);
              }}
            >
              <label>
                Nilai
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={grading.score ?? ""}
                  onChange={(e) =>
                    setGrading({ ...grading, score: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Umpan balik
                <textarea
                  value={grading.feedback || ""}
                  onChange={(e) =>
                    setGrading({ ...grading, feedback: e.target.value })
                  }
                />
              </label>
              <Button type="submit">Simpan penilaian</Button>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Quizzes() {
  const { data, user, go, save, reload, toast } = useApp();
  const [quiz, setQuiz] = useState<Row | undefined>(),
    [answers, setAnswers] = useState<number[]>([]),
    [result, setResult] = useState<number | null>(null),
    [remaining, setRemaining] = useState(900),
    [add, setAdd] = useState(false),
    [busy, setBusy] = useState(false);
  const editable = canEdit(user.role);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const finish = async () => {
    if (!quiz) return;
    if (
      answers.length !== quiz.questions.length ||
      answers.some((x) => x == null)
    ) {
      toast("Jawab semua soal terlebih dahulu.", true);
      return;
    }
    setBusy(true);
    try {
      if (user.role === "student") {
        const res = await api(`/api/quiz/${quiz.id}/submit`, { answers });
        setResult(res.score);
        await reload();
      } else
        setResult(
          Math.round(
            (quiz.questions.filter(
              (q: any, i: number) => q.answer === answers[i],
            ).length /
              quiz.questions.length) *
              100,
          ),
        );
      if (timer.current) clearInterval(timer.current);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (quiz && result === null) {
      timer.current = setInterval(
        () => setRemaining((n) => Math.max(0, n - 1)),
        1000,
      );
      return () => {
        if (timer.current) clearInterval(timer.current);
      };
    }
  }, [quiz?.id, result]);
  useEffect(() => {
    if (remaining === 0 && quiz && result === null) {
      if (timer.current) clearInterval(timer.current);
      setQuiz(undefined);
      toast("Waktu kuis habis. Silakan mulai kembali.", true);
    }
  }, [remaining]);
  return (
    <>
      <PageHead
        eyebrow="UJI PEMAHAMAN, TEMUKAN POTENSI"
        title="Kuis online"
        description="Evaluasi singkat dengan hasil otomatis dan umpan balik yang jelas."
        action={
          editable ? (
            <Button onClick={() => setAdd(true)}>
              <Plus size={16} />
              Buat kuis
            </Button>
          ) : undefined
        }
      />
      <div className="tabs">
        <button onClick={() => go("assignments")}>Tugas & PR</button>
        <button className="active">Kuis online</button>
      </div>
      <div className="card-grid">
        {data.quizzes.map((q) => {
          const sub = data.submissions.find(
            (s) => s.assignmentId === q.id && s.studentId === user.studentId,
          );
          return (
            <Panel key={q.id}>
              <div className="assignment-top">
                <span className="assignment-icon color-2">
                  <GraduationCap size={24} />
                </span>
                <Badge tone="purple">Kuis aktif</Badge>
              </div>
              <div className="eyebrow">
                {q.subject} ·{" "}
                {data.classes.find((c) => c.id === q.classId)?.name}
              </div>
              <h3 className="card-title">{q.title}</h3>
              <div className="quiz-meta">
                <span>
                  <FileText size={16} />
                  {q.questions.length} soal
                </span>
                <span>
                  <Clock3 size={16} />
                  {q.duration} menit
                </span>
              </div>
              <p className="card-copy">
                Evaluasi pemahaman konsep melalui soal pilihan ganda. Hasil
                langsung tersedia setelah dikumpulkan.
              </p>
              {sub && (
                <div className="callout green">
                  Nilai terakhir: <strong>{sub.score}/100</strong>
                </div>
              )}
              <Button
                className="full-width"
                onClick={() => {
                  setQuiz(q);
                  setAnswers([]);
                  setResult(null);
                  setRemaining(q.duration * 60);
                }}
              >
                <Play size={15} />
                {user.role === "student"
                  ? sub
                    ? "Kerjakan kembali"
                    : "Mulai kuis"
                  : "Pratinjau kuis"}
              </Button>
            </Panel>
          );
        })}
      </div>
      {quiz && (
        <Modal
          title={quiz.title}
          subtitle={
            user.role === "student"
              ? "Kerjakan secara mandiri. Hasil dinilai otomatis."
              : "Pratinjau demo · jawaban tidak disimpan sebagai nilai siswa."
          }
          onClose={() => setQuiz(undefined)}
          wide
        >
          {result !== null ? (
            <div className="quiz-result">
              <span>
                <GraduationCap size={42} />
              </span>
              <h2>
                {result >= 75 ? "Kerja bagus!" : "Terus semangat belajar!"}
              </h2>
              <strong>
                {result}
                <em>/100</em>
              </strong>
              <p>
                {result >= 75
                  ? "Pemahamanmu sudah baik. Pertahankan dan terus berlatih."
                  : "Pelajari kembali materi aljabar dan coba latihan tambahan."}
              </p>
              <Button onClick={() => setQuiz(undefined)}>Selesai</Button>
            </div>
          ) : (
            <div className="quiz-body">
              <div className="quiz-timer">
                <span>
                  {answers.filter((x) => x != null).length} dari{" "}
                  {quiz.questions.length} soal terjawab
                </span>
                <Badge tone={remaining < 60 ? "red" : "blue"}>
                  <Clock3 size={13} />
                  {Math.floor(remaining / 60)}:
                  {String(remaining % 60).padStart(2, "0")}
                </Badge>
              </div>
              {quiz.questions.map((q: any, i: number) => (
                <fieldset key={i}>
                  <legend>
                    <span>{i + 1}</span>
                    {q.question}
                  </legend>
                  {q.options.map((o: string, j: number) => (
                    <label
                      className={`answer-option ${answers[i] === j ? "selected" : ""}`}
                      key={j}
                    >
                      <input
                        type="radio"
                        name={"question-" + i}
                        checked={answers[i] === j}
                        onChange={() =>
                          setAnswers((a) => {
                            const next = [...a];
                            next[i] = j;
                            return next;
                          })
                        }
                      />
                      <span>{String.fromCharCode(65 + j)}</span>
                      {o}
                    </label>
                  ))}
                </fieldset>
              ))}
              <Button disabled={busy} onClick={finish}>
                <CheckCircle2 size={16} />
                Kumpulkan & lihat hasil
              </Button>
            </div>
          )}
        </Modal>
      )}
      {add && (
        <FormModal
          title="Buat kuis dari bank soal"
          initial={{
            title: "Evaluasi Aljabar Dasar",
            classId: data.classes[0]?.id,
            subject: "Matematika",
            duration: 15,
            due: "2026-10-31",
          }}
          fields={[
            { key: "title", label: "Judul kuis", required: true },
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
              key: "subject",
              label: "Mata pelajaran",
              options: [
                {
                  value: "Matematika",
                  label: "Matematika — bank aljabar (5 soal)",
                },
              ],
              required: true,
            },
            {
              key: "duration",
              label: "Durasi (menit)",
              type: "number",
              min: 1,
              max: 180,
              required: true,
            },
            { key: "due", label: "Tenggat", type: "date", required: true },
          ]}
          onClose={() => setAdd(false)}
          onSave={(v) =>
            save("quizzes", { ...v, questions: data.quizzes[0]?.questions })
          }
        />
      )}
    </>
  );
}
export function Reports() {
  const { data, user, school, save, reload, toast, go, selectedId } = useApp();
  const [cls, setCls] = useState("all"),
    [status, setStatus] = useState(
      ["Draf", "Review", "Terbit"].includes(selectedId) ? selectedId : "all",
    ),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [preview, setPreview] = useState<Row | undefined>(),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [starting, setStarting] = useState(false),
    [readiness, setReadiness] = useState(false);
  const editable =
    user.role === "principal" || (user.role === "teacher" && user.isHomeroom);
  const canPublish = canReviewReport(user, preview?.classId);
  const canFinalize = canPublishReport(user, preview, data.settings[0]);
  const missing = data.students.flatMap((student) =>
    data.subjects
      .filter(
        (subject) =>
          !data.grades.some(
            (g) => g.studentId === student.id && g.subjectId === subject.id,
          ),
      )
      .map((subject) => ({ student, subject })),
  );
  const jobs = useReportJobs(user);
  const rows = data.reports.filter((r) => {
    const s = data.students.find((s) => s.id === r.studentId);
    return (
      s &&
      (cls === "all" || r.classId === cls) &&
      (status === "all" || r.status === status) &&
      s.name.toLowerCase().includes(query.toLowerCase())
    );
  });
  const startJob = async () => {
    setStarting(true);
    try {
      await createReportArchive(
        user,
        selected.size
          ? [...selected]
          : rows
              .filter(
                (r) =>
                  user.role === "principal" ||
                  r.classId === user.homeroomClassId,
              )
              .map((r) => r.id),
        data,
        school,
      );
      toast("Arsip rapor siap diunduh.");
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setStarting(false);
    }
  };
  return (
    <>
      <PageHead
        eyebrow="CERITA BELAJAR DALAM SATU LAPORAN"
        title="Rapor digital"
        description={
          ["parent", "student"].includes(user.role)
            ? "Lihat capaian semester dan unduh rapor yang sudah diterbitkan sekolah."
            : "Susun, tinjau, dan bagikan capaian siswa dengan lebih bermakna."
        }
        action={
          editable ? (
            <>
              {user.role === "principal" && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      downloadJSON(
                        await api("/api/academic-backup"),
                        "Cadangan-Akademik-KabarKelas.json",
                      );
                    } catch (e) {
                      toast((e as Error).message, true);
                    }
                  }}
                >
                  Cadangan akademik
                </Button>
              )}
              <Button onClick={startJob} disabled={starting || !rows.length}>
                <Layers size={16} />
                Generate massal {selected.size ? `(${selected.size})` : ""}
              </Button>
            </>
          ) : undefined
        }
      />
      {editable && (
        <div className="report-readiness">
          <div>
            <strong>
              {missing.length
                ? `${missing.length} nilai belum lengkap`
                : "Nilai seluruh siswa lengkap"}
            </strong>
            <p>
              {isPro(data.settings[0])
                ? `Tenggat rapor ${date(data.settings[0]?.reportDue)}. `
                : ""}
              Periksa kelengkapan sebelum penerbitan.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setReadiness(true)}>
            Periksa kelengkapan
          </Button>
        </div>
      )}
      {!["parent", "student"].includes(user.role) && (
        <div className="metrics three">
          {["Draf", "Review", "Terbit"].map((s, i) => (
            <Metric
              key={s}
              label={["Masih disusun", "Menunggu review", "Siap dibagikan"][i]}
              value={data.reports.filter((r) => r.status === s).length}
              icon={[FileText, Clock3, FileCheck2][i]}
              tone={["amber", "blue", "teal"][i]}
              note="rapor semester ganjil"
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
            />
          ))}
        </div>
      )}
      {jobs
        .slice(-3)
        .reverse()
        .map((j) => (
          <div className="job-progress" key={j.id}>
            <span className="heading-icon teal">
              {j.status === "Selesai" ? (
                <CheckCircle2 size={20} />
              ) : j.status === "Gagal" ? (
                <X size={20} />
              ) : (
                <LoaderCircle size={20} className="spin" />
              )}
            </span>
            <div>
              <strong>Rapor massal · {j.total} siswa</strong>
              <small>
                {j.status} — {j.done}/{j.total} rapor{" "}
                {j.error && "· " + j.error}
              </small>
              <div className="progress-track">
                <i
                  style={{ width: `${(j.done / Math.max(j.total, 1)) * 100}%` }}
                />
              </div>
            </div>
            {j.status === "Selesai" && (
              <a
                href={j.url}
                download="Rapor-KabarKelas.zip"
                className="btn secondary"
              >
                <Download size={15} />
                Unduh ZIP
              </a>
            )}
            {j.status === "Gagal" && (
              <Button
                variant="secondary"
                onClick={async () => {
                  await startJob();
                }}
              >
                Coba lagi
              </Button>
            )}
          </div>
        ))}
      <Panel
        title="Daftar rapor siswa"
        subtitle="PDF dan ZIP dibuat di perangkatmu. Proses tetap berjalan saat berpindah menu; jangan tutup tab sebelum selesai."
      >
        <div className="table-toolbar">
          <SearchBox
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder="Cari rapor siswa…"
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
              value={status}
              aria-label="Status rapor"
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Semua status</option>
              {["Draf", "Review", "Terbit"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {canPublish && (
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Pilih semua rapor"
                      checked={
                        rows.length > 0 && rows.every((r) => selected.has(r.id))
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? new Set(
                                rows
                                  .filter((r) =>
                                    canReviewReport(user, r.classId),
                                  )
                                  .map((r) => r.id),
                              )
                            : new Set(),
                        )
                      }
                    />
                  </th>
                )}
                <th>Siswa</th>
                <th>Kelas</th>
                <th>Kelengkapan nilai</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice((page - 1) * 12, page * 12).map((r) => {
                const s = data.students.find((s) => s.id === r.studentId)!;
                const n = data.grades.filter(
                  (g) => g.studentId === s.id,
                ).length;
                return (
                  <tr key={r.id}>
                    {canPublish && (
                      <td>
                        <input
                          type="checkbox"
                          disabled={!canReviewReport(user, r.classId)}
                          aria-label={`Pilih rapor ${s.name}`}
                          checked={selected.has(r.id)}
                          onChange={(e) =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              e.target.checked
                                ? next.add(r.id)
                                : next.delete(r.id);
                              return next;
                            })
                          }
                        />
                      </td>
                    )}
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
                      <span
                        className={
                          n === data.subjects.length ? "text-teal" : "text-red"
                        }
                      >
                        <CheckCircle2 size={13} /> {n}/{data.subjects.length}{" "}
                        mapel
                      </span>
                    </td>
                    <td>
                      <Badge tone={tone(r.status)}>{r.status}</Badge>
                    </td>
                    <td>
                      <Button variant="ghost" onClick={() => setPreview(r)}>
                        Tinjau rapor <ArrowRight size={14} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty title="Tidak ada rapor pada filter ini" />}
        <Pagination page={page} total={rows.length} onChange={setPage} />
      </Panel>
      {preview && (
        <Modal
          title="Pratinjau rapor"
          subtitle="Tinjau nilai, deskripsi, dan catatan sebelum diterbitkan."
          onClose={() => setPreview(undefined)}
          wide
        >
          <div className="report-sheet">
            <div className="report-letterhead">
              <GraduationCap size={34} />
              <div>
                <h2>{school.name}</h2>
                <p>RAPOR HASIL BELAJAR · {data.settings[0]?.curriculum}</p>
                <small>Semester Ganjil · Tahun Ajaran 2026/2027</small>
              </div>
            </div>
            <div className="report-identity">
              <strong>
                {data.students.find((s) => s.id === preview.studentId)?.name}
              </strong>
              <span>
                NISN{" "}
                {data.students.find((s) => s.id === preview.studentId)?.nisn} ·{" "}
                {data.classes.find((c) => c.id === preview.classId)?.name}
              </span>
              <Badge tone={tone(preview.status)}>{preview.status}</Badge>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Mata pelajaran</th>
                  <th>Nilai</th>
                  <th>Deskripsi capaian</th>
                </tr>
              </thead>
              <tbody>
                {data.grades
                  .filter((g) => g.studentId === preview.studentId)
                  .map((g) => (
                    <tr key={g.id}>
                      <td>{g.subject}</td>
                      <td>
                        <strong
                          className={
                            g.score < (data.settings[0]?.kkm || 75)
                              ? "text-red"
                              : "text-teal"
                          }
                        >
                          {gradeDisplay(g.score, data.settings[0])}
                        </strong>
                      </td>
                      <td className="description-cell">{g.description}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <label className="report-note">
              Catatan wali kelas
              {canPublish ? (
                <textarea
                  rows={3}
                  value={preview.note}
                  onChange={(e) =>
                    setPreview({ ...preview, note: e.target.value })
                  }
                />
              ) : (
                <p>{preview.note}</p>
              )}
            </label>
            {canPublish && (
              <Button
                variant="ghost"
                onClick={() => {
                  const s = data.students.find(
                    (s) => s.id === preview.studentId,
                  )!;
                  const low = data.grades
                    .filter(
                      (g) =>
                        g.studentId === s.id &&
                        g.score < (data.settings[0]?.kkm || 75),
                    )
                    .map((g) => g.subject);
                  setPreview({
                    ...preview,
                    note: `${s.name.split(" ")[0]} ${low.length ? "perlu penguatan pada " + low.join(", ") : "menunjukkan penguasaan materi yang baik"}. Kehadiran tercatat ${s.attendance}%. ${low.length ? "Disarankan mengikuti pendampingan rutin dan latihan bertahap selama dua minggu." : "Pertahankan kedisiplinan, keaktifan berdiskusi, dan rasa ingin tahu."}`,
                  });
                  toast(
                    "Catatan diisi dari aturan nilai dan kehadiran. Tinjau sebelum menyimpan.",
                  );
                }}
              >
                <Sparkles size={15} />
                Isi catatan dari nilai
              </Button>
            )}
          </div>
          <footer className="report-actions">
            <Button
              variant="secondary"
              onClick={() =>
                reportPDF(
                  data.students.find((s) => s.id === preview.studentId)!,
                  {
                    ...data,
                    reports: data.reports.map((r) =>
                      r.id === preview.id ? preview : r,
                    ),
                  },
                  school,
                )
              }
            >
              <Download size={16} />
              Unduh PDF
            </Button>
            {canPublish && (
              <>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const r = await save("reports", {
                      ...preview,
                      status: "Review",
                    });
                    setPreview(r);
                  }}
                >
                  {isPro(data.settings[0]) &&
                  data.settings[0]?.approvalMode === "two-step" &&
                  user.role === "teacher"
                    ? "Validasi wali kelas"
                    : "Simpan & ajukan review"}
                </Button>
                {canFinalize && (
                  <Button
                    disabled={
                      !!(
                        isPro(data.settings[0]) &&
                        data.settings[0]?.approvalMode === "two-step" &&
                        preview.status !== "Terbit" &&
                        !preview.homeroomReviewed
                      )
                    }
                    onClick={async () => {
                      const r = await save("reports", {
                        ...preview,
                        status: "Terbit",
                        date: new Date().toISOString(),
                      });
                      setPreview(r);
                    }}
                  >
                    <CheckCircle2 size={16} />
                    Setujui & terbitkan
                  </Button>
                )}
              </>
            )}
          </footer>
        </Modal>
      )}
      {readiness && (
        <Modal
          title="Pemeriksaan kelengkapan rapor"
          onClose={() => setReadiness(false)}
          wide
        >
          {missing.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th>Mapel belum diisi</th>
                    <th>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {missing.map(({ student, subject }) => (
                    <tr key={student.id + subject.id}>
                      <td>{student.name}</td>
                      <td>{subject.name}</td>
                      <td>
                        {user.role === "teacher" &&
                        user.subjectIds.includes(subject.id) ? (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              go("grades", student.classId + "~" + subject.id)
                            }
                          >
                            Lengkapi nilai
                          </Button>
                        ) : (
                          <span>
                            Perlu diisi guru pengampu{" "}
                            {subject.teacher || subject.name}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Nilai seluruh siswa sudah lengkap"
              description="Lanjutkan review dan persetujuan sesuai alur sekolah."
            />
          )}
        </Modal>
      )}
    </>
  );
}
export function Schedule() {
  const { data, user, save, remove, go } = useApp();
  const [cls, setCls] = useState(data.classes[0]?.id || ""),
    [day, setDay] = useState("Senin"),
    [form, setForm] = useState<Partial<Row> | null>(null),
    [deleting, setDeleting] = useState<Row | null>(null);
  const admin = user.role === "admin";
  const rows = data.schedule
    .filter((s) => s.classId === cls && s.day === day)
    .sort((a, b) => a.time.localeCompare(b.time));
  return (
    <>
      <PageHead
        eyebrow="RITME BELAJAR YANG TERARAH"
        title="Jadwal pelajaran"
        description="Jadwal kelas, ruang, dan guru pengampu dalam satu tampilan."
        action={
          <>
            <ClassSelect all={false} value={cls} onChange={setCls} />
            {admin && (
              <Button
                onClick={() =>
                  setForm({
                    classId: cls,
                    day,
                    time: "07:00 – 08:30",
                    room: "Ruang 101",
                  })
                }
              >
                <Plus size={16} />
                Tambah jadwal
              </Button>
            )}
          </>
        }
      />
      <div className="tabs">
        <button className="active">Jadwal pelajaran</button>
        {canAccessPage(user, "materials") && (
          <button onClick={() => go("materials")}>Materi belajar</button>
        )}
      </div>
      <div className="week-tabs">
        {["Senin", "Selasa", "Rabu", "Kamis", "Jumat"].map((d) => (
          <button
            key={d}
            className={day === d ? "active" : ""}
            onClick={() => setDay(d)}
          >
            <strong>{d}</strong>
          </button>
        ))}
      </div>
      <Panel
        title={`${day} · ${data.classes.find((c) => c.id === cls)?.name}`}
        subtitle="Kegiatan belajar mengajar"
      >
        {rows.map((s) => (
          <div className="schedule-row" key={s.id}>
            <div>
              <strong>{s.time.split(" – ")[0]}</strong>
              <small>{s.time.split(" – ")[1]}</small>
            </div>
            <span className="schedule-line" />
            <span className="assignment-icon color-0">
              <BookOpen size={22} />
            </span>
            <div>
              <h3>{s.subject}</h3>
              <p>
                {s.teacher} · {s.room}
              </p>
            </div>
            {admin ? (
              <div className="operation-actions">
                <Button variant="ghost" onClick={() => setForm(s)}>
                  Ubah
                </Button>
                <Button variant="ghost" onClick={() => setDeleting(s)}>
                  Hapus
                </Button>
              </div>
            ) : (
              <Badge tone="blue">Terjadwal</Badge>
            )}
          </div>
        ))}
        {!rows.length && <Empty title="Tidak ada jadwal pada hari ini" />}
      </Panel>
      {form && (
        <FormModal
          title={form.id ? "Ubah jadwal" : "Tambah jadwal"}
          initial={form}
          fields={[
            {
              key: "classId",
              label: "Kelas",
              options: data.classes.map((c) => ({
                value: c.id,
                label: c.name,
              })),
              required: true,
            },
            {
              key: "day",
              label: "Hari",
              options: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"].map(
                (value) => ({ value, label: value }),
              ),
              required: true,
            },
            {
              key: "time",
              label: "Jam (contoh 07:00 – 08:30)",
              required: true,
            },
            {
              key: "subject",
              label: "Mata pelajaran",
              options: data.subjects.map((s) => ({
                value: s.name,
                label: s.name,
              })),
              required: true,
            },
            {
              key: "teacher",
              label: "Guru pengampu",
              options: data.teachers.map((t) => ({
                value: t.name,
                label: t.name,
              })),
              required: true,
            },
            { key: "room", label: "Ruang", required: true },
          ]}
          onClose={() => setForm(null)}
          onSave={(v) => save("schedule", v)}
        />
      )}
      {deleting && (
        <Modal
          title="Hapus jadwal?"
          subtitle={`${deleting.subject} · ${deleting.day} · ${deleting.time}`}
          onClose={() => setDeleting(null)}
        >
          <footer>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await remove("schedule", deleting.id);
                setDeleting(null);
              }}
            >
              Hapus jadwal
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}

export function Materials() {
  const { data, user, go, save } = useApp();
  const [cls, setCls] = useState("all"),
    [detail, setDetail] = useState<Row | undefined>(),
    [add, setAdd] = useState(false);
  return (
    <>
      <PageHead
        eyebrow="RUANG UNTUK TERUS BERTUMBUH"
        title="Materi belajar"
        description="Modul dan sumber belajar yang mendukung pemahaman siswa."
        action={
          canEdit(user.role) ? (
            <Button onClick={() => setAdd(true)}>
              <Plus size={16} />
              Tambah materi
            </Button>
          ) : undefined
        }
      />
      <div className="section-toolbar">
        <div className="tabs compact-tabs">
          <button onClick={() => go("schedule")}>Jadwal pelajaran</button>
          <button className="active">Materi belajar</button>
        </div>
        <ClassSelect value={cls} onChange={setCls} />
      </div>
      <div className="card-grid">
        {data.materials
          .filter((m) => cls === "all" || m.classId === cls)
          .map((m) => (
            <Panel key={m.id}>
              <div className="material-cover">
                <BookOpen size={42} />
                <span>RUANG BELAJAR</span>
                <strong>{m.subject}</strong>
                <i />
              </div>
              <Badge tone="blue">
                {data.classes.find((c) => c.id === m.classId)?.name}
              </Badge>
              <h3 className="card-title">{m.title}</h3>
              <p className="card-copy">
                Pelajari konsep inti, pahami contoh, lalu asah pemahaman melalui
                latihan mandiri.
              </p>
              <Button
                variant="secondary"
                className="full-width"
                onClick={() => setDetail(m)}
              >
                Buka modul <ArrowRight size={16} />
              </Button>
            </Panel>
          ))}
      </div>
      {detail && (
        <Modal
          title={detail.title}
          subtitle={detail.subject}
          onClose={() => setDetail(undefined)}
        >
          <div className="reading-content">
            <BookOpen size={38} />
            <p>{detail.description}</p>
            {canAccessPage(user, "quizzes") && (
              <Button onClick={() => go("quizzes")}>
                Lanjut ke kuis <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </Modal>
      )}
      {add && (
        <FormModal
          title="Tambah materi"
          fields={[
            { key: "title", label: "Judul materi", required: true },
            {
              key: "subject",
              label: "Mata pelajaran",
              required: true,
              options: data.subjects
                .filter(
                  (s) =>
                    user.role !== "teacher" || user.subjectIds.includes(s.id),
                )
                .map((s) => ({
                  value: s.name,
                  label: s.name,
                })),
            },
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
              key: "description",
              label: "Isi modul / tautan sumber",
              required: true,
              type: "textarea",
            },
          ]}
          onClose={() => setAdd(false)}
          onSave={(v) => save("materials", { ...v, type: "Modul" })}
        />
      )}
    </>
  );
}
