export const roleNames = {
  principal: "Kepala Sekolah",
  admin: "Admin Sekolah",
  teacher: "Guru",
  parent: "Wali Murid",
  student: "Siswa",
  foundation: "Yayasan",
  security: "Security",
};
export const roleResponsibilities = {
  principal:
    "Akademik, pendampingan, persetujuan rapor dan izin, serta tindak lanjut unit.",
  admin:
    "Biodata, data sekolah, SPP manual, PPDB, jadwal, dan penyelesaian pengecualian gerbang.",
  teacher:
    "Pembelajaran pada kelas dan mapel yang ditugaskan, serta presensi dan izin sendiri.",
  parent:
    "Perkembangan anak terhubung, riwayat SPP, dan penjemput yang diizinkan.",
  student: "Tugas, kuis, materi, dan perkembangan belajar sendiri.",
  foundation:
    "Target, prioritas, kebutuhan, dan hasil tindak lanjut lintas unit; data agregat.",
  security:
    "Pindai QR, cocokkan penjemput, catat masuk/pulang, dan laporkan kejadian gerbang.",
};
const common = ["dashboard", "announcements"];
export const pagesByRole = {
  principal: [
    ...common,
    "students",
    "ews",
    "below-kkm",
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
    "character",
    "tahfizh",
    "unit-work",
    "analytics",
    "workflow",
    "packages",
  ],
  admin: [
    ...common,
    "students",
    "master",
    "schedule",
    "staff-attendance",
    "staff-recap",
    "uniform",
    "finance",
    "settings",
    "admissions",
    "pickup",
    "gate-history",
    "gate-incidents",
    "analytics",
    "packages",
  ],
  teacher: [
    ...common,
    "students",
    "ews",
    "below-kkm",
    "attendance",
    "grades",
    "assignments",
    "quizzes",
    "reports",
    "schedule",
    "materials",
    "staff-self",
    "analytics",
  ],
  parent: [
    ...common,
    "attendance",
    "grades",
    "assignments",
    "reports",
    "schedule",
    "materials",
    "finance",
    "uniform",
    "pickup",
    "character",
    "tahfizh",
  ],
  student: [
    ...common,
    "attendance",
    "grades",
    "assignments",
    "quizzes",
    "reports",
    "schedule",
    "materials",
    "uniform",
    "character",
    "tahfizh",
  ],
  foundation: [
    "dashboard",
    "foundation",
    "board-actions",
    "unit-needs",
    "meeting",
    "packages",
    "trust",
  ],
  security: ["dashboard", "gate-scan", "gate-history", "gate-incidents"],
};
export const collectionsByRole = {
  principal: [
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
    "interventions",
    "schedule",
    "settings",
    "materials",
    "staffAttendance",
    "leaveRequests",
    "character",
    "tahfizh",
    "pickupLogs",
    "foundationTasks",
    "unitNeeds",
    "schoolTargets",
    "termSnapshots",
    "savedReports",
  ],
  admin: [
    "students",
    "teachers",
    "classes",
    "subjects",
    "announcements",
    "invoices",
    "payments",
    "schedule",
    "settings",
    "audit",
    "admissions",
    "staffAttendance",
    "leaveRequests",
    "uniforms",
    "uniformOverrides",
    "pickupPersons",
    "pickupLogs",
    "gateIncidents",
    "savedReports",
  ],
  teacher: [
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
    "interventions",
    "schedule",
    "settings",
    "materials",
    "staffAttendance",
    "leaveRequests",
    "uniforms",
    "uniformOverrides",
    "character",
    "tahfizh",
    "termSnapshots",
    "savedReports",
  ],
  parent: [
    "students",
    "classes",
    "subjects",
    "grades",
    "attendance",
    "assignments",
    "submissions",
    "reports",
    "announcements",
    "invoices",
    "payments",
    "interventions",
    "schedule",
    "settings",
    "materials",
    "uniforms",
    "uniformOverrides",
    "character",
    "tahfizh",
    "pickupPersons",
    "pickupLogs",
  ],
  student: [
    "students",
    "classes",
    "subjects",
    "grades",
    "attendance",
    "assignments",
    "submissions",
    "quizzes",
    "reports",
    "announcements",
    "interventions",
    "schedule",
    "settings",
    "materials",
    "uniforms",
    "uniformOverrides",
    "character",
    "tahfizh",
  ],
  foundation: [
    "settings",
    "foundationTasks",
    "unitNeeds",
    "schoolTargets",
    "termSnapshots",
  ],
  security: ["students", "classes", "settings", "pickupLogs", "gateIncidents"],
};
export const administrativeBackupKinds = [
  "students",
  "teachers",
  "classes",
  "subjects",
  "announcements",
  "invoices",
  "payments",
  "schedule",
  "settings",
  "audit",
  "admissions",
  "staffAttendance",
  "leaveRequests",
  "uniforms",
  "uniformOverrides",
  "pickupPersons",
  "pickupLogs",
  "gateIncidents",
];
const optional = {
  character: "character",
  tahfizh: "tahfizh",
  admissions: "admissions",
};
const proPages = new Set([
  "ews",
  "below-kkm",
  "interventions",
  "analytics",
  "workflow",
]);
const foundationPages = new Set([
  "foundation",
  "board-actions",
  "unit-needs",
  "meeting",
  "unit-work",
]);
const proCollections = new Set([
  "interventions",
  "termSnapshots",
  "savedReports",
]);
const foundationCollections = new Set([
  "foundationTasks",
  "unitNeeds",
  "schoolTargets",
]);
export function canAccessPage(user, page, settings) {
  if (!user) return false;
  const allowed =
    pagesByRole[user.role]?.includes(page) ||
    (user.role === "teacher" &&
      user.isHomeroom &&
      ["interventions", "character", "tahfizh"].includes(page));
  return (
    !!allowed &&
    (!proPages.has(page) || isPro(settings)) &&
    (!foundationPages.has(page) || isFoundation(settings)) &&
    (!optional[page] ||
      !settings?.enabledModules ||
      settings.enabledModules.includes(optional[page]))
  );
}
export function canReadCollection(user, kind, settings) {
  return (
    !!collectionsByRole[user?.role]?.includes(kind) &&
    (!settings || !proCollections.has(kind) || isPro(settings)) &&
    (!settings || !foundationCollections.has(kind) || isFoundation(settings)) &&
    (!settings ||
      user?.role !== "foundation" ||
      kind === "settings" ||
      isFoundation(settings))
  );
}
export function isPro(settings) {
  return ["Pro", "Yayasan"].includes(settings?.plan || "Pro");
}
export function isFoundation(settings) {
  return settings?.plan === "Yayasan";
}
export function canEditAcademic(user) {
  return user?.role === "teacher";
}
export function canManageSchool(user) {
  return user?.role === "admin";
}
export function canReviewReport(user, classId) {
  return (
    user?.role === "principal" ||
    (user?.role === "teacher" &&
      user.isHomeroom &&
      (!classId || classId === user.homeroomClassId))
  );
}
export function canPublishReport(user, report, settings) {
  return (
    canReviewReport(user, report?.classId) &&
    (!isPro(settings) ||
      settings?.approvalMode !== "two-step" ||
      user.role === "principal")
  );
}
export function canIntervene(user) {
  return (
    user?.role === "principal" || (user?.role === "teacher" && user.isHomeroom)
  );
}
export function canReadAcademic(user) {
  return ["principal", "teacher", "parent", "student"].includes(user?.role);
}
export function displayRole(user) {
  return user?.role === "teacher" && user.isHomeroom
    ? "Guru · Wali Kelas"
    : roleNames[user?.role] || "";
}
export function normalizeUser(user) {
  if (user.role === "homeroom")
    user = { ...user, role: "teacher", isHomeroom: true };
  if (user.role === "superadmin") user = { ...user, role: "foundation" };
  return {
    ...user,
    isHomeroom: user.role === "teacher" && user.isHomeroom === true,
    homeroomClassId:
      user.role === "teacher" && user.isHomeroom
        ? user.homeroomClassId || `${user.school}-cl-0`
        : null,
    teacherId: user.teacherId || `${user.school}-te-0`,
    subjectIds: user.subjectIds || [`${user.school}-su-0`],
  };
}
