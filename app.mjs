import express from "express";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { seed } from "./seed.mjs";
import { seedOperations } from "./seed-operations.mjs";
import {
  roleNames,
  normalizeUser,
  canReadAcademic,
  canIntervene,
  canReviewReport,
} from "./shared/access.mjs";

const names = {
  principal: "Dr. Ahmad Hidayat, M.Pd.",
  admin: "Dewi Puspitasari",
  teacher: "Ratna Wulandari, S.Pd.",
  parent: "Dian Prameswari",
  student: "Nadia Azzahra",
  foundation: "Hasan Pradana, M.Pd.",
};
const schools = [
  {
    id: "s1",
    name: "SMA Nusantara",
    city: "Bandung",
    short: "N",
    color: "#008e83",
  },
  {
    id: "s2",
    name: "SMA Cendekia",
    city: "Jakarta",
    short: "C",
    color: "#5575ce",
  },
  {
    id: "s3",
    name: "SMA Bina Bangsa",
    city: "Yogyakarta",
    short: "B",
    color: "#a66a3b",
  },
];
const kinds = [
  "students",
  "teachers",
  "classes",
  "subjects",
  "grades",
  "attendance",
  "assignments",
  "submissions",
  "quizzes",
  "reports",
  "announcements",
  "invoices",
  "payments",
  "interventions",
  "schedule",
  "settings",
  "audit",
  "materials",
  "admissions",
  "staffAttendance",
  "leaveRequests",
  "uniforms",
  "uniformOverrides",
  "character",
  "tahfizh",
  "pickupPersons",
  "pickupLogs",
];
const academicKinds = new Set([
  "grades",
  "attendance",
  "assignments",
  "submissions",
  "quizzes",
  "reports",
  "interventions",
  "materials",
  "character",
  "tahfizh",
]);
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
const validDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value));
class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const deny = (
  message = "Peran ini tidak memiliki izin untuk tindakan tersebut.",
) => {
  throw new RequestError(403, message);
};
const invalid = (message) => {
  throw new RequestError(400, message);
};
export function createApplication({ databasePath, secureCookies = false }) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, school TEXT NOT NULL, kind TEXT NOT NULL, body TEXT NOT NULL); CREATE INDEX IF NOT EXISTS scope ON records(school,kind); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, body TEXT NOT NULL, expires INTEGER NOT NULL);",
  );
  const put = (kind, school, item) => {
    db.prepare(
      "INSERT INTO records VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body",
    ).run(item.id, school, kind, JSON.stringify(item));
    return item;
  };
  const all = (school, kind) =>
    db
      .prepare("SELECT body FROM records WHERE school=? AND kind=?")
      .all(school, kind)
      .map((r) => JSON.parse(r.body));
  if (!db.prepare("SELECT id FROM records LIMIT 1").get()) {
    db.exec("BEGIN");
    try {
      seed((kind, school, item) => {
        if (kinds.includes(kind)) put(kind, school, item);
      });
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  let migrated = false;
  if (!db.prepare("SELECT id FROM records WHERE id='operations-v2'").get()) {
    db.exec("BEGIN");
    try {
      seedOperations((kind, school, item) => put(kind, school, item), all);
      put("metadata", "system", {
        id: "operations-v2",
        version: 2,
        qrKey: randomBytes(32).toString("hex"),
      });
      db.exec("COMMIT");
      migrated = true;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  const qrKey = JSON.parse(
    db.prepare("SELECT body FROM records WHERE id='operations-v2'").get().body,
  ).qrKey;
  const audit = (user, action) =>
    put("audit", user.school, {
      id: `${user.school}-audit-${randomBytes(8).toString("hex")}`,
      actor: user.name,
      action,
      date: new Date().toISOString(),
    });
  const teaching = (user) => user.role === "teacher";
  const personal = (user) => ["parent", "student"].includes(user.role);
  const accessibleStudent = (user, student) =>
    !!student &&
    user.role !== "foundation" &&
    (!personal(user) || student.id === user.studentId) &&
    (!teaching(user) || user.classIds.includes(student.classId));
  const getStudent = (user, id) => {
    const student = all(user.school, "students").find((s) => s.id === id);
    if (!accessibleStudent(user, student))
      deny("Siswa berada di luar akses Anda.");
    return student;
  };
  const ownClass = (user, classId) =>
    !teaching(user) || user.classIds.includes(classId);
  const qrToken = (school, person) => {
    const payload = Buffer.from(
      JSON.stringify({
        school,
        personId: person.id,
        studentId: person.studentId,
        validOn: person.validOn || null,
      }),
    ).toString("base64url");
    return `KK2.${payload}.${createHmac("sha256", qrKey).update(payload).digest("base64url")}`;
  };
  function verifyQR(user, code) {
    const [prefix, payload, signature, ...extra] = String(code || "").split(
      ".",
    );
    if (prefix !== "KK2" || !payload || !signature || extra.length)
      invalid("QR tidak dikenali.");
    const expected = Buffer.from(
        createHmac("sha256", qrKey).update(payload).digest("base64url"),
      ),
      actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      invalid("Tanda verifikasi QR tidak valid.");
    let parsed;
    try {
      parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    } catch {
      invalid("Isi QR tidak valid.");
    }
    if (parsed.school !== user.school) deny("QR berasal dari sekolah lain.");
    const person = all(user.school, "pickupPersons").find(
      (p) =>
        p.id === parsed.personId &&
        p.studentId === parsed.studentId &&
        p.status !== "Nonaktif",
    );
    if (!person) invalid("Penjemput tidak lagi terdaftar.");
    if (person.validOn && person.validOn !== today())
      invalid(`QR pengganti hanya berlaku pada ${person.validOn}.`);
    return {
      person,
      student: getStudent(user, person.studentId),
      temporary: !!person.validOn,
    };
  }
  function scoped(user, kind, items) {
    if (user.role === "foundation")
      return kind === "announcements"
        ? items.filter(
            (a) =>
              a.status !== "Draf" &&
              (!a.audience || ["Semua", "Yayasan"].includes(a.audience)),
          )
        : kind === "settings"
          ? items.map(({ name, year, semester, principal, id }) => ({
              name,
              year,
              semester,
              principal,
              id,
            }))
          : [];
    if (user.role === "admin" && academicKinds.has(kind)) return [];
    if (kind === "character" || kind === "tahfizh") {
      if (teaching(user) && !user.isHomeroom) return [];
    }
    if (kind === "quizzes" && user.role === "parent") return [];
    if (kind === "interventions" && teaching(user) && !user.isHomeroom)
      return [];
    if (
      !["admin", "parent"].includes(user.role) &&
      ["invoices", "payments"].includes(kind)
    )
      return [];
    const students = all(user.school, "students").filter((s) =>
        accessibleStudent(user, s),
      ),
      ids = new Set(students.map((s) => s.id));
    if (kind === "students")
      return students.map((s) =>
        user.role === "admin"
          ? Object.fromEntries(
              Object.entries(s).filter(
                ([key]) => !["attendance", "history", "overdue"].includes(key),
              ),
            )
          : s,
      );
    if (
      [
        "grades",
        "attendance",
        "reports",
        "invoices",
        "payments",
        "interventions",
        "submissions",
        "character",
        "tahfizh",
      ].includes(kind)
    ) {
      const filtered = items.filter(
        (i) =>
          ids.has(i.studentId) &&
          (!teaching(user) ||
            !["interventions", "character", "tahfizh"].includes(kind) ||
            students.find((s) => s.id === i.studentId)?.classId ===
              user.homeroomClassId),
      );
      return kind === "reports" && personal(user)
        ? filtered.filter((r) => r.status === "Terbit")
        : filtered;
    }
    if (
      ["classes", "assignments", "quizzes", "schedule", "materials"].includes(
        kind,
      )
    ) {
      if (personal(user))
        return items.filter(
          (i) => (i.classId || i.id) === students[0]?.classId,
        );
      if (teaching(user))
        return items.filter(i=>user.classIds.includes(i.classId||i.id)&&(!['assignments','quizzes','materials'].includes(kind)||user.subjectIds.includes(i.subjectId||all(user.school,'subjects').find(s=>s.name===i.subject)?.id)));
    }
    if (kind === "teachers") {
      if (personal(user)) return [];
      if (teaching(user))
        return items.map(({ id, name, subject, photo }) => ({
          id,
          name,
          subject,
          photo,
        }));
    }
    if (kind === "staffAttendance")
      return personal(user)
        ? []
        : teaching(user)
          ? items.filter((i) => i.teacherId === user.teacherId)
          : items;
    if (kind === "leaveRequests")
      return personal(user)
        ? []
        : teaching(user)
          ? items.filter((i) => i.teacherId === user.teacherId)
          : user.role === "admin"
            ? items.map(({ id, teacherId, from, to, status, type }) => ({
                id,
                teacherId,
                from,
                to,
                status,
                type,
              }))
            : items;
    if (["pickupPersons", "pickupLogs"].includes(kind))
      return ["admin", "principal", "parent"].includes(user.role)
        ? items.filter((i) => ids.has(i.studentId))
        : [];
    if (kind === "audit") return user.role === "admin" ? items : [];
    if (kind === "admissions") return user.role === "admin" ? items : [];
    if (kind === "announcements")
      return items.filter(
        (a) =>
          (["admin"].includes(user.role) || a.status !== "Draf") &&
          (!a.classId || students.some((s) => s.classId === a.classId)) &&
          (!a.audience ||
            a.audience === "Semua" ||
            a.audience === roleNames[user.role] ||
            (user.role === "parent" && a.audience === "Orang Tua")),
      );
    return items;
  }
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "4mb" }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    next();
  });
  const rates = new Map();
  app.use("/api", (req, res, next) => {
    const now = Date.now(),
      key = req.ip;
    let entry = rates.get(key);
    if (!entry || now - entry.at > 60000) {
      entry = { at: now, count: 0 };
      rates.set(key, entry);
    }
    if (++entry.count > 600)
      return res
        .status(429)
        .json({ error: "Terlalu banyak permintaan. Coba sebentar lagi." });
    next();
  });
  app.post("/api/session", (req, res) => {
    const { role = "principal", school = "s1", isHomeroom = false } = req.body;
    if (
      !Object.hasOwn(roleNames, role) ||
      !schools.some((s) => s.id === school)
    )
      return res.status(400).json({ error: "Peran atau sekolah tidak valid." });
    const user = normalizeUser({
      role,
      school,
      name: names[role],
      studentId: `${school}-st-0`,
      classIds: [`${school}-cl-0`, `${school}-cl-1`],
      isHomeroom: role === "teacher" && isHomeroom === true,
    });
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
      token,
      JSON.stringify(user),
      Date.now() + 86400000,
    );
    res.cookie("kk_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: secureCookies || req.secure,
      maxAge: 86400000,
    });
    res.json(user);
  });
  app.use("/api", (req, res, next) => {
    const token = (req.headers.cookie || "")
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("kk_session="))
      ?.split("=")[1];
    const row =
      token &&
      db
        .prepare("SELECT body FROM sessions WHERE token=? AND expires>?")
        .get(token, Date.now());
    if (!row)
      return res.status(401).json({ error: "Silakan pilih peran demo." });
    const user = normalizeUser(JSON.parse(row.body));
    if (!Object.hasOwn(roleNames, user.role))
      return res
        .status(401)
        .json({ error: "Silakan pilih kembali peran demo." });
    req.user = user;
    next();
  });
  app.get("/api/bootstrap", (req, res) => {
    const user = req.user,
      data = Object.fromEntries(
        kinds.map((kind) => [kind, scoped(user, kind, all(user.school, kind))]),
      );
    if (personal(user))
      data.quizzes = data.quizzes.map((q) => ({
        ...q,
        questions: q.questions.map(({ answer, ...question }) => question),
      }));
    data.pickupPersons = data.pickupPersons.map((person) => ({
      ...person,
      qr: qrToken(user.school, person),
    }));
    const school = {
      ...schools.find((s) => s.id === user.school),
      name:
        all(user.school, "settings")[0]?.name ||
        schools.find((s) => s.id === user.school).name,
    };
    const overview =
      user.role === "foundation"
        ? schools.map((s) => {
            const students = all(s.id, "students"),
              grades = all(s.id, "grades"),
              invoices = all(s.id, "invoices");
            return {
              ...s,
              students: students.length,
              teachers: all(s.id, "teachers").length,
              attendance: Math.round(
                students.reduce((a, b) => a + b.attendance, 0) /
                  Math.max(students.length, 1),
              ),
              average: Math.round(
                grades.reduce((a, b) => a + b.score, 0) /
                  Math.max(grades.length, 1),
              ),
              reportsPublished: all(s.id, "reports").filter(
                (r) => r.status === "Terbit",
              ).length,
              invoiceTotal: invoices.reduce((a, i) => a + i.amount, 0),
              paidTotal: invoices.reduce(
                (a, i) =>
                  a + (i.paidAmount ?? (i.status === "Lunas" ? i.amount : 0)),
                0,
              ),
            };
          })
        : [];
    res.json({
      user,
      schools,
      school,
      data,
      overview,
      features: {
        externalIntegrations: false,
        chat: false,
        paymentGateway: false,
        ai: false,
        reportGeneration: "browser",
      },
    });
  });
  function ensureWrite(user, kind, item, original) {
    const role = user.role;
    const writers = {
      students: ["admin"],
      teachers: ["admin"],
      classes: ["admin"],
      subjects: ["admin"],
      settings: ["admin"],
      admissions: ["admin"],
      invoices: ["admin"],
      uniforms: ["admin"],
      uniformOverrides: ["admin"],
      schedule: ["admin"],
      grades: ["teacher"],
      attendance: ["teacher"],
      assignments: ["teacher"],
      quizzes: ["teacher"],
      materials: ["teacher"],
      submissions: ["teacher", "student"],
      reports: ["principal", "teacher"],
      interventions: ["principal", "teacher"],
      character: ["teacher"],
      tahfizh: ["teacher"],
      announcements: ["admin", "principal", "teacher"],
      staffAttendance: ["admin", "teacher"],
      leaveRequests: ["teacher", "principal"],
      pickupPersons: ["admin", "parent"],
      pickupLogs: ["admin"],
    };
    if (!writers[kind]?.includes(role)) deny();
    if (["messages", "integrations", "leads", "jobs"].includes(kind))
      deny("Fitur ini tidak tersedia pada versi ini.");
    if (
      [
        "students",
        "teachers",
        "classes",
        "subjects",
        "settings",
        "admissions",
        "invoices",
        "uniforms",
        "uniformOverrides",
      ].includes(kind) &&
      role !== "admin"
    )
      deny();
    if (
      ["grades", "attendance", "assignments", "quizzes", "materials"].includes(
        kind,
      ) &&
      role !== "teacher"
    )
      deny();
    if (kind === "interventions" && !canIntervene(user)) deny();
    if (
      ["character", "tahfizh"].includes(kind) &&
      !(role === "teacher" && user.isHomeroom)
    )
      deny();
    if (
      kind === "reports" &&
      !canReviewReport(user, item.classId || original?.classId)
    )
      deny(
        "Persetujuan rapor hanya untuk kepala sekolah dan wali kelas siswa tersebut.",
      );
    if (
      kind === "announcements" &&
      !["admin", "principal", "teacher"].includes(role)
    )
      deny();
    if (kind === "submissions" && !["teacher", "student"].includes(role))
      deny();
    if (kind === "staffAttendance" && !["admin", "teacher"].includes(role))
      deny();
    if (kind === "leaveRequests" && !["teacher", "principal"].includes(role))
      deny();
    if (kind === "pickupPersons" && !["admin", "parent"].includes(role)) deny();
    if (kind === "pickupLogs" && role !== "admin") deny();
    if (!kinds.includes(kind)) deny();
    for (const record of [original, item]) {
      if (!record) continue;
      if (record.studentId) {
        const student = getStudent(user, record.studentId);
        if (
          ["character", "tahfizh", "reports", "interventions"].includes(kind) &&
          role === "teacher" &&
          student.classId !== user.homeroomClassId
        )
          deny("Tindakan ini hanya tersedia pada kelas perwalian Anda.");
      }
      if (record.classId && !ownClass(user, record.classId))
        deny("Kelas berada di luar akses Anda.");
      if (
        ["grades", "assignments", "quizzes", "materials"].includes(kind) &&
        role === "teacher"
      ) {
        const subject =
          record.subjectId ||
          all(user.school, "subjects").find((s) => s.name === record.subject)
            ?.id;
        if (subject && !user.subjectIds.includes(subject))
          deny("Mata pelajaran ini tidak ditugaskan kepada Anda.");
      }
      if (
        ["staffAttendance", "leaveRequests"].includes(kind) &&
        role === "teacher" &&
        record.teacherId &&
        record.teacherId !== user.teacherId
      )
        deny("Anda hanya dapat memperbarui data kehadiran sendiri.");
    }
  }
  function saveRecord(user, kind, body, { log = true } = {}) {
    let item = {
      ...body,
      id: body.id || `${user.school}-${kind}-${randomBytes(7).toString("hex")}`,
    };
    const stored =
      body.id &&
      db
        .prepare("SELECT school,kind,body FROM records WHERE id=?")
        .get(body.id);
    if (stored && (stored.school !== user.school || stored.kind !== kind))
      deny("Data berada di luar sekolah Anda.");
    const original = stored && JSON.parse(stored.body);
    ensureWrite(user, kind, item, original);
    if (kind === "students") {
      if (!item.name?.trim() || !/^\d{10}$/.test(item.nisn || ""))
        invalid("Nama dan NISN 10 digit wajib diisi.");
      if (
        all(user.school, "students").some(
          (s) => s.nisn === item.nisn && s.id !== item.id,
        )
      )
        invalid("NISN sudah terdaftar.");
      if (!all(user.school, "classes").some((c) => c.id === item.classId))
        invalid("Kelas tidak valid.");
      item = {
        attendance: 100,
        history: [80, 80, 80, 80],
        overdue: 0,
        status: "Aktif",
        ...original,
        ...item,
      };
    }
    if (
      [
        "grades",
        "attendance",
        "reports",
        "interventions",
        "character",
        "tahfizh",
        "pickupPersons",
        "pickupLogs",
      ].includes(kind) &&
      !item.studentId
    )
      invalid("Siswa wajib dipilih.");
    if (
      [
        "teachers",
        "classes",
        "subjects",
        "assignments",
        "quizzes",
        "announcements",
        "materials",
        "admissions",
      ].includes(kind) &&
      !(item.name || item.title)?.trim()
    )
      invalid("Nama atau judul wajib diisi.");
    if (kind === "settings") {
      if (
        item.gradeScale &&
        !["100", "10", "4", "letter"].includes(item.gradeScale)
      )
        invalid("Skala nilai tidak valid.");
      if (
        Number(item.weightDaily) +
          Number(item.weightMidterm) +
          Number(item.weightFinal) !==
        100
      )
        invalid("Total bobot nilai harus 100%.");
      if (item.kkm < 0 || item.kkm > 100) invalid("KKM harus bernilai 0–100.");
      item = {
        ...original,
        ...item,
        ewsAttendance: original?.ewsAttendance || 80,
        ewsDrop: original?.ewsDrop || 10,
        ewsOverdue: original?.ewsOverdue || 3,
      };
    }
    if (kind === "grades") {
      if (!Number.isFinite(item.score) || item.score < 0 || item.score > 100)
        invalid("Nilai harus 0–100.");
      getStudent(user, item.studentId);
      if (!all(user.school, "subjects").some((s) => s.id === item.subjectId))
        invalid("Mata pelajaran tidak valid.");
    }
    if (kind === "attendance") {
      const student = getStudent(user, item.studentId);
      if (
        !["Hadir", "Sakit", "Izin", "Alpa"].includes(item.status) ||
        !validDate(item.date)
      )
        invalid("Tanggal atau status kehadiran tidak valid.");
      item.classId = student.classId;
      const duplicate = all(user.school, "attendance").find(
        (a) =>
          a.studentId === student.id &&
          a.date === item.date &&
          a.id !== item.id,
      );
      if (duplicate) item.id = duplicate.id;
    }
    if (
      kind === "interventions" &&
      (!item.title?.trim() ||
        !item.pic?.trim() ||
        !validDate(item.due) ||
        !["Direncanakan", "Berjalan", "Selesai"].includes(item.status))
    )
      invalid("Rencana, penanggung jawab, tanggal, dan status wajib diisi.");
    if (kind === "reports") {
      const student = getStudent(user, item.studentId);
      item.classId = student.classId;
      if (!canReviewReport(user, student.classId)) deny();
      if (
        item.status === "Terbit" &&
        all(user.school, "subjects").some(
          (subject) =>
            !all(user.school, "grades").some(
              (g) => g.studentId === student.id && g.subjectId === subject.id,
            ),
        )
      )
        invalid("Lengkapi seluruh nilai sebelum menerbitkan rapor.");
    }
    if (kind === "invoices") {
      if (!original) {
        if (
          !item.title?.trim() ||
          !Number.isFinite(item.amount) ||
          item.amount <= 0 ||
          !validDate(item.due)
        )
          invalid("Data tagihan tidak valid.");
        getStudent(user, item.studentId);
        item = { ...item, status: "Belum lunas", paidAmount: 0 };
      } else {
        const amount = Number(body.paymentAmount),
          paid =
            original.paidAmount ??
            (original.status === "Lunas" ? original.amount : 0);
        if (
          !Number.isFinite(amount) ||
          amount <= 0 ||
          amount > original.amount - paid
        )
          invalid("Nominal pembayaran harus sesuai sisa tagihan.");
        if (
          !["Tunai", "Transfer manual"].includes(body.method) ||
          !validDate(body.paymentDate)
        )
          invalid("Metode dan tanggal pembayaran wajib diisi.");
        item = {
          ...original,
          paidAmount: paid + amount,
          status: paid + amount === original.amount ? "Lunas" : "Sebagian",
          paidAt: body.paymentDate,
          method: body.method,
          receipt: `KK-${Date.now()}-${randomBytes(2).toString("hex")}`,
        };
        put("payments", user.school, {
          id: `${user.school}-payment-${randomBytes(7).toString("hex")}`,
          studentId: original.studentId,
          invoiceId: original.id,
          amount,
          method: body.method,
          date: body.paymentDate,
          receipt: item.receipt,
          note: body.note || "",
          recordedBy: user.name,
        });
      }
    }
    if (kind === "submissions") {
      const assignment = all(user.school, "assignments").find(
        (a) => a.id === item.assignmentId,
      );
      if (!assignment) invalid("Tugas tidak ditemukan.");
      if (user.role === "teacher") {
        const subject = all(user.school, "subjects").find(
          (s) => s.name === assignment.subject,
        );
        if (!user.subjectIds.includes(subject?.id))
          deny("Mata pelajaran ini tidak ditugaskan kepada Anda.");
      }
      const student = getStudent(user, item.studentId || user.studentId);
      if (student.classId !== assignment.classId)
        deny("Tugas bukan untuk kelas siswa ini.");
      if (user.role === "student") {
        item = {
          ...item,
          studentId: user.studentId,
          status: "Dikumpulkan",
          date: new Date().toISOString(),
        };
        delete item.score;
        delete item.feedback;
      } else if (
        item.score != null &&
        (!Number.isFinite(item.score) || item.score < 0 || item.score > 100)
      )
        invalid("Nilai harus 0–100.");
    }
    if (
      ["assignments", "quizzes"].includes(kind) &&
      (!validDate(item.due) ||
        !all(user.school, "classes").some((c) => c.id === item.classId))
    )
      invalid("Kelas dan tenggat wajib diisi.");
    if (kind === "announcements") {
      if (item.status && !["Draf", "Terbit"].includes(item.status))
        invalid("Status pengumuman tidak valid.");
      item.category = item.category || "Akademik";
      item.date = item.date || today();
      item.status = item.status || "Terbit";
      item.author = user.name;
      if (user.role === "teacher")
        item.classId = item.classId || user.homeroomClassId || user.classIds[0];
    }
    if (kind === "staffAttendance") {
      if (user.role === "teacher") item.teacherId = user.teacherId;
      if (
        !all(user.school, "teachers").some((t) => t.id === item.teacherId) ||
        !validDate(item.date) ||
        !["Hadir", "Sakit", "Izin", "Alpa"].includes(item.status)
      )
        invalid("Data absensi guru tidak valid.");
      const duplicate = all(user.school, "staffAttendance").find(
        (a) => a.teacherId === item.teacherId && a.date === item.date,
      );
      if (duplicate) item = { ...duplicate, ...item, id: duplicate.id };
    }
    if (kind === "leaveRequests") {
      if (user.role === "teacher") {
        if (original && original.status !== "Menunggu")
          deny("Pengajuan yang telah diputuskan tidak dapat diubah.");
        if (
          !validDate(item.from) ||
          !validDate(item.to) ||
          item.to < item.from ||
          !item.reason?.trim()
        )
          invalid("Tanggal dan alasan izin wajib diisi.");
        item = {
          ...item,
          teacherId: user.teacherId,
          status: "Menunggu",
          decisionNote: "",
          created: new Date().toISOString(),
        };
      } else {
        if (!original || !["Disetujui", "Ditolak"].includes(item.status))
          invalid("Pilih keputusan izin.");
        item = {
          ...original,
          status: item.status,
          decisionNote: String(item.decisionNote || ""),
          decidedBy: user.name,
          decidedAt: new Date().toISOString(),
        };
      }
    }
    if (
      kind === "schedule" &&
      (!all(user.school, "classes").some((c) => c.id === item.classId) ||
        !["Senin", "Selasa", "Rabu", "Kamis", "Jumat"].includes(item.day) ||
        !/^([01]\d|2[0-3])[.:][0-5]\d [–-] ([01]\d|2[0-3])[.:][0-5]\d$/.test(
          item.time || "",
        ) ||
        !item.subject?.trim() ||
        !item.teacher?.trim() ||
        !item.room?.trim())
    )
      invalid("Kelas, hari, jam, mata pelajaran, guru, dan ruang wajib diisi.");
    if (
      kind === "uniformOverrides" &&
      (!validDate(item.date) || !item.name?.trim())
    )
      invalid("Tanggal dan seragam wajib diisi.");
    if (
      kind === "uniforms" &&
      (!item.name?.trim() ||
        !Number.isInteger(Number(item.weekday)) ||
        item.weekday < 1 ||
        item.weekday > 5)
    )
      invalid("Hari dan nama seragam wajib diisi.");
    if (kind === "character") {
      if (
        !item.dimension?.trim() ||
        !Number.isInteger(item.score) ||
        item.score < 1 ||
        item.score > 4
      )
        invalid("Dimensi P5 dan capaian 1–4 wajib diisi.");
    }
    if (
      kind === "tahfizh" &&
      (!item.surah?.trim() || !item.verses?.trim() || !item.character?.trim())
    )
      invalid("Surah, ayat, dan catatan akhlak wajib diisi.");
    if (kind === "pickupPersons") {
      if (
        !item.name?.trim() ||
        !item.relationship?.trim() ||
        !item.phone?.trim()
      )
        invalid("Nama, hubungan, dan telepon penjemput wajib diisi.");
      if (item.validOn && !validDate(item.validOn))
        invalid("Tanggal penjemput pengganti tidak valid.");
      delete item.qr;
      item.status = item.status || "Aktif";
    }
    if (kind === "pickupLogs") {
      if (original) deny("Catatan antar-jemput tidak dapat ditimpa.");
      if (!["Antar", "Jemput"].includes(item.action))
        invalid("Pilih Antar atau Jemput.");
      let person;
      if (item.qr) {
        const verified = verifyQR(user, item.qr);
        if (verified.student.id !== item.studentId)
          invalid("QR bukan untuk siswa yang dipilih.");
        person = verified.person;
      } else {
        person = all(user.school, "pickupPersons").find(
          (p) =>
            p.id === item.personId &&
            p.studentId === item.studentId &&
            p.status !== "Nonaktif" &&
            (!p.validOn || p.validOn === today()),
        );
        if (!person && !item.note?.trim())
          invalid("Catatan wajib untuk penjemput yang tidak terdaftar.");
      }
      item = {
        id: item.id,
        studentId: item.studentId,
        action: item.action,
        personId: person?.id || null,
        personName: person?.name || item.personName || "Tidak terdaftar",
        relationship: person?.relationship || "Lainnya",
        verified: !!person,
        source: item.qr ? "QR" : "Manual",
        note: item.note || "",
        date: today(),
        time: new Date().toLocaleTimeString("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
        }),
        recordedBy: user.name,
      };
    }
    put(kind, user.school, item);
    if (["attendance", "grades", "submissions"].includes(kind)) {
      const student = all(user.school, "students").find(
        (s) => s.id === item.studentId,
      );
      if (student) {
        const next = { ...student };
        if (kind === "attendance") {
          const rows = all(user.school, "attendance").filter(
            (a) => a.studentId === student.id,
          );
          next.attendance = Math.round(
            (rows.filter((a) => a.status === "Hadir").length / rows.length) *
              100,
          );
        }
        if (kind === "grades") {
          const grades = all(user.school, "grades").filter(
            (g) => g.studentId === student.id,
          );
          next.history = [
            ...(student.history || [80, 80, 80, 80]).slice(0, -1),
            Math.round(grades.reduce((a, g) => a + g.score, 0) / grades.length),
          ];
        }
        if (kind === "submissions") {
          const submissions = all(user.school, "submissions").filter(
            (s) => s.studentId === student.id,
          );
          next.overdue = all(user.school, "assignments").filter(
            (a) =>
              a.classId === student.classId &&
              !submissions.some((s) => s.assignmentId === a.id),
          ).length;
        }
        put("students", user.school, next);
      }
    }
    if (log)
      audit(
        user,
        `${original ? "Memperbarui" : "Menambahkan"} ${kind}: ${item.name || item.title || item.studentId || item.id}`,
      );
    return item;
  }
  const transactional = (fn) => {
    db.exec("BEGIN");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
  app.post("/api/academic-batch", (req, res) => {
    const { kind, rows } = req.body;
    if (
      !["grades", "attendance"].includes(kind) ||
      !Array.isArray(rows) ||
      !rows.length ||
      rows.length > 200
    )
      invalid("Batch akademik tidak valid.");
    const result = transactional(() =>
      rows.map((row) => saveRecord(req.user, kind, row, { log: false })),
    );
    audit(req.user, `Menyimpan ${rows.length} data ${kind} sekaligus`);
    res.json({ count: result.length });
  });
  app.post("/api/ews-rules", (req, res) => {
    if (req.user.role !== "principal") deny();
    const settings = all(req.user.school, "settings")[0],
      item = { ...settings };
    for (const key of ["ewsAttendance", "ewsDrop", "ewsOverdue"]) {
      const value = Number(req.body[key]);
      if (
        !Number.isFinite(value) ||
        value < 1 ||
        value > (key === "ewsOverdue" ? 50 : 100)
      )
        invalid("Ambang indikator tidak valid.");
      item[key] = value;
    }
    put("settings", req.user.school, item);
    audit(req.user, "Memperbarui aturan peringatan akademik");
    res.json(item);
  });
  app.post("/api/pickup/verify", (req, res) => {
    if (!["admin", "principal"].includes(req.user.role)) deny();
    res.json(verifyQR(req.user, req.body.qr));
  });
  app.get("/api/backup", (req, res) => {
    if (req.user.role !== "admin") deny();
    audit(req.user, "Mengekspor cadangan data sekolah");
    res.json({
      format: "KabarKelas-2",
      school: req.user.school,
      date: new Date().toISOString(),
      data: Object.fromEntries(
        kinds.map((kind) => [kind, all(req.user.school, kind)]),
      ),
    });
  });
  app.post("/api/restore", (req, res) => {
    const user = req.user,
      body = req.body;
    if (user.role !== "admin") deny();
    if (
      !["KabarKelas-1", "KabarKelas-2"].includes(body.format) ||
      body.school !== user.school ||
      !body.data ||
      !kinds
        .filter(
          (k) =>
            ![
              "payments",
              "staffAttendance",
              "leaveRequests",
              "uniforms",
              "uniformOverrides",
              "character",
              "tahfizh",
              "pickupPersons",
              "pickupLogs",
            ].includes(k),
        )
        .every((k) => Array.isArray(body.data[k]))
    )
      invalid("Cadangan tidak valid atau berasal dari sekolah lain.");
    const seen = new Set();
    for (const kind of kinds)
      for (const row of body.data[kind] || []) {
        const old =
          row.id &&
          db.prepare("SELECT school,kind FROM records WHERE id=?").get(row.id);
        if (
          typeof row.id !== "string" ||
          !row.id ||
          seen.has(row.id) ||
          (old && (old.school !== user.school || old.kind !== kind))
        )
          invalid("Referensi cadangan tidak valid.");
        seen.add(row.id);
      }
    transactional(() => {
      for (const kind of kinds) {
        if (!Array.isArray(body.data[kind])) continue;
        db.prepare("DELETE FROM records WHERE school=? AND kind=?").run(
          user.school,
          kind,
        );
        for (const row of body.data[kind]) put(kind, user.school, row);
      }
    });
    audit(user, "Memulihkan cadangan data sekolah");
    res.json({ ok: true });
  });
  app.get("/api/imports", (req, res) => {
    if (req.user.role !== "admin") deny();
    res.json(all(req.user.school, "imports"));
  });
  app.post("/api/import-students", (req, res) => {
    const user = req.user,
      rows = req.body.rows;
    if (user.role !== "admin") deny();
    if (!Array.isArray(rows) || !rows.length || rows.length > 2000)
      invalid("Jumlah baris harus 1–2.000.");
    const seen = new Set(all(user.school, "students").map((s) => s.nisn));
    for (const row of rows) {
      if (
        !row.name?.trim() ||
        !/^\d{10}$/.test(row.nisn) ||
        seen.has(row.nisn) ||
        !all(user.school, "classes").some((c) => c.id === row.classId) ||
        !["L", "P"].includes(row.gender)
      )
        invalid(`Baris tidak valid atau duplikat: ${row.name || "tanpa nama"}`);
      seen.add(row.nisn);
    }
    const ids = [];
    const job = transactional(() => {
      for (const row of rows) {
        const id = `${user.school}-import-${randomBytes(7).toString("hex")}`;
        put("students", user.school, {
          ...row,
          id,
          photo: row.gender === "P" ? 1 : 0,
          attendance: 100,
          history: [80, 80, 80, 80],
          overdue: 0,
          status: "Aktif",
          enrolled: today(),
        });
        ids.push(id);
      }
      return put("imports", user.school, {
        id: `${user.school}-import-job-${Date.now()}`,
        count: ids.length,
        ids,
        date: new Date().toISOString(),
        status: "Selesai",
      });
    });
    audit(user, `Mengimpor ${ids.length} siswa`);
    res.json(job);
  });
  app.post("/api/imports/:id/rollback", (req, res) => {
    const user = req.user;
    if (user.role !== "admin") deny();
    const job = all(user.school, "imports").find((j) => j.id === req.params.id);
    if (!job || job.status !== "Selesai")
      invalid("Impor tidak tersedia untuk rollback.");
    let removed = 0;
    transactional(() => {
      for (const id of job.ids) {
        if (
          ![
            "grades",
            "attendance",
            "reports",
            "submissions",
            "invoices",
            "interventions",
            "character",
            "tahfizh",
            "pickupLogs",
          ].some((kind) =>
            all(user.school, kind).some((r) => r.studentId === id),
          )
        ) {
          db.prepare(
            "DELETE FROM records WHERE id=? AND school=? AND kind=?",
          ).run(id, user.school, "students");
          removed++;
        }
      }
      put("imports", user.school, { ...job, status: "Dibatalkan", removed });
    });
    audit(user, `Rollback impor: ${removed} siswa`);
    res.json({ removed });
  });
  app.post("/api/quiz/:id/submit", (req, res) => {
    const user = req.user;
    if (user.role !== "student") deny();
    const quiz = all(user.school, "quizzes").find(
        (q) => q.id === req.params.id,
      ),
      student = getStudent(user, user.studentId),
      answers = req.body.answers;
    if (!quiz || quiz.classId !== student.classId) deny("Kuis tidak tersedia.");
    if (
      !Array.isArray(answers) ||
      answers.length !== quiz.questions.length ||
      answers.some(
        (a, i) =>
          !Number.isInteger(a) ||
          a < 0 ||
          a >= quiz.questions[i].options.length,
      )
    )
      invalid("Jawab semua soal terlebih dahulu.");
    const score = Math.round(
      (quiz.questions.filter((q, i) => q.answer === answers[i]).length /
        quiz.questions.length) *
        100,
    );
    const result = put("submissions", user.school, {
      id: `${quiz.id}-${user.studentId}`,
      studentId: user.studentId,
      assignmentId: quiz.id,
      status: "Dinilai",
      score,
      date: new Date().toISOString(),
    });
    audit(user, `Menyelesaikan kuis ${quiz.title}`);
    res.json(result);
  });
  app.post("/api/:kind", (req, res) =>
    res.json(
      transactional(() => saveRecord(req.user, req.params.kind, req.body)),
    ),
  );
  app.delete("/api/:kind/:id", (req, res) => {
    const user = req.user,
      { kind, id } = req.params;
    if (
      user.role !== "admin" ||
      ![
        "students",
        "teachers",
        "classes",
        "subjects",
        "announcements",
        "admissions",
        "uniformOverrides",
        "pickupPersons",
        "schedule",
      ].includes(kind)
    )
      deny();
    const stored = db
      .prepare("SELECT body FROM records WHERE id=? AND school=? AND kind=?")
      .get(id, user.school, kind);
    if (!stored) throw new RequestError(404, "Data tidak ditemukan.");
    if (
      kind === "classes" &&
      all(user.school, "students").some((s) => s.classId === id)
    )
      invalid("Pindahkan siswa sebelum menghapus kelas.");
    transactional(() => {
      db.prepare("DELETE FROM records WHERE id=? AND school=? AND kind=?").run(
        id,
        user.school,
        kind,
      );
      if (kind === "students")
        for (const collection of [
          ...academicKinds,
          "invoices",
          "payments",
          "pickupPersons",
          "pickupLogs",
        ])
          for (const row of all(user.school, collection).filter(
            (r) => r.studentId === id,
          ))
            db.prepare("DELETE FROM records WHERE id=?").run(row.id);
    });
    audit(user, `Menghapus ${kind}: ${id}`);
    res.json({ ok: true });
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "Fitur atau endpoint tidak tersedia." }),
  );
  app.use((error, req, res, next) => {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    console.error(error.message);
    res
      .status(500)
      .json({ error: "Permintaan belum berhasil. Silakan coba lagi." });
  });
  return { app, db, all, put, migrated };
}
