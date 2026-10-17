import { createContext, useContext } from "react";
export type Row = { id: string; [key: string]: any };
export type User = {
  role: string;
  school: string;
  name: string;
  studentId: string;
  classIds: string[];
  isHomeroom: boolean;
  homeroomClassId: string | null;
  teacherId: string;
  subjectIds: string[];
};
export type AppState = {
  data: Record<string, Row[]>;
  user: User;
  school: Row;
  schools: Row[];
  overview: Row[];
  go: (page: string, id?: string) => void;
  save: (kind: string, item: Partial<Row>, quiet?: boolean) => Promise<Row>;
  remove: (kind: string, id: string) => Promise<void>;
  reload: () => Promise<void>;
  toast: (msg: string, error?: boolean) => void;
  page: string;
  selectedId: string;
  setRole: (
    role: string,
    school?: string,
    isHomeroom?: boolean,
  ) => Promise<void>;
};
export const AppContext = createContext<AppState>(null!);
export const useApp = () => useContext(AppContext);
export {
  roleNames,
  canAccessPage,
  canManageSchool,
  canReviewReport,
  canIntervene,
  canReadAcademic,
  displayRole,
} from "../shared/access.mjs";
export const rolePhotos: Record<string, number> = {
  principal: 8,
  admin: 10,
  teacher: 6,
  parent: 9,
  student: 1,
  foundation: 8,
};
export const currency = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
export const number = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n || 0);
export const date = (d: string, short = false) =>
  d
    ? new Date(d).toLocaleDateString("id-ID", {
        day: "numeric",
        month: short ? "short" : "long",
        year: "numeric",
      })
    : "—";
export const avg = (arr: number[]) =>
  arr.length
    ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
    : 0;
export function risk(student: Row, data: Record<string, Row[]>) {
  const settings = data.settings?.[0] || {};
  const grades = (data.grades || []).filter((g) => g.studentId === student.id);
  const drop = student.history?.[0] - student.history?.at(-1) || 0;
  const reasons = [];
  if (student.attendance < (settings.ewsAttendance || 80))
    reasons.push(
      `Kehadiran ${student.attendance}%, di bawah ${settings.ewsAttendance || 80}%`,
    );
  if (drop > (settings.ewsDrop || 10))
    reasons.push(`Rata-rata nilai turun ${drop} poin`);
  if (student.overdue >= (settings.ewsOverdue || 3))
    reasons.push(`${student.overdue} tugas belum dikumpulkan`);
  if (grades.some((g) => g.score < (settings.kkm || 75)))
    reasons.push(
      `${grades.filter((g) => g.score < (settings.kkm || 75)).length} mata pelajaran di bawah KKM`,
    );
  return {
    level:
      reasons.length >= 3 ? "Tinggi" : reasons.length ? "Sedang" : "Rendah",
    reasons,
    score: avg(grades.map((g) => g.score)),
    drop,
  };
}
export const canEdit = (role: string) => role === "teacher";

export function gradeDisplay(score: number, settings: Partial<Row> = {}) {
  if (!Number.isFinite(score)) return "—";
  switch (settings.gradeScale) {
    case "10":
      return number(score / 10);
    case "4":
      return number(score / 25);
    case "letter":
      return score >= 90
        ? "A"
        : score >= 80
          ? "B"
          : score >= 70
            ? "C"
            : score >= 60
              ? "D"
              : "E";
    default:
      return number(score);
  }
}
