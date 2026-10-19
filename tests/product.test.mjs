import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createApplication } from "../app.mjs";
import {
  roleNames,
  collectionsByRole,
  pagesByRole,
  canAccessPage,
} from "../shared/access.mjs";
let runtime, server, dir, base;
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
before(async () => {
  dir = await mkdtemp(tmpdir() + "/kk-product-");
  runtime = createApplication({ databasePath: dir + "/db.sqlite" });
  server = runtime.app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
  await new Promise((r) => server.close(r));
  runtime.db.close();
  await rm(dir, { recursive: true, force: true });
});
async function login(role, school = "s1", isHomeroom = false, plan) {
  const r = await fetch(base + "/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role, school, isHomeroom, plan }),
  });
  assert.equal(r.status, 200);
  return r.headers.get("set-cookie").split(";")[0];
}
async function call(cookie, path, body) {
  const r = await fetch(base + path, {
    headers: { cookie, "content-type": "application/json" },
    ...(body === undefined
      ? {}
      : { method: "POST", body: JSON.stringify(body) }),
  });
  return { status: r.status, body: await r.json() };
}
test("all seven roles receive only authorized collections and explicit minimum fields", async () => {
  assert.equal(Object.keys(roleNames).length, 7);
  for (const role of Object.keys(roleNames)) {
    const cookie = await login(role),
      { body: b } = await call(cookie, "/api/bootstrap");
    for (const [kind, rows] of Object.entries(b.data))
      if (!collectionsByRole[role].includes(kind))
        assert.equal(rows.length, 0, role + ":" + kind);
    for (const page of pagesByRole[role])
      assert.equal(canAccessPage(b.user, page, { plan: "Yayasan" }), true, role + ":" + page);
    if (role === "security") {
      assert.equal(b.data.pickupPersons.length, 0);
      assert.deepEqual(
        Object.keys(b.data.students[0]).sort(),
        ["id", "name", "nis", "classId", "photo", "status"].sort(),
      );
      assert.equal(b.data.settings[0].kkm, undefined);
      assert.equal((await call(cookie, "/api/backup")).status, 403);
      assert.equal((await call(cookie, "/api/board")).status, 403);
    }
    if (role === "admin") {
      assert.equal(b.data.settings[0].ewsAttendance, undefined);
      const backup = (await call(cookie, "/api/backup")).body;
      assert.equal(backup.data.grades, undefined);
      assert.equal(backup.data.students[0].attendance, undefined);
    }
  }
});
test("write APIs reject every unrelated role, including authority escalation via generic paths", async () => {
  const paths = {
    security: [
      "/api/students",
      "/api/grades",
      "/api/invoices",
      "/api/settings",
      "/api/unit-needs",
      "/api/foundation-tasks",
      "/api/workflow",
      "/api/demo-plan",
      "/api/saved-reports",
    ],
    admin: [
      "/api/grades",
      "/api/reports",
      "/api/interventions",
      "/api/foundation-tasks",
      "/api/unit-needs",
      "/api/school-targets",
      "/api/pickupLogs",
    ],
    teacher: [
      "/api/invoices",
      "/api/teachers",
      "/api/settings",
      "/api/school-targets",
      "/api/demo-plan",
      "/api/gate-incidents",
      "/api/pickupLogs",
    ],
    foundation: [
      "/api/students",
      "/api/grades",
      "/api/invoices",
      "/api/settings",
      "/api/pickupLogs",
      "/api/gate-incidents",
    ],
    parent: [
      "/api/grades",
      "/api/invoices",
      "/api/reports",
      "/api/gate-incidents",
      "/api/pickupLogs",
      "/api/foundation-tasks",
    ],
    student: [
      "/api/grades",
      "/api/settings",
      "/api/invoices",
      "/api/gate-incidents",
      "/api/pickupLogs",
    ],
    principal: [
      "/api/students",
      "/api/invoices",
      "/api/pickupLogs",
      "/api/gate-incidents",
    ],
  };
  for (const [role, list] of Object.entries(paths)) {
    const c = await login(role);
    for (const path of list)
      assert.equal((await call(c, path, {})).status, 403, role + ":" + path);
  }
});
test("Security verifies sanitized QR, logs a stateful arrival/departure and prevents overwrite/replay", async () => {
  const c = await login("security");
  const code = (await call(c, "/api/demo-gate-card")).body.qr;
  const verified = await call(c, "/api/pickup/verify", { qr: code });
  assert.equal(verified.status, 200);
  assert.equal(verified.body.person.phone, undefined);
  assert.equal(verified.body.student.attendance, undefined);
  const body = { studentId: "s1-st-0", qr: code, action: "Antar" };
  assert.equal((await call(c, "/api/pickupLogs", body)).status, 200);
  assert.equal((await call(c, "/api/pickupLogs", body)).status, 400);
  const out = await call(c, "/api/pickupLogs", { ...body, action: "Jemput" });
  assert.equal(out.status, 200);
  assert.equal(out.body.recordedBy, "Bambang Suryanto");
  assert.equal((await call(c, "/api/pickupLogs", out.body)).status, 403);
  assert.equal(
    (await call(c, "/api/pickupLogs", { ...body, action: "Jemput" })).status,
    400,
  );
  assert.equal(
    (await call(c, "/api/pickupLogs", { ...body, studentId: "s2-st-0" }))
      .status,
    403,
  );
});
test("unregistered pickup requires Admin confirmation and a permit is valid only once", async () => {
  const security = await login("security"),
    admin = await login("admin");
  assert.equal(
    (
      await call(security, "/api/pickupLogs", {
        studentId: "s1-st-2",
        action: "Jemput",
        personName: "Seseorang",
        note: "Saya izinkan",
      })
    ).status,
    403,
  );
  const incident = (
    await call(security, "/api/gate-incidents", {
      studentId: "s1-st-2",
      category: "Penjemput tidak terdaftar",
      personName: "Hendra Uji",
      relationship: "Saudara",
      note: "Siswa menunggu di pos; menunggu konfirmasi wali.",
    })
  ).body;
  assert.ok(incident.id);
  assert.equal(
    (
      await call(security, "/api/gate-incidents", {
        ...incident,
        status: "Izinkan sekali",
        decisionNote: "Saya izinkan",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(admin, "/api/gate-incidents", {
        ...incident,
        status: "Izinkan sekali",
        decisionNote: "Wali terdaftar telah mengonfirmasi identitas.",
      })
    ).status,
    200,
  );
  const request = {
    studentId: "s1-st-2",
    action: "Jemput",
    incidentId: incident.id,
  };
  assert.equal((await call(security, "/api/pickupLogs", request)).status, 200);
  assert.equal((await call(security, "/api/pickupLogs", request)).status, 403);
  const foreign = await login("admin", "s2");
  assert.equal(
    (
      await call(foreign, "/api/gate-incidents", {
        ...incident,
        status: "Izinkan sekali",
        decisionNote: "test",
      })
    ).status,
    403,
  );
});
test("foundation gives unit instructions; only the assigned principal records progress and evidence", async () => {
  const foundation = await login("foundation", "s1", false, "Yayasan"),
    p1 = await login("principal"),
    p2 = await login("principal", "s2");
  const task = await call(foundation, "/api/foundation-tasks", {
    schoolId: "s1",
    title: "Rencana penyelesaian rapor uji",
    pic: "Kepala Unit Nusantara",
    due: today(),
    instruction: "Laporkan pemetaan kelengkapan tiap kelas.",
  });
  assert.equal(task.status, 200);
  assert.equal(
    (
      await call(p2, "/api/foundation-tasks", {
        ...task.body,
        status: "Berjalan",
        response: "test",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(p1, "/api/foundation-tasks", {
        ...task.body,
        status: "Selesai",
        response: "Selesai",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(p1, "/api/foundation-tasks", {
        ...task.body,
        status: "Selesai",
        response: "Rapor telah ditinjau.",
        evidence: "Daftar verifikasi kelas lengkap.",
      })
    ).status,
    200,
  );
  const b = (await call(foundation, "/api/board")).body;
  assert.ok(
    b.tasks.some((t) => t.id === task.body.id && t.status === "Selesai"),
  );
  assert.equal(b.units.length, 3);
  assert.ok(new Set(b.units.map((u) => u.attendance)).size > 1);
  assert.ok(
    b.units.every((u) => u.target && Number.isFinite(u.dataCompleteness)),
  );
  assert.equal(JSON.stringify(b).includes("Nadia Azzahra"), false);
});
test("unit needs are proposed by principal, decided by foundation, fulfilled by unit and isolated by school", async () => {
  const p = await login("principal"),
    f = await login("foundation", "s1", false, "Yayasan"),
    other = await login("principal", "s2");
  const need = await call(p, "/api/unit-needs", {
    title: "Buku pendampingan",
    amount: 750000,
    category: "Program siswa",
    reason: "Mendukung program kelas.",
  });
  assert.equal(need.status, 200);
  assert.equal(
    (await call(p, "/api/unit-needs", { ...need.body, status: "Disetujui" }))
      .body.status,
    "Diajukan",
  );
  const decided = await call(f, "/api/unit-needs", {
    ...need.body,
    status: "Disetujui",
    decisionNote: "Disetujui sesuai rencana unit.",
  });
  assert.equal(decided.status, 200);
  assert.equal(
    (
      await call(other, "/api/unit-needs", {
        ...decided.body,
        fulfillment: "Terpenuhi",
        fulfillmentNote: "test",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(p, "/api/unit-needs", {
        ...decided.body,
        fulfillment: "Terpenuhi",
        fulfillmentNote: "Buku diterima dan digunakan pada kelas.",
      })
    ).status,
    200,
  );
});
test("Standard preserves core work and backup while Pro gates configurable workflows and analysis", async () => {
  const p = await login("principal"),
    admin = await login("admin"),
    teacher = await login("teacher");
  assert.equal(
    (await call(p, "/api/demo-plan", { plan: "Standard" })).status,
    200,
  );
  assert.equal(
    (await call(teacher, "/api/demo-plan", { plan: "Pro" })).status,
    403,
  );
  assert.equal(
    (
      await call(p, "/api/workflow", {
        approvalMode: "two-step",
        reportDue: today(),
        followupDays: 3,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(p, "/api/saved-reports", {
        name: "View",
        period: "Semua",
        classId: "all",
      })
    ).status,
    403,
  );
  const b = (await call(teacher, "/api/bootstrap")).body;
  assert.ok(b.data.grades.length);
  assert.ok(b.data.reports.length);
  assert.equal(b.data.termSnapshots.length, 0);
  assert.equal(b.data.interventions.length, 0);
  assert.equal(b.data.settings[0].ewsAttendance, undefined);
  assert.equal(b.data.students[0].history, undefined);
  assert.equal((await call(admin, "/api/backup")).status, 200);
  assert.equal((await call(p, "/api/demo-plan", { plan: "Pro" })).status, 200);
  assert.equal(
    (
      await call(p, "/api/saved-reports", {
        name: "View",
        period: "Semua",
        classId: "all",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call(teacher, "/api/saved-reports", {
        name: "Foreign",
        period: "Semua",
        classId: "s1-cl-5",
      })
    ).status,
    400,
  );
});
test("two-stage Pro publication requires homeroom review and principal final approval", async () => {
  const p = await login("principal"),
    teacher = await login("teacher", "s1", true);
  await call(p, "/api/workflow", {
    approvalMode: "two-step",
    reportDue: today(),
    followupDays: 3,
  });
  const b = (await call(teacher, "/api/bootstrap")).body,
    report = b.data.reports.find(
      (r) => r.classId === "s1-cl-0" && r.status === "Draf",
    );
  assert.ok(report);
  assert.equal(
    (
      await call(p, "/api/reports", {
        ...report,
        status: "Terbit",
        homeroomReviewed: true,
      })
    ).status,
    400,
  );
  assert.equal(
    (await call(teacher, "/api/reports", { ...report, status: "Terbit" }))
      .status,
    403,
  );
  assert.equal(
    (await call(teacher, "/api/reports", { ...report, status: "Review" }))
      .status,
    200,
  );
  assert.equal(
    (await call(p, "/api/reports", { ...report, status: "Terbit" })).status,
    200,
  );
});
test("bulk invoices/payments are atomic and admission conversion creates one pupil without re-entry", async () => {
  const c = await login("admin");
  const body = {
    classId: "s1-cl-0",
    title: "Tagihan kelas uji produk",
    amount: 150000,
    due: today(),
  };
  assert.equal((await call(c, "/api/invoices/batch", body)).body.count, 24);
  assert.equal((await call(c, "/api/invoices/batch", body)).status, 400);
  const b = (await call(c, "/api/bootstrap")).body,
    ids = b.data.invoices
      .filter((i) => i.title === body.title)
      .map((i) => i.id);
  assert.equal(ids.length, 24);
  assert.equal(
    (
      await call(c, "/api/payments/batch", {
        ids: [ids[0], "s2-invalid"],
        method: "Tunai",
        paymentDate: today(),
      })
    ).status,
    403,
  );
  assert.equal(
    runtime.all("s1", "invoices").find((i) => i.id === ids[0]).paidAmount,
    0,
  );
  assert.equal(
    (
      await call(c, "/api/payments/batch", {
        ids: ids.slice(0, 2),
        method: "Tunai",
        paymentDate: today(),
        note: "Diterima kasir.",
      })
    ).body.count,
    2,
  );
  const candidate = b.data.admissions.find((a) => a.status === "Diterima");
  const enrolled = await call(c, `/api/admissions/${candidate.id}/enroll`, {
    classId: "s1-cl-0",
    gender: "L",
    address: "Alamat uji",
  });
  assert.equal(enrolled.status, 200);
  assert.equal(enrolled.body.nisn, candidate.nisn);
  assert.equal(
    (
      await call(c, `/api/admissions/${candidate.id}/enroll`, {
        classId: "s1-cl-0",
        gender: "L",
      })
    ).status,
    400,
  );
  assert.ok(
    runtime
      .all("s1", "reports")
      .some((r) => r.studentId === enrolled.body.id && r.status === "Draf"),
  );
});
test("Admin cannot alter academic fields through identity updates or backup restore", async () => {
  const c = await login("admin");
  const before = runtime.all("s1", "students")[0];
  const result = await call(c, "/api/students", {
    ...before,
    attendance: 1,
    history: [1],
    overdue: 99,
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.attendance, undefined);
  assert.equal(runtime.all("s1", "students")[0].attendance, before.attendance);
  const backup = (await call(c, "/api/backup")).body;
  backup.data.students[0].attendance = 2;
  backup.data.grades = [{ id: "inject", score: 100, studentId: before.id }];
  assert.equal((await call(c, "/api/restore", backup)).status, 200);
  assert.equal(runtime.all("s1", "students")[0].attendance, before.attendance);
  assert.equal(
    runtime.all("s1", "grades").some((g) => g.id === "inject"),
    false,
  );
});

test("academic archives remain available on Standard to the principal, never Admin or Security", async () => {
  const p = await login("principal");
  await call(p, "/api/demo-plan", { plan: "Standard" });
  const archive = await call(p, "/api/academic-backup");
  assert.equal(archive.status, 200);
  assert.ok(archive.body.data.grades.length);
  assert.equal(archive.body.data.interventions, undefined);
  assert.equal(archive.body.data.students[0].history, undefined);
  for (const role of ["admin", "security", "teacher", "parent", "foundation"])
    assert.equal(
      (await call(await login(role), "/api/academic-backup")).status,
      403,
      role,
    );
  await call(p, "/api/demo-plan", { plan: "Pro" });
});

test("administrative restore cannot forge gate logs, reuse one-time permits, approve teacher leave or change receipts", async () => {
  const c = await login("admin"),
    backup = (await call(c, "/api/backup")).body;
  assert.equal(backup.data.leaveRequests[0].reason, undefined);
  const gate = runtime.all("s1", "pickupLogs")[0],
    leave = runtime.all("s1", "leaveRequests")[0],
    payment = runtime.all("s1", "payments")[0],
    incident = runtime.all("s1", "gateIncidents").find((i) => i.used);
  assert.ok(incident);
  backup.data.pickupLogs = [{ ...gate, personName: "Forged name" }];
  backup.data.leaveRequests = [{ ...leave, status: "Disetujui" }];
  backup.data.payments = [{ ...payment, amount: 1 }];
  backup.data.gateIncidents = [{ ...incident, used: false }];
  assert.equal((await call(c, "/api/restore", backup)).status, 200);
  assert.equal(
    runtime.all("s1", "pickupLogs").find((r) => r.id === gate.id).personName,
    gate.personName,
  );
  assert.equal(
    runtime.all("s1", "leaveRequests").find((r) => r.id === leave.id).status,
    leave.status,
  );
  assert.equal(
    runtime.all("s1", "payments").find((r) => r.id === payment.id).amount,
    payment.amount,
  );
  assert.equal(
    runtime.all("s1", "gateIncidents").find((r) => r.id === incident.id).used,
    true,
  );
});
