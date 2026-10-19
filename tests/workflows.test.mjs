import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import JSZip from "jszip";

const base = "http://127.0.0.1:3197";
let server, temp, browser;
async function newContext(options = {}) {
  const context = await browser.newContext(options);
  await context.addInitScript(() =>
    localStorage.setItem("kk-welcome-v3", "seen"),
  );
  return context;
}
const launch = () =>
  new Promise((resolve, reject) => {
    server = spawn(process.execPath, ["server.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: "3197",
        DB_PATH: path.join(temp, "test.sqlite"),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    server.stdout.on("data", (b) => {
      log += b;
      if (log.includes("KabarKelas ready")) resolve();
    });
    server.stderr.on("data", (b) => {
      log += b;
    });
    server.on("exit", (code) => {
      if (code) reject(new Error(log));
    });
  });
const stop = () =>
  new Promise((resolve) => {
    server.once("exit", resolve);
    server.kill();
  });
async function login(role = "admin", school = "s1", isHomeroom = false) {
  const r = await fetch(base + "/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, school, isHomeroom }),
  });
  assert.equal(r.status, 200);
  return r.headers.get("set-cookie").split(";")[0];
}
async function request(cookie, url, body, method = "POST") {
  const r = await fetch(base + url, {
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    ...(body !== undefined ? { method, body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, body: await r.json() };
}
before(async () => {
  temp = await mkdtemp(path.join(os.tmpdir(), "kabarkelas-test-"));
  await mkdir("test-results", { recursive: true });
  await launch();
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
});
after(async () => {
  await browser?.close();
  await stop();
  await rm(temp, { recursive: true, force: true });
});

test("startup shows the service error, stops the spinner, and can recover after retry", async () => {
  const context = await newContext();
  const page = await context.newPage();
  await page.route("**/api/bootstrap", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error:
          "Layanan data KabarKelas belum tersedia. Silakan coba lagi beberapa saat.",
      }),
    }),
  );
  await page.goto(base);
  const alert = page.getByRole("alert");
  await alert.waitFor();
  assert.match(await alert.textContent(), /Layanan data KabarKelas/);
  assert.equal(await page.locator(".loader").count(), 0);
  assert.doesNotMatch(await alert.textContent(), /Pastikan server berjalan/);
  await page.unroute("**/api/bootstrap");
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await page.locator("main h1").waitFor();
  assert.match(
    await page.locator("main h1").textContent(),
    /Selamat (pagi|siang|sore|malam)/,
  );
  await context.close();
});

test("demo data covers three schools, and unauthenticated access is rejected", async () => {
  const r = await fetch(base + "/api/bootstrap");
  assert.equal(r.status, 401);
  const cookie = await login("foundation");
  const { body } = await request(cookie, "/api/bootstrap");
  assert.equal(body.overview.length, 3);
  assert.equal(
    body.overview.reduce((a, s) => a + s.students, 0),
    576,
  );
  assert.equal(body.data.students.length, 0);
});
test("tenant boundaries reject foreign IDs and linked references", async () => {
  const c = await login();
  const { body: b } = await request(c, "/api/bootstrap");
  assert.equal(b.data.students.length, 192);
  assert.ok(b.data.students.every((s) => s.id.startsWith("s1-")));
  assert.equal(
    (
      await request(c, "/api/students", {
        ...b.data.students[0],
        id: "s2-st-0",
      })
    ).status,
    403,
  );
  assert.equal(
    (await request(c, "/api/grades", { studentId: "s2-st-0", score: 90 }))
      .status,
    403,
  );
});
test("teacher access is limited to assigned classes; parent only sees the linked child", async () => {
  const c = await login("teacher");
  const { body: b } = await request(c, "/api/bootstrap");
  assert.equal(b.data.students.length, 48);
  assert.ok(b.data.students.every((s) => b.user.classIds.includes(s.classId)));
  assert.equal(
    (
      await request(c, "/api/attendance", {
        studentId: "s1-st-100",
        classId: "s1-cl-4",
        date: "2026-10-17",
        status: "Hadir",
      })
    ).status,
    403,
  );
  const p = await login("parent");
  const { body: pb } = await request(p, "/api/bootstrap");
  assert.equal(pb.data.students.length, 1);
  assert.ok(pb.data.grades.every((g) => g.studentId === "s1-st-0"));
  assert.equal(
    (await request(p, "/api/grades", { ...pb.data.grades[0], score: 100 }))
      .status,
    403,
  );
  assert.ok(
    pb.data.quizzes.every((q) =>
      q.questions.every((x) => x.answer === undefined),
    ),
  );
});
test("attendance saves and updates the student summary without duplicate daily rows", async () => {
  const c = await login("teacher");
  const item = {
    id: "s1-st-0-attendance-test",
    studentId: "s1-st-0",
    classId: "s1-cl-0",
    date: "2026-10-17",
    status: "Hadir",
  };
  assert.equal((await request(c, "/api/attendance", item)).status, 200);
  assert.equal(
    (await request(c, "/api/attendance", { ...item, status: "Izin" })).status,
    200,
  );
  const { body: b } = await request(c, "/api/bootstrap");
  assert.equal(b.data.attendance.filter((a) => a.id === item.id).length, 1);
  const records = b.data.attendance.filter((a) => a.studentId === "s1-st-0");
  assert.equal(
    b.data.students.find((s) => s.id === "s1-st-0").attendance,
    Math.round(
      (records.filter((a) => a.status === "Hadir").length / records.length) *
        100,
    ),
  );
});
test("grades validate ranges, persist, and update academic history", async () => {
  const c = await login("teacher");
  const { body: b } = await request(c, "/api/bootstrap");
  const g = b.data.grades[0];
  assert.equal(
    (await request(c, "/api/grades", { ...g, score: 101 })).status,
    400,
  );
  assert.equal(
    (await request(c, "/api/grades", { ...g, score: 79 })).status,
    200,
  );
  const { body: next } = await request(c, "/api/bootstrap");
  assert.equal(next.data.grades.find((x) => x.id === g.id).score, 79);
  assert.notEqual(
    next.data.students.find((x) => x.id === g.studentId).history.at(-1),
    66,
  );
});
test("interventions retain PIC, target, status and outcome", async () => {
  const c = await login("principal");
  const { body: i } = await request(c, "/api/interventions", {
    studentId: "s1-st-0",
    title: "Evaluasi dua minggu",
    pic: "Ratna Wulandari, S.Pd.",
    due: "2026-10-31",
    status: "Berjalan",
    note: "Latihan aljabar 20 menit setiap hari.",
  });
  assert.ok(i.id);
  const r = await request(c, "/api/interventions", {
    ...i,
    status: "Selesai",
    note: "Kehadiran dan pemahaman meningkat.",
    outcome: "Membaik",
    evaluationNote: "Evaluasi dua minggu menunjukkan perkembangan positif.",
  });
  assert.equal(r.body.status, "Selesai");
});
test("student submission cannot assign its own grade and quiz answers are graded on the server", async () => {
  const c = await login("student");
  let { body: b } = await request(c, "/api/bootstrap");
  const a = b.data.assignments[0];
  const { body: submission } = await request(c, "/api/submissions", {
    studentId: "s1-st-0",
    assignmentId: a.id,
    body: "Hasil pekerjaan saya.",
    score: 100,
  });
  assert.equal(submission.score, undefined);
  assert.equal(submission.status, "Dikumpulkan");
  const q = b.data.quizzes[0];
  const r = await request(c, `/api/quiz/${q.id}/submit`, {
    answers: [0, 2, 1, 2, 3],
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.score, 100);
  assert.equal(
    (await request(c, `/api/quiz/${q.id}/submit`, { answers: [0] })).status,
    400,
  );
});
test("only Admin records manual partial payments; amount tampering and overpayment are rejected", async () => {
  const parent = await login("parent");
  const { body: b } = await request(parent, "/api/bootstrap");
  const invoice = b.data.invoices.find((i) => i.status === "Belum lunas");
  assert.equal(
    (
      await request(parent, "/api/invoices", {
        ...invoice,
        paymentAmount: 1,
        method: "Tunai",
        paymentDate: "2026-10-17",
      })
    ).status,
    403,
  );
  const admin = await login();
  const first = await request(admin, "/api/invoices", {
    ...invoice,
    amount: 1,
    paymentAmount: 200000,
    method: "Transfer manual",
    paymentDate: "2026-10-17",
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.amount, 650000);
  assert.equal(first.body.paidAmount, 200000);
  assert.equal(first.body.status, "Sebagian");
  assert.ok(first.body.receipt);
  assert.equal(
    (
      await request(admin, "/api/invoices", {
        ...invoice,
        paymentAmount: 999999,
        method: "Tunai",
        paymentDate: "2026-10-17",
      })
    ).status,
    400,
  );
  const last = await request(admin, "/api/invoices", {
    ...invoice,
    paymentAmount: 450000,
    method: "Tunai",
    paymentDate: "2026-10-17",
  });
  assert.equal(last.body.status, "Lunas");
  const { body: next } = await request(parent, "/api/bootstrap");
  assert.equal(
    next.data.payments.filter((p) => p.invoiceId === invoice.id).length,
    2,
  );
  assert.equal(
    (await request(admin, "/api/payments", { amount: 1 })).status,
    403,
  );
});
test("Excel import validation is atomic, duplicate NISNs are blocked, rollback removes untouched imported data", async () => {
  const c = await login();
  const row = {
    name: "Siswa Uji Import",
    nisn: "0012345678",
    classId: "s1-cl-0",
    gender: "P",
  };
  assert.equal(
    (
      await request(c, "/api/import-students", {
        rows: [row, { ...row, name: "Duplikat" }],
      })
    ).status,
    400,
  );
  let { body: b } = await request(c, "/api/bootstrap");
  assert.equal(b.data.students.length, 192);
  const { body: job } = await request(c, "/api/import-students", {
    rows: [row],
  });
  assert.equal(job.count, 1);
  assert.equal(
    (await request(c, "/api/import-students", { rows: [row] })).status,
    400,
  );
  const rollback = await request(c, `/api/imports/${job.id}/rollback`, {});
  assert.equal(rollback.body.removed, 1);
  ({ body: b } = await request(c, "/api/bootstrap"));
  assert.equal(b.data.students.length, 192);
});
test("settings enforce total weights; backup restore is scoped and auditable", async () => {
  const c = await login();
  const { body: b } = await request(c, "/api/bootstrap");
  assert.equal(
    (
      await request(c, "/api/settings", {
        ...b.data.settings[0],
        weightDaily: 60,
      })
    ).status,
    400,
  );
  const { body: backup } = await request(c, "/api/backup");
  assert.equal(backup.format, "KabarKelas-3");
  assert.equal(
    (await request(c, "/api/restore", { ...backup, school: "s2" })).status,
    400,
  );
  assert.equal((await request(c, "/api/restore", backup)).status, 200);
  const p = await login("parent");
  assert.equal((await request(p, "/api/backup")).status, 403);
});
test("report approval requires principal or the pupil's homeroom teacher", async () => {
  const teacher = await login("teacher");
  const { body: b } = await request(teacher, "/api/bootstrap");
  const report = b.data.reports.find((r) => r.classId === "s1-cl-0");
  assert.equal(
    (await request(teacher, "/api/reports", { ...report, status: "Terbit" }))
      .status,
    403,
  );
  const homeroom = await login("teacher", "s1", true);
  assert.equal(
    (await request(homeroom, "/api/reports", { ...report, status: "Terbit" }))
      .status,
    200,
  );
  const other = b.data.reports.find((r) => r.classId === "s1-cl-1");
  assert.equal(
    (await request(homeroom, "/api/reports", { ...other, status: "Terbit" }))
      .status,
    403,
  );
  const principal = await login("principal");
  assert.equal(
    (await request(principal, "/api/reports", { ...other, status: "Terbit" }))
      .status,
    200,
  );
  assert.equal((await request(principal, "/api/report-jobs")).status, 404);
});
test("sessions and edits survive a server restart", async () => {
  const c = await login();
  const { body: b } = await request(c, "/api/bootstrap");
  const s = b.data.students[1];
  await request(c, "/api/students", {
    ...s,
    address: "Alamat uji persistensi",
  });
  await stop();
  await launch();
  const { body: next, status } = await request(c, "/api/bootstrap");
  assert.equal(status, 200);
  assert.equal(
    next.data.students.find((r) => r.id === s.id).address,
    "Alamat uji persistensi",
  );
});
test("each role renders allowed screens; Admin and Foundation cannot open academic pages", async () => {
  const context = await newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const screens = {
    principal: [
      "dashboard",
      "students",
      "students/s1-st-0",
      "ews",
      "interventions",
      "attendance",
      "grades",
      "assignments",
      "quizzes",
      "reports",
      "schedule",
      "materials",
      "staff-leave",
      "staff-recap",
      "gate-history",
      "unit-work",
      "workflow",
      "analytics",
      "character",
      "tahfizh",
    ],
    admin: [
      "dashboard",
      "students",
      "students/s1-st-0",
      "master",
      "finance",
      "settings",
      "admissions",
      "schedule",
      "announcements",
      "staff-attendance",
      "staff-recap",
      "uniform",
      "pickup",
    ],
    teacher: [
      "dashboard",
      "ews",
      "below-kkm",
      "grades",
      "staff-self",
      "character",
      "tahfizh",
    ],
    parent: [
      "dashboard",
      "grades",
      "reports",
      "finance",
      "pickup",
      "uniform",
      "character",
      "tahfizh",
    ],
    student: ["dashboard", "assignments", "quizzes", "reports", "uniform"],
    foundation: [
      "dashboard",
      "foundation",
      "trust",
      "board-actions",
      "unit-needs",
      "meeting",
      "packages",
    ],
    security: ["dashboard", "gate-scan", "gate-history", "gate-incidents"],
  };
  for (const [role, routes] of Object.entries(screens)) {
    await context.request.post(base + "/api/session", {
      data: { role, isHomeroom: role === "teacher" },
    });
    await page.goto(base);
    await page.reload();
    for (const route of routes) {
      await page.goto(base + "/#/" + route);
      await page
        .locator("main h1")
        .waitFor({ timeout: 10000 })
        .catch(async () => {
          throw new Error(
            role +
              ":" +
              route +
              " " +
              (await page.locator("main").innerText()) +
              " errors: " +
              errors.join(","),
          );
        });
      assert.ok(
        (await page.locator("main").innerText()).length > 40,
        role + ":" + route,
      );
    }
    if (["admin", "foundation", "security"].includes(role)) {
      assert.equal(await page.locator('.nav-item[href="#/ews"]').count(), 0);
      await page.goto(base + "/#/ews");
      await page
        .getByRole("heading", {
          name: "Halaman tidak tersedia untuk peran ini",
        })
        .waitFor();
    }
  }
  await context.request.post(base + "/api/session", {
    data: { role: "principal" },
  });
  await page.reload();
  await page.goto(base + "/#/students/s1-st-0");
  await page.locator(".student-ews").waitFor();
  assert.ok((await page.locator(".student-ews").boundingBox()).y < 400);
  await page.screenshot({
    path: "test-results/student-360-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.goto(base + "/#/dashboard");
  await page.locator(".ews-overview").waitFor();
  assert.ok((await page.locator(".ews-overview").boundingBox()).y < 330);
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.goto(base + "/#/dashboard");
  await page.locator(".ews-overview").waitFor();
  assert.ok((await page.locator(".ews-overview").boundingBox()).y < 430);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  assert.deepEqual(errors, []);
  await context.close();
});
test("browser role switch, assignment submission, timed quiz, PDF download and parent portal work", async () => {
  const context = await newContext({
    acceptDownloads: true,
    viewport: { width: 1365, height: 1000 },
  });
  await context.request.post(base + "/api/session", {
    data: { role: "student" },
  });
  const p = await context.newPage();
  await p.goto(base);
  await p.locator(".personal-profile").waitFor();
  await p.goto(base + "/#/assignments");
  await p
    .getByRole("button", { name: "Lihat & kerjakan tugas" })
    .first()
    .click();
  await p
    .getByPlaceholder("Tuliskan jawaban atau tautan hasil pekerjaanmu…")
    .fill("Jawaban lengkap untuk pengujian alur siswa.");
  await p.getByRole("button", { name: "Kumpulkan jawaban" }).click();
  await p.getByRole("dialog").waitFor({ state: "hidden" });
  await p.goto(base + "/#/quizzes");
  await p
    .getByRole("button", { name: /Kerjakan kembali|Mulai kuis/ })
    .first()
    .click();
  for (const [i, answer] of [0, 2, 1, 2, 3].entries())
    await p
      .locator("fieldset")
      .nth(i)
      .locator("input[type=radio]")
      .nth(answer)
      .check();
  await p.getByRole("button", { name: "Kumpulkan & lihat hasil" }).click();
  await p.getByRole("heading", { name: "Kerja bagus!" }).waitFor();
  assert.match(await p.locator(".quiz-result").innerText(), /100/);
  await p.getByRole("button", { name: "Selesai", exact: true }).click();
  await p.goto(base + "/#/reports");
  await p.getByRole("button", { name: "Tinjau rapor" }).first().click();
  const download = p.waitForEvent("download");
  await p.getByRole("button", { name: "Unduh PDF" }).click();
  assert.match((await download).suggestedFilename(), /Rapor-.*\.pdf/);
  await p.getByRole("button", { name: "Tutup dialog" }).click();
  await p.getByRole("button", { name: "Ganti peran" }).click();
  await p
    .getByRole("button", { name: /Wali Murid Ikuti perkembangan/ })
    .click();
  await p.locator(".personal-profile").waitFor();
  assert.match(await p.locator("h1").innerText(), /Ibu Dian/);
  await p.screenshot({
    path: "test-results/parent-portal.png",
    fullPage: true,
    animations: "disabled",
  });
  await context.close();
});

test("seven primary roles and academic capabilities are enforced in API payloads", async () => {
  const admin = await login();
  const { body: a } = await request(admin, "/api/bootstrap");
  for (const kind of [
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
  ])
    assert.equal(a.data[kind].length, 0, kind);
  for (const field of ["attendance", "history", "overdue"])
    assert.equal(a.data.students[0][field], undefined);
  assert.equal(a.data.messages, undefined);
  assert.equal(a.data.integrations, undefined);
  assert.equal(a.features.ai, false);
  assert.equal(a.features.chat, false);
  assert.equal(a.features.paymentGateway, false);
  for (const role of ["homeroom", "superadmin"]) {
    const r = await fetch(base + "/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    assert.equal(r.status, 400);
  }
  for (const kind of [
    "grades",
    "interventions",
    "reports",
    "messages",
    "integrations",
    "leads",
  ])
    assert.equal(
      (
        await request(admin, "/api/" + kind, {
          studentId: "s1-st-0",
          score: 90,
        })
      ).status,
      403,
      kind,
    );
  const teacher = await login("teacher");
  const { body: t } = await request(teacher, "/api/bootstrap");
  assert.equal(t.data.character.length, 0);
  assert.equal(t.data.interventions.length, 0);
  assert.equal(t.data.invoices.length, 0);
  const parent = await login("parent");
  const { body: p } = await request(parent, "/api/bootstrap");
  assert.equal(p.data.quizzes.length, 0);
  assert.ok(p.data.reports.every((r) => r.status === "Terbit"));
  const foundation = await login("foundation");
  const { body: f } = await request(foundation, "/api/bootstrap");
  for (const kind of [
    "students",
    "teachers",
    "grades",
    "invoices",
    "pickupPersons",
  ])
    assert.equal(f.data[kind].length, 0);
});
test("academic batch is atomic and assigned subjects are enforced", async () => {
  const c = await login("teacher");
  const { body: b } = await request(c, "/api/bootstrap");
  const g = b.data.grades.find((g) => g.subjectId === b.user.subjectIds[0]);
  const result = await request(c, "/api/academic-batch", {
    kind: "grades",
    rows: [
      { ...g, score: 88 },
      { ...g, id: "s1-invalid-grade", studentId: "s1-st-100", score: 89 },
    ],
  });
  assert.equal(result.status, 403);
  const { body: next } = await request(c, "/api/bootstrap");
  assert.equal(next.data.grades.find((x) => x.id === g.id).score, g.score);
  assert.equal(
    (
      await request(c, "/api/grades", {
        ...b.data.grades.find((x) => x.subjectId !== b.user.subjectIds[0]),
        score: 99,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(c, "/api/academic-batch", {
        kind: "grades",
        rows: [{ ...g, score: 88 }],
      })
    ).status,
    200,
  );
  const admin = await login();
  assert.equal(
    (await request(admin, "/api/academic-batch", { kind: "grades", rows: [g] }))
      .status,
    403,
  );
});
test("EWS rules belong to principal and Admin cannot overwrite them with school settings", async () => {
  const principal = await login("principal");
  const rules = { ewsAttendance: 84, ewsDrop: 12, ewsOverdue: 4 };
  assert.equal((await request(principal, "/api/ews-rules", rules)).status, 200);
  const admin = await login();
  const { body: b } = await request(admin, "/api/bootstrap");
  assert.equal((await request(admin, "/api/ews-rules", rules)).status, 403);
  await request(admin, "/api/settings", {
    ...b.data.settings[0],
    ewsAttendance: 99,
    gradeScale: "4",
  });
  const { body: next } = await request(principal, "/api/bootstrap");
  assert.equal(next.data.settings[0].ewsAttendance, 84);
  assert.equal(next.data.settings[0].gradeScale, "4");
});
test("teacher leave is private and only principal can approve; P5 needs own homeroom capability", async () => {
  const teacher = await login("teacher");
  const { body: leave, status } = await request(teacher, "/api/leaveRequests", {
    from: "2026-10-20",
    to: "2026-10-21",
    type: "Izin keluarga",
    reason: "Keperluan keluarga",
  });
  assert.equal(status, 200);
  assert.equal(leave.status, "Menunggu");
  assert.equal(
    (
      await request(teacher, "/api/leaveRequests", {
        ...leave,
        teacherId: "s1-te-1",
      })
    ).status,
    403,
  );
  const principal = await login("principal");
  assert.equal(
    (
      await request(principal, "/api/leaveRequests", {
        ...leave,
        status: "Disetujui",
        decisionNote: "Materi pengganti tersedia.",
      })
    ).body.status,
    "Disetujui",
  );
  assert.equal(
    (await request(teacher, "/api/leaveRequests", leave)).status,
    403,
  );
  const h = await login("teacher", "s1", true);
  const { body: b } = await request(h, "/api/bootstrap");
  const record = b.data.character[0];
  assert.equal(
    (await request(teacher, "/api/character", { ...record, score: 4 })).status,
    403,
  );
  assert.equal(
    (await request(h, "/api/character", { ...record, score: 4 })).status,
    200,
  );
  assert.equal(
    (
      await request(h, "/api/character", {
        ...record,
        id: "s1-p5-foreign",
        studentId: "s1-st-24",
      })
    ).status,
    403,
  );
});
test("parent guardian cards are signed, child-scoped and time-limited; only Security records pickup", async () => {
  const parent = await login("parent");
  const { body: b } = await request(parent, "/api/bootstrap");
  const person = b.data.pickupPersons[0];
  assert.match(person.qr, /^KK2\./);
  const security = await login("security");
  assert.equal(
    (await request(security, "/api/pickup/verify", { qr: person.qr })).status,
    200,
  );
  assert.equal(
    (
      await request(security, "/api/pickup/verify", {
        qr: person.qr.slice(0, -5) + "xxxxx",
      })
    ).status,
    400,
  );
  const other = await login("security", "s2");
  assert.equal(
    (await request(other, "/api/pickup/verify", { qr: person.qr })).status,
    403,
  );
  assert.equal(
    (
      await request(parent, "/api/pickupPersons", {
        name: "Penjemput lain",
        studentId: "s1-st-1",
        relationship: "Ayah",
        phone: "08123456789",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(parent, "/api/pickupLogs", {
        studentId: "s1-st-0",
        personId: person.id,
        action: "Jemput",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(security, "/api/pickupLogs", {
        studentId: "s1-st-0",
        qr: person.qr,
        action: "Antar",
      })
    ).status,
    200,
  );
  const log = await request(security, "/api/pickupLogs", {
    studentId: "s1-st-0",
    qr: person.qr,
    action: "Jemput",
  });
  assert.equal(log.status, 200);
  assert.equal(log.body.verified, true);
  assert.equal(
    (await request(security, "/api/pickupLogs", log.body)).status,
    403,
  );
  const temporary = await request(parent, "/api/pickupPersons", {
    name: "Budi Uji",
    studentId: "s1-st-0",
    relationship: "Saudara",
    phone: "08123456789",
    validOn: "2020-01-01",
  });
  assert.equal(temporary.status, 200);
  const { body: next } = await request(parent, "/api/bootstrap");
  const expired = next.data.pickupPersons.find(
    (p) => p.id === temporary.body.id,
  );
  assert.equal(
    (await request(security, "/api/pickup/verify", { qr: expired.qr })).status,
    400,
  );
});
test("Admin edits uniform exceptions and schedules; family and teachers only read", async () => {
  const admin = await login();
  const item = {
    date: "2026-10-23",
    name: "Batik nasional",
    note: "Kegiatan budaya",
  };
  const created = await request(admin, "/api/uniformOverrides", item);
  assert.equal(created.status, 200);
  const parent = await login("parent");
  const { body: b } = await request(parent, "/api/bootstrap");
  assert.ok(b.data.uniformOverrides.some((u) => u.id === created.body.id));
  assert.equal(
    (await request(parent, "/api/uniformOverrides", created.body)).status,
    403,
  );
  const lesson = await request(admin, "/api/schedule", {
    classId: "s1-cl-0",
    day: "Senin",
    time: "09:00 – 10:30",
    subject: "Matematika",
    teacher: "Ratna Wulandari",
    room: "Ruang 201",
  });
  assert.equal(lesson.status, 200);
  assert.equal(
    (await request(admin, "/api/schedule/" + lesson.body.id, {}, "DELETE"))
      .status,
    200,
  );
});
test("browser bulk PDF generation downloads a valid ZIP without server jobs or polling", async () => {
  const context = await newContext({ acceptDownloads: true });
  await context.request.post(base + "/api/session", {
    data: { role: "principal" },
  });
  const page = await context.newPage(),
    requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto(base + "/#/reports");
  await page.locator("main h1").waitFor();
  const boxes = page.getByRole("checkbox");
  await boxes.nth(1).check();
  await boxes.nth(2).check();
  await page.getByRole("button", { name: /Generate massal/ }).click();
  const link = page.getByRole("link", { name: /Unduh ZIP/ });
  await link.waitFor({ timeout: 30000 });
  const pending = page.waitForEvent("download");
  await link.click();
  const download = await pending;
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  const files = Object.values(zip.files);
  assert.equal(files.length, 2);
  for (const f of files)
    assert.equal(
      (await f.async("nodebuffer")).subarray(0, 5).toString(),
      "%PDF-",
    );
  assert.equal(
    requests.some(
      (url) => url.includes("report-jobs") || url.includes("report-worker"),
    ),
    false,
  );
  await context.close();
});

test("Security scanner decodes an uploaded QR image and exposes exactly the gate menus", async () => {
  const context = await newContext({ viewport: { width: 1440, height: 1000 } });
  await context.request.post(base + "/api/session", {
    data: { role: "security" },
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/#/gate-scan");
  await page
    .getByRole("heading", { name: "Pindai QR gerbang", exact: true })
    .waitFor();
  const hrefs = await page
    .locator(".nav-item")
    .evaluateAll((els) => els.map((e) => e.getAttribute("href")).sort());
  assert.deepEqual(
    hrefs,
    ["#/dashboard", "#/gate-scan", "#/gate-history", "#/gate-incidents"].sort(),
  );
  const sample = await (
    await context.request.get(base + "/api/demo-gate-card")
  ).json();
  const { default: qrcode } = await import("qrcode-generator");
  const qr = qrcode(0, "M");
  qr.addData(sample.qr);
  qr.make();
  const imagePage = await context.newPage();
  await imagePage.setContent(
    '<div id="qr" style="background:white;padding:30px;width:520px">' +
      qr.createSvgTag({ cellSize: 5, margin: 5, scalable: true }) +
      "</div>",
  );
  const png = await imagePage.locator("#qr").screenshot();
  await imagePage.close();
  await page
    .getByLabel("Unggah gambar QR")
    .setInputFiles({
      name: "Kartu-penjemput.png",
      mimeType: "image/png",
      buffer: png,
    });
  await page
    .getByText("Kartu aktif dan terverifikasi")
    .waitFor({ timeout: 10000 })
    .catch(async () => {
      throw new Error(
        "QR upload: " +
          (await page.locator("main").innerText()) +
          " browser errors: " +
          errors.join(","),
      );
    });
  assert.match(
    await page.locator(".verified-card").innerText(),
    /Nadia Azzahra/,
  );
  assert.equal(
    await page.getByRole("button", { name: "Catat masuk / antar" }).isEnabled(),
    true,
  );
  await page.getByRole("button", { name: "Catat masuk / antar" }).click();
  await page.waitForFunction(() =>
    document.querySelector(".verified-card")?.textContent.includes("Antar ·"),
  );
  await page.getByRole("button", { name: "Catat pulang / jemput" }).click();
  await page.waitForFunction(() =>
    document.querySelector(".verified-card")?.textContent.includes("Jemput ·"),
  );
  await page.screenshot({
    path: "test-results/security-qr-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  for (const route of [
    "grades",
    "finance",
    "students/s1-st-0",
    "settings",
    "foundation",
    "packages",
    "pickup",
    "staff-attendance",
  ]) {
    await page.goto(base + "/#/" + route);
    await page
      .getByRole("heading", { name: "Halaman tidak tersedia untuk peran ini" })
      .waitFor();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.goto(base + "/#/gate-scan");
  await page.locator(".scanner-window").waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: "test-results/security-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  assert.deepEqual(errors, []);
  await context.close();
});
test("welcome selects a role and guided tour advances only after a successful action", async () => {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  await page.goto(base);
  const welcome = page.getByRole("dialog", { name: "Pilih pengalaman demo" });
  await welcome.waitFor();
  await page.screenshot({
    path: "test-results/demo-welcome.png",
    fullPage: false,
    animations: "disabled",
  });
  await welcome.getByRole("button", { name: /Security Pindai QR/ }).click();
  await welcome.waitFor({ state: "hidden" });
  const tour = page.getByLabel("Panduan skenario demo");
  await tour.waitFor();
  assert.match(await tour.innerText(), /1\/3/);
  await tour.getByRole("button", { name: "Buka langkah ini" }).click();
  await page.getByRole("button", { name: "Gunakan kartu dummy" }).click();
  assert.match(await tour.innerText(), /1\/3/);
  await page
    .getByRole("button", { name: "Verifikasi kode", exact: true })
    .click();
  await page.getByText("Kartu aktif dan terverifikasi").waitFor();
  await page.waitForFunction(() =>
    document.querySelector(".tour-dock")?.textContent.includes("2/3"),
  );
  await context.close();
});
test("foundation meeting PDF reflects saved follow-ups and contains no pupil detail", async () => {
  const context = await newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 1000 },
  });
  await context.request.post(base + "/api/session", {
    data: { role: "foundation" },
  });
  const page = await context.newPage();
  await page.goto(base + "/#/dashboard");
  await page.locator(".board-hero").waitFor();
  await page.screenshot({
    path: "test-results/foundation-dashboard.png",
    fullPage: true,
    animations: "disabled",
  });
  for (const denied of [
    "students",
    "grades",
    "finance",
    "pickup",
    "gate-scan",
    "settings",
    "announcements",
  ])
    assert.equal(
      await page.locator(`.nav-item[href="#/${denied}"]`).count(),
      0,
      denied,
    );
  await page.goto(base + "/#/meeting");
  await page.locator(".meeting-preview").waitFor();
  assert.equal(
    (await page.locator("main").innerText()).includes("Nadia Azzahra"),
    false,
  );
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Unduh laporan rapat", exact: true })
    .click();
  const download = await pending,
    bytes = await readFile(await download.path());
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.goto(base + "/#/dashboard");
  await page.locator(".board-hero").waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await context.close();
});
