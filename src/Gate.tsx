import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  DoorOpen,
  Download,
  Flag,
  ScanLine,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { useApp, type Row, todayWIB, date, liveDate } from "./model";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  FormModal,
  Metric,
  PageHead,
  Panel,
  SearchBox,
  tone,
} from "./ui";
import { api } from "./App";
import { exportExcel } from "./export";
const opts = (list: string[]) => list.map((value) => ({ value, label: value }));
export function GateDashboard() {
  const { data, go } = useApp(),
    d = todayWIB();
  const logs = data.pickupLogs.filter((l) => l.date === d);
  const last = new Map<string, Row>();
  logs.forEach((l) => last.set(l.studentId, l));
  const inside = [...last.values()].filter((l) => l.action === "Antar");
  const waiting = data.gateIncidents.filter((i) => i.status === "Menunggu");
  return (
    <>
      <PageHead
        eyebrow="POS KEAMANAN SEKOLAH"
        title="Gerbang aman, perjalanan tercatat"
        description={
          liveDate() +
          " · Cocokkan identitas pengantar atau penjemput dengan hasil verifikasi."
        }
        action={
          <Button onClick={() => go("gate-scan")}>
            <ScanLine size={19} />
            Mulai pindai QR
          </Button>
        }
      />
      <section className="gate-hero">
        <ShieldCheck size={44} />
        <div>
          <h2>Verifikasi dulu, lalu catat masuk atau pulang.</h2>
          <p>
            QR tidak valid atau penjemput berbeda? Siswa tetap di area aman.
            Laporkan kejadian untuk konfirmasi Admin.
          </p>
        </div>
        <Button variant="secondary" onClick={() => go("gate-incidents")}>
          Laporkan kejadian
        </Button>
      </section>
      <div className="metrics three">
        <Metric
          label="Tercatat berada di sekolah"
          value={inside.length}
          icon={Users}
          note="berdasarkan catatan gerbang hari ini"
        />
        <Metric
          label="Sudah tercatat pulang"
          value={[...last.values()].filter((l) => l.action === "Jemput").length}
          icon={DoorOpen}
          tone="blue"
        />
        <Metric
          label="Menunggu konfirmasi Admin"
          value={waiting.length}
          icon={Flag}
          tone="amber"
          onClick={() => go("gate-incidents")}
        />
      </div>
      <Panel title="Pekerjaan pos keamanan">
        <div className="work-grid">
          <button className="work-item" onClick={() => go("gate-scan")}>
            <ScanLine size={24} />
            <div>
              <strong>Verifikasi pengantar / penjemput</strong>
              <small>Kamera, unggah gambar QR, atau kode dari kartu</small>
            </div>
          </button>
          <button className="work-item" onClick={() => go("gate-incidents")}>
            <Flag size={24} />
            <div>
              <strong>{waiting.length} kejadian menunggu keputusan</strong>
              <small>Periksa respons Admin sebelum memberi pengecualian</small>
            </div>
          </button>
        </div>
      </Panel>
      <Panel
        title="Siswa belum tercatat pulang"
        subtitle="Catatan gerbang tidak menggantikan absensi pembelajaran."
      >
        <div className="gate-students">
          {inside.slice(0, 12).map((l) => {
            const s = data.students.find((s) => s.id === l.studentId);
            return (
              <div className="person" key={l.studentId}>
                <Avatar photo={s?.photo} />
                <div>
                  <strong>{s?.name}</strong>
                  <small>
                    {data.classes.find((c) => c.id === s?.classId)?.name} ·
                    masuk {l.time} WIB
                  </small>
                </div>
              </div>
            );
          })}
          {!inside.length && (
            <Empty title="Belum ada siswa dengan catatan masuk yang terbuka" />
          )}
        </div>
      </Panel>
    </>
  );
}
export function GateScan() {
  const { data, reload, toast, go } = useApp();
  const [code, setCode] = useState(""),
    [verified, setVerified] = useState<Row | null>(null),
    [busy, setBusy] = useState(false),
    [camera, setCamera] = useState(false),
    [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null),
    controls = useRef<{ stop: () => void } | null>(null),
    reader = useRef<any>(null),
    running = useRef(false),
    cancelled = useRef(false);
  const current = useRef(code);
  current.current = code;
  const stop = () => {
    cancelled.current = true;
    controls.current?.stop();
    controls.current = null;
    if (video.current?.srcObject)
      (video.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
    setCamera(false);
  };
  useEffect(
    () => () => {
      cancelled.current = true;
      controls.current?.stop();
      if (video.current?.srcObject)
        (video.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
    },
    [],
  );
  const verify = async (value = code) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    setVerified(null);
    try {
      const result = await api("/api/pickup/verify", { qr: value });
      setCode(value);
      setVerified(result);
      toast("Kartu terverifikasi. Cocokkan identitas fisik sebelum mencatat.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      running.current = false;
    }
  };
  const start = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Kamera membutuhkan HTTPS dan browser yang mendukung. Gunakan unggah gambar atau kode kartu.",
      );
      return;
    }
    cancelled.current = false;
    setCamera(true);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (cancelled.current) return;
      const { DecodeHintType } = await import("@zxing/library");
      reader.current = new BrowserQRCodeReader(
        new Map([[DecodeHintType.TRY_HARDER, true]]),
      );
      const ctl = await reader.current.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        video.current!,
        (result: any, _error: any, control: any) => {
          if (result && !running.current) {
            control.stop();
            setCamera(false);
            void verify(result.getText());
          }
        },
      );
      if (cancelled.current) ctl.stop();
      else controls.current = ctl;
    } catch {
      stop();
      setError(
        "Kamera belum dapat dibuka. Izinkan akses kamera, atau gunakan unggah gambar QR.",
      );
    }
  };
  const image = async (file?: File) => {
    if (!file) return;
    stop();
    setError("");
    if (file.size > 8 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 8 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const { DecodeHintType } = await import("@zxing/library");
      let result;
      try {
        result = await new BrowserQRCodeReader(
          new Map([[DecodeHintType.TRY_HARDER, true]]),
        ).decodeFromImageUrl(url);
      } catch {
        result = await new BrowserQRCodeReader(
          new Map([
            [DecodeHintType.TRY_HARDER, true],
            [DecodeHintType.PURE_BARCODE, true],
          ]),
        ).decodeFromImageUrl(url);
      }
      await verify(result.getText());
    } catch {
      setError(
        "QR tidak terbaca pada gambar. Gunakan gambar yang jelas atau tempel kode kartu.",
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  const record = async (action: string) => {
    if (!verified || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/pickupLogs", {
        studentId: verified.student.id,
        qr: code,
        action,
      });
      await reload();
      toast(
        `${action === "Antar" ? "Kedatangan" : "Kepulangan"} tercatat dengan waktu server.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const latest = verified
    ? data.pickupLogs
        .filter(
          (l) => l.studentId === verified.student.id && l.date === todayWIB(),
        )
        .at(-1)
    : null;
  return (
    <>
      <PageHead
        title="Pindai QR gerbang"
        description="Verifikasi izin, cocokkan wajah siswa serta identitas penjemput, lalu catat kejadian."
      />
      <div className="scanner-grid">
        <Panel
          title="Pembaca QR"
          subtitle="Pemrosesan kamera dan gambar berlangsung di perangkat pengguna."
        >
          <div className="scanner-body">
            <div className={`scanner-window ${camera ? "active" : ""}`}>
              <video
                ref={video}
                muted
                playsInline
                autoPlay
                aria-label="Kamera pembaca QR"
              />
              {!camera && (
                <div className="scanner-placeholder">
                  <ScanLine size={56} />
                  <p>Siapkan kartu QR pengantar / penjemput</p>
                </div>
              )}
              <span className="scan-corner" />
            </div>
            <div className="operation-actions">
              <Button onClick={camera ? stop : start} disabled={busy}>
                <Camera size={17} />
                {camera ? "Hentikan kamera" : "Buka kamera"}
              </Button>
              <label className="btn secondary file-button">
                <Upload size={17} />
                Unggah gambar QR
                <input
                  aria-label="Unggah gambar QR"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    void image(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <label className="scanner-code">
              Kode kartu
              <input
                aria-label="Kode QR penjemput"
                placeholder="Tempel kode KK2.…"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setVerified(null);
                  setError("");
                }}
              />
            </label>
            <div className="operation-actions">
              <Button disabled={busy || !code.trim()} onClick={() => verify()}>
                Verifikasi kode
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  try {
                    const sample = await api("/api/demo-gate-card");
                    setCode(sample.qr);
                    setVerified(null);
                    toast("Kartu dummy siap. Tekan Verifikasi kode.");
                  } catch (e) {
                    toast((e as Error).message, true);
                  }
                }}
              >
                Gunakan kartu dummy
              </Button>
            </div>
            {error && (
              <div role="alert" className="form-error">
                {error}
              </div>
            )}
          </div>
        </Panel>
        <Panel
          title={
            verified ? "Hasil verifikasi" : "Identitas yang perlu dicocokkan"
          }
        >
          {verified ? (
            <div className="verified-card">
              <Badge tone="green">
                <ShieldCheck size={14} />
                Kartu aktif dan terverifikasi
              </Badge>
              <div className="person">
                <Avatar photo={verified.student.photo} size={74} />
                <div>
                  <h2>{verified.student.name}</h2>
                  <p>
                    {
                      data.classes.find(
                        (c) => c.id === verified.student.classId,
                      )?.name
                    }{" "}
                    · NIS {verified.student.nis || "—"}
                  </p>
                </div>
              </div>
              <dl>
                <dt>Pengantar / penjemput</dt>
                <dd>{verified.person.name}</dd>
                <dt>Hubungan</dt>
                <dd>{verified.person.relationship}</dd>
                <dt>Masa berlaku</dt>
                <dd>
                  {verified.temporary
                    ? date(verified.person.validOn)
                    : "Terdaftar, selama izin tetap aktif"}
                </dd>
                <dt>Catatan terakhir hari ini</dt>
                <dd>
                  {latest
                    ? `${latest.action} · ${latest.time} WIB`
                    : "Belum ada catatan"}
                </dd>
              </dl>
              <div className="callout blue">
                QR memverifikasi izin yang tercatat. Petugas tetap mencocokkan
                identitas orang yang hadir.
              </div>
              <div className="operation-actions">
                <Button
                  disabled={busy || latest?.action === "Antar"}
                  onClick={() => record("Antar")}
                >
                  Catat masuk / antar
                </Button>
                <Button
                  disabled={busy || latest?.action !== "Antar"}
                  variant="secondary"
                  onClick={() => record("Jemput")}
                >
                  Catat pulang / jemput
                </Button>
              </div>
              <Button
                variant="ghost"
                onClick={() => go("gate-incidents", verified.student.id)}
              >
                Identitas berbeda / perlu konfirmasi
              </Button>
            </div>
          ) : (
            <Empty
              title="Belum ada kartu yang diverifikasi"
              description="Hasil pemindaian menampilkan siswa, hubungan penjemput, serta masa berlaku izin."
            />
          )}
        </Panel>
      </div>
    </>
  );
}
export function GateHistory() {
  const { data, user } = useApp();
  const [day, setDay] = useState(todayWIB()),
    [query, setQuery] = useState("");
  const rows = data.pickupLogs.filter(
    (l) =>
      (!day || l.date === day) &&
      `${data.students.find((s) => s.id === l.studentId)?.name || ""} ${l.personName}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHead
        title="Riwayat gerbang"
        description="Catatan kedatangan dan kepulangan yang dibuat Security. Riwayat tidak dapat ditimpa."
        action={
          <Button
            variant="secondary"
            onClick={() =>
              exportExcel(
                rows.map((l) => ({
                  Tanggal: l.date,
                  WaktuWIB: l.time,
                  Siswa: data.students.find((s) => s.id === l.studentId)?.name,
                  Kegiatan: l.action,
                  Penjemput: l.personName,
                  Verifikasi: l.source,
                  Petugas: l.recordedBy,
                })),
                "Riwayat-gerbang",
              )
            }
          >
            <Download size={16} />
            Ekspor catatan
          </Button>
        }
      />
      <Panel
        title={`${rows.length} catatan`}
        action={
          <div className="operation-actions">
            <input
              type="date"
              aria-label="Tanggal riwayat gerbang"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder="Cari siswa atau penjemput…"
            />
          </div>
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Waktu (WIB)</th>
                <th>Siswa</th>
                <th>Kegiatan</th>
                <th>Pengantar / penjemput</th>
                <th>Verifikasi</th>
                <th>Petugas</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .slice()
                .reverse()
                .map((l) => (
                  <tr key={l.id}>
                    <td>
                      {date(l.date, true)} · {l.time}
                    </td>
                    <td>
                      {data.students.find((s) => s.id === l.studentId)?.name}
                    </td>
                    <td>{l.action}</td>
                    <td>{l.personName}</td>
                    <td>
                      <Badge tone={l.verified ? "green" : "amber"}>
                        {l.source}
                      </Badge>
                    </td>
                    <td>{l.recordedBy}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty title="Belum ada catatan untuk filter ini" />}
      </Panel>
    </>
  );
}
export function GateIncidents() {
  const { data, user, selectedId, reload, toast } = useApp();
  const [form, setForm] = useState<Partial<Row> | null>(null),
    [busy, setBusy] = useState("");
  const security = user.role === "security";
  const submit = async (v: Partial<Row>) => {
    await api("/api/gate-incidents", v);
    await reload();
    toast(
      security
        ? "Kejadian dilaporkan kepada Admin."
        : "Keputusan tersimpan untuk petugas gerbang.",
    );
  };
  return (
    <>
      <PageHead
        title={
          security
            ? "Kejadian & konfirmasi gerbang"
            : "Konfirmasi pengecualian gerbang"
        }
        description={
          security
            ? "Siswa tetap di area aman selama izin belum dikonfirmasi Admin."
            : "Periksa identitas dan konfirmasi kepada wali sebelum memberi izin satu kali."
        }
        action={
          security ? (
            <Button
              onClick={() =>
                setForm({
                  studentId: selectedId || data.students[0]?.id,
                  category: "Penjemput tidak terdaftar",
                  relationship: "Lainnya",
                })
              }
            >
              <Flag size={17} />
              Laporkan kejadian
            </Button>
          ) : undefined
        }
      />
      <div className="card-grid">
        {data.gateIncidents
          .slice()
          .reverse()
          .map((i) => (
            <Panel key={i.id}>
              <Badge
                tone={
                  i.status === "Menunggu"
                    ? "amber"
                    : i.status === "Ditolak"
                      ? "red"
                      : "green"
                }
              >
                {i.used ? "Izin sudah digunakan" : i.status}
              </Badge>
              <small className="data-freshness">
                {date(i.date, true)} · {i.recordedBy}
              </small>
              <h3 className="card-title">
                {data.students.find((s) => s.id === i.studentId)?.name}
              </h3>
              <strong>{i.category}</strong>
              <p className="card-copy">{i.note}</p>
              {i.personName && (
                <p className="card-copy">
                  {i.personName} · {i.relationship}
                </p>
              )}
              {i.decisionNote && (
                <div className="task-response">
                  <strong>Keputusan Admin</strong>
                  <p>{i.decisionNote}</p>
                </div>
              )}
              {!security && i.status === "Menunggu" && (
                <Button onClick={() => setForm({ ...i, status: "Ditangani" })}>
                  Tinjau & beri keputusan
                </Button>
              )}
              {security &&
                i.status === "Izinkan sekali" &&
                !i.used &&
                i.date === todayWIB() && (
                  <Button
                    disabled={busy === i.id}
                    onClick={async () => {
                      setBusy(i.id);
                      try {
                        await api("/api/pickupLogs", {
                          studentId: i.studentId,
                          incidentId: i.id,
                          action: "Jemput",
                          note: "Izin pengecualian satu kali dari Admin.",
                        });
                        await reload();
                        toast("Kepulangan dengan izin Admin tercatat.");
                      } catch (e) {
                        toast((e as Error).message, true);
                      } finally {
                        setBusy("");
                      }
                    }}
                  >
                    Catat jemput dengan izin Admin
                  </Button>
                )}
            </Panel>
          ))}
      </div>
      {!data.gateIncidents.length && (
        <Empty title="Belum ada kejadian dilaporkan" />
      )}
      {form && (
        <FormModal
          title={
            security ? "Laporan kejadian gerbang" : "Keputusan pengecualian"
          }
          initial={form}
          fields={
            security
              ? [
                  {
                    key: "studentId",
                    label: "Siswa",
                    options: data.students.map((s) => ({
                      value: s.id,
                      label: s.name,
                    })),
                    required: true,
                  },
                  {
                    key: "category",
                    label: "Kategori",
                    options: opts([
                      "Penjemput tidak terdaftar",
                      "QR tidak valid",
                      "Keterlambatan penjemputan",
                      "Data kedatangan belum tercatat",
                      "Kondisi darurat",
                    ]),
                    required: true,
                  },
                  { key: "personName", label: "Nama orang yang hadir" },
                  {
                    key: "relationship",
                    label: "Hubungan",
                    options: opts([
                      "Ayah",
                      "Ibu",
                      "Saudara",
                      "Pengasuh",
                      "Lainnya",
                    ]),
                  },
                  {
                    key: "note",
                    label: "Kronologi dan tindakan sementara",
                    type: "textarea",
                    required: true,
                  },
                ]
              : [
                  {
                    key: "status",
                    label: "Keputusan",
                    options: opts(["Izinkan sekali", "Ditolak", "Ditangani"]),
                    required: true,
                  },
                  {
                    key: "decisionNote",
                    label: "Hasil konfirmasi & arahan",
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
