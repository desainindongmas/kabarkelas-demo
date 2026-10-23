import { Board, UnitWork, Packages, ProAnalysis, Workflow } from "./Product";
import { GateDashboard, GateScan, GateHistory, GateIncidents } from "./Gate";
import { DemoWelcome, DemoTour } from "./Experience";
import { FoundationPlanRequired } from "./PlanExperience";
import { VisitorJourney, type VisitorPage } from "./VisitorJourney";
import { NeedsCalculator, OrderRequest, waitForBuyerSession, type BuyerNeeds } from "./BuyerFlow";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Network,
  PanelLeftClose,
  Search,
  Settings2,
  ShieldCheck,
  Shirt,
  Users,
  Wallet,
  UserCheck,
  DoorOpen,
} from "lucide-react";
import {
  AppContext,
  roleNames,
  roleResponsibilities,
  rolePhotos,
  canAccessPage,
  isFoundation,
  displayRole,
  risk,
  type Row,
  type User,
} from "./model";
import { Avatar, Badge, Brand, Button, Empty, Modal } from "./ui";
import Dashboard from "./Dashboard";
import {
  Students,
  StudentDetail,
  EarlyWarning,
  Interventions,
} from "./Students";
import {
  Attendance,
  Grades,
  Assignments,
  Quizzes,
  Reports,
  Schedule,
  Materials,
} from "./Academic";
import {
  MasterData,
  Finance,
  Announcements,
  Settings,
  Admissions,
  AdminDashboard,
} from "./Admin";
import { PersonalDashboard } from "./Portals";
import {
  StaffAttendance,
  StaffLeave,
  StaffRecap,
  Uniforms,
  Character,
  Tahfizh,
  Pickup,
  BelowKkm,
  Trust,
} from "./Operations";

export async function api(url: string, body?: unknown, method = "POST") {
  const response = await fetch(url, {
    ...(body !== undefined
      ? {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "Data KabarKelas belum dapat dimuat. Silakan coba lagi beberapa saat.",
    );
  }
  if (!response.ok) {
    const error = new Error(
      result.error || "Permintaan belum berhasil. Silakan coba lagi.",
    ) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  if (body !== undefined)
    window.dispatchEvent(
      new CustomEvent("kk:action", {
        detail: {
          path:
            url +
            (url === "/api/academic-batch"
              ? "#" + (body as { kind: string }).kind
              : ""),
          method,
          result,
        },
      }),
    );
  return result;
}
const navigation = [
  {
    group: "RUANG KERJA",
    items: [
      { id: "dashboard", label: "Ringkasan", icon: LayoutDashboard },
      { id: "students", label: "Student 360", icon: Users },
      { id: "ews", label: "Early Warning", icon: Activity },
      { id: "below-kkm", label: "Di bawah KKM", icon: BookOpen },
      { id: "interventions", label: "Pendampingan", icon: ShieldCheck },
    ],
  },
  {
    group: "AKADEMIK",
    items: [
      { id: "attendance", label: "Kehadiran siswa", icon: ClipboardCheck },
      { id: "grades", label: "Nilai & kompetensi", icon: BookOpen },
      { id: "assignments", label: "Tugas & kuis", icon: FolderOpen },
      { id: "reports", label: "Rapor digital", icon: FileCheck2 },
      { id: "character", label: "Capaian & P5", icon: GraduationCap },
      { id: "tahfizh", label: "Tahfizh & akhlak", icon: BookOpen },
      { id: "schedule", label: "Jadwal & materi", icon: CalendarDays },
    ],
  },
  {
    group: "OPERASIONAL",
    items: [
      { id: "staff-self", label: "Kehadiran & izin saya", icon: UserCheck },
      { id: "staff-attendance", label: "Absensi guru", icon: UserCheck },
      {
        id: "staff-leave",
        label: "Persetujuan izin guru",
        icon: ClipboardCheck,
      },
      { id: "staff-recap", label: "Rekap absensi", icon: ClipboardCheck },
      { id: "uniform", label: "Jadwal seragam", icon: Shirt },
      { id: "pickup", label: "Penjemput terdaftar", icon: DoorOpen },
      { id: "gate-scan", label: "Pindai QR gerbang", icon: ShieldCheck },
      { id: "gate-history", label: "Riwayat gerbang", icon: ClipboardCheck },
      { id: "gate-incidents", label: "Konfirmasi gerbang", icon: ShieldCheck },
      { id: "announcements", label: "Pengumuman", icon: Bell },
    ],
  },
  {
    group: "SEKOLAH",
    items: [
      { id: "master", label: "Data sekolah", icon: Building2 },
      { id: "finance", label: "Administrasi SPP", icon: Wallet },
      { id: "admissions", label: "Penerimaan siswa", icon: GraduationCap },
      { id: "foundation", label: "Perbandingan sekolah", icon: Network },
      { id: "trust", label: "Keamanan & data", icon: ShieldCheck },
      { id: "settings", label: "Pengaturan", icon: Settings2 },
      { id: "analytics", label: "Analisis & laporan", icon: Activity },
      { id: "workflow", label: "Alur & tenggat", icon: ClipboardCheck },
      { id: "unit-work", label: "Koordinasi yayasan", icon: Network },
      {
        id: "board-actions",
        label: "Tindak lanjut unit",
        icon: ClipboardCheck,
      },
      { id: "unit-needs", label: "Kebutuhan unit", icon: Wallet },
      { id: "meeting", label: "Laporan rapat", icon: FileCheck2 },
      { id: "packages", label: "Paket & manfaat", icon: Building2 },
      { id: "visit", label: "Tur & pemesanan", icon: HelpCircle },
    ],
  },
];
const titleMap = Object.fromEntries(
  navigation.flatMap((g) => g.items.map((i) => [i.id, i.label])),
);
const descriptions: Record<string, string> = {
  principal: "Pantau akademik dan dampingi siswa",
  admin: "Kelola data dan administrasi sekolah",
  teacher: "Kelola pembelajaran di kelas yang diajar",
  parent: "Ikuti perkembangan anak yang terhubung",
  student: "Pantau tugas dan perjalanan belajarmu",
  foundation: "Keputusan dan tindak lanjut lintas unit",
  security: "Verifikasi QR, catatan gerbang dan laporan kejadian",
};
function parseRoute() {
  const firstPage = localStorage.getItem("kk-welcome-v3") === "seen" || localStorage.getItem("kk-site-intro-v1") === "seen" ? "dashboard" : "visit";
  const [page = "dashboard", id = ""] = (
    location.hash.replace(/^#\/?/, "") || firstPage
  ).split("/");
  return { page, id };
}
const visitorRoutes: Record<string, VisitorPage> = { visit: "start", usage: "flow", needs: "needs", order: "order" };
const visitorHashes: Record<VisitorPage, string> = { start: "visit", flow: "usage", needs: "needs", order: "order" };
const defaultNeeds: BuyerNeeds = { plan: "Standard", students: 500, units: [500, 500, 500], wantsEws: false };
function validNeeds(value: unknown): value is BuyerNeeds {
  if (!value || typeof value !== "object") return false;
  const v = value as BuyerNeeds;
  return ["Standard", "Pro", "Yayasan"].includes(v.plan) && Number.isSafeInteger(v.students) && v.students > 0 &&
    Array.isArray(v.units) && v.units.length >= (v.plan === "Yayasan" ? 2 : 1) && v.units.length <= 100 && v.units.every(n => Number.isSafeInteger(n) && n > 0) && typeof v.wantsEws === "boolean";
}
function restoredNeeds(): BuyerNeeds {
  try { const saved = JSON.parse(localStorage.getItem("kk-buyer-needs-v1") || "null"); return validNeeds(saved) ? saved : defaultNeeds; }
  catch { return defaultNeeds; }
}
export default function App() {
  const [state, setState] = useState<{
      data: Record<string, Row[]>;
      user: User;
      school: Row;
      schools: Row[];
      overview: Row[];
    } | null>(null),
    [route, setRoute] = useState(parseRoute),
    [buyerNeeds, setBuyerNeeds] = useState<BuyerNeeds>(restoredNeeds),
    [welcome, setWelcome] = useState(
      () => localStorage.getItem("kk-welcome-v3") !== "seen",
    ),
    [error, setError] = useState(""),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [roleModal, setRoleModal] = useState(false),
    [help, setHelp] = useState(false),
    [notifications, setNotifications] = useState(false),
    [search, setSearch] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [switching, setSwitching] = useState(false),
    [notice, setNotice] = useState<{ msg: string; error: boolean } | null>(
      null,
    );
  const toast = useCallback(
    (msg: string, error = false) => setNotice({ msg, error }),
    [],
  );
  useEffect(() => {
    localStorage.setItem("kk-buyer-needs-v1", JSON.stringify(buyerNeeds));
  }, [buyerNeeds]);
  useEffect(() => {
    const choose = (event: Event) => {
      const value = (event as CustomEvent).detail;
      if (validNeeds(value)) setBuyerNeeds(value);
    };
    window.addEventListener("kk:buyer-needs", choose);
    return () => window.removeEventListener("kk:buyer-needs", choose);
  }, []);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  const reload = useCallback(
    async () => setState(await api("/api/bootstrap")),
    [],
  );
  useEffect(() => {
    if (visitorRoutes[route.page] || state) return;
    let active = true;
    setError("");
    (async () => {
      try {
        await waitForBuyerSession();
        if (!active) return;
        let data;
        try {
          data = await api("/api/bootstrap");
        } catch (e) {
          if ((e as Error & { status?: number }).status !== 401) throw e;
          await api("/api/session", { role: "principal" });
          data = await api("/api/bootstrap");
        }
        if (active) setState(data);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Data belum dapat dimuat.");
      }
    })();
    return () => {
      active = false;
    };
  }, [!!visitorRoutes[route.page], !!state]);
  useEffect(() => {
    const update = () => {
      setRoute(parseRoute());
      setMobile(false);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    const shortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("hashchange", update);
    window.addEventListener("keydown", shortcut);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("keydown", shortcut);
    };
  }, []);
  const go = (page: string, id = "") => {
    location.hash = `/${page}${id ? "/" + id : ""}`;
    setMobile(false);
    window.dispatchEvent(
      new CustomEvent("kk:action", { detail: { path: "route:" + page } }),
    );
  };
  const setRole = async (role: string, school?: string, isHomeroom = false) => {
    setSwitching(true);
    try {
      await api("/api/session", {
        role,
        school: school || state?.user.school || "s1",
        isHomeroom,
      });
      await reload();
      setRoleModal(false);
      go("dashboard");
      toast(
        `Beralih ke ${roleNames[role]}${isHomeroom ? " · Wali Kelas" : ""}`,
      );
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setSwitching(false);
    }
  };
  const save = async (kind: string, item: Partial<Row>, quiet = false) => {
    try {
      const result = await api(`/api/${kind}`, item);
      await reload();
      if (!quiet) toast("Perubahan berhasil disimpan");
      return result;
    } catch (e) {
      if (!quiet) toast((e as Error).message, true);
      throw e;
    }
  };
  const remove = async (kind: string, id: string) => {
    await api(`/api/${kind}/${id}`, {}, "DELETE");
    await reload();
    toast("Data berhasil dihapus");
  };
  const visitorPage = visitorRoutes[route.page];
  if (visitorPage)
    return <VisitorJourney page={visitorPage}
      onNavigate={page => go(visitorHashes[page])}
      onExplore={() => {
        localStorage.setItem("kk-site-intro-v1", "seen");
        setWelcome(localStorage.getItem("kk-welcome-v3") !== "seen");
        go("dashboard");
      }}>
      {visitorPage === "needs" && <NeedsCalculator value={buyerNeeds} onChange={setBuyerNeeds} onContinue={() => go("order")} />}
      {visitorPage === "order" && <OrderRequest needs={buyerNeeds} onBack={() => go("needs")} />}
    </VisitorJourney>;
  if (!state)
    return (
      <div className="app-loading">
        <Brand />
        {!error && <div className="loader" />}
        <p role={error ? "alert" : undefined}>
          {error || "Menyiapkan ruang tumbuh bersama…"}
        </p>
        {error && <Button onClick={() => location.reload()}>Coba lagi</Button>}
      </div>
    );
  const { user, data, school, schools } = state,
    isPersonal = ["parent", "student"].includes(user.role);
  const groups = navigation
    .map((g) => ({
      ...g,
      items: g.items
        .filter((i) => i.id === "visit" ? ["principal", "admin", "foundation"].includes(user.role) : canAccessPage(user, i.id, data.settings[0]))
        .map((i) => ({
          ...i,
          label:
            i.id === "students" && user.role === "admin"
              ? "Data siswa"
              : i.id === "schedule" && user.role === "admin"
                ? "Jadwal pelajaran"
                : i.id === "assignments" && user.role === "parent"
                  ? "Tugas anak"
                  : i.id === "finance" && user.role === "parent"
                    ? "Tagihan & kuitansi"
                    : i.label,
        })),
    }))
    .filter((g) => g.items.length);
  const content = () => {
    if (!canAccessPage(user, route.page, data.settings[0]))
      return (
        <Empty
          title="Halaman tidak tersedia untuk peran ini"
          description="Gunakan menu sesuai tugas dan hak aksesmu. Fitur EWS memerlukan Pro atau Yayasan; pengelolaan lintas unit memerlukan Yayasan."
          action={
            <Button onClick={() => go("dashboard")}>
              Kembali ke ringkasan
            </Button>
          }
        />
      );
    switch (route.page) {
      case "dashboard":
        return isPersonal ? (
          <PersonalDashboard />
        ) : user.role === "foundation" ? (
          isFoundation(data.settings[0]) ? <Board /> : <FoundationPlanRequired />
        ) : user.role === "security" ? (
          <GateDashboard />
        ) : user.role === "admin" ? (
          <AdminDashboard />
        ) : (
          <Dashboard />
        );
      case "students":
        return route.id ? <StudentDetail /> : <Students />;
      case "ews":
        return <EarlyWarning />;
      case "below-kkm":
        return <BelowKkm />;
      case "interventions":
        return <Interventions />;
      case "attendance":
        return <Attendance />;
      case "grades":
        return <Grades />;
      case "assignments":
        return <Assignments />;
      case "quizzes":
        return <Quizzes />;
      case "reports":
        return <Reports />;
      case "schedule":
        return <Schedule />;
      case "materials":
        return <Materials />;
      case "master":
        return <MasterData />;
      case "finance":
        return <Finance />;
      case "announcements":
        return <Announcements />;
      case "settings":
        return <Settings />;
      case "foundation":
        return <Board view="comparison" />;
      case "board-actions":
        return <Board view="actions" />;
      case "unit-needs":
        return <Board view="needs" />;
      case "meeting":
        return <Board view="meeting" />;
      case "unit-work":
        return <UnitWork />;
      case "packages":
        return <Packages />;
      case "analytics":
        return <ProAnalysis />;
      case "workflow":
        return <Workflow />;
      case "gate-scan":
        return <GateScan />;
      case "gate-history":
        return <GateHistory />;
      case "gate-incidents":
        return <GateIncidents />;
      case "admissions":
        return <Admissions />;
      case "staff-self":
        return <StaffAttendance self />;
      case "staff-attendance":
        return <StaffAttendance />;
      case "staff-leave":
        return <StaffLeave />;
      case "staff-recap":
        return <StaffRecap />;
      case "uniform":
        return <Uniforms />;
      case "character":
        return <Character />;
      case "tahfizh":
        return <Tahfizh />;
      case "pickup":
        return <Pickup />;
      case "trust":
        return <Trust />;
      default:
        return <Empty />;
    }
  };
  const mobileIds: Record<string, string[]> = {
    principal: ["dashboard", "ews", "reports", "staff-leave"],
    admin: ["dashboard", "master", "staff-attendance", "finance"],
    teacher: ["dashboard", "attendance", "grades", "staff-self"],
    parent: ["dashboard", "grades", "assignments", "reports"],
    student: ["dashboard", "assignments", "quizzes", "grades"],
    foundation: ["dashboard", "board-actions", "unit-needs", "meeting"],
    security: ["dashboard", "gate-scan", "gate-history", "gate-incidents"],
  };
  const mobileItems = mobileIds[user.role]
    .map((id) => navigation.flatMap((g) => g.items).find((i) => i.id === id)!)
    .filter((i) => i && canAccessPage(user, i.id, data.settings[0]));
  return (
    <AppContext.Provider
      value={{
        ...state,
        go,
        save,
        remove,
        reload,
        toast,
        page: route.page,
        selectedId: route.id,
        setRole,
      }}
    >
      <div className={`app ${collapsed ? "collapsed" : ""}`}>
        {mobile && (
          <div className="sidebar-scrim" onClick={() => setMobile(false)} />
        )}
        <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
          <a className="brand-link" href="#/dashboard">
            <Brand compact={collapsed} />
          </a>
          <button className="school-card" onClick={() => setRoleModal(true)}>
            <span className="school-emblem">
              <GraduationCap size={23} />
            </span>
            <div>
              <strong>{school.name}</strong>
              <small>{displayRole(user)}</small>
            </div>
            <span className="pro-mini">DEMO</span>
          </button>
          <div className="nav-scroll">
            {groups.map((group) => (
              <div className="nav-group" key={group.group}>
                <div className="nav-label">{group.group}</div>
                {group.items.map((item) => (
                  <a
                    key={item.id}
                    title={collapsed ? item.label : undefined}
                    href={`#/${item.id}`}
                    className={`nav-item ${route.page === item.id || (route.page === "quizzes" && item.id === "assignments") || (route.page === "materials" && item.id === "schedule") ? "active" : ""}`}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                    {item.id === "ews" && (
                      <span className="nav-count">
                        {
                          data.students.filter(
                            (s) => risk(s, data).level !== "Rendah",
                          ).length
                        }
                      </span>
                    )}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div className="sidebar-bottom">
            <div className="demo-card">
              <ShieldCheck size={20} />
              <div>
                <strong>Fokus pada sekolah</strong>
                <p>Data, rapor, dan pendampingan.</p>
              </div>
              <button aria-label="Panduan demo" onClick={() => setHelp(true)}>
                <ArrowRight size={17} />
              </button>
            </div>
            <button className="sidebar-help" onClick={() => setHelp(true)}>
              <HelpCircle size={17} />
              <span>Pusat bantuan</span>
              <span className="version">v1.1</span>
            </button>
            <button className="profile-card" onClick={() => setRoleModal(true)}>
              <Avatar photo={rolePhotos[user.role]} size={36} />
              <div>
                <strong>{user.name.replace(", M.Pd.", "")}</strong>
                <small>{displayRole(user)}</small>
              </div>
              <ChevronDown size={15} />
            </button>
          </div>
        </aside>
        <div className="main-wrap">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-btn collapse-button"
                aria-label="Ciutkan sidebar"
                onClick={() => setCollapsed(!collapsed)}
              >
                <PanelLeftClose size={19} />
              </button>
              <button
                className="icon-btn mobile-menu"
                aria-label="Buka menu"
                onClick={() => setMobile(true)}
              >
                <Menu size={22} />
              </button>
              <span>Workspace</span>
              <ChevronRight size={13} />
              <strong>{titleMap[route.page] || "KabarKelas"}</strong>
            </div>
            <div className="top-actions">
              <button
                className="tour-start"
                onClick={() => window.dispatchEvent(new Event("kk:tour"))}
              >
                Skenario demo
              </button>
              <button
                className="global-search"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={16} />
                <span>Cari di KabarKelas</span>
                <kbd>⌘ K</kbd>
              </button>
              <span className="top-divider" />
              <span className="term">
                <CalendarDays size={15} />
                {data.settings[0]?.year || "2026/2027"} <span>•</span>
                {data.settings[0]?.semester || "Ganjil"}
              </span>
              {canAccessPage(user, "announcements", data.settings[0]) && (
                <button
                  className="notification-btn icon-btn"
                  aria-label="Buka notifikasi"
                  onClick={() => setNotifications(true)}
                >
                  <Bell size={20} />
                </button>
              )}
              <button
                className="role-switch"
                onClick={() => setRoleModal(true)}
              >
                <Avatar photo={rolePhotos[user.role]} size={32} />
                <span>Ganti peran</span>
                <ChevronDown size={13} />
              </button>
            </div>
          </header>
          <div className="demo-plan-strip">
            <div className="demo-plan-status" aria-live="polite">
              <span className="demo-label">DEMO</span>
              <strong>Sedang mencoba {data.settings[0]?.plan || "Pro"}</strong>
              <span className="demo-plan-description">Data contoh · akses mengikuti peran</span>
            </div>
            {["principal", "admin", "foundation"].includes(user.role) && (
              <label className="demo-plan-select">
                Ganti paket demo
                <select value={data.settings[0]?.plan || "Pro"} disabled={switching}
                  onChange={async (event) => {
                    const plan = event.target.value;
                    setSwitching(true);
                    try {
                      await save("demo-plan", { plan }, true);
                      if (!canAccessPage(user, route.page, { ...data.settings[0], plan })) go("dashboard");
                      toast(`Sedang mencoba ${plan}. Data demo tetap tersimpan.`);
                    } catch (e) { toast((e as Error).message, true); }
                    finally { setSwitching(false); }
                  }}>
                  <option>Standard</option><option>Pro</option><option>Yayasan</option>
                </select>
              </label>
            )}
          </div>
          <main
            key={`${route.page}-${user.school}-${displayRole(user)}-${data.settings[0]?.plan}`}
            className="content"
          >
            {content()}
          </main>
          <footer className="app-footer">
            <span>
              © 2026 KabarKelas <span>by Desainin Dong, Mas</span>
            </span>
            <span>
              <span className="status-dot" />
              Data demo tersimpan <span className="footer-dot">•</span>
              <button onClick={() => setHelp(true)}>Tentang demo</button>
            </span>
          </footer>
        </div>
        <nav className="bottom-nav">
          {mobileItems.map((item) => (
            <button
              className={route.page === item.id ? "active" : ""}
              key={item.id}
              onClick={() => go(item.id)}
            >
              <item.icon size={20} />
              {item.id === "dashboard" ? "Beranda" : item.label}
            </button>
          ))}
          <button onClick={() => setMobile(true)}>
            <Menu size={20} />
            Lainnya
          </button>
        </nav>
        <DemoTour />
        {welcome && (
          <DemoWelcome
            onSkip={async (plan) => {
              await api("/api/session", { role: user.role, school: user.school, isHomeroom: user.isHomeroom, plan });
              await reload();
              localStorage.setItem("kk-welcome-v3", "seen");
              setWelcome(false);
            }}
            onChoose={async (role, h, plan) => {
              await api("/api/session", { role, school: user.school, isHomeroom: !!h, plan });
              await reload();
              go("dashboard");
              localStorage.setItem("kk-welcome-v3", "seen");
              setWelcome(false);
              setTimeout(() => window.dispatchEvent(new Event("kk:tour")), 50);
            }}
          />
        )}
        {roleModal && (
          <Modal
            title="Jelajahi KabarKelas sesuai peranmu"
            subtitle="Menu dan tindakan mengikuti tanggung jawab setiap peran."
            onClose={() => setRoleModal(false)}
            wide
          >
            <div className="role-grid">
              {Object.entries(roleNames).map(([role, label]) => (
                <button
                  className={`role-card ${role === user.role ? "selected" : ""}`}
                  key={role}
                  disabled={switching}
                  onClick={() =>
                    setRole(
                      role,
                      undefined,
                      role === "teacher" &&
                        user.role === "teacher" &&
                        user.isHomeroom,
                    )
                  }
                >
                  <Avatar photo={rolePhotos[role]} size={46} />
                  <div>
                    <strong>{label}</strong>
                    <small>{descriptions[role]}</small>
                  </div>
                  {role === user.role ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </button>
              ))}
            </div>
            <div className="teacher-capability">
              <h4>Akses tambahan guru</h4>
              <p>
                Wali kelas tetap berperan sebagai guru, dengan pendampingan, P5,
                dan persetujuan rapor untuk kelas perwaliannya.
              </p>
              <div>
                <Button
                  variant={
                    user.role === "teacher" && !user.isHomeroom
                      ? "primary"
                      : "secondary"
                  }
                  disabled={switching}
                  onClick={() => setRole("teacher", undefined, false)}
                >
                  Guru mata pelajaran
                </Button>
                <Button
                  variant={
                    user.role === "teacher" && user.isHomeroom
                      ? "primary"
                      : "secondary"
                  }
                  disabled={switching}
                  onClick={() => setRole("teacher", undefined, true)}
                >
                  Guru + wali kelas X IPA 1
                </Button>
              </div>
            </div>
            {["admin", "principal"].includes(user.role) && (
              <div className="school-switch">
                <h4>Sekolah demo</h4>
                {schools.map((s) => (
                  <button
                    key={s.id}
                    disabled={switching}
                    className={s.id === user.school ? "selected" : ""}
                    onClick={() => setRole(user.role, s.id)}
                  >
                    <Building2 size={18} />
                    <span>
                      {s.name}
                      <small>{s.city}</small>
                    </span>
                    {s.id === user.school && <CheckCircle2 size={16} />}
                  </button>
                ))}
              </div>
            )}
            <div className="modal-info">
              <ShieldCheck size={17} />
              Admin mengelola administrasi. Pemantauan akademik berada pada
              kepala sekolah dan guru. Wali murid dan siswa hanya melihat data
              yang terhubung.
            </div>
          </Modal>
        )}
        {searchOpen && (
          <Modal
            title="Temukan di KabarKelas"
            onClose={() => {
              setSearchOpen(false);
              setSearch("");
            }}
          >
            <div className="command-search">
              <Search size={21} />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari siswa atau menu…"
              />
            </div>
            <div className="search-results">
              {search &&
                (canAccessPage(user, "students", data.settings[0]) || isPersonal) &&
                data.students
                  .filter(
                    (s) =>
                      s.name.toLowerCase().includes(search.toLowerCase()) ||
                      s.nisn.includes(search),
                  )
                  .slice(0, 5)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        go(
                          canAccessPage(user, "students", data.settings[0])
                            ? "students"
                            : "dashboard",
                          canAccessPage(user, "students", data.settings[0]) ? s.id : "",
                        );
                        setSearchOpen(false);
                      }}
                    >
                      <Avatar photo={s.photo} />
                      <span>
                        <strong>{s.name}</strong>
                        <small>
                          {data.classes.find((c) => c.id === s.classId)?.name} ·{" "}
                          {s.nisn}
                        </small>
                      </span>
                      <ArrowRight size={17} />
                    </button>
                  ))}
              {groups
                .flatMap((g) => g.items)
                .filter((i) =>
                  i.label.toLowerCase().includes(search.toLowerCase()),
                )
                .slice(0, 8)
                .map((i) => (
                  <button
                    key={i.id}
                    onClick={() => {
                      go(i.id);
                      setSearchOpen(false);
                    }}
                  >
                    <i.icon size={20} />
                    <span>{i.label}</span>
                    <ArrowRight size={16} />
                  </button>
                ))}
            </div>
          </Modal>
        )}
        {notifications && (
          <Modal
            title="Pemberitahuan sekolah"
            subtitle="Informasi dan pengingat tersedia di dalam aplikasi."
            onClose={() => setNotifications(false)}
          >
            {data.announcements.slice(0, 4).map((a) => (
              <button
                className="notification-row"
                key={a.id}
                onClick={() => {
                  setNotifications(false);
                  go("announcements");
                }}
              >
                <span className="notice-icon">
                  <Bell size={18} />
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <p>{a.body.slice(0, 110)}…</p>
                  <small>{a.date}</small>
                </div>
                <ChevronRight size={17} />
              </button>
            ))}
            {canAccessPage(user, "ews", data.settings[0]) && (
              <button
                className="notification-row"
                onClick={() => {
                  setNotifications(false);
                  go("ews");
                }}
              >
                <span className="notice-icon amber">
                  <Activity size={18} />
                </span>
                <div>
                  <strong>Periksa prioritas pendampingan siswa</strong>
                  <p>Lihat indikator yang perlu ditindaklanjuti di kelas.</p>
                </div>
                <ChevronRight size={17} />
              </button>
            )}
          </Modal>
        )}
        {help && (
          <Modal
            title="Panduan sesuai peranmu"
            subtitle="Demo KabarKelas dengan pembagian akses sesuai peran."
            onClose={() => setHelp(false)}
          >
            <div className="help-content">
              <Brand />
              <h3>{displayRole(user)}</h3>
              <p>{roleResponsibilities[user.role]}</p>
              <div className="callout blue">
                Identitas dan skenario menggunakan data dummy. Hak akses
                dibatasi pada menu dan API. Pengingat tersedia di aplikasi;
                tidak ada pesan keluar. Pemilihan role terbuka khusus untuk
                demo.
              </div>
              <Button
                onClick={() => {
                  setHelp(false);
                  window.dispatchEvent(new Event("kk:tour"));
                }}
              >
                Mulai skenario peranku
                <ArrowRight size={16} />
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setHelp(false);
                  setRoleModal(true);
                }}
              >
                Jelajahi role lain
              </Button>
              <Button variant="secondary" onClick={() => { setHelp(false); go("visit"); }}>
                Tur situs, hitung kebutuhan & pemesanan
              </Button>
            </div>
          </Modal>
        )}
        {notice && (
          <div role="status" className={`toast ${notice.error ? "error" : ""}`}>
            <CheckCircle2 size={19} />
            <span>{notice.msg}</span>
            <button
              onClick={() => setNotice(null)}
              aria-label="Tutup pemberitahuan"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
