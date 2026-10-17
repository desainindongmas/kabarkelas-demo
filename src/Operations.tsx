import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  GraduationCap,
  Plus,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import qrcode from "qrcode-generator";
import { useApp, type Row, date, number, canReviewReport } from "./model";
import {
  Badge,
  Button,
  Empty,
  FormModal,
  Metric,
  Modal,
  PageHead,
  Panel,
  SearchBox,
  tone,
  type Field,
} from "./ui";
import { api } from "./App";
import { exportExcel, tablePDF } from "./export";
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
const options = (values: string[]) =>
  values.map((value) => ({ value, label: value }));
function StudentPicker({
  value,
  onChange,
  students,
}: {
  value: string;
  onChange: (v: string) => void;
  students: Row[];
}) {
  return (
    <select
      aria-label="Pilih siswa"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {students.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

export function StaffAttendance({ self = false }: { self?: boolean }) {
  const { data, user, save, toast } = useApp();
  const [day, setDay] = useState(today()),
    [form, setForm] = useState<Partial<Row> | null>(null),
    [leave, setLeave] = useState(false),
    [busy, setBusy] = useState(false);
  const teachers = self
    ? data.teachers.filter((t) => t.id === user.teacherId)
    : data.teachers;
  const rows = teachers.map((t): Row => ({
    ...t,
    record: data.staffAttendance.find(
      (a) => a.teacherId === t.id && a.date === day,
    ),
  }));
  const punch = async (out = false) => {
    setBusy(true);
    try {
      const old = data.staffAttendance.find(
        (a) => a.teacherId === user.teacherId && a.date === today(),
      );
      if (out && !old?.checkIn) {
        toast("Catat masuk terlebih dahulu.", true);
        return;
      }
      await save("staffAttendance", {
        ...old,
        teacherId: user.teacherId,
        date: today(),
        status: "Hadir",
        source: "Mandiri",
        [out ? "checkOut" : "checkIn"]: new Date().toLocaleTimeString("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead
        eyebrow="OPERASIONAL SEKOLAH"
        title={self ? "Presensi & izin saya" : "Absensi guru"}
        description="Catat kehadiran dan waktu masuk serta pulang. Izin diputuskan oleh kepala sekolah."
        action={
          self ? (
            <Button onClick={() => setLeave(true)}>
              <Plus size={16} />
              Ajukan izin
            </Button>
          ) : undefined
        }
      />
      {self && (
        <Panel title="Presensi hari ini" subtitle={date(today())}>
          <div className="operation-actions">
            <Button
              disabled={
                busy ||
                !!data.staffAttendance.find(
                  (a) => a.teacherId === user.teacherId && a.date === today(),
                )?.checkIn
              }
              onClick={() => punch()}
            >
              Catat masuk
            </Button>
            <Button
              variant="secondary"
              disabled={
                busy ||
                !!data.staffAttendance.find(
                  (a) => a.teacherId === user.teacherId && a.date === today(),
                )?.checkOut
              }
              onClick={() => punch(true)}
            >
              Catat pulang
            </Button>
          </div>
          <p className="card-copy">
            Waktu menggunakan zona WIB. Riwayat tersedia di bawah.
          </p>
        </Panel>
      )}
      <Panel
        title={self ? "Riwayat presensi" : "Presensi guru per hari"}
        action={
          <input
            aria-label="Tanggal presensi"
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Guru</th>
                <th>Status</th>
                <th>Masuk</th>
                <th>Pulang</th>
                {!self && <th>Tindakan</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.name}</strong>
                    <small className="block">{t.subject}</small>
                  </td>
                  <td>
                    <Badge tone={tone(t.record?.status || "Belum dicatat")}>
                      {t.record?.status || "Belum dicatat"}
                    </Badge>
                  </td>
                  <td>{t.record?.checkIn || "—"}</td>
                  <td>{t.record?.checkOut || "—"}</td>
                  {!self && (
                    <td>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setForm({
                            ...t.record,
                            teacherId: t.id,
                            date: day,
                            status: t.record?.status || "Hadir",
                            source: "Admin",
                          })
                        }
                      >
                        Catat / ubah
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {self && (
        <Panel title="Pengajuan izin saya">
          <LeaveTable rows={data.leaveRequests} />
        </Panel>
      )}
      {form && (
        <FormModal
          title="Perbarui absensi guru"
          initial={form}
          fields={[
            { key: "date", label: "Tanggal", type: "date", required: true },
            {
              key: "status",
              label: "Status",
              options: options(["Hadir", "Sakit", "Izin", "Alpa"]),
              required: true,
            },
            { key: "checkIn", label: "Jam masuk", type: "time" },
            { key: "checkOut", label: "Jam pulang", type: "time" },
          ]}
          onClose={() => setForm(null)}
          onSave={(v) => save("staffAttendance", v)}
        />
      )}
      {leave && (
        <FormModal
          title="Ajukan izin"
          initial={{ type: "Izin keluarga", from: today(), to: today() }}
          fields={[
            {
              key: "type",
              label: "Jenis izin",
              options: options(["Izin keluarga", "Sakit", "Dinas luar"]),
              required: true,
            },
            { key: "from", label: "Mulai", type: "date", required: true },
            { key: "to", label: "Selesai", type: "date", required: true },
            {
              key: "reason",
              label: "Alasan",
              type: "textarea",
              required: true,
            },
          ]}
          onClose={() => setLeave(false)}
          onSave={(v) => save("leaveRequests", v)}
        />
      )}
    </>
  );
}
function LeaveTable({
  rows,
  onDecide,
}: {
  rows: Row[];
  onDecide?: (r: Row) => void;
}) {
  const { data } = useApp();
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Guru / keperluan</th>
            <th>Periode</th>
            <th>Status</th>
            <th>Catatan keputusan</th>
            {onDecide && <th>Tindakan</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>
                  {data.teachers.find((t) => t.id === r.teacherId)?.name ||
                    "Saya"}
                </strong>
                <small className="block">
                  {r.type} · {r.reason}
                </small>
              </td>
              <td>
                {date(r.from, true)} – {date(r.to, true)}
              </td>
              <td>
                <Badge
                  tone={
                    r.status === "Menunggu"
                      ? "amber"
                      : r.status === "Ditolak"
                        ? "red"
                        : "green"
                  }
                >
                  {r.status}
                </Badge>
              </td>
              <td>{r.decisionNote || "Menunggu keputusan kepala sekolah"}</td>
              {onDecide && (
                <td>
                  {r.status === "Menunggu" && (
                    <Button variant="secondary" onClick={() => onDecide(r)}>
                      Tinjau izin
                    </Button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <Empty title="Belum ada pengajuan izin" />}
    </div>
  );
}
export function StaffLeave() {
  const { data, save } = useApp();
  const [form, setForm] = useState<Row | null>(null);
  return (
    <>
      <PageHead
        title="Persetujuan izin guru"
        description="Tinjau keperluan dan jadwal guru sebelum memutuskan pengajuan."
      />
      <Panel
        title={`${data.leaveRequests.filter((r) => r.status === "Menunggu").length} pengajuan menunggu`}
      >
        <LeaveTable rows={data.leaveRequests} onDecide={setForm} />
      </Panel>
      {form && (
        <FormModal
          title="Keputusan izin"
          initial={{ ...form, status: "Disetujui" }}
          fields={[
            {
              key: "status",
              label: "Keputusan",
              options: options(["Disetujui", "Ditolak"]),
              required: true,
            },
            {
              key: "decisionNote",
              label: "Catatan keputusan",
              type: "textarea",
              required: true,
            },
          ]}
          onClose={() => setForm(null)}
          onSave={(v) => save("leaveRequests", v)}
        />
      )}
    </>
  );
}
export function StaffRecap() {
  const { data, user } = useApp();
  const [kind, setKind] = useState("staff"),
    [month, setMonth] = useState("2026-10");
  const source = kind === "staff" ? data.staffAttendance : data.attendance,
    people = kind === "staff" ? data.teachers : data.students;
  const rows = people.map((p) => {
    const records = source.filter(
      (a) => (a.teacherId || a.studentId) === p.id && a.date?.startsWith(month),
    );
    return {
      Nama: p.name,
      ...Object.fromEntries(
        ["Hadir", "Sakit", "Izin", "Alpa"].map((status) => [
          status,
          records.filter((r) => r.status === status).length,
        ]),
      ),
      Persentase: records.length
        ? `${Math.round((records.filter((r) => r.status === "Hadir").length / records.length) * 100)}%`
        : "—",
    };
  });
  return (
    <>
      <PageHead
        title="Rekap kehadiran"
        description="Rekap berdasarkan catatan presensi pada periode yang dipilih."
        action={
          <>
            <Button
              variant="secondary"
              onClick={() => tablePDF(rows, `Rekap kehadiran ${month}`)}
            >
              Unduh PDF
            </Button>
            <Button onClick={() => exportExcel(rows, `Rekap-${kind}-${month}`)}>
              Ekspor Excel
            </Button>
          </>
        }
      />
      <Panel
        title="Rekap bulanan"
        action={
          <div className="operation-actions">
            {user.role === "principal" && (
              <select
                aria-label="Jenis rekap"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="staff">Guru</option>
                <option value="student">Siswa</option>
              </select>
            )}
            <input
              aria-label="Bulan rekap"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {Object.keys(rows[0] || { Nama: "" }).map((k) => (
                  <th key={k}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {Object.values(r).map((v, j) => (
                    <td key={j}>{String(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
export function Uniforms() {
  const { data, user, save, remove } = useApp();
  const [form, setForm] = useState<Partial<Row> | null>(null),
    [special, setSpecial] = useState(false);
  const admin = user.role === "admin";
  const days = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
  return (
    <>
      <PageHead
        title="Jadwal seragam"
        description="Persiapkan seragam harian dan lihat perubahan untuk kegiatan khusus."
        action={
          admin ? (
            <Button
              onClick={() => {
                setForm({ date: today() });
                setSpecial(true);
              }}
            >
              <Plus size={16} />
              Jadwal khusus
            </Button>
          ) : undefined
        }
      />
      <div className="uniform-grid">
        {[...data.uniforms]
          .sort((a, b) => a.weekday - b.weekday)
          .map((r) => (
            <Panel key={r.id}>
              <div className="eyebrow">{days[r.weekday]}</div>
              <h3>{r.name}</h3>
              <p className="card-copy">{r.note}</p>
              {admin && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setForm(r);
                    setSpecial(false);
                  }}
                >
                  Ubah seragam
                </Button>
              )}
            </Panel>
          ))}
      </div>
      <Panel title="Perubahan jadwal khusus">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Seragam</th>
                <th>Keterangan</th>
                {admin && <th>Tindakan</th>}
              </tr>
            </thead>
            <tbody>
              {data.uniformOverrides.map((r) => (
                <tr key={r.id}>
                  <td>{date(r.date)}</td>
                  <td>{r.name}</td>
                  <td>{r.note}</td>
                  {admin && (
                    <td>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setForm(r);
                          setSpecial(true);
                        }}
                      >
                        Ubah
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => remove("uniformOverrides", r.id)}
                      >
                        Hapus
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.uniformOverrides.length && <Empty />}
      </Panel>
      {form && (
        <FormModal
          title={special ? "Jadwal seragam khusus" : "Seragam mingguan"}
          initial={form}
          fields={[
            ...(special
              ? [
                  {
                    key: "date",
                    label: "Tanggal",
                    type: "date",
                    required: true,
                  },
                ]
              : []),
            { key: "name", label: "Seragam", required: true },
            { key: "note", label: "Keterangan", type: "textarea" },
          ]}
          onClose={() => setForm(null)}
          onSave={(v) => save(special ? "uniformOverrides" : "uniforms", v)}
        />
      )}
    </>
  );
}
export function Character() {
  const { data, user, save } = useApp();
  const students =
    user.role === "teacher"
      ? data.students.filter((s) => s.classId === user.homeroomClassId)
      : data.students;
  const [id, setId] = useState(students[0]?.id || ""),
    [form, setForm] = useState<Row | null>(null);
  const dimensions = [
    "Beriman dan berakhlak mulia",
    "Berkebinekaan global",
    "Bergotong royong",
    "Mandiri",
    "Bernalar kritis",
    "Kreatif",
  ];
  const rows: Row[] = dimensions.map(
    (dimension) =>
      data.character.find(
        (r) => r.studentId === id && r.dimension === dimension,
      ) || {
        id: "",
        studentId: id,
        dimension,
        score: 1,
        project: "",
        note: "",
      },
  );
  return (
    <>
      <PageHead
        title="Karakter & P5"
        description="Capaian enam dimensi Profil Pelajar Pancasila dan catatan perkembangan."
        action={
          <StudentPicker students={students} value={id} onChange={setId} />
        }
      />
      <div className="callout blue">
        <GraduationCap size={22} />
        <p>
          Skala 1: mulai berkembang · 2: sedang berkembang · 3: sesuai harapan ·
          4: sangat berkembang.
        </p>
      </div>
      <div className="card-grid">
        {rows.map((r) => (
          <Panel key={r.id}>
            <Badge tone={r.score >= 3 ? "green" : "amber"}>
              Capaian {r.score} / 4
            </Badge>
            <h3 className="card-title">{r.dimension}</h3>
            <p className="card-copy">{r.project}</p>
            <div className="progress-track">
              <i style={{ width: r.score * 25 + "%" }} />
            </div>
            <p>{r.note}</p>
            {user.role === "teacher" && (
              <Button variant="secondary" onClick={() => setForm(r)}>
                Perbarui capaian
              </Button>
            )}
          </Panel>
        ))}
      </div>
      {!rows.length && <Empty title="Belum ada penilaian P5" />}
      {form && (
        <FormModal
          title={form.dimension}
          initial={form}
          fields={[
            {
              key: "score",
              label: "Capaian (1–4)",
              type: "number",
              min: 1,
              max: 4,
              required: true,
            },
            { key: "project", label: "Projek", required: true },
            {
              key: "note",
              label: "Catatan perkembangan",
              type: "textarea",
              required: true,
            },
          ]}
          onClose={() => setForm(null)}
          onSave={(v) => save("character", v)}
        />
      )}
    </>
  );
}
export function Tahfizh() {
  const { data, user, save } = useApp();
  const students =
    user.role === "teacher"
      ? data.students.filter((s) => s.classId === user.homeroomClassId)
      : data.students;
  const [id, setId] = useState(students[0]?.id || ""),
    [form, setForm] = useState<Partial<Row> | null>(null);
  const row = data.tahfizh.find((r) => r.studentId === id);
  return (
    <>
      <PageHead
        title="Tahfizh & akhlak"
        description="Catatan hafalan, murajaah, dan kebiasaan baik siswa."
        action={
          <StudentPicker students={students} value={id} onChange={setId} />
        }
      />
      <Panel
        title={row ? `Surah ${row.surah}` : "Catatan hafalan"}
        action={
          user.role === "teacher" ? (
            <Button
              onClick={() => setForm(row || { studentId: id, date: today() })}
            >
              Perbarui catatan
            </Button>
          ) : undefined
        }
      >
        {row ? (
          <div className="operation-detail">
            <Badge tone="blue">Ayat {row.verses}</Badge>
            <h3>{row.fluency}</h3>
            <h4>Murajaah</h4>
            <p>{row.murajaah}</p>
            <h4>Akhlak & adab</h4>
            <p>{row.character}</p>
            <h4>Catatan pembimbing</h4>
            <p>{row.note}</p>
            <small>Diperbarui {date(row.date)}</small>
          </div>
        ) : (
          <Empty />
        )}
      </Panel>
      {form && (
        <FormModal
          title="Catatan tahfizh & akhlak"
          initial={form}
          fields={[
            { key: "surah", label: "Surah", required: true },
            { key: "verses", label: "Ayat", required: true },
            {
              key: "fluency",
              label: "Kelancaran",
              options: options(["Perlu latihan", "Baik", "Sangat baik"]),
              required: true,
            },
            { key: "murajaah", label: "Rencana murajaah", type: "textarea" },
            {
              key: "character",
              label: "Akhlak & adab",
              type: "textarea",
              required: true,
            },
            { key: "note", label: "Catatan pembimbing", type: "textarea" },
            { key: "date", label: "Tanggal", type: "date", required: true },
          ]}
          onClose={() => setForm(null)}
          onSave={(v) => save("tahfizh", v)}
        />
      )}
    </>
  );
}
export function BelowKkm() {
  const { data, go } = useApp();
  const [query, setQuery] = useState("");
  const kkm = data.settings[0]?.kkm || 75;
  const rows = data.grades
    .filter((g) => g.score < kkm)
    .map((g): Row => ({
      ...g,
      student: data.students.find((s) => s.id === g.studentId),
    }))
    .filter((g) => g.student?.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <PageHead
        title="Nilai di bawah KKM"
        description={`Daftar capaian di bawah KKM ${kkm} untuk merencanakan penguatan belajar.`}
        action={
          <Button
            variant="secondary"
            onClick={() =>
              exportExcel(
                rows.map((r) => ({
                  Nama: r.student?.name,
                  Mapel: r.subject,
                  Nilai: r.score,
                  KKM: kkm,
                })),
                "Nilai-di-bawah-KKM",
              )
            }
          >
            Ekspor Excel
          </Button>
        }
      />
      <Panel
        title={`${rows.length} capaian perlu pendampingan`}
        action={
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Cari siswa…"
          />
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Mapel</th>
                <th>Nilai</th>
                <th>KKM</th>
                <th>Tindak lanjut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.student?.name}</td>
                  <td>{r.subject}</td>
                  <td>
                    <Badge tone="red">{r.score}</Badge>
                  </td>
                  <td>{kkm}</td>
                  <td>
                    <Button
                      variant="ghost"
                      onClick={() => go("students", r.studentId)}
                    >
                      Lihat profil siswa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty title="Tidak ada nilai di bawah KKM pada filter ini" />
        )}
      </Panel>
    </>
  );
}
function QRCard({ person }: { person: Row }) {
  const qr = qrcode(0, "M");
  qr.addData(person.qr);
  qr.make();
  const svg = qr.createSvgTag({ cellSize: 3, margin: 4, scalable: true });
  const download = () => {
    const a = document.createElement("a");
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    a.href = url;
    a.download = `Kartu-jemput-${person.name}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="qr-card">
      <div
        role="img"
        aria-label={`Kode QR penjemput ${person.name}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <strong>{person.name}</strong>
      <p>
        {person.relationship} ·{" "}
        {person.validOn ? date(person.validOn) : "Penjemput terdaftar"}
      </p>
      <Button variant="secondary" onClick={download}>
        <Download size={16} />
        Unduh kartu QR
      </Button>
      <details>
        <summary>Kode untuk verifikasi manual</summary>
        <textarea aria-label="Kode kartu QR" readOnly value={person.qr} />
      </details>
    </div>
  );
}
export function Pickup() {
  const { data, user, save, toast } = useApp();
  const [studentId, setStudent] = useState(data.students[0]?.id || ""),
    [form, setForm] = useState<Partial<Row> | null>(null),
    [record, setRecord] = useState(false),
    [card, setCard] = useState<Row | null>(null),
    [code, setCode] = useState(""),
    [verified, setVerified] = useState<Row | null>(null),
    [busy, setBusy] = useState(false);
  const admin = user.role === "admin",
    parent = user.role === "parent",
    people = data.pickupPersons.filter((p) => p.studentId === studentId),
    logs = data.pickupLogs
      .filter((r) => r.studentId === studentId)
      .slice()
      .reverse();
  const verify = async () => {
    setBusy(true);
    try {
      const result = await api("/api/pickup/verify", { qr: code });
      setVerified(result);
      setStudent(result.student.id);
      toast(
        "Kartu terverifikasi. Cocokkan identitas penjemput sebelum mencatat.",
      );
    } catch (e) {
      setVerified(null);
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead
        title="Antar & jemput siswa"
        description="Penjemput terdaftar, kartu verifikasi QR, dan riwayat kedatangan serta kepulangan."
        action={
          <StudentPicker
            students={data.students}
            value={studentId}
            onChange={(v) => {
              setStudent(v);
              setVerified(null);
            }}
          />
        }
      />
      {(admin || user.role === "principal") && (
        <Panel
          title="Verifikasi kartu QR"
          subtitle="Pindai dengan pembaca QR perangkat, lalu tempel kode kartu. Selalu cocokkan dengan identitas penjemput."
        >
          <div className="operation-actions">
            <input
              aria-label="Kode QR penjemput"
              placeholder="Tempel kode KK2.…"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setVerified(null);
              }}
            />
            <Button disabled={busy || !code} onClick={verify}>
              Verifikasi QR
            </Button>
          </div>
          {verified && (
            <div className="callout green">
              <ShieldCheck size={22} />
              <p>
                <strong>{verified.person.name}</strong> ·{" "}
                {verified.person.relationship}
                <br />
                {verified.student.name} ·{" "}
                {verified.temporary
                  ? "Pengganti hari ini"
                  : "Penjemput terdaftar"}
              </p>
              {admin && (
                <Button onClick={() => setRecord(true)}>
                  Catat antar / jemput
                </Button>
              )}
            </div>
          )}
        </Panel>
      )}
      <Panel
        title="Penjemput yang diizinkan"
        action={
          admin || parent ? (
            <Button onClick={() => setForm({ studentId, status: "Aktif" })}>
              <Plus size={16} />
              Tambah penjemput
            </Button>
          ) : undefined
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Penjemput</th>
                <th>Hubungan</th>
                <th>Berlaku</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <small className="block">{p.phone}</small>
                  </td>
                  <td>{p.relationship}</td>
                  <td>{p.validOn ? date(p.validOn) : "Tetap"}</td>
                  <td>
                    <Badge tone={p.status === "Aktif" ? "green" : "neutral"}>
                      {p.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="operation-actions">
                      {p.status === "Aktif" && (
                        <Button variant="ghost" onClick={() => setCard(p)}>
                          Kartu QR
                        </Button>
                      )}
                      {(admin || parent) && (
                        <Button variant="ghost" onClick={() => setForm(p)}>
                          Ubah
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!people.length && <Empty />}
      </Panel>
      <Panel
        title="Riwayat antar & jemput"
        action={
          admin ? (
            <Button
              onClick={() => {
                setVerified(null);
                setRecord(true);
              }}
            >
              Catat manual
            </Button>
          ) : undefined
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Waktu (WIB)</th>
                <th>Kegiatan</th>
                <th>Penjemput</th>
                <th>Verifikasi</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((r) => (
                <tr key={r.id}>
                  <td>
                    {date(r.date, true)} · {r.time}
                  </td>
                  <td>{r.action}</td>
                  <td>{r.personName}</td>
                  <td>
                    <Badge tone={r.verified ? "green" : "amber"}>
                      {r.verified ? "Terdaftar" : "Perlu konfirmasi"} ·{" "}
                      {r.source}
                    </Badge>
                  </td>
                  <td>{r.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!logs.length && <Empty title="Belum ada riwayat untuk siswa ini" />}
      </Panel>
      {form && (
        <FormModal
          title="Data penjemput"
          initial={form}
          fields={[
            { key: "name", label: "Nama lengkap", required: true },
            {
              key: "relationship",
              label: "Hubungan",
              options: options([
                "Ayah",
                "Ibu",
                "Saudara",
                "Pengasuh",
                "Lainnya",
              ]),
              required: true,
            },
            { key: "phone", label: "Telepon", type: "tel", required: true },
            {
              key: "validOn",
              label: "Berlaku khusus tanggal (kosongkan untuk tetap)",
              type: "date",
            },
            {
              key: "status",
              label: "Status",
              options: options(["Aktif", "Nonaktif"]),
              required: true,
            },
          ]}
          onClose={() => setForm(null)}
          onSave={(v) => save("pickupPersons", v)}
        />
      )}
      {record && (
        <FormModal
          title="Catat antar / jemput"
          initial={{
            studentId,
            action: "Jemput",
            personId:
              verified?.person.id ||
              people.find((p) => p.status === "Aktif")?.id,
            qr: verified ? code : undefined,
          }}
          fields={[
            {
              key: "action",
              label: "Kegiatan",
              options: options(["Antar", "Jemput"]),
              required: true,
            },
            ...(!verified
              ? [
                  {
                    key: "personId",
                    label: "Penjemput terdaftar",
                    options: people
                      .filter((p) => p.status === "Aktif")
                      .map((p) => ({ value: p.id, label: p.name })),
                  },
                  { key: "personName", label: "Nama jika tidak terdaftar" },
                ]
              : []),
            {
              key: "note",
              label: "Catatan (wajib jika tidak terdaftar)",
              type: "textarea",
            },
          ]}
          onClose={() => setRecord(false)}
          onSave={(v) => save("pickupLogs", v)}
        />
      )}
      {card && (
        <Modal
          title="Kartu penjemput"
          subtitle={`Untuk ${data.students.find((s) => s.id === card.studentId)?.name}. Simpan kartu secara pribadi.`}
          onClose={() => setCard(null)}
        >
          <QRCard person={card} />
        </Modal>
      )}
    </>
  );
}
export function Trust() {
  const { overview } = useApp();
  return (
    <>
      <PageHead
        title="Tata kelola yayasan"
        description="Ringkasan akses dan batas data antar unit pendidikan."
      />
      <Panel title="Akses sesuai tanggung jawab">
        <div className="operation-detail">
          <ShieldCheck size={32} />
          <h3>{overview.length} unit dalam satu ringkasan</h3>
          <p>
            Yayasan melihat statistik agregat sekolah. Biodata siswa, hasil
            belajar per siswa, rincian tagihan, dan data penjemput tersedia
            hanya untuk role yang berwenang di unit masing-masing.
          </p>
          <p>
            Data demo terpisah per sesi pengunjung. Seluruh komunikasi berupa
            pengumuman di aplikasi. Pembayaran dicatat manual oleh Admin
            Sekolah.
          </p>
          <p>
            Rapor PDF, arsip ZIP, serta ekspor Excel dibuat pada perangkat
            pengguna.
          </p>
        </div>
      </Panel>
    </>
  );
}

export function SchoolReminders() {
  const { data, go, user } = useApp();
  const next = new Date();
  next.setUTCHours(5, 0, 0, 0);
  next.setUTCDate(next.getUTCDate() + 1);
  while ([0, 6].includes(next.getUTCDay()))
    next.setUTCDate(next.getUTCDate() + 1);
  const key = next.toISOString().slice(0, 10);
  const uniform =
    data.uniformOverrides.find((u) => u.date === key) ||
    data.uniforms.find((u) => Number(u.weekday) === next.getUTCDay());
  const pending = data.assignments.filter(
    (a) =>
      a.due <= key &&
      (["parent", "student"].includes(user.role)
        ? !data.submissions.some((s) => s.assignmentId === a.id)
        : true),
  );
  return (
    <div className="reminder-strip">
      <CalendarDays size={23} />
      <div>
        <p>
          <strong>
            {uniform
              ? `Seragam berikutnya: ${uniform.name}`
              : "Persiapan hari belajar berikutnya"}
          </strong>{" "}
          · {date(key, true)}
        </p>
        <p>
          {uniform?.note}
          {pending.length
            ? ` · ${pending.length} tugas perlu diperiksa sebelum hari belajar berikutnya.`
            : ""}
        </p>
      </div>
      <Button
        variant="secondary"
        onClick={() => go(pending.length ? "assignments" : "schedule")}
      >
        {pending.length ? "Periksa tugas" : "Lihat jadwal"}
      </Button>
    </div>
  );
}
