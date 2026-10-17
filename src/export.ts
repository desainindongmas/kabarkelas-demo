import type { Row } from "./model";
import { date, gradeDisplay } from "./model";
export async function exportExcel(
  rows: Record<string, unknown>[],
  filename: string,
) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = Object.keys(rows[0] || {}).map(() => ({ wch: 24 }));
  XLSX.utils.book_append_sheet(wb, ws, "KabarKelas");
  XLSX.writeFile(wb, filename + ".xlsx");
}
export async function reportPDF(
  student: Row,
  data: Record<string, Row[]>,
  school: Row,
  returnBlob = false,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const settings = data.settings?.[0] || {};
  const report = data.reports.find((r) => r.studentId === student.id);
  const grades = data.grades.filter((g) => g.studentId === student.id);
  const className =
    data.classes.find((c) => c.id === student.classId)?.name || "";
  const color = settings.color || "#008e83";
  const template = settings.template || "Merdeka";
  doc.setFillColor(color);
  doc.setDrawColor(color);
  if (template === "Merdeka") {
    doc.rect(0, 0, 210, 36, "F");
    doc.setTextColor(255);
  } else if (template === "Klasik") {
    doc.setTextColor(45);
    doc.setLineWidth(1);
    doc.line(16, 35, 194, 35);
  } else {
    doc.rect(0, 0, 5, 297, "F");
    doc.setTextColor(color);
    doc.setLineWidth(0.3);
    doc.line(16, 35, 194, 35);
  }
  doc.setFontSize(19);
  doc.text("RAPOR HASIL BELAJAR", 16, 17);
  doc.setFontSize(10);
  doc.text(
    school.name + " | " + (settings.curriculum || "Kurikulum Merdeka"),
    16,
    27,
  );
  doc.setTextColor(40, 50, 60);
  doc.text(`Nama: ${student.name}`, 16, 47);
  doc.text(`NISN: ${student.nisn}`, 16, 54);
  doc.text(`Kelas: ${className}`, 130, 47);
  doc.text(
    `${settings.year || "2026/2027"} - ${settings.semester || "Ganjil"}`,
    130,
    54,
  );
  doc.setFillColor(239, 245, 245);
  doc.rect(16, 63, 178, 10, "F");
  doc.setFontSize(9);
  doc.text("MATA PELAJARAN / CAPAIAN", 20, 70);
  doc.text("NILAI", 150, 70);
  doc.text("PREDIKAT", 170, 70);
  let y = 83;
  grades.forEach((g) => {
    if (y > 260) {
      doc.addPage();
      y = 24;
    }
    doc.setFontSize(10);
    doc.text(g.subject, 20, y);
    doc.text(gradeDisplay(g.score, settings), 154, y);
    doc.setFontSize(8);
    doc.text(
      g.score >= 90 ? "Sangat baik" : g.score >= 75 ? "Baik" : "Bimbingan",
      170,
      y,
    );
    doc.setTextColor(125);
    doc.setFontSize(7);
    const desc = doc.splitTextToSize(g.description || "", 123);
    doc.text(desc, 20, y + 5);
    doc.setTextColor(40, 50, 60);
    doc.setDrawColor(230);
    const height = Math.max(17, 10 + desc.length * 3.5);
    doc.line(16, y + height - 4, 194, y + height - 4);
    y += height;
  });
  doc.addPage();
  doc.setTextColor(color);
  doc.setFontSize(15);
  doc.text("CATATAN PERKEMBANGAN", 16, 22);
  doc.setTextColor(40, 50, 60);
  doc.setFontSize(10);
  doc.text(`${student.name} | ${className}`, 16, 33);
  doc.setFontSize(11);
  doc.text("Catatan wali kelas", 16, 52);
  doc.setFontSize(10);
  doc.text(
    doc.splitTextToSize(
      report?.note || "Pertahankan semangat belajar dan konsistensi kehadiran.",
      175,
    ),
    16,
    63,
  );
  doc.text(`Kehadiran: ${student.attendance}%`, 16, 106);
  doc.text(`Status rapor: ${report?.status || "Draf"}`, 16, 116);
  doc.text("Mengetahui, Kepala Sekolah", 118, 178);
  doc.text(settings.principal || "Dr. Ahmad Hidayat, M.Pd.", 118, 210);
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p);
    doc.setTextColor(130);
    doc.setFontSize(7);
    doc.text(
      `DEMO - DATA FIKTIF | ${settings.footer || "KabarKelas"}`,
      16,
      285,
    );
    doc.text(`${p} / ${doc.getNumberOfPages()}`, 184, 285);
  }
  if (returnBlob) return doc.output("blob");
  doc.save(`Rapor-${student.name.replaceAll(" ", "-")}.pdf`);
}
export async function receiptPDF(invoice: Row, student: Row, school: Row) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFontSize(22);
  doc.text("KUITANSI PEMBAYARAN", 20, 28);
  doc.setFontSize(11);
  const lines = [
    school.name,
    "KabarKelas - PENCATATAN PEMBAYARAN MANUAL",
    `No. ${invoice.receipt || invoice.id}`,
    `Nama: ${student.name}`,
    `NISN: ${student.nisn}`,
    `Keperluan: ${invoice.title}`,
    `Jumlah: Rp ${Number(invoice.amount).toLocaleString("id-ID")}`,
    `Status: ${invoice.status}`,
    `Tanggal: ${date(invoice.paidAt)}`,
  ];
  lines.forEach((l, i) => doc.text(l, 20, 48 + i * 12));
  doc.save(`Kuitansi-${student.nisn}.pdf`);
}
export function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export async function tablePDF(rows: Record<string, unknown>[], title: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(9);
  let y = 30;
  const keys = Object.keys(rows[0] || {}),
    width = 265 / Math.max(keys.length, 1);
  const header = () => {
    doc.setFont("helvetica", "bold");
    keys.forEach((key, i) => doc.text(key, 14 + i * width, y));
    doc.setFont("helvetica", "normal");
    y += 9;
  };
  header();
  rows.forEach((row) => {
    if (y > 190) {
      doc.addPage();
      y = 18;
      header();
    }
    keys.forEach((key, i) =>
      doc.text(String(row[key] ?? "—").slice(0, 40), 14 + i * width, y, {
        maxWidth: width - 3,
      }),
    );
    y += 10;
  });
  doc.save(title.replaceAll(" ", "-") + ".pdf");
}
