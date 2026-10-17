import { useSyncExternalStore } from "react";
import type { Row, User } from "./model";
import { canReviewReport } from "../shared/access.mjs";
import { reportPDF } from "./export";
export type ReportJob = {
  id: string;
  owner: string;
  status: "Berjalan" | "Selesai" | "Gagal";
  done: number;
  total: number;
  error?: string;
  url?: string;
};
let jobs: ReportJob[] = [];
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => jobs;
const owner = (user: User) =>
  `${user.school}:${user.role}:${user.isHomeroom ? user.homeroomClassId : ""}`;
function update(id: string, changes: Partial<ReportJob>) {
  jobs = jobs.map((job) => (job.id === id ? { ...job, ...changes } : job));
  listeners.forEach((listener) => listener());
}
export function useReportJobs(user: User) {
  return useSyncExternalStore(subscribe, snapshot).filter(
    (job) => job.owner === owner(user),
  );
}
export async function createReportArchive(
  user: User,
  ids: string[],
  data: Record<string, Row[]>,
  school: Row,
) {
  if (jobs.some((job) => job.status === "Berjalan"))
    throw new Error(
      "Masih ada berkas yang sedang disiapkan. Tunggu sampai selesai.",
    );
  const selected = [...new Set(ids)]
    .map((id) => data.reports.find((report) => report.id === id))
    .filter(Boolean) as Row[];
  if (selected.some((report) => !canReviewReport(user, report.classId)))
    throw new Error("Rapor berada di luar kelas perwalian Anda.");
  if (!selected.length) throw new Error("Pilih setidaknya satu rapor.");
  const id = crypto.randomUUID(),
    job: ReportJob = {
      id,
      owner: owner(user),
      status: "Berjalan",
      done: 0,
      total: selected.length,
    };
  jobs = [...jobs, job];
  listeners.forEach((listener) => listener());
  try {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const [index, report] of selected.entries()) {
      const student = data.students.find(
        (student) => student.id === report.studentId,
      );
      if (!student) throw new Error("Data siswa tidak tersedia.");
      const blob = (await reportPDF(student, data, school, true)) as Blob;
      zip.file(
        `${student.nisn}-${student.name.replace(/[^\p{L}\p{N} -]/gu, "")}.pdf`,
        await blob.arrayBuffer(),
      );
      update(id, { done: index + 1 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const archive = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
    });
    update(id, { status: "Selesai", url: URL.createObjectURL(archive) });
  } catch (error) {
    update(id, { status: "Gagal", error: (error as Error).message });
    throw error;
  }
}
