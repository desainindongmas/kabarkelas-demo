import { randomBytes } from "node:crypto";
import { isPro } from "./shared/access.mjs";
export function installProductAPI({
  app,
  all,
  put,
  db,
  schools,
  deny,
  invalid,
  transactional,
  saveRecord,
  audit,
  today,
  validDate,
}) {
  const settings = (user) => all(user.school, "settings")[0];
  const requirePro = (user) => {
    if (!isPro(settings(user)))
      deny(
        "Fitur ini tersedia pada paket Pro sekolah. Paket Standard tetap menyediakan pekerjaan harian lengkap.",
      );
  };
  const ensure = (role, allowed) => {
    if (!allowed.includes(role)) deny();
  };
  const uid = (school, kind) =>
    `${school}-${kind}-${randomBytes(7).toString("hex")}`;
  const find = (kind, user, id) => {
    const row = all(user.school, kind).find((r) => r.id === id);
    if (!row) deny("Data berada di luar unit Anda.");
    return row;
  };
  const schoolSummary = (s) => {
    const pupils = all(s.id, "students"),
      reports = all(s.id, "reports"),
      invoices = all(s.id, "invoices"),
      target = all(s.id, "schoolTargets")[0] || {},
      audits = all(s.id, "audit"),
      openTasks = all(s.id, "foundationTasks").filter(
        (t) => t.status !== "Selesai",
      );
    const amount = invoices.reduce((a, i) => a + i.amount, 0),
      paid = invoices.reduce(
        (a, i) => a + (i.paidAmount ?? (i.status === "Lunas" ? i.amount : 0)),
        0,
      ),
      attendance = Math.round(
        pupils.reduce((a, p) => a + p.attendance, 0) /
          Math.max(pupils.length, 1),
      );
    const dueInvoices = invoices.filter((i) => i.due <= today()),
      dueAmount = dueInvoices.reduce((a, i) => a + i.amount, 0),
      duePaid = dueInvoices.reduce(
        (a, i) => a + (i.paidAmount ?? (i.status === "Lunas" ? i.amount : 0)),
        0,
      );
    const reportRate = Math.round(
        (reports.filter((r) => r.status === "Terbit").length /
          Math.max(pupils.length, 1)) *
          100,
      ),
      collectionRate = Math.round((duePaid / Math.max(dueAmount, 1)) * 100),
      complete = pupils.filter(
        (p) => p.nisn && p.classId && p.parent && p.phone,
      ).length;
    const snapshots = all(s.id, "termSnapshots").filter(
        (t) => t.period === "2025/2026 Genap",
      ),
      previousAttendance = Math.round(
        snapshots.reduce((a, t) => a + t.attendance * t.students, 0) /
          Math.max(
            snapshots.reduce((a, t) => a + t.students, 0),
            1,
          ),
      );
    const latest =
      [
        ...audits.map((a) => a.date),
        ...all(s.id, "reports").map((r) => r.date),
        ...all(s.id, "attendance").map((a) => a.date),
      ]
        .filter(Boolean)
        .sort()
        .at(-1) || null;
    const issues = [];
    if (attendance < (target.attendance || 95))
      issues.push({
        metric: "Kehadiran",
        value: attendance,
        target: target.attendance || 95,
      });
    if (reportRate < (target.reportRate || 95))
      issues.push({
        metric: "Rapor terbit",
        value: reportRate,
        target: target.reportRate || 95,
      });
    if (collectionRate < (target.collectionRate || 85))
      issues.push({
        metric: "Penerimaan SPP",
        value: collectionRate,
        target: target.collectionRate || 85,
      });
    return {
      ...s,
      staleDays: latest
        ? Math.max(0, Math.floor((Date.now() - Date.parse(latest)) / 86400000))
        : null,
      name: all(s.id, "settings")[0]?.name || s.name,
      students: pupils.length,
      teachers: all(s.id, "teachers").length,
      attendance,
      previousAttendance,
      reportRate,
      reportsPublished: reports.filter((r) => r.status === "Terbit").length,
      collectionRate,
      invoiceTotal: amount,
      paidTotal: paid,
      dataCompleteness: Math.round(
        (complete / Math.max(pupils.length, 1)) * 100,
      ),
      lastUpdated: latest,
      target,
      issues,
      openTasks: openTasks.length,
      overdueTasks: openTasks.filter((t) => t.due < today()).length,
      period:
        all(s.id, "settings")[0]?.year +
        " · " +
        all(s.id, "settings")[0]?.semester,
    };
  };
  const board = () => ({
    units: schools.map(schoolSummary),
    tasks: schools.flatMap((s) => all(s.id, "foundationTasks")),
    needs: schools.flatMap((s) => all(s.id, "unitNeeds")),
    generatedAt: new Date().toISOString(),
    basis:
      "Data dummy; perbandingan menggunakan persentase, target unit dan tren, bukan pemeringkatan nilai mentah.",
  });
  app.get("/api/board", (req, res) => {
    ensure(req.user.role, ["foundation"]);
    res.json(board());
  });
  app.post("/api/foundation-tasks", (req, res) => {
    const u = req.user,
      b = req.body;
    ensure(u.role, ["foundation", "principal"]);
    const school = u.role === "foundation" ? b.schoolId : u.school;
    if (!schools.some((s) => s.id === school))
      invalid("Pilih unit yang valid.");
    const old =
      b.id && all(school, "foundationTasks").find((r) => r.id === b.id);
    if (b.id && !old) deny();
    let item;
    if (u.role === "foundation") {
      if (
        !b.title?.trim() ||
        !b.pic?.trim() ||
        !validDate(b.due) ||
        !b.instruction?.trim()
      )
        invalid("Judul, PIC, tenggat, dan arahan wajib diisi.");
      if (old && b.status && b.status !== old.status)
        invalid("Status pelaksanaan diperbarui oleh kepala unit.");
      item = {
        ...old,
        id: old?.id || uid(school, "task"),
        schoolId: school,
        title: b.title,
        category: b.category || "Operasional",
        priority: b.priority === "Tinggi" ? "Tinggi" : "Sedang",
        pic: b.pic,
        due: b.due,
        instruction: b.instruction,
        status: old?.status || "Direncanakan",
        response: old?.response || "",
        evidence: old?.evidence || "",
        created: old?.created || today(),
        createdBy: old?.createdBy || u.name,
        updatedAt: new Date().toISOString(),
      };
    } else {
      if (
        !old ||
        !["Direncanakan", "Berjalan", "Selesai"].includes(b.status) ||
        !b.response?.trim()
      )
        invalid("Status dan hasil tindak lanjut wajib diisi.");
      if (b.status === "Selesai" && !b.evidence?.trim())
        invalid("Bukti penyelesaian wajib diisi.");
      item = {
        ...old,
        status: b.status,
        response: b.response,
        evidence: b.evidence || "",
        updatedAt: new Date().toISOString(),
        respondedBy: u.name,
      };
    }
    put("foundationTasks", school, item);
    audit({ ...u, school }, "Memperbarui tindak lanjut unit: " + item.title);
    res.json(item);
  });
  app.post("/api/unit-needs", (req, res) => {
    const u = req.user,
      b = req.body;
    ensure(u.role, ["principal", "foundation"]);
    const school = u.role === "foundation" ? b.schoolId : u.school;
    if (!schools.some((s) => s.id === school)) invalid("Unit tidak valid.");
    const old = b.id && all(school, "unitNeeds").find((r) => r.id === b.id);
    if (b.id && !old) deny();
    let item;
    if (u.role === "principal") {
      if (old && old.status === "Disetujui") {
        if (
          !["Belum dimulai", "Diproses", "Terpenuhi"].includes(b.fulfillment) ||
          !b.fulfillmentNote?.trim()
        )
          invalid("Status pemenuhan dan bukti perkembangan wajib diisi.");
        item = {
          ...old,
          fulfillment: b.fulfillment,
          fulfillmentNote: b.fulfillmentNote,
        };
      } else {
        if (old && old.status !== "Diajukan")
          deny("Pengajuan yang telah diputuskan tidak dapat diubah.");
        if (
          !b.title?.trim() ||
          !b.reason?.trim() ||
          !Number.isFinite(b.amount) ||
          b.amount <= 0
        )
          invalid("Judul, alasan, dan anggaran wajib diisi.");
        item = {
          id: old?.id || uid(school, "need"),
          schoolId: school,
          title: b.title,
          category: b.category || "Sarana",
          amount: b.amount,
          reason: b.reason,
          status: "Diajukan",
          fulfillment: "Belum dimulai",
          created: old?.created || today(),
          createdBy: u.name,
        };
      }
    } else {
      if (
        !old ||
        old.status !== "Diajukan" ||
        !["Disetujui", "Ditolak"].includes(b.status) ||
        !b.decisionNote?.trim()
      )
        invalid("Pengajuan, keputusan dan catatan wajib diisi.");
      item = {
        ...old,
        status: b.status,
        decisionNote: b.decisionNote,
        decidedBy: u.name,
        decidedAt: new Date().toISOString(),
      };
    }
    item.updatedAt = new Date().toISOString();
    put("unitNeeds", school, item);
    audit({ ...u, school }, "Memperbarui kebutuhan unit: " + item.title);
    res.json(item);
  });
  app.post("/api/school-targets", (req, res) => {
    const u = req.user,
      b = req.body;
    ensure(u.role, ["foundation"]);
    if (!schools.some((s) => s.id === b.schoolId)) invalid("Unit tidak valid.");
    const item = { id: `${b.schoolId}-target` };
    for (const key of ["attendance", "reportRate", "collectionRate"]) {
      if (!Number.isFinite(b[key]) || b[key] < 1 || b[key] > 100)
        invalid("Target harus 1–100%.");
      item[key] = b[key];
    }
    put("schoolTargets", b.schoolId, {
      ...item,
      updatedAt: new Date().toISOString(),
      updatedBy: u.name,
    });
    audit({ ...u, school: b.schoolId }, "Memperbarui target unit");
    res.json(item);
  });
  app.post("/api/demo-plan", (req, res) => {
    const u = req.user;
    ensure(u.role, ["admin", "principal"]);
    if (!["Standard", "Pro"].includes(req.body.plan))
      invalid("Paket tidak valid.");
    const old = settings(u);
    put("settings", u.school, { ...old, plan: req.body.plan });
    audit(u, "Mencoba paket demo " + req.body.plan);
    res.json({ plan: req.body.plan, demo: true });
  });
  app.post("/api/workflow", (req, res) => {
    const u = req.user,
      b = req.body;
    ensure(u.role, ["principal"]);
    requirePro(u);
    if (
      !["single", "two-step"].includes(b.approvalMode) ||
      !validDate(b.reportDue) ||
      !Number.isInteger(b.followupDays) ||
      b.followupDays < 1 ||
      b.followupDays > 30
    )
      invalid("Tahap persetujuan, tenggat dan pengingat tidak valid.");
    put("settings", u.school, {
      ...settings(u),
      approvalMode: b.approvalMode,
      reportDue: b.reportDue,
      followupDays: b.followupDays,
    });
    audit(u, "Memperbarui alur persetujuan dan pengingat");
    res.json({ ok: true });
  });
  app.post("/api/saved-reports", (req, res) => {
    const u = req.user,
      b = req.body;
    ensure(u.role, ["principal", "admin", "teacher"]);
    requirePro(u);
    if (
      !b.name?.trim() ||
      ![
        "Semua",
        "2025/2026 Ganjil",
        "2025/2026 Genap",
        "2026/2027 Ganjil",
      ].includes(b.period) ||
      ![
        "all",
        ...all(u.school, "classes")
          .filter((c) => u.role !== "teacher" || u.classIds.includes(c.id))
          .map((c) => c.id),
      ].includes(b.classId)
    )
      invalid("Nama, periode, atau kelas tidak valid.");
    const owner = u.role === "teacher" ? u.teacherId : u.role;
    const old = b.id && find("savedReports", u, b.id);
    if (old && old.owner !== owner) deny();
    const item = {
      id: old?.id || uid(u.school, "view"),
      name: b.name,
      period: b.period,
      classId: b.classId,
      owner,
      createdAt: new Date().toISOString(),
    };
    put("savedReports", u.school, item);
    audit(u, "Menyimpan tampilan laporan: " + item.name);
    res.json(item);
  });
  app.post("/api/invoices/batch", (req, res) => {
    const u = req.user,
      b = req.body;
    ensure(u.role, ["admin"]);
    if (!b.classId || !all(u.school, "classes").some((c) => c.id === b.classId))
      invalid("Pilih kelas.");
    const students = all(u.school, "students").filter(
      (s) => s.classId === b.classId,
    );
    if (!students.length) invalid("Kelas belum berisi siswa.");
    const result = transactional(() =>
      students.map((s) => {
        if (
          all(u.school, "invoices").some(
            (i) => i.studentId === s.id && i.title === b.title,
          )
        )
          invalid("Tagihan dengan judul ini sudah ada. Gunakan judul lain.");
        return saveRecord(
          u,
          "invoices",
          { studentId: s.id, title: b.title, amount: b.amount, due: b.due },
          { log: false },
        );
      }),
    );
    audit(u, `Membuat ${result.length} tagihan kelas sekaligus`);
    res.json({ count: result.length });
  });
  app.post("/api/payments/batch", (req, res) => {
    const u = req.user,
      b = req.body;
    ensure(u.role, ["admin"]);
    if (
      !Array.isArray(b.ids) ||
      !b.ids.length ||
      b.ids.length > 200 ||
      new Set(b.ids).size !== b.ids.length
    )
      invalid("Pilih 1–200 tagihan berbeda.");
    const result = transactional(() =>
      b.ids.map((id) => {
        const invoice = find("invoices", u, id),
          paid =
            invoice.paidAmount ??
            (invoice.status === "Lunas" ? invoice.amount : 0);
        return saveRecord(
          u,
          "invoices",
          {
            ...invoice,
            paymentAmount: invoice.amount - paid,
            method: b.method,
            paymentDate: b.paymentDate,
            note: b.note,
          },
          { log: false },
        );
      }),
    );
    audit(u, `Mencatat ${result.length} penerimaan sekaligus`);
    res.json({ count: result.length });
  });
  app.post("/api/admissions/:id/enroll", (req, res) => {
    const u = req.user,
      b = req.body;
    ensure(u.role, ["admin"]);
    if (
      settings(u).enabledModules &&
      !settings(u).enabledModules.includes("admissions")
    )
      deny("Modul penerimaan belum diaktifkan.");
    const candidate = find("admissions", u, req.params.id);
    if (candidate.convertedStudentId)
      invalid("Calon siswa sudah menjadi siswa aktif.");
    if (candidate.status !== "Diterima")
      invalid("Selesaikan keputusan penerimaan terlebih dahulu.");
    if (!["L", "P"].includes(b.gender)) invalid("Jenis kelamin wajib diisi.");
    const result = transactional(() => {
      const student = saveRecord(u, "students", {
        name: candidate.name,
        nisn: candidate.nisn,
        parent: candidate.parent,
        phone: candidate.phone,
        classId: b.classId,
        gender: b.gender,
        address: b.address,
        photo: b.gender === "P" ? 1 : 0,
        enrolled: today(),
      });
      put("admissions", u.school, {
        ...candidate,
        status: "Terdaftar",
        convertedStudentId: student.id,
        convertedAt: new Date().toISOString(),
      });
      put("reports", u.school, {
        id: uid(u.school, "report"),
        studentId: student.id,
        classId: student.classId,
        status: "Draf",
        note: "",
        date: today(),
      });
      return student;
    });
    audit(u, "Mendaftarkan calon siswa ke kelas: " + candidate.name);
    const { attendance, history, overdue, ...identity } = result;
    res.json(identity);
  });
  app.post("/api/gate-incidents", (req, res) => {
    const u = req.user,
      b = req.body;
    ensure(u.role, ["security", "admin"]);
    const old = b.id && find("gateIncidents", u, b.id);
    let item;
    if (u.role === "security") {
      if (old) deny("Catatan kejadian tidak dapat ditimpa petugas.");
      if (
        !all(u.school, "students").some((s) => s.id === b.studentId) ||
        !b.category?.trim() ||
        !b.note?.trim()
      )
        invalid("Siswa, kategori dan kronologi wajib diisi.");
      item = {
        id: uid(u.school, "incident"),
        studentId: b.studentId,
        category: b.category,
        personName: b.personName || "",
        relationship: b.relationship || "Lainnya",
        note: b.note,
        status: "Menunggu",
        date: today(),
        created: new Date().toISOString(),
        recordedBy: u.name,
        decisionNote: "",
        used: false,
      };
    } else {
      if (
        !old ||
        old.status !== "Menunggu" ||
        !["Izinkan sekali", "Ditolak", "Ditangani"].includes(b.status) ||
        !b.decisionNote?.trim()
      )
        invalid("Keputusan dan catatan konfirmasi wajib diisi.");
      if (b.status === "Izinkan sekali" && !old.personName?.trim())
        invalid("Nama penjemput wajib tercatat sebelum izin diberikan.");
      item = {
        ...old,
        status: b.status,
        decisionNote: b.decisionNote,
        decidedBy: u.name,
        decidedAt: new Date().toISOString(),
      };
    }
    put("gateIncidents", u.school, item);
    audit(u, "Memperbarui kejadian gerbang: " + item.category);
    res.json(item);
  });
  return { board, schoolSummary, requirePro };
}
