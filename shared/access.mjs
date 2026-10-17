export const roleNames = {
  principal: "Kepala Sekolah",
  admin: "Admin Sekolah",
  teacher: "Guru",
  parent: "Wali Murid",
  student: "Siswa",
  foundation: "Yayasan",
};
const common = ["dashboard", "announcements"];
const pages = {
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
    "pickup",
    "character",
    "tahfizh",
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
  foundation: [...common, "foundation", "trust"],
};
export function canAccessPage(user, page) {
  return (
    !!user &&
    (pages[user.role]?.includes(page) ||
      (user.role === "teacher" &&
        user.isHomeroom &&
        ["interventions", "character", "tahfizh"].includes(page)))
  );
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
