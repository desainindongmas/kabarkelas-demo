import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createApplication } from "../app.mjs";
import {
  canAccessPage,
  canReadCollection,
  isFoundation,
  isPro,
  roleNames,
} from "../shared/access.mjs";

let runtime, server, directory, base;
before(async () => {
  directory = await mkdtemp(tmpdir() + "/kk-packages-");
  runtime = createApplication({ databasePath: directory + "/db.sqlite" });
  server = runtime.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  runtime.db.close();
  await rm(directory, { recursive: true, force: true });
});
async function login(role, plan, school = "s1") {
  const response = await fetch(base + "/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role, school, plan, isHomeroom: role === "teacher" }),
  });
  assert.equal(response.status, 200);
  return {
    cookie: response.headers.get("set-cookie").split(";")[0],
    user: await response.json(),
  };
}
async function call(session, path, body, method = body === undefined ? "GET" : "POST") {
  const response = await fetch(base + path, {
    method,
    headers: { cookie: session.cookie, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

test("seven-role by three-package matrix keeps role and package permissions independent", async () => {
  for (const plan of ["Standard", "Pro", "Yayasan"]) {
    for (const role of Object.keys(roleNames)) {
      const session = await login(role, plan);
      const { body: bootstrap } = await call(session, "/api/bootstrap");
      const config = bootstrap.data.settings[0];
      const pro = plan !== "Standard";
      const foundation = plan === "Yayasan";
      const academic = ["principal", "teacher", "parent", "student"].includes(role);
      const label = `${role}/${plan}`;
      assert.equal(config.plan, plan, label);
      assert.equal(bootstrap.features.plan, plan, label);
      assert.equal(bootstrap.features.pro, pro, label);
      assert.equal(bootstrap.features.ews, pro, label);
      assert.equal(bootstrap.features.foundation, foundation, label);
      assert.equal(isPro(config), pro);
      assert.equal(isFoundation(config), foundation);
      assert.equal(canAccessPage(bootstrap.user, "ews", config), pro && ["principal", "teacher"].includes(role), label);
      assert.equal(canAccessPage(bootstrap.user, "below-kkm", config), pro && ["principal", "teacher"].includes(role), label);
      assert.equal(canAccessPage(bootstrap.user, "interventions", config), pro && ["principal", "teacher"].includes(role), label);
      assert.equal(canAccessPage(bootstrap.user, "unit-work", config), foundation && role === "principal", label);
      assert.equal(canAccessPage(bootstrap.user, "foundation", config), foundation && role === "foundation", label);
      assert.equal(canReadCollection(bootstrap.user, "interventions", config), pro && academic, label);
      assert.equal(canReadCollection(bootstrap.user, "foundationTasks", config), foundation && ["principal", "foundation"].includes(role), label);
      assert.equal(bootstrap.data.interventions.length > 0, pro && academic, label);
      assert.equal(bootstrap.data.termSnapshots.length > 0, pro && (["principal", "teacher"].includes(role) || (foundation && role === "foundation")), label);
      assert.equal(bootstrap.data.foundationTasks.length > 0, foundation && ["principal", "foundation"].includes(role), label);
      assert.equal(bootstrap.overview.length, foundation && role === "foundation" ? 3 : 0, label);
      assert.equal(config.ewsAttendance !== undefined, pro && academic, label);

      if (academic) {
        assert.ok(bootstrap.data.grades.length, label + " retains grades");
        assert.ok(bootstrap.data.attendance.length, label + " retains attendance");
        assert.ok(bootstrap.data.assignments.length, label + " retains tasks");
        assert.ok(bootstrap.data.reports.length, label + " retains reports");
        assert.equal(bootstrap.data.students[0].history !== undefined, pro, label);
        assert.equal(bootstrap.data.students[0].overdue !== undefined, pro, label);
        assert.equal(bootstrap.data.grades[0].previous !== undefined, pro, label);
      }
      if (["parent", "student"].includes(role)) {
        assert.deepEqual(bootstrap.data.students.map((student) => student.id), [session.user.studentId]);
        assert.ok(bootstrap.data.interventions.every((item) => item.studentId === session.user.studentId));
      }
      if (["admin", "security", "foundation"].includes(role)) {
        assert.equal(bootstrap.data.grades.length, 0, label);
        assert.equal(config.ewsDrop, undefined, label);
        assert.ok(bootstrap.data.students.every((student) => student.history === undefined), label);
      }
      const intervention = runtime.all("s1", "interventions")[0];
      assert.equal((await call(session, "/api/interventions", intervention)).status,
        pro && ["principal", "teacher"].includes(role) ? 200 : 403, label + " write EWS");
      assert.equal((await call(session, "/api/ews-rules", { ewsAttendance: 80, ewsDrop: 10, ewsOverdue: 3 })).status,
        pro && role === "principal" ? 200 : 403, label + " configure EWS");
      assert.equal((await call(session, "/api/interventions/" + intervention.id, undefined, "DELETE")).status, 403, label + " generic delete");
      assert.equal((await call(session, "/api/board")).status,
        foundation && role === "foundation" ? 200 : 403, label + " board");
    }
  }
});

test("downgrading hides advanced data without changing rules, pupil history, or stored workflows", async () => {
  const principal = await login("principal", "Pro");
  const customRules = { ewsAttendance: 87, ewsDrop: 8, ewsOverdue: 2 };
  assert.equal((await call(principal, "/api/ews-rules", customRules)).status, 200);
  assert.equal((await call(principal, "/api/workflow", { approvalMode: "two-step", reportDue: today(), followupDays: 5 })).status, 200);
  assert.equal((await call(principal, "/api/saved-reports", { name: "Analisis tersimpan", period: "Semua", classId: "all" })).status, 200);
  const preserved = Object.fromEntries(["s1", "s2", "s3"].map((school) => [school, {
    students: runtime.all(school, "students"),
    interventions: runtime.all(school, "interventions"),
    snapshots: runtime.all(school, "termSnapshots"),
    saved: runtime.all(school, "savedReports"),
    tasks: runtime.all(school, "foundationTasks"),
    settings: runtime.all(school, "settings")[0],
  }]));
  assert.equal((await call(principal, "/api/demo-plan", { plan: "Standard" })).status, 200);
  const standard = (await call(principal, "/api/bootstrap")).body;
  assert.equal(standard.data.interventions.length, 0);
  assert.equal(standard.data.savedReports.length, 0);
  assert.equal(standard.data.termSnapshots.length, 0);
  assert.equal(standard.data.settings[0].ewsAttendance, undefined);
  assert.equal(standard.data.settings[0].approvalMode, undefined);
  assert.equal((await call(principal, "/api/interventions", preserved.s1.interventions[0])).status, 403);
  assert.equal((await call(principal, "/api/ews-rules", { ...customRules, ewsDrop: 99 })).status, 403);

  const archive = await call(principal, "/api/academic-backup");
  assert.equal(archive.status, 200);
  assert.ok(archive.body.data.grades.length);
  assert.equal(archive.body.data.interventions, undefined);
  assert.equal(archive.body.data.termSnapshots, undefined);
  assert.equal(archive.body.data.students[0].history, undefined);
  assert.equal(archive.body.data.students[0].overdue, undefined);
  assert.equal(archive.body.data.grades[0].previous, undefined);

  for (const school of ["s1", "s2", "s3"]) {
    assert.deepEqual(runtime.all(school, "students"), preserved[school].students);
    assert.deepEqual(runtime.all(school, "interventions"), preserved[school].interventions);
    assert.deepEqual(runtime.all(school, "termSnapshots"), preserved[school].snapshots);
    assert.deepEqual(runtime.all(school, "savedReports"), preserved[school].saved);
    assert.deepEqual(runtime.all(school, "foundationTasks"), preserved[school].tasks);
    assert.deepEqual(runtime.all(school, "settings")[0], { ...preserved[school].settings, plan: "Standard" });
  }
  assert.equal((await call(principal, "/api/demo-plan", { plan: "Pro" })).status, 200);
  const restored = (await call(principal, "/api/bootstrap")).body;
  assert.deepEqual(restored.data.interventions, preserved.s1.interventions);
  assert.deepEqual(restored.data.students[0].history, preserved.s1.students[0].history);
  assert.equal(restored.data.settings[0].ewsAttendance, customRules.ewsAttendance);
  assert.equal(restored.data.settings[0].approvalMode, "two-step");
  assert.equal(restored.data.savedReports.length, preserved.s1.saved.length);
});

test("Standard completes daily academic work and exports even when retained Pro rules require two stages", async () => {
  const teacher = await login("teacher", "Standard");
  const principal = await login("principal");
  const admin = await login("admin");
  const original = runtime.all("s1", "grades")[0];
  assert.equal((await call(teacher, "/api/grades", { ...original, score: 82 })).status, 200);
  assert.equal((await call(teacher, "/api/attendance", { studentId: original.studentId, date: today(), status: "Hadir" })).status, 200);
  const report = runtime.all("s1", "reports").find((row) => row.studentId === original.studentId);
  assert.equal((await call(teacher, "/api/reports", { ...report, status: "Terbit" })).status, 200);
  assert.equal((await call(principal, "/api/academic-backup")).status, 200);
  const backup = await call(admin, "/api/backup");
  assert.equal(backup.status, 200);
  assert.equal(backup.body.data.settings[0].ewsAttendance, undefined);
  assert.equal(backup.body.data.settings[0].plan, "Standard");
  assert.equal((await call(admin, "/api/invoices", { title: "SPP Standard", studentId: original.studentId, amount: 100000, due: today() })).status, 200);
  const security = await login("security");
  const card = await call(security, "/api/demo-gate-card");
  assert.equal((await call(security, "/api/pickup/verify", { qr: card.body.qr })).status, 200);
});

test("Yayasan data and mutations require both the Yayasan package and the correct role", async () => {
  const foundation = await login("foundation", "Pro");
  const principal = await login("principal");
  for (const plan of ["Standard", "Pro"]) {
    await call(foundation, "/api/demo-plan", { plan });
    assert.equal((await call(foundation, "/api/foundation-tasks", {})).status, 403);
    assert.equal((await call(principal, "/api/foundation-tasks", {})).status, 403);
    assert.equal((await call(principal, "/api/unit-needs", {})).status, 403);
    assert.equal((await call(foundation, "/api/school-targets", {})).status, 403);
    assert.equal((await call(foundation, "/api/board")).status, 403);
  }
  assert.equal((await call(foundation, "/api/demo-plan", { plan: "Yayasan" })).status, 200);
  const board = await call(foundation, "/api/board");
  assert.equal(board.status, 200);
  assert.equal(board.body.units.length, 3);
  for (const unit of board.body.units) {
    assert.equal(Object.values(unit.riskCounts).reduce((sum, count) => sum + count, 0), unit.students);
    assert.ok(unit.handlingSummary.improved > 0);
    assert.ok(unit.handlingSummary.open > 0);
  }
  assert.equal(JSON.stringify(board.body).includes("studentId"), false);
  assert.equal(JSON.stringify(board.body).includes("Nadia Azzahra"), false);
  assert.equal((await call(principal, "/api/board")).status, 403);
  const task = runtime.all("s1", "foundationTasks")[0];
  assert.equal((await call(principal, "/api/foundation-tasks", { ...task, status: "Berjalan", response: "Koordinasi telah dimulai." })).status, 200);
  const security = await login("security");
  assert.equal((await call(security, "/api/foundation-tasks", task)).status, 403);
});

test("demo plan switches all units atomically; sessions preserve selected plan and never change role", async () => {
  const principal = await login("principal", "Pro");
  const originalUser = principal.user;
  assert.equal((await call(principal, "/api/demo-plan", { plan: "Standard" })).status, 200);
  for (const school of ["s1", "s2", "s3"])
    assert.equal(runtime.all(school, "settings")[0].plan, "Standard");
  const otherSchool = await login("teacher", undefined, "s2");
  assert.equal((await call(otherSchool, "/api/bootstrap")).body.features.plan, "Standard");
  const visitor = await login("security", "Yayasan", "s3");
  const before = (await call(visitor, "/api/bootstrap")).body;
  assert.equal(before.user.role, "security");
  assert.equal(before.data.grades.length, 0);
  assert.equal(before.features.plan, "Yayasan");
  assert.equal((await call(visitor, "/api/demo-plan", { plan: "Pro" })).status, 403);
  assert.deepEqual((await call(principal, "/api/bootstrap")).body.user, originalUser);

  const stable = ["s1", "s2", "s3"].map((school) => runtime.all(school, "settings")[0]);
  assert.equal((await call(principal, "/api/demo-plan", { plan: "Bogus" })).status, 400);
  for (const [index, school] of ["s1", "s2", "s3"].entries())
    assert.deepEqual(runtime.all(school, "settings")[0], stable[index]);
  runtime.db.exec("CREATE TRIGGER reject_unit_plan BEFORE UPDATE ON records WHEN NEW.id='s2-settings' BEGIN SELECT RAISE(ABORT,'unit update failed'); END;");
  try {
    assert.equal((await call(principal, "/api/demo-plan", { plan: "Standard" })).status, 500);
    for (const [index, school] of ["s1", "s2", "s3"].entries())
      assert.deepEqual(runtime.all(school, "settings")[0], stable[index]);
  } finally {
    runtime.db.exec("DROP TRIGGER reject_unit_plan;");
  }
  await call(principal, "/api/demo-plan", { plan: "Pro" });
});
