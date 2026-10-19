import { TodayWork } from "./Product";
import { useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CreditCard,
  Download,
  ExternalLink,
  FileSpreadsheet,
  GraduationCap,
  HardDrive,
  History,
  Layers,
  Link,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Network,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import {
  avg,
  canEdit,
  currency,
  date,
  number,
  roleNames,
  useApp,
  greeting,
  roleResponsibilities,
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
  Metric,
  Modal,
  PageHead,
  Pagination,
  Panel,
  SearchBox,
  tone,
  type Field,
} from "./ui";
import { exportExcel, downloadJSON, receiptPDF } from "./export";
import { api } from "./App";

export function MasterData() {
  const { data, user, save, remove, go, toast } = useApp();
  const [tab, setTab] = useState("teachers"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [form, setForm] = useState<Partial<Row> | null>(null),
    [del, setDel] = useState<Row | undefined>(),
    [imp, setImp] = useState(false);
  const tabs = [
    { id: "teachers", name: "Guru & staf", icon: Users },
    { id: "classes", name: "Kelas", icon: Building2 },
    { id: "subjects", name: "Mata pelajaran", icon: BookOpen },
    { id: "students", name: "Data siswa", icon: GraduationCap },
  ];
  const fields: Record<string, Field[]> = {
    teachers: [
      { key: "name", label: "Nama lengkap", required: true },
      { key: "nip", label: "NIP", required: true },
      {
        key: "subject",
        label: "Mata pelajaran",
        required: true,
        options: data.subjects.map((s) => ({ value: s.name, label: s.name })),
      },
      {
        key: "gender",
        label: "Jenis kelamin",
        options: [
          { value: "P", label: "Perempuan" },
          { value: "L", label: "Laki-laki" },
        ],
        required: true,
      },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Telepon", type: "tel", required: true },
    ],
    classes: [
      { key: "name", label: "Nama kelas", required: true },
      {
        key: "homeroom",
        label: "Wali kelas",
        required: true,
        options: data.teachers.map((t) => ({ value: t.name, label: t.name })),
      },
      { key: "room", label: "Ruang kelas", required: true },
      {
        key: "capacity",
        label: "Kapasitas",
        type: "number",
        min: 1,
        max: 60,
        required: true,
      },
    ],
    subjects: [
      { key: "name", label: "Nama mata pelajaran", required: true },
      { key: "code", label: "Kode", required: true },
      {
        key: "kkm",
        label: "KKM",
        type: "number",
        min: 0,
        max: 100,
        required: true,
      },
      {
        key: "teacher",
        label: "Guru pengampu",
        required: true,
        options: data.teachers.map((t) => ({ value: t.name, label: t.name })),
      },
    ],
    students: [
      { key: "name", label: "Nama lengkap", required: true },
      { key: "nisn", label: "NISN 10 digit", required: true },
      {
        key: "classId",
        label: "Kelas",
        required: true,
        options: data.classes.map((c) => ({ value: c.id, label: c.name })),
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
      { key: "birth", label: "Tanggal lahir", type: "date", required: true },
      { key: "parent", label: "Orang tua / wali", required: true },
      { key: "phone", label: "Telepon", required: true, type: "tel" },
      { key: "address", label: "Alamat", required: true },
    ],
  };
  const rows = data[tab].filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase()),
  );
  const editable = user.role === "admin";
  return (
    <>
      <PageHead
        eyebrow="FONDASI SEKOLAH YANG TERHUBUNG"
        title="Data sekolah"
        description="Kelola guru, kelas, mata pelajaran, dan identitas siswa di satu tempat."
        action={
          editable ? (
            <>
              <Button variant="secondary" onClick={() => setImp(true)}>
                <Upload size={16} />
                Impor Excel
              </Button>
              <Button onClick={() => setForm({})}>
                <Plus size={16} />
                Tambah data
              </Button>
            </>
          ) : undefined
        }
      />
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => {
              setTab(t.id);
              setPage(1);
              setQuery("");
            }}
          >
            <t.icon size={16} />
            {t.name}
            <span>{data[t.id].length}</span>
          </button>
        ))}
      </div>
      <Panel
        title={tabs.find((t) => t.id === tab)?.name}
        action={
          <ExportButton
            onClick={() =>
              exportExcel(
                rows.map((r) =>
                  Object.fromEntries(
                    Object.entries(r).filter(
                      ([k, v]) =>
                        !["id", "photo", "history"].includes(k) &&
                        typeof v !== "object",
                    ),
                  ),
                ),
                "Data-" + tab,
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
            placeholder="Cari data…"
          />
          <span className="muted">{rows.length} data terdaftar</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>
                  {tab === "teachers"
                    ? "NIP"
                    : tab === "classes"
                      ? "Wali kelas"
                      : tab === "students"
                        ? "NISN"
                        : "Kode"}
                </th>
                <th>
                  {tab === "teachers"
                    ? "Mata pelajaran"
                    : tab === "classes"
                      ? "Siswa / kapasitas"
                      : tab === "students"
                        ? "Kelas"
                        : "KKM"}
                </th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.slice((page - 1) * 12, page * 12).map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="person">
                      {["teachers", "students"].includes(tab) ? (
                        <Avatar photo={r.photo} size={38} />
                      ) : (
                        <span className="heading-icon teal">
                          {tab === "classes" ? (
                            <Building2 size={18} />
                          ) : (
                            <BookOpen size={18} />
                          )}
                        </span>
                      )}
                      <div>
                        <strong>{r.name}</strong>
                        {tab === "teachers" && <small>{r.email}</small>}
                      </div>
                    </div>
                  </td>
                  <td>{r.nip || r.homeroom || r.nisn || r.code}</td>
                  <td>
                    {tab === "classes"
                      ? `${data.students.filter((s) => s.classId === r.id).length} / ${r.capacity}`
                      : r.subject ||
                        data.classes.find((c) => c.id === r.classId)?.name ||
                        r.kkm}
                  </td>
                  <td>
                    <Badge tone="green">Aktif</Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      {tab === "students" && (
                        <button
                          className="icon-btn"
                          aria-label={`Profil ${r.name}`}
                          onClick={() => go("students", r.id)}
                        >
                          <ArrowUpRight size={17} />
                        </button>
                      )}
                      {editable && (
                        <>
                          <button
                            className="icon-btn"
                            aria-label={`Edit ${r.name}`}
                            onClick={() => setForm(r)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-btn text-red"
                            aria-label={`Hapus ${r.name}`}
                            onClick={() => setDel(r)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty />}
        <Pagination total={rows.length} page={page} onChange={setPage} />
      </Panel>
      {form && (
        <FormModal
          title={`${form.id ? "Edit" : "Tambah"} ${tabs.find((t) => t.id === tab)?.name.toLowerCase()}`}
          initial={form}
          fields={fields[tab]}
          onClose={() => setForm(null)}
          onSave={(v) =>
            save(tab, {
              ...(tab === "students"
                ? {
                    attendance: 100,
                    history: [80, 80, 80, 80, 80, 80],
                    overdue: 0,
                    status: "Aktif",
                  }
                : {}),
              ...v,
              ...(["teachers", "students"].includes(tab)
                ? {
                    photo:
                      v.gender === "L"
                        ? tab === "teachers"
                          ? 7
                          : 0
                        : tab === "teachers"
                          ? 6
                          : 1,
                  }
                : {}),
            })
          }
        />
      )}{" "}
      {del && (
        <Modal
          title="Hapus data ini?"
          subtitle={del.name}
          onClose={() => setDel(undefined)}
        >
          <div className="modal-copy">
            <p>
              Data yang telah dihapus tidak dapat dikembalikan melalui halaman
              ini. Kelas berisi siswa harus dikosongkan terlebih dahulu.
            </p>
          </div>
          <footer>
            <Button variant="secondary" onClick={() => setDel(undefined)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await remove(tab, del.id);
                  setDel(undefined);
                } catch (e) {
                  toast((e as Error).message, true);
                }
              }}
            >
              Hapus data
            </Button>
          </footer>
        </Modal>
      )}
      {imp && <ImportWizard onClose={() => setImp(false)} />}
    </>
  );
}
function ImportWizard({ onClose }: { onClose: () => void }) {
  const { data, user, reload, toast } = useApp();
  const [rows, setRows] = useState<Record<string, any>[]>([]),
    [headers, setHeaders] = useState<string[]>([]),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [step, setStep] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [history, setHistory] = useState<Row[]>([]);
  const keys = [
    ["name", "Nama lengkap"],
    ["nisn", "NISN"],
    ["class", "Kelas"],
    ["gender", "Jenis kelamin"],
    ["parent", "Orang tua"],
    ["phone", "Telepon"],
  ];
  const mapped: any[] = rows.map((r, i) => {
    const v = Object.fromEntries(
      keys.map(([key]) => [key, String(r[mapping[key]] ?? "").trim()]),
    );
    const c = data.classes.find(
      (c) => c.name.toLowerCase() === v.class.toLowerCase(),
    );
    const errors = [];
    if (!v.name) errors.push("Nama kosong");
    if (!/^\d{10}$/.test(v.nisn)) errors.push("NISN harus 10 digit");
    if (
      data.students.some((s) => s.nisn === v.nisn) ||
      rows.slice(0, i).some((p) => String(p[mapping.nisn]) === v.nisn)
    )
      errors.push("NISN duplikat");
    if (!c) errors.push("Kelas tidak ditemukan");
    if (!["L", "P", "Laki-laki", "Perempuan"].includes(v.gender))
      errors.push("Gender harus L/P");
    return {
      ...v,
      classId: c?.id,
      gender: ["P", "Perempuan"].includes(v.gender) ? "P" : "L",
      errors,
    };
  });
  return (
    <Modal
      title="Impor siswa dari Excel / Dapodik"
      subtitle="Unggah → petakan kolom → validasi → impor. Tidak ada data yang ditimpa."
      onClose={onClose}
      wide
    >
      <div className="import-body">
        <div className="stepper">
          {["Unggah berkas", "Pemetaan kolom", "Validasi & impor"].map(
            (s, i) => (
              <div className={step >= i + 1 ? "active" : ""} key={s}>
                <span>{step > i + 1 ? <Check size={14} /> : i + 1}</span>
                {s}
              </div>
            ),
          )}
        </div>
        {step === 1 && (
          <>
            <label className="upload-zone large">
              <FileSpreadsheet size={36} />
              <strong>Pilih berkas Excel atau CSV</strong>
              <span>
                Format .xlsx, .xls, .csv · maksimal 5 MB · 2.000 siswa
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setError("");
                  if (file.size > 5 * 1024 * 1024) {
                    setError("Ukuran berkas maksimal 5 MB");
                    return;
                  }
                  try {
                    const XLSX = await import("xlsx");
                    const wb = XLSX.read(await file.arrayBuffer(), {
                      type: "array",
                    });
                    const rs = XLSX.utils.sheet_to_json<Record<string, any>>(
                      wb.Sheets[wb.SheetNames[0]],
                      { defval: "", raw: false },
                    );
                    if (!rs.length || rs.length > 2000)
                      throw new Error("Berkas harus berisi 1–2.000 siswa.");
                    const hs = Object.keys(rs[0]);
                    setHeaders(hs);
                    setRows(rs);
                    const saved = JSON.parse(
                      localStorage.getItem(`kk-mapping-${user.school}`) || "{}",
                    );
                    const aliases: Record<string, string[]> = {
                      name: ["nama", "nama lengkap", "nama siswa"],
                      nisn: ["nisn"],
                      class: ["kelas", "rombel"],
                      gender: ["jk", "gender", "jenis kelamin"],
                      parent: ["orang tua", "nama orang tua", "wali"],
                      phone: ["telepon", "hp", "no hp"],
                    };
                    setMapping(
                      Object.fromEntries(
                        keys.map(([k]) => [
                          k,
                          hs.includes(saved[k])
                            ? saved[k]
                            : hs.find((h) =>
                                aliases[k].includes(h.toLowerCase()),
                              ) || "",
                        ]),
                      ),
                    );
                    setStep(2);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
            </label>
            <Button
              variant="secondary"
              onClick={() =>
                exportExcel(
                  [
                    {
                      Nama: "Anisa Putri",
                      NISN: "0012345678",
                      Kelas: data.classes[0]?.name,
                      JK: "P",
                      "Orang Tua": "Ibu Rina",
                      Telepon: "081234567890",
                    },
                  ],
                  "Template-Impor-Siswa",
                )
              }
            >
              <Download size={16} />
              Unduh template contoh
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  setHistory(await api("/api/imports"));
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <History size={16} />
              Riwayat impor & rollback
            </Button>
            {history.map((h) => (
              <div className="import-history" key={h.id}>
                <div>
                  <strong>{h.count} siswa</strong>
                  <small>
                    {date(h.date)} · {h.status}
                  </small>
                </div>
                {h.status === "Selesai" && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await api(`/api/imports/${h.id}/rollback`, {});
                        setHistory(await api("/api/imports"));
                        await reload();
                        toast(
                          "Impor dibatalkan. Data yang telah mendapat aktivitas baru dipertahankan.",
                        );
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Rollback impor
                  </Button>
                )}
              </div>
            ))}
          </>
        )}
        {step === 2 && (
          <>
            <p className="card-copy">
              Ditemukan {rows.length} baris. Cocokkan kolom berkas dengan data
              KabarKelas.
            </p>
            <div className="form-grid">
              {keys.map(([k, label]) => (
                <label key={k}>
                  {label}
                  {["name", "nisn", "class", "gender"].includes(k) && " *"}
                  <select
                    value={mapping[k] || ""}
                    onChange={(e) =>
                      setMapping({ ...mapping, [k]: e.target.value })
                    }
                  >
                    <option value="">Tidak dipetakan</option>
                    {headers.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <footer>
              <Button variant="secondary" onClick={() => setStep(1)}>
                Kembali
              </Button>
              <Button
                disabled={
                  !["name", "nisn", "class", "gender"].every((k) => mapping[k])
                }
                onClick={() => {
                  localStorage.setItem(
                    `kk-mapping-${user.school}`,
                    JSON.stringify(mapping),
                  );
                  setStep(3);
                }}
              >
                Validasi data <ArrowRight size={15} />
              </Button>
            </footer>
          </>
        )}
        {step === 3 && (
          <>
            <div
              className={`callout ${mapped.some((r) => r.errors.length) ? "amber" : "green"}`}
            >
              <CheckCircle2 size={20} />
              <span>
                {mapped.filter((r) => !r.errors.length).length} data valid ·{" "}
                {mapped.filter((r) => r.errors.length).length} data perlu
                diperbaiki. Perbaiki berkas bila ditemukan kesalahan.
              </span>
            </div>
            <div className="table-scroll import-preview">
              <table>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>NISN</th>
                    <th>Kelas</th>
                    <th>Validasi</th>
                  </tr>
                </thead>
                <tbody>
                  {mapped.slice(0, 30).map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td>{r.nisn}</td>
                      <td>{r.class}</td>
                      <td>
                        {r.errors.length ? (
                          <span className="text-red">
                            {r.errors.join(", ")}
                          </span>
                        ) : (
                          <Badge tone="green">Valid</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <small className="muted">
              Pratinjau maksimal 30 baris. Semua {mapped.length} baris telah
              divalidasi.
            </small>
            <footer>
              <Button variant="secondary" onClick={() => setStep(2)}>
                Ubah pemetaan
              </Button>
              <Button
                disabled={busy || mapped.some((r) => r.errors.length)}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await api("/api/import-students", {
                      rows: mapped.map(({ errors, ...r }) => r),
                    });
                    await reload();
                    toast(`${mapped.length} siswa berhasil diimpor`);
                    onClose();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Upload size={16} />
                )}
                Impor {mapped.length} siswa
              </Button>
            </footer>
          </>
        )}
        {error && <div className="form-error">{error}</div>}
      </div>
    </Modal>
  );
}

export function Finance() {
  const { data, user, school, save, reload, toast, selectedId } = useApp();
  const [status, setStatus] = useState("all"),
    [query, setQuery] = useState(""),
    [payment, setPayment] = useState<Row | null>(null),
    [add, setAdd] = useState(false),
    [paymentPage, setPaymentPage] = useState(1),
    [onlyOverdue, setOnlyOverdue] = useState(selectedId === "overdue"),
    [bulk, setBulk] = useState(false),
    [collect, setCollect] = useState(false),
    [cls, setCls] = useState("all"),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<Set<string>>(new Set());
  const admin = user.role === "admin";
  const paidOf = (i: Row) =>
    i.paidAmount ?? (i.status === "Lunas" ? i.amount : 0);
  const total = data.invoices.reduce((a, i) => a + i.amount, 0),
    paid = data.invoices.reduce((a, i) => a + paidOf(i), 0);
  const rows = data.invoices.filter(
    (i) =>
      (status === "all" || i.status === status) &&
      (!onlyOverdue ||
        (i.status !== "Lunas" &&
          i.due <=
            new Date().toLocaleDateString("en-CA", {
              timeZone: "Asia/Jakarta",
            }))) &&
      (cls === "all" ||
        data.students.find((s) => s.id === i.studentId)?.classId === cls) &&
      `${i.title} ${data.students.find((s) => s.id === i.studentId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHead
        title="Keuangan & SPP"
        description={
          admin
            ? "Kelola tagihan dan catat pembayaran yang diterima sekolah."
            : "Lihat tagihan serta pembayaran yang telah dicatat sekolah."
        }
        action={
          <>
            <ExportButton
              onClick={() =>
                exportExcel(
                  rows.map((i) => ({
                    Nama: data.students.find((s) => s.id === i.studentId)?.name,
                    Tagihan: i.title,
                    Nominal: i.amount,
                    Terbayar: paidOf(i),
                    Sisa: i.amount - paidOf(i),
                    Status: i.status,
                  })),
                  "Rekap-SPP",
                )
              }
            />
            {admin && (
              <Button variant="secondary" onClick={() => setBulk(true)}>
                Buat tagihan kelas
              </Button>
            )}
            {admin && (
              <Button onClick={() => setAdd(true)}>
                <Plus size={16} />
                Buat tagihan
              </Button>
            )}
          </>
        }
      />
      <div className="metrics three">
        <Metric label="Total tagihan" value={currency(total)} icon={Wallet} />
        <Metric
          label="Tercatat dibayar"
          value={currency(paid)}
          icon={CheckCircle2}
          tone="blue"
        />
        <Metric
          label="Sisa tagihan"
          value={currency(total - paid)}
          icon={Wallet}
          tone="amber"
        />
      </div>
      <div className="callout blue">
        <Wallet size={22} />
        <p>
          Pembayaran melalui kas sekolah atau transfer manual sesuai petunjuk
          sekolah. Admin mencatat penerimaan dan menerbitkan kuitansi di
          aplikasi.
        </p>
      </div>
      <Panel
        title="Tagihan siswa"
        action={
          <div className="operation-actions">
            {admin && (
              <label className="inline-filter">
                <input
                  type="checkbox"
                  checked={onlyOverdue}
                  onChange={(e) => {
                    setOnlyOverdue(e.target.checked);
                    setPage(1);
                  }}
                />
                Jatuh tempo saja
              </label>
            )}
            {admin && (
              <ClassSelect
                value={cls}
                onChange={(v) => {
                  setCls(v);
                  setPage(1);
                }}
              />
            )}
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder="Cari siswa atau tagihan…"
            />
            <select
              aria-label="Status tagihan"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Semua status</option>
              {["Belum lunas", "Sebagian", "Lunas"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        }
      >
        {admin && selected.size > 0 && (
          <div className="batch-toolbar">
            <strong>{selected.size} tagihan dipilih</strong>
            <Button onClick={() => setCollect(true)}>
              Catat penerimaan terpilih
            </Button>
            <Button variant="ghost" onClick={() => setSelected(new Set())}>
              Bersihkan
            </Button>
          </div>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {admin && (
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Pilih tagihan pada halaman"
                      checked={
                        rows
                          .slice((page - 1) * 20, page * 20)
                          .filter((i) => i.amount > paidOf(i)).length > 0 &&
                        rows
                          .slice((page - 1) * 20, page * 20)
                          .filter((i) => i.amount > paidOf(i))
                          .every((i) => selected.has(i.id))
                      }
                      onChange={(e) => {
                        const next = new Set(selected);
                        rows
                          .slice((page - 1) * 20, page * 20)
                          .filter((i) => i.amount > paidOf(i))
                          .forEach((i) =>
                            e.target.checked
                              ? next.add(i.id)
                              : next.delete(i.id),
                          );
                        setSelected(next);
                      }}
                    />
                  </th>
                )}
                <th>Siswa / tagihan</th>
                <th>Jatuh tempo</th>
                <th>Nominal</th>
                <th>Terbayar</th>
                <th>Sisa</th>
                <th>Status</th>
                {admin && <th>Tindakan</th>}
              </tr>
            </thead>
            <tbody>
              {rows.slice((page - 1) * 20, page * 20).map((i) => (
                <tr key={i.id}>
                  {admin && (
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Pilih tagihan ${i.title} ${data.students.find((s) => s.id === i.studentId)?.name}`}
                        disabled={i.amount <= paidOf(i)}
                        checked={selected.has(i.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          e.target.checked ? next.add(i.id) : next.delete(i.id);
                          setSelected(next);
                        }}
                      />
                    </td>
                  )}
                  <td>
                    <strong>
                      {data.students.find((s) => s.id === i.studentId)?.name}
                    </strong>
                    <small className="block">{i.title}</small>
                  </td>
                  <td>{date(i.due, true)}</td>
                  <td>{currency(i.amount)}</td>
                  <td>{currency(paidOf(i))}</td>
                  <td>{currency(i.amount - paidOf(i))}</td>
                  <td>
                    <Badge
                      tone={i.status === "Sebagian" ? "amber" : tone(i.status)}
                    >
                      {i.status}
                    </Badge>
                  </td>
                  {admin && (
                    <td>
                      {i.amount > paidOf(i) && (
                        <Button
                          variant="secondary"
                          onClick={() => setPayment(i)}
                        >
                          Catat pembayaran
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty title="Tidak ada tagihan pada filter ini" />}
        <Pagination
          page={page}
          total={rows.length}
          size={20}
          onChange={setPage}
        />
      </Panel>
      <Panel
        title="Riwayat penerimaan"
        subtitle="Kuitansi dibuat dari transaksi yang sudah tercatat."
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Siswa</th>
                <th>Tagihan</th>
                <th>Nominal</th>
                <th>Metode</th>
                <th>Kuitansi</th>
              </tr>
            </thead>
            <tbody>
              {data.payments
                .slice()
                .reverse()
                .slice((paymentPage - 1) * 20, paymentPage * 20)
                .map((p) => {
                  const student = data.students.find(
                    (s) => s.id === p.studentId,
                  )!;
                  const invoice = data.invoices.find(
                    (i) => i.id === p.invoiceId,
                  );
                  return (
                    <tr key={p.id}>
                      <td>{date(p.date, true)}</td>
                      <td>{student?.name}</td>
                      <td>{invoice?.title}</td>
                      <td>{currency(p.amount)}</td>
                      <td>{p.method}</td>
                      <td>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            receiptPDF(
                              {
                                ...p,
                                title: invoice?.title,
                                paidAt: p.date,
                                status: "Tercatat",
                              },
                              student,
                              school,
                            )
                          }
                        >
                          <Download size={14} />
                          Kuitansi
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!data.payments.length && (
          <Empty title="Belum ada penerimaan tercatat" />
        )}
        <Pagination
          page={paymentPage}
          total={data.payments.length}
          size={20}
          onChange={setPaymentPage}
        />
      </Panel>
      {payment && (
        <FormModal
          title="Catat pembayaran diterima"
          initial={{
            ...payment,
            paymentAmount: payment.amount - paidOf(payment),
            method: "Tunai",
            paymentDate: new Date().toLocaleDateString("en-CA", {
              timeZone: "Asia/Jakarta",
            }),
          }}
          fields={[
            {
              key: "paymentAmount",
              label: `Nominal diterima (sisa ${currency(payment.amount - paidOf(payment))})`,
              type: "number",
              min: 1,
              max: payment.amount - paidOf(payment),
              required: true,
            },
            {
              key: "method",
              label: "Metode",
              options: ["Tunai", "Transfer manual"].map((value) => ({
                value,
                label: value,
              })),
              required: true,
            },
            {
              key: "paymentDate",
              label: "Tanggal diterima",
              type: "date",
              required: true,
            },
            {
              key: "note",
              label: "Catatan / referensi transfer",
              type: "textarea",
            },
          ]}
          onClose={() => setPayment(null)}
          onSave={(v) => save("invoices", v)}
          label="Simpan penerimaan"
        />
      )}
      {add && (
        <FormModal
          title="Buat tagihan"
          initial={{ due: "2026-11-10" }}
          fields={[
            {
              key: "studentId",
              label: "Siswa",
              options: data.students.map((s) => ({
                value: s.id,
                label: s.name,
              })),
              required: true,
            },
            { key: "title", label: "Nama tagihan", required: true },
            {
              key: "amount",
              label: "Nominal (Rp)",
              type: "number",
              min: 1,
              required: true,
            },
            { key: "due", label: "Jatuh tempo", type: "date", required: true },
          ]}
          onClose={() => setAdd(false)}
          onSave={(v) => save("invoices", v)}
        />
      )}
      {bulk && (
        <FormModal
          title="Buat tagihan satu kelas"
          initial={{
            classId: cls === "all" ? data.classes[0]?.id : cls,
            title: "SPP periode baru",
            amount: 650000,
            due: new Date().toISOString().slice(0, 10),
          }}
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
              key: "title",
              label: "Judul tagihan (unik per siswa)",
              required: true,
            },
            {
              key: "amount",
              label: "Nominal per siswa (Rp)",
              type: "number",
              min: 1,
              required: true,
            },
            { key: "due", label: "Jatuh tempo", type: "date", required: true },
          ]}
          onClose={() => setBulk(false)}
          onSave={async (v) => {
            const result = await api("/api/invoices/batch", v);
            await reload();
            toast(`${result.count} tagihan berhasil dibuat sekaligus.`);
          }}
        />
      )}
      {collect && (
        <FormModal
          title={`Catat pelunasan ${selected.size} tagihan`}
          initial={{
            method: "Tunai",
            paymentDate: new Date().toLocaleDateString("en-CA", {
              timeZone: "Asia/Jakarta",
            }),
          }}
          fields={[
            {
              key: "method",
              label: "Metode",
              options: ["Tunai", "Transfer manual"].map((value) => ({
                value,
                label: value,
              })),
              required: true,
            },
            {
              key: "paymentDate",
              label: "Tanggal penerimaan",
              type: "date",
              required: true,
            },
            {
              key: "note",
              label:
                "Konfirmasi uang telah diterima untuk seluruh tagihan terpilih",
              type: "textarea",
              required: true,
            },
          ]}
          onClose={() => setCollect(false)}
          label="Simpan penerimaan sesuai sisa tagihan"
          onSave={async (v) => {
            await api("/api/payments/batch", { ...v, ids: [...selected] });
            await reload();
            setSelected(new Set());
            toast("Penerimaan tersimpan. Kuitansi tersedia pada riwayat.");
          }}
        />
      )}
    </>
  );
}

export function Announcements() {
  const { data, user, save } = useApp();
  const [query, setQuery] = useState(""),
    [detail, setDetail] = useState<Row | undefined>(),
    [form, setForm] = useState<Partial<Row> | null>(null);
  const editable = ["admin", "principal", "teacher"].includes(user.role);
  return (
    <>
      <PageHead
        eyebrow="KABAR BAIK DIMULAI DARI SINI"
        title="Pengumuman sekolah"
        description="Informasi penting, cerita prestasi, dan agenda untuk seluruh keluarga sekolah."
        action={
          editable ? (
            <Button
              onClick={() =>
                setForm({
                  category: "Akademik",
                  audience: "Semua",
                  status: "Terbit",
                })
              }
            >
              <Plus size={16} />
              Buat pengumuman
            </Button>
          ) : undefined
        }
      />
      <div className="section-toolbar">
        <span className="muted">
          {data.announcements.length} kabar dari sekolah
        </span>
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Cari pengumuman…"
        />
      </div>
      <div className="announcement-grid">
        {data.announcements
          .filter((a) => a.title.toLowerCase().includes(query.toLowerCase()))
          .sort(
            (a, b) =>
              Number(b.pinned || 0) - Number(a.pinned || 0) ||
              b.date.localeCompare(a.date),
          )
          .map((a, i) => (
            <article
              className={`announcement-card ${i === 0 ? "featured" : ""}`}
              key={a.id}
            >
              <div className={`announcement-visual visual-${i % 4}`}>
                <span>{a.category.toUpperCase()}</span>
                {i % 3 === 0 ? (
                  <CalendarGraphic />
                ) : i % 3 === 1 ? (
                  <Users size={72} strokeWidth={1} />
                ) : (
                  <GraduationCap size={80} strokeWidth={1} />
                )}
                <i />
                <b />
              </div>
              <div className="announcement-copy">
                <div>
                  <Badge tone={i % 2 ? "blue" : "green"}>{a.category}</Badge>
                  <small>{date(a.date, true)}</small>
                </div>
                <h2>{a.title}</h2>
                <p>{a.body}</p>
                <div>
                  <span>Oleh {a.author}</span>
                  <button className="text-btn" onClick={() => setDetail(a)}>
                    Baca selengkapnya <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </article>
          ))}
      </div>
      {detail && (
        <Modal
          title={detail.title}
          subtitle={`${detail.category} · ${date(detail.date)}`}
          onClose={() => setDetail(undefined)}
        >
          <div className="reading-content">
            <p>{detail.body}</p>
            <small>Oleh {detail.author}</small>
            {editable && (
              <Button
                variant="secondary"
                onClick={() => {
                  setForm(detail);
                  setDetail(undefined);
                }}
              >
                <Pencil size={15} />
                Edit pengumuman
              </Button>
            )}
          </div>
        </Modal>
      )}
      {form && (
        <FormModal
          title={form.id ? "Edit pengumuman" : "Buat pengumuman"}
          initial={form}
          fields={[
            { key: "title", label: "Judul", required: true },
            {
              key: "audience",
              label: "Ditujukan kepada",
              options: ["Semua", ...Object.values(roleNames)].map((value) => ({
                value,
                label: value,
              })),
              required: true,
            },
            {
              key: "status",
              label: "Status",
              options: ["Draf", "Terbit"].map((value) => ({
                value,
                label: value,
              })),
              required: true,
            },
            {
              key: "category",
              label: "Kategori",
              required: true,
              options: [
                "Akademik",
                "Orang tua",
                "Prestasi",
                "Administrasi",
                "Kegiatan",
              ].map((x) => ({ value: x, label: x })),
            },
            {
              key: "body",
              label: "Isi pengumuman",
              type: "textarea",
              required: true,
            },
          ]}
          onClose={() => setForm(null)}
          onSave={(v) =>
            save("announcements", {
              ...v,
              date: new Date().toISOString().slice(0, 10),
              author: user.name,
            })
          }
        />
      )}
    </>
  );
}
function CalendarGraphic() {
  return (
    <div className="calendar-graphic">
      <span>OKTOBER</span>
      <strong>26</strong>
      <small>Mulai cerita baru.</small>
    </div>
  );
}

export function Settings() {
  const { data, user, save, toast } = useApp();
  const [tab, setTab] = useState("school"),
    [values, setValues] = useState(data.settings[0] || {}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const editable = user.role === "admin";
  const tabs = [
    ["school", "Identitas sekolah", Building2],
    ["academic", "Konfigurasi akademik", BookOpen],
    ["report", "Template rapor", Palette],
    ["roles", "Peran & akses", LockKeyhole],
    ["audit", "Audit & backup", ShieldCheck],
  ] as const;
  const input = (
    key: string,
    label: string,
    type = "text",
    min?: number,
    max?: number,
  ) => (
    <label>
      {label}
      <input
        disabled={!editable}
        type={type}
        min={min}
        max={max}
        required
        value={values[key] ?? ""}
        onChange={(e) =>
          setValues({
            ...values,
            [key]: type === "number" ? Number(e.target.value) : e.target.value,
          })
        }
      />
    </label>
  );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (
      Number(values.weightDaily) +
        Number(values.weightMidterm) +
        Number(values.weightFinal) !==
      100
    ) {
      setError("Total bobot Harian, UTS, dan UAS harus 100%.");
      return;
    }
    setBusy(true);
    try {
      await save("settings", values);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead
        eyebrow="SESUAI CARA SEKOLAHMU BEKERJA"
        title="Pengaturan sekolah"
        description="Satu sistem yang fleksibel untuk kebutuhan sekolah yang berbeda."
      />
      <div className="settings-layout">
        <nav className="settings-nav">
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon size={17} />
              {label}
              <ChevronRight size={14} />
            </button>
          ))}
        </nav>
        <Panel
          title={tabs.find((t) => t[0] === tab)?.[1]}
          subtitle={
            !editable
              ? "Tampilan informasi. Beralih ke Admin Sekolah untuk mengubah konfigurasi."
              : "Perubahan akan diterapkan untuk sekolah yang sedang dipilih."
          }
        >
          <form onSubmit={submit}>
            <div className="settings-content">
              {tab === "school" && (
                <>
                  <div className="school-brand-preview">
                    <span className="school-emblem large">
                      <GraduationCap size={32} />
                    </span>
                    <div>
                      <h3>{values.name}</h3>
                      <p>{values.curriculum}</p>
                    </div>
                  </div>
                  <div className="form-grid">
                    {input("name", "Nama sekolah")}
                    {input("principal", "Kepala sekolah")}
                    {input("address", "Alamat sekolah")}
                    {input("footer", "Motto / footer rapor")}
                  </div>
                </>
              )}
              {tab === "academic" && (
                <>
                  <div className="form-grid">
                    {input("year", "Tahun ajaran")}
                    {input("semester", "Semester")}
                    <label>
                      Kurikulum
                      <select
                        disabled={!editable}
                        value={values.curriculum}
                        onChange={(e) =>
                          setValues({ ...values, curriculum: e.target.value })
                        }
                      >
                        <option>Kurikulum Merdeka</option>
                        <option>Kurikulum 2013</option>
                        <option>Kurikulum PKBM</option>
                      </select>
                    </label>
                    {input("kkm", "KKM default", "number", 0, 100)}
                    <div className="module-toggles full">
                      <h4>Modul sesuai kebutuhan sekolah</h4>
                      {[
                        ["character", "P5 & karakter"],
                        ["tahfizh", "Tahfizh & akhlak"],
                        ["admissions", "Penerimaan siswa baru"],
                      ].map(([key, label]) => (
                        <label key={key}>
                          <input
                            type="checkbox"
                            checked={(
                              values.enabledModules || [
                                "character",
                                "tahfizh",
                                "admissions",
                              ]
                            ).includes(key)}
                            onChange={(e) =>
                              setValues({
                                ...values,
                                enabledModules: e.target.checked
                                  ? [...(values.enabledModules || []), key]
                                  : (values.enabledModules || []).filter(
                                      (m: string) => m !== key,
                                    ),
                              })
                            }
                          />
                          {label}
                        </label>
                      ))}
                      <p>
                        Modul yang dinonaktifkan disembunyikan dari role
                        terkait. Data lama tetap disimpan.
                      </p>
                    </div>
                    <label>
                      Tampilan nilai
                      <select
                        value={values.gradeScale || "100"}
                        onChange={(e) =>
                          setValues({ ...values, gradeScale: e.target.value })
                        }
                      >
                        <option value="100">0–100</option>
                        <option value="10">0–10</option>
                        <option value="4">0–4</option>
                        <option value="letter">Huruf A–E</option>
                      </select>
                    </label>
                  </div>
                  <h4>Bobot nilai akhir</h4>
                  <p className="card-copy">
                    Perubahan bobot digunakan saat nilai disimpan berikutnya.
                    Total ketiga bobot harus 100%.
                  </p>
                  <div className="form-grid three-cols">
                    {input("weightDaily", "Harian (%)", "number", 0, 100)}
                    {input("weightMidterm", "UTS (%)", "number", 0, 100)}
                    {input("weightFinal", "UAS (%)", "number", 0, 100)}
                  </div>
                </>
              )}
              {tab === "report" && (
                <>
                  <div className="template-options">
                    {["Merdeka", "Klasik", "Minimalis"].map((t) => (
                      <button
                        type="button"
                        disabled={!editable}
                        className={values.template === t ? "selected" : ""}
                        key={t}
                        onClick={() => setValues({ ...values, template: t })}
                      >
                        <div className={`template-thumb ${t}`}>
                          <span />
                          <i />
                          <i />
                          <i />
                          <i />
                          <b />
                        </div>
                        <span>{t}</span>
                        {values.template === t && <CheckCircle2 size={16} />}
                      </button>
                    ))}
                  </div>
                  <div className="form-grid">
                    {input("color", "Warna identitas", "color")}
                    {input("footer", "Footer rapor")}
                    {input("principal", "Nama penanda tangan")}
                  </div>
                  <div className="callout blue">
                    <FileSpreadsheet size={18} />
                    <p>
                      Template dan warna digunakan pada ekspor PDF berikutnya.
                      Tanda tangan pada demo berupa nama kepala sekolah.
                    </p>
                  </div>
                </>
              )}
              {tab === "roles" && (
                <div className="role-policy-list">
                  {Object.entries(roleNames).map(([key, name]) => (
                    <article key={key}>
                      <strong>{name}</strong>
                      <p>{roleResponsibilities[key]}</p>
                    </article>
                  ))}
                  <p>
                    Wali kelas adalah kemampuan tambahan Guru untuk kelas
                    perwaliannya. Menu, halaman langsung, tombol dan API
                    mengikuti batas akses yang sama.
                  </p>
                </div>
              )}
              {tab === "audit" && (
                <>
                  <div className="backup-card">
                    <HardDrive size={30} />
                    <div>
                      <h3>Cadangan data sekolah</h3>
                      <p>
                        Ekspor JSON berisi data demo sekolah aktif. Simpan untuk
                        pemulihan.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          downloadJSON(
                            await api("/api/backup"),
                            `Backup-KabarKelas-${user.school}.json`,
                          );
                          toast("Cadangan berhasil diunduh");
                        } catch (e) {
                          toast((e as Error).message, true);
                        }
                      }}
                    >
                      <Download size={15} />
                      Backup
                    </Button>
                  </div>
                  {editable && (
                    <label className="restore-upload">
                      Pulihkan cadangan JSON sekolah ini
                      <input
                        type="file"
                        accept=".json"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          try {
                            const v = JSON.parse(await f.text());
                            await api("/api/restore", v);
                            location.reload();
                          } catch (e) {
                            toast((e as Error).message, true);
                          }
                        }}
                      />
                    </label>
                  )}
                  <h4>Jejak aktivitas</h4>
                  <div className="audit-list">
                    {[...data.audit]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 30)
                      .map((a) => (
                        <div key={a.id}>
                          <span className="timeline-icon">
                            <History size={15} />
                          </span>
                          <div>
                            <strong>{a.action}</strong>
                            <small>
                              {a.actor} · {date(a.date, true)}
                            </small>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
            {error && <div className="form-error">{error}</div>}
            {editable && ["school", "academic", "report"].includes(tab) && (
              <footer>
                <Button type="submit" disabled={busy}>
                  <Save size={16} />
                  Simpan pengaturan
                </Button>
              </footer>
            )}
          </form>
        </Panel>
      </div>
    </>
  );
}

export function Foundation() {
  const { overview } = useApp();
  return (
    <>
      <PageHead
        eyebrow="SATU VISI, BANYAK RUANG TUMBUH"
        title="Ringkasan yayasan"
        description="Pantau capaian dan operasional seluruh unit melalui data agregat."
      />
      <div className="metrics four">
        <Metric label="Unit sekolah" value={overview.length} icon={Building2} />
        <Metric
          label="Total siswa"
          value={overview.reduce((a, s) => a + s.students, 0)}
          icon={Users}
        />
        <Metric
          label="Rata-rata kehadiran"
          value={`${avg(overview.map((s) => s.attendance))}%`}
          icon={CheckCircle2}
          tone="blue"
        />
        <Metric
          label="Rata-rata nilai"
          value={avg(overview.map((s) => s.average))}
          icon={TrendingUp}
          tone="amber"
        />
      </div>
      <div className="card-grid">
        {overview.map((s, i) => (
          <Panel key={s.id}>
            <div className="school-unit-top">
              <span className={`unit-symbol color-${i}`}>{s.short}</span>
              <Badge tone="green">Aktif</Badge>
            </div>
            <div className="eyebrow">{s.city}</div>
            <h3 className="card-title">{s.name}</h3>
            <div className="unit-stats">
              <div>
                <strong>{s.students}</strong>
                <small>Siswa</small>
              </div>
              <div>
                <strong>{s.teachers}</strong>
                <small>Guru</small>
              </div>
              <div>
                <strong>{s.attendance}%</strong>
                <small>Kehadiran</small>
              </div>
            </div>
            <div className="operation-detail">
              <p>
                Rata-rata nilai <strong>{s.average}/100</strong>
              </p>
              <p>
                Rapor terbit <strong>{s.reportsPublished}</strong>
              </p>
              <p>
                Tagihan <strong>{currency(s.invoiceTotal)}</strong>
              </p>
              <p>
                Penerimaan <strong>{currency(s.paidTotal)}</strong>
              </p>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
export function AdminDashboard() {
  const { data, go } = useApp();
  const incomplete = data.students.filter(
      (s) => !s.phone || !s.parent || !s.address,
    ),
    open = data.invoices.filter((i) => i.status !== "Lunas");
  return (
    <>
      <PageHead
        eyebrow="ADMINISTRASI YANG TERTATA"
        title={`${greeting()}, Bu Dewi`}
        description="Kelola data sekolah, presensi guru, dan pencatatan keuangan."
        action={
          <Button onClick={() => go("master")}>
            <Plus size={16} />
            Kelola data sekolah
          </Button>
        }
      />
      <TodayWork />
      <div className="metrics four">
        <Metric
          label="Siswa aktif"
          value={data.students.length}
          icon={Users}
          onClick={() => go("students")}
        />
        <Metric
          label="Guru & staf"
          value={data.teachers.length}
          icon={GraduationCap}
          tone="blue"
          onClick={() => go("master")}
        />
        <Metric
          label="Data perlu dilengkapi"
          value={incomplete.length}
          icon={ClipboardIcon}
          tone="amber"
          onClick={() => go("students")}
        />
        <Metric
          label="Tagihan belum lunas"
          value={open.length}
          icon={Wallet}
          tone="purple"
          onClick={() => go("finance")}
        />
      </div>
      <div className="dashboard-grid">
        <Panel title="Pusat administrasi">
          <div className="admin-shortcuts">
            {[
              ["master", "Data sekolah & impor Excel"],
              ["staff-attendance", "Catat absensi guru"],
              ["finance", "Tagihan & penerimaan SPP"],
              ["uniform", "Jadwal seragam"],
              ["schedule", "Jadwal pelajaran"],
              ["pickup", "Antar & jemput siswa"],
            ].map(([id, label]) => (
              <Button key={id} variant="secondary" onClick={() => go(id)}>
                {label}
                <ArrowRight size={16} />
              </Button>
            ))}
          </div>
        </Panel>
        <Panel
          title="Kelengkapan data siswa"
          subtitle="Periksa kontak wali dan alamat untuk administrasi sekolah."
        >
          {incomplete.slice(0, 6).map((s) => (
            <button
              className="admin-issue"
              key={s.id}
              onClick={() => go("students", s.id)}
            >
              <strong>{s.name}</strong>
              <span>
                {[
                  !s.phone && "Telepon",
                  !s.parent && "Wali",
                  !s.address && "Alamat",
                ]
                  .filter(Boolean)
                  .join(", ")}{" "}
                belum terisi
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
          {!incomplete.length && <Empty title="Data administrasi lengkap" />}
          <Button variant="ghost" onClick={() => go("students")}>
            Periksa semua siswa
            <ArrowRight size={15} />
          </Button>
        </Panel>
      </div>
      <Panel title="Kabar sekolah">
        {data.announcements.slice(0, 3).map((a) => (
          <button
            className="admin-issue"
            key={a.id}
            onClick={() => go("announcements")}
          >
            <strong>{a.title}</strong>
            <small>{date(a.date, true)}</small>
            <ChevronRight size={16} />
          </button>
        ))}
      </Panel>
    </>
  );
}
const ClipboardIcon = FileSpreadsheet;

export function Admissions() {
  const { data, user, save, reload, toast, selectedId } = useApp();
  const [filter, setFilter] = useState(
      selectedId === "Diterima" ? "Diterima" : "all",
    ),
    [query, setQuery] = useState(""),
    [form, setForm] = useState<Partial<Row> | null>(null),
    [enroll, setEnroll] = useState<Row | null>(null);
  const rows = data.admissions.filter(
    (a) =>
      (filter === "all" || a.status === filter) &&
      a.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHead
        eyebrow="AWAL PERJALANAN BARU"
        title="Penerimaan siswa baru"
        description="Kelola pendaftaran, verifikasi, dan hasil seleksi calon siswa."
        action={
          user.role === "admin" ? (
            <Button onClick={() => setForm({ status: "Verifikasi" })}>
              <Plus size={16} />
              Daftarkan calon siswa
            </Button>
          ) : undefined
        }
      />
      <div className="metrics three">
        {["Verifikasi", "Seleksi", "Diterima"].map((s, i) => (
          <Metric
            key={s}
            label={s}
            value={data.admissions.filter((a) => a.status === s).length}
            icon={[FileSpreadsheet, Users, GraduationCap][i]}
            tone={["amber", "blue", "teal"][i]}
            note="calon siswa"
          />
        ))}
      </div>
      <Panel title="Daftar calon siswa">
        <div className="table-toolbar">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Cari nama calon siswa…"
          />
          <select
            aria-label="Status pendaftaran"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Semua status</option>
            {[
              "Verifikasi",
              "Seleksi",
              "Diterima",
              "Tidak diterima",
              "Terdaftar",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Calon siswa</th>
                <th>Asal sekolah</th>
                <th>Orang tua</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.name}</strong>
                    <small className="cell-small">NISN {a.nisn}</small>
                  </td>
                  <td>{a.previousSchool}</td>
                  <td>
                    {a.parent}
                    <small className="cell-small">{a.phone}</small>
                  </td>
                  <td>
                    <Badge tone={tone(a.status)}>{a.status}</Badge>
                  </td>
                  <td>
                    {a.status === "Diterima" && !a.convertedStudentId && (
                      <Button variant="secondary" onClick={() => setEnroll(a)}>
                        Daftarkan ke kelas
                      </Button>
                    )}
                    {a.convertedStudentId && (
                      <Badge tone="green">Sudah menjadi siswa aktif</Badge>
                    )}
                    {user.role === "admin" && !a.convertedStudentId && (
                      <Button variant="ghost" onClick={() => setForm(a)}>
                        Tinjau pendaftaran
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty />}
      </Panel>
      {form && (
        <FormModal
          title={form.id ? "Tinjau pendaftaran" : "Pendaftaran calon siswa"}
          initial={form}
          fields={[
            { key: "name", label: "Nama lengkap", required: true },
            { key: "nisn", label: "NISN", required: true },
            { key: "previousSchool", label: "Asal sekolah", required: true },
            { key: "parent", label: "Nama orang tua", required: true },
            { key: "phone", label: "Telepon", type: "tel", required: true },
            {
              key: "status",
              label: "Status pendaftaran",
              required: true,
              options: [
                "Verifikasi",
                "Seleksi",
                "Diterima",
                "Tidak diterima",
              ].map((x) => ({ value: x, label: x })),
            },
          ]}
          onClose={() => setForm(null)}
          onSave={(v) =>
            save("admissions", {
              ...v,
              date: v.date || new Date().toISOString(),
            })
          }
        />
      )}
      {enroll && (
        <FormModal
          title={`Daftarkan ${enroll.name} ke kelas`}
          initial={{ classId: data.classes[0]?.id, gender: "P", address: "" }}
          fields={[
            {
              key: "classId",
              label: "Kelas tujuan",
              options: data.classes.map((c) => ({
                value: c.id,
                label: c.name,
              })),
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
            {
              key: "address",
              label: "Alamat",
              type: "textarea",
              required: true,
            },
          ]}
          onClose={() => setEnroll(null)}
          onSave={async (v) => {
            await api(`/api/admissions/${enroll.id}/enroll`, v);
            await reload();
            toast(
              "Siswa aktif dan draf rapor berhasil dibuat dari data pendaftaran.",
            );
          }}
        />
      )}
    </>
  );
}
