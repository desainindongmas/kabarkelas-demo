import { TodayWork } from "./Product";
import { SchoolReminders } from "./Operations";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  GraduationCap,
  Mail,
  MessageSquare,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { avg, currency, date, risk, isPro, useApp, greeting, liveDate } from "./model";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Metric,
  PageHead,
  Panel,
  SearchBox,
  tone,
} from "./ui";
import { reportPDF } from "./export";
export function PersonalDashboard() {
  const { data, user, go, school } = useApp();
  const pro = isPro(data.settings[0]);
  const [period, setPeriod] = useState("semester");
  const s = data.students[0];
  if (!s) return <Empty title="Belum ada siswa yang terhubung" />;
  const r = risk(s, data),
    parent = user.role === "parent",
    grades = data.grades.filter((g) => g.studentId === s.id),
    pending = data.invoices.filter((i) => i.studentId === s.id && i.status !== "Lunas"),
    report = data.reports.find((r) => r.studentId === s.id);
  const pendingTasks = data.assignments.filter(
    (a) => a.classId === s.classId && !data.submissions.some(
      (submission) => submission.studentId === s.id && submission.assignmentId === a.id,
    ),
  );
  return (
    <>
      <PageHead
        eyebrow={
          parent
            ? "TUMBUH BERSAMA, MESKI DARI RUMAH"
            : "RUANG UNTUK JADI VERSI TERBAIK DIRIMU"
        }
        title={
          parent
            ? `${greeting()}, ${s.parent || "Ayah/Bunda"}`
            : `Halo, ${s.name.split(" ")[0]}! ☀`
        }
        description={
          parent
            ? `Mari lihat cerita belajar ${s.name.split(" ")[0]} dan dukung langkah kecilnya hari ini.`
            : "Semangat baru, kesempatan baru. Yuk, mulai langkah belajarmu hari ini."
        }
        action={
          <div className="date-chip">
            <CalendarDays size={16} />
            {liveDate()}
          </div>
        }
      />
      <div className="personal-profile">
        <Avatar photo={s.photo} size={72} />
        <div>
          <small>{parent ? "PERKEMBANGAN ANAK" : "PROFIL BELAJARMU"}</small>
          <h2>{s.name}</h2>
          <p>
            {data.classes.find((c) => c.id === s.classId)?.name} <span>•</span>{" "}
            {school.name}
          </p>
        </div>
        <Button
          disabled={!report}
          variant="secondary"
          onClick={() => reportPDF(s, data, school)}
        >
          <Download size={16} />
          Unduh rapor
        </Button>
      </div>
      {pro && <div
        className={`student-ews ${r.level === "Rendah" ? "healthy" : r.level === "Tinggi" ? "risk-high" : "risk-medium"}`}
      >
        <div className="ews-title">
          <span className="ews-symbol">
            <Activity size={24} />
          </span>
          <div>
            <small>EARLY WARNING · PENDAMPINGAN BELAJAR</small>
            <h3>
              {r.level === "Rendah"
                ? "Perkembangan yang baik, terus pertahankan!"
                : parent
                  ? `${s.name.split(" ")[0]} membutuhkan dukungan kita bersama`
                  : "Ada beberapa hal yang bisa kita perbaiki bersama"}
            </h3>
            <p>
              {r.reasons.join(" · ") ||
                "Kehadiran, tugas, dan capaian berada dalam kondisi baik."}
            </p>
          </div>
          <Button variant="secondary" onClick={() => go("assignments")}>
            <MessageSquare size={15} />
            Lihat tugas yang perlu diselesaikan
          </Button>
        </div>
      </div>}
      <TodayWork />
      <SchoolReminders />
      <div className="metrics four">
        <Metric
          label="Rata-rata nilai"
          value={avg(grades.map((g) => g.score))}
          icon={TrendingUp}
          note={`${grades.length} mata pelajaran`}
          onClick={() => go("grades")}
        />
        <Metric
          label="Kehadiran"
          value={`${s.attendance}%`}
          icon={ClipboardCheck}
          tone="blue"
          note="semester ini"
          onClick={() => go("attendance")}
        />
        <Metric
          label="Tugas tertunda"
          value={pendingTasks.length}
          icon={BookOpen}
          tone="amber"
          note="yuk, selesaikan bertahap"
          onClick={() => go("assignments")}
        />
        <Metric
          label={parent ? "Tagihan aktif" : "Kuis tersedia"}
          value={parent ? pending.length : data.quizzes.length}
          icon={parent ? Wallet : GraduationCap}
          tone="purple"
          note={parent ? "termasuk bulan mendatang" : "siap untuk dikerjakan"}
          onClick={() => go(parent ? "finance" : "quizzes")}
        />
      </div>
      <div className="student-grid">
        {pro ? <Panel
          title={parent ? "Ringkasan perkembangan" : "Ringkasan belajarmu"}
          subtitle="Ringkasan berbasis data demo · ditinjau bersama wali kelas"
          action={<Sparkles size={19} className="text-teal" />}
        >
          <div className="parent-insights">
            <div>
              <span className="heading-icon amber">
                <BookOpen size={19} />
              </span>
              <div>
                <h3>Fokus kecil, dampak besar</h3>
                <p>
                  {grades.some((g) => g.score < 75)
                    ? `Dampingi latihan ${grades
                        .filter((g) => g.score < 75)
                        .slice(0, 3)
                        .map((g) => g.subject)
                        .join(
                          ", ",
                        )} selama 20 menit sehari. Mulai dari konsep paling dasar.`
                    : "Pertahankan kebiasaan belajar yang konsisten dan eksplorasi materi pengayaan."}
                </p>
              </div>
            </div>
            <div>
              <span className="heading-icon blue">
                <ClipboardCheck size={19} />
              </span>
              <div>
                <h3>Bangun ritme kehadiran</h3>
                <p>
                  {s.attendance < 80
                    ? "Diskusikan hambatan kehadiran bersama wali kelas. Jadwal tidur dan persiapan pagi dapat menjadi langkah awal."
                    : "Kehadiran sudah mendukung proses belajar. Terus jaga konsistensinya."}
                </p>
              </div>
            </div>
            <div>
              <span className="heading-icon teal">
                <ShieldCheck size={19} />
              </span>
              <div>
                <h3>Kita mendampingi bersama</h3>
                <p>
                  {
                    data.interventions.filter((i) => i.studentId === s.id && i.status !== "Selesai")
                      .length
                  }{" "}
                  rencana pendampingan sedang dijalankan. Hubungi wali kelas
                  untuk berdiskusi mengenai perkembangannya.
                </p>
              </div>
            </div>
          </div>
        </Panel> : <Panel title={parent ? "Kabar belajar anak" : "Ringkasan belajarmu"} subtitle="Data pembelajaran yang telah dicatat sekolah.">
          <div className="parent-insights">
            <div><span className="heading-icon blue"><ClipboardCheck size={19} /></span><div><h3>Kehadiran tercatat {s.attendance}%</h3><p>Lihat catatan hadir, izin, dan sakit pada riwayat kehadiran.</p><Button variant="secondary" onClick={() => go("attendance")}>Lihat kehadiran</Button></div></div>
            <div><span className="heading-icon teal"><BookOpen size={19} /></span><div><h3>{pendingTasks.length} tugas belum selesai</h3><p>Buka tugas untuk melihat instruksi dan tenggat. Selesaikan sedikit demi sedikit sesuai jadwal belajar.</p><Button variant="secondary" onClick={() => go("assignments")}>Lihat tugas</Button></div></div>
          </div>
        </Panel>}
        {pro ? <Panel
          title="Perjalanan nilai"
          subtitle="Proses belajar selalu punya ceritanya sendiri"
          action={
            <select
              aria-label="Periode nilai"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="semester">Semester ini</option>
              <option value="recent">Terakhir</option>
            </select>
          }
        >
          <div className="detail-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={["Jul", "Agu", "Sep", "Okt"]
                  .map((month, i) => ({ month, Nilai: s.history?.[i] || 0 }))
                  .slice(period === "recent" ? 2 : 0)}
                margin={{ left: -20, right: 10, top: 15 }}
              >
                <defs>
                  <linearGradient id="parentFill" x2="0" y2="1">
                    <stop stopColor="#1b9e8c" stopOpacity={0.22} />
                    <stop offset="1" stopColor="#1b9e8c" stopOpacity={0} />
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
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Area
                  dataKey="Nilai"
                  type="monotone"
                  stroke="#11998c"
                  fill="url(#parentFill)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "white" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <span>Lihat kemajuan, bukan hanya angka.</span>
            <button onClick={() => go("grades")}>
              Detail nilai <ArrowUpRight size={14} />
            </button>
          </div>
        </Panel> : <Panel title="Nilai mata pelajaran" subtitle="Nilai saat ini dan deskripsi dari guru.">
          <div className="table-scroll"><table><thead><tr><th>Mata pelajaran</th><th>Nilai</th></tr></thead><tbody>{grades.slice(0, 6).map((g) => <tr key={g.id}><td>{g.subject}</td><td><strong>{g.score}</strong><span className="muted"> /100</span></td></tr>)}</tbody></table></div>
          <Button variant="secondary" onClick={() => go("grades")}>Semua nilai <ArrowRight size={15} /></Button>
        </Panel>}
      </div>
      <div className="student-grid">
        <Panel
          title="Tugas yang perlu diselesaikan"
          action={
            <button className="text-btn" onClick={() => go("assignments")}>
              Semua tugas
              <ArrowRight size={15} />
            </button>
          }
        >
          {pendingTasks
            .slice(0, 3)
            .map((a) => (
              <button
                key={a.id}
                className="personal-task"
                onClick={() => go("assignments")}
              >
                <span className="heading-icon blue">
                  <BookOpen size={18} />
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <small>
                    {a.subject} · {date(a.due, true)}
                  </small>
                </div>
                <Badge tone="amber">Belum selesai</Badge>
              </button>
            ))}
        </Panel>
        <Panel
          title={parent ? "Ringkasan pembayaran" : "Kabar sekolah"}
          subtitle={
            parent
              ? "Tetap tertib, semakin tenang."
              : "Informasi terbaru untukmu"
          }
        >
          {parent ? (
            <div className="personal-payment">
              <Wallet size={30} />
              <small>Total tagihan belum lunas</small>
              <strong>
                {currency(
                  pending.reduce(
                    (a, i) => a + i.amount - (i.paidAmount || 0),
                    0,
                  ),
                )}
              </strong>
              <p>{pending.length} tagihan · dicatat manual oleh sekolah</p>
              <Button variant="secondary" onClick={() => go("finance")}>
                Lihat tagihan <ArrowRight size={16} />
              </Button>
            </div>
          ) : (
            data.announcements.slice(0, 3).map((a) => (
              <button
                key={a.id}
                className="news-row"
                onClick={() => go("announcements")}
              >
                <span className="heading-icon teal">
                  <Mail size={18} />
                </span>
                <div>
                  <small>{a.category}</small>
                  <strong>{a.title}</strong>
                </div>
                <ArrowUpRight size={15} />
              </button>
            ))
          )}
        </Panel>
      </div>
    </>
  );
}
