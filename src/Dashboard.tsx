import { TodayWork } from "./Product";
import { SchoolReminders } from "./Operations";
import { ProExample } from "./PlanExperience";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  FileCheck2,
  GraduationCap,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
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
  Bar,
  BarChart,
  Cell,
} from "recharts";
import {
  avg,
  number,
  risk,
  useApp,
  canEdit,
  canIntervene,
  liveDate,
  greeting,
  isPro,
} from "./model";
import {
  Avatar,
  Badge,
  Button,
  ClassSelect,
  LinkButton,
  Metric,
  PageHead,
  Panel,
  tone,
} from "./ui";
import { useState } from "react";
export default function Dashboard() {
  const { data, user, go } = useApp();
  const pro = isPro(data.settings[0]);
  const [period, setPeriod] = useState("semester");
  const [classId, setClassId] = useState("all");
  const students = data.students.filter(
    (s) => classId === "all" || s.classId === classId,
  );
  const risks = (pro ? students : [])
    .map(
      (s) => ({ ...s, ...risk(s, data) }) as typeof s & ReturnType<typeof risk>,
    )
    .filter((s) => s.level !== "Rendah")
    .sort((a, b) => b.reasons.length - a.reasons.length);
  const attendance = avg(students.map((s) => s.attendance));
  const average = avg(
    data.grades
      .filter((g) => students.some((s) => s.id === g.studentId))
      .map((g) => g.score),
  );
  const reports = data.reports.filter((r) =>
    students.some((s) => s.id === r.studentId),
  );
  const published = reports.filter((r) => r.status === "Terbit").length;
  const trend = ["Jul", "Agu", "Sep", "Okt", "Nov", "Des"].map((month, i) => ({
    month,
    score: avg(students.map((s) => s.history?.[Math.min(i, 5)] || 0)),
    target: 80,
  }));
  const classTrend = data.classes
    .filter((c) => classId === "all" || c.id === classId)
    .map((c) => ({
      name: c.name,
      score: avg(
        data.grades
          .filter(
            (g) =>
              data.students.find((s) => s.id === g.studentId)?.classId === c.id,
          )
          .map((g) => g.score),
      ),
    }));
  const firstName =
    user.role === "principal"
      ? "Pak Ahmad"
      : user.role === "admin"
        ? "Bu Dewi"
        : "Bu Ratna";
  return (
    <>
      <PageHead
        eyebrow="SETIAP LANGKAH, BERARTI"
        title={`${greeting()}, ${firstName}`}
        description="Mari ciptakan hari yang lebih baik untuk setiap siswa."
        action={
          <>
            <div className="date-chip">
              <CalendarDays size={16} />
              {liveDate()}
            </div>
            <Button
              onClick={() => go(canEdit(user.role) ? "attendance" : "reports")}
            >
              <Plus size={16} />
              {canEdit(user.role) ? "Input kehadiran" : "Tinjau rapor"}
            </Button>
          </>
        }
      />
      <ProExample />
      {pro && <section className="ews-overview" aria-label="Prioritas Early Warning">
        <span className="ews-overview-icon">
          <Activity size={30} />
        </span>
        <div>
          <div className="eyebrow">EARLY WARNING SYSTEM</div>
          <h2>{risks.length} siswa membutuhkan pendampingan</h2>
          <p>
            <strong>
              {risks.filter((s) => s.level === "Tinggi").length} risiko tinggi
            </strong>{" "}
            · {risks.filter((s) => s.level === "Sedang").length} perlu perhatian
            · Berdasarkan nilai, kehadiran, dan tugas.
          </p>
        </div>
        <Button variant="secondary" onClick={() => go("ews")}>
          Lihat prioritas
          <ArrowRight size={17} />
        </Button>
      </section>}
      {user.role === "teacher" && <SchoolReminders />}
      <TodayWork />
      <div className="section-toolbar">
        <div className="tab-inline">
          <button className="active">Ringkasan sekolah</button>
          {pro && <button onClick={() => go("ews")}>
            Perlu perhatian <span>{risks.length}</span>
          </button>}
        </div>
        <div className="toolbar-right">
          <ClassSelect value={classId} onChange={setClassId} />
          {pro && <select
            aria-label="Periode grafik"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="semester">Semester ini</option>
            <option value="recent">3 bulan terakhir</option>
          </select>}
        </div>
      </div>
      <div className="metrics">
        <Metric
          label="Total siswa aktif"
          value={number(students.length)}
          icon={Users}
          change={`${data.classes.filter((c) => classId === "all" || c.id === classId).length} kelas`}
          note="terhubung dalam satu ruang"
          onClick={() => go("students")}
        />
        <Metric
          label="Rata-rata kehadiran"
          value={
            <>
              {attendance}
              <em>%</em>
            </>
          }
          icon={GraduationCap}
          change="Semester ini"
          note="pada semester berjalan"
          tone="blue"
          onClick={() => go("attendance")}
        />
        <Metric
          label="Rata-rata nilai"
          value={
            <>
              {average}
              <em>/100</em>
            </>
          }
          icon={TrendingUp}
          change={pro ? `+${number(avg(students.map((s) => (s.history?.at(-1) || 0) - (s.history?.[0] || 0))))} poin` : `${data.grades.filter((g) => students.some((s) => s.id === g.studentId)).length} nilai tercatat`}
          note={pro ? "dibanding awal semester" : "pada semester berjalan"}
          tone="purple"
          onClick={() => go("grades")}
        />
        {pro ? <Metric
          label="Siswa perlu perhatian"
          value={risks.length}
          icon={Activity}
          change={`${risks.filter((s) => s.level === "Tinggi").length} risiko tinggi`}
          note="perlu ditindaklanjuti"
          tone="amber"
          onClick={() => go("ews")}
        /> : <Metric label="Rapor terbit" value={published} icon={FileCheck2} change={`${reports.length} rapor tercatat`} note="siap dibagikan kepada keluarga" tone="amber" onClick={() => go("reports")} />}
      </div>
      <div className="dashboard-main-grid">
        {pro ? <Panel
          title="Perkembangan akademik"
          subtitle="Langkah kecil menuju capaian yang lebih baik"
          action={
            <span className="chart-legend">
              <i /> Rata-rata nilai <b /> Target sekolah
            </span>
          }
        >
          <div className="chart-summary">
            <strong>
              {average}
              <span>/100</span>
            </strong>
            <Badge tone="green">
              <TrendingUp size={12} /> Progres semester
            </Badge>
          </div>
          <div className="trend-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={
                  period === "recent" ? trend.slice(1, 4) : trend.slice(0, 4)
                }
                margin={{ top: 8, right: 20, left: -22, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#009d8d" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#009d8d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#edf0f2"
                  strokeDasharray="4 4"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#8a949e" }}
                  dy={8}
                />
                <YAxis
                  domain={[60, 100]}
                  ticks={[60, 70, 80, 90, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#8a949e" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e7eaec",
                    fontSize: 12,
                  }}
                  formatter={(v: any, name: any) => [
                    number(Number(v)),
                    name === "score" ? "Rata-rata" : "Target",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="#b7c6cb"
                  strokeDasharray="5 5"
                  fill="none"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#009c8c"
                  strokeWidth={2.5}
                  fill="url(#areaFill)"
                  dot={{ r: 4, fill: "white", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <span>
              <span className="status-dot" /> Berdasarkan nilai siswa semester
              berjalan
            </span>
            <button onClick={() => go("grades")}>
              Lihat analisis <ArrowUpRight size={14} />
            </button>
          </div>
        </Panel> : <Panel title="Kegiatan sekolah hari ini" subtitle="Selesaikan pencatatan dan pembelajaran sehari-hari.">
          <div className="parent-insights">
            <div><span className="heading-icon blue"><CalendarDays size={20} /></span><div><h3>Kehadiran siswa</h3><p>Rata-rata kehadiran tercatat {attendance}%. Buka daftar kelas untuk mencatat kehadiran hari ini.</p><Button variant="secondary" onClick={() => go("attendance")}>Kelola kehadiran <ArrowRight size={15} /></Button></div></div>
            <div><span className="heading-icon teal"><BookOpen size={20} /></span><div><h3>Nilai dan tugas</h3><p>Rata-rata nilai saat ini {average}/100. Perbarui penilaian dan bagikan tugas sesuai kelas yang dikelola.</p><Button variant="secondary" onClick={() => go("grades")}>Kelola nilai <ArrowRight size={15} /></Button></div></div>
          </div>
        </Panel>}
        <Panel
          title={
            <>
              <span className="heading-icon amber">
                <Activity size={17} />
              </span>
              Perlu ditindaklanjuti
            </>
          }
          subtitle="Fokus pada hal yang berdampak hari ini"
          action={<span className="tiny-label">HARI INI</span>}
          className="priorities"
        >
          {pro && <button onClick={() => go("ews")}>
            <span className="priority-icon red">
              <Users size={18} />
            </span>
            <div>
              <strong>
                {risks.filter((s) => s.level === "Tinggi").length} siswa
                berisiko tinggi
              </strong>
              <p>Penurunan nilai & kehadiran</p>
            </div>
            <ChevronRight size={17} />
          </button>}
          <button onClick={() => go("reports")}>
            <span className="priority-icon amber">
              <FileCheck2 size={18} />
            </span>
            <div>
              <strong>
                {reports.filter((r) => r.status === "Review").length} rapor
                menunggu review
              </strong>
              <p>Selesaikan sebelum pembagian rapor</p>
            </div>
            <ChevronRight size={17} />
          </button>
          {pro && canIntervene(user) && (
            <button onClick={() => go("interventions")}>
              <span className="priority-icon blue">
                <Clock3 size={18} />
              </span>
              <div>
                <strong>
                  {
                    data.interventions.filter((i) => i.status !== "Selesai")
                      .length
                  }{" "}
                  pendampingan berjalan
                </strong>
                <p>Pastikan setiap rencana terlaksana</p>
              </div>
              <ChevronRight size={17} />
            </button>
          )}
          <div className="priority-note">
            <span>
              <ShieldCheck size={20} />
            </span>
            <p>
              {pro ? "Perhatian lebih awal." : "Pencatatan yang teratur."}
              <br />
              <strong>{pro ? "Kesempatan tumbuh lebih besar." : "Belajar berjalan lebih lancar."}</strong>
            </p>
          </div>
        </Panel>
      </div>
      <div className="dashboard-lower-grid" style={!pro ? {gridTemplateColumns: "1fr"} : undefined}>
        {pro && <Panel
          title={
            <>
              Siswa dalam perhatian <Badge tone="amber">Early Warning</Badge>
            </>
          }
          subtitle="Kenali lebih dekat, dampingi lebih tepat."
          action={
            <LinkButton onClick={() => go("ews")}>Lihat semua</LinkButton>
          }
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nama siswa</th>
                  <th>Indikator utama</th>
                  <th>Status risiko</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {risks.slice(0, 4).map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => go("students", s.id)}
                    className="clickable-row"
                  >
                    <td>
                      <div className="person">
                        <Avatar photo={s.photo} size={37} />
                        <div>
                          <strong>{s.name}</strong>
                          <small>
                            {data.classes.find((c) => c.id === s.classId)?.name}{" "}
                            <span>•</span> NIS {s.nis}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="indicator-text">
                        <ArrowDown size={13} />
                        {s.reasons.find((r) => r.includes("turun")) ||
                          s.reasons[0]}
                      </span>
                      <small className="cell-small">
                        {s.reasons.length} indikator terdeteksi
                      </small>
                    </td>
                    <td>
                      <Badge tone={tone(s.level)}>{s.level}</Badge>
                    </td>
                    <td>
                      <button
                        className="icon-btn"
                        aria-label={`Lihat ${s.name}`}
                      >
                        <ArrowUpRight size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>}
        <Panel
          title="Kesiapan rapor"
          subtitle="Setiap capaian layak dirayakan."
          action={
            <span className="heading-icon teal">
              <FileCheck2 size={17} />
            </span>
          }
        >
          <div className="report-readiness">
            <div
              className="donut"
              style={
                {
                  "--progress": `${(published / Math.max(reports.length, 1)) * 100}%`,
                } as React.CSSProperties
              }
            >
              <div>
                <strong>
                  {Math.round((published / Math.max(reports.length, 1)) * 100)}
                  <small>%</small>
                </strong>
                <span>siap dibagikan</span>
              </div>
            </div>
            <div className="readiness-legend">
              <span>
                <i className="teal-bg" />
                Sudah terbit<strong>{published}</strong>
              </span>
              <span>
                <i className="amber-bg" />
                Dalam review
                <strong>
                  {reports.filter((r) => r.status === "Review").length}
                </strong>
              </span>
              <span>
                <i className="gray-bg" />
                Masih draf
                <strong>
                  {reports.filter((r) => r.status === "Draf").length}
                </strong>
              </span>
            </div>
            <Button variant="secondary" onClick={() => go("reports")}>
              Kelola rapor <ArrowRight size={15} />
            </Button>
          </div>
        </Panel>
      </div>
      <div className="dashboard-bottom-grid">
        <Panel
          title="Capaian per kelas"
          subtitle="Rata-rata nilai seluruh mata pelajaran"
          action={
            <LinkButton onClick={() => go("grades")}>Detail nilai</LinkButton>
          }
        >
          <div className="class-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={classTrend}
                margin={{ top: 10, left: -20, right: 10, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#edf0f2" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: "#7c8795" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "#8a949e" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f0f8f6" }}
                  contentStyle={{ fontSize: 12, borderRadius: 10 }}
                />
                <Bar
                  dataKey="score"
                  name="Rata-rata"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={34}
                >
                  {classTrend.map((_, i) => (
                    <Cell key={i} fill={i % 2 ? "#9ad8ce" : "#168e81"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel
          title="Kabar sekolah"
          subtitle="Informasi terbaru dari ruang sekolah"
          action={
            <LinkButton onClick={() => go("announcements")}>
              Semua kabar
            </LinkButton>
          }
        >
          {data.announcements.slice(0, 3).map((a, i) => (
            <button
              className="news-row"
              key={a.id}
              onClick={() => go("announcements")}
            >
              <div className={`news-icon n${i}`}>
                {i === 0 ? (
                  <CalendarDays size={18} />
                ) : i === 1 ? (
                  <Users size={18} />
                ) : (
                  <GraduationCap size={18} />
                )}
              </div>
              <div>
                <small>
                  {a.category} <span>•</span> {a.date.slice(8)} Oktober
                </small>
                <strong>{a.title}</strong>
              </div>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </Panel>
      </div>
      <div className="insight-footer">
        <span>
          <Sparkles size={17} /> Bukan sekadar data. Ini tentang masa depan
          mereka.
        </span>
        <span>Ringkasan berdasarkan data sekolah</span>
      </div>
    </>
  );
}
