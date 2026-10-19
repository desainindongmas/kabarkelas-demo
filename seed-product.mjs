const day = (offset = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
};
export function seedProduct(put, all) {
  for (let n = 1; n <= 3; n++) {
    const school = `s${n}`,
      settings = all(school, "settings")[0];
    put("settings", school, {
      plan: "Pro",
      approvalMode: "single",
      reportDue: day(7),
      followupDays: 3,
      enabledModules: ["character", "tahfizh", "admissions"],
      ...settings,
    });
    for (const [ci, cls] of all(school, "classes").entries())
      for (let ai = 0; ai < 3; ai++) {
        const id = `${school}-as-history-${ci}-${ai}`;
        put("assignments", school, {
          id,
          title: `Latihan penguatan pekan sebelumnya ${ai + 1}`,
          subject: "Matematika",
          classId: cls.id,
          due: day(-7 + ai),
          description:
            "Kerjakan latihan penguatan dan sertakan langkah penyelesaian. Tugas ini menjadi contoh tindak lanjut pada data dummy.",
          type: "PR",
          teacher: "Ratna Wulandari",
        });
        all(school, "students")
          .filter((st) => st.classId === cls.id)
          .forEach((st) => {
            const index = Number(st.id.split("-").at(-1)),
              high = index % 19 === 0,
              medium = !high && index % 11 === 0;
            if (!high && (!medium || ai === 2))
              put("submissions", school, {
                id: `${id}-${st.id}`,
                assignmentId: id,
                studentId: st.id,
                status: "Dinilai",
                body: "Latihan telah dikerjakan sesuai petunjuk.",
                score: 85,
                date: day(-4),
              });
          });
      }
    for (const st of all(school, "students")) {
      const submissions = all(school, "submissions").filter(
        (sub) => sub.studentId === st.id,
      );
      put("students", school, {
        ...st,
        overdue: all(school, "assignments").filter(
          (a) =>
            a.classId === st.classId &&
            a.due < day() &&
            !submissions.some((sub) => sub.assignmentId === a.id),
        ).length,
      });
    }
    put("schoolTargets", school, {
      id: `${school}-target`,
      attendance: 95,
      reportRate: 95,
      collectionRate: 85,
      updatedAt: day(),
      updatedBy: "Pengurus Yayasan",
    });
    for (const [index, period] of [
      "2025/2026 Ganjil",
      "2025/2026 Genap",
      "2026/2027 Ganjil",
    ].entries())
      for (const [ci, cls] of all(school, "classes").entries()) {
        const pupils = all(school, "students").filter(
            (s) => s.classId === cls.id,
          ),
          ids = new Set(pupils.map((s) => s.id)),
          grades = all(school, "grades").filter((g) => ids.has(g.studentId));
        const current = Math.round(
            pupils.reduce((a, s) => a + s.attendance, 0) /
              Math.max(pupils.length, 1),
          ),
          score = Math.round(
            grades.reduce((a, g) => a + g.score, 0) /
              Math.max(grades.length, 1),
          );
        put("termSnapshots", school, {
          id: `${school}-term-${ci}-${index}`,
          classId: cls.id,
          period,
          attendance: Math.min(
            100,
            Math.max(
              0,
              current +
                (n === 2 ? (2 - index) * 3 : -(2 - index) * (n === 3 ? 5 : 1)),
            ),
          ),
          average: Math.min(100, score - (2 - index) * (n === 3 ? 4 : 1)),
          students: pupils.length,
          reportRate:
            index < 2
              ? 100
              : Math.round(
                  (all(school, "reports").filter(
                    (r) => r.classId === cls.id && r.status === "Terbit",
                  ).length /
                    Math.max(pupils.length, 1)) *
                    100,
                ),
          measuredAt: day(-index),
          source: "Skenario data dummy",
        });
      }
    put("foundationTasks", school, {
      id: `${school}-unit-task`,
      schoolId: school,
      title: [
        "Lengkapi rapor menjelang pembagian",
        "Tinjau penurunan kehadiran",
        "Bagikan praktik pendampingan yang berhasil",
      ][n - 1],
      category: ["Rapor", "Kehadiran", "Praktik baik"][n - 1],
      priority: n === 3 ? "Sedang" : "Tinggi",
      pic: settings.principal,
      due: day(n === 1 ? -1 : 3),
      status: n === 3 ? "Selesai" : "Berjalan",
      instruction: [
        "Petakan nilai yang belum lengkap dan tetapkan jadwal penyelesaian per kelas.",
        "Kaji penyebab ketidakhadiran dan laporkan rencana perbaikan tanpa menyertakan identitas siswa.",
        "Dokumentasikan langkah pendampingan untuk dibagikan kepada unit lain.",
      ][n - 1],
      response:
        n === 3
          ? "Pendampingan mingguan dan evaluasi bersama wali kelas telah diterapkan."
          : "Tim unit telah membagi tugas dan sedang memverifikasi data.",
      evidence:
        n === 3 ? "Ringkasan praktik sudah dicatat untuk rapat pengurus." : "",
      created: day(-4),
      updatedAt: day(-1),
      createdBy: "Pengurus Yayasan",
    });
    put("unitNeeds", school, {
      id: `${school}-need`,
      schoolId: school,
      title: [
        "Perbaikan perangkat cetak rapor",
        "Pengadaan alat bantu pembelajaran",
        "Pelatihan pendampingan wali kelas",
      ][n - 1],
      category: n === 3 ? "Pengembangan guru" : "Sarana",
      amount: [1800000, 2400000, 1500000][n - 1],
      reason:
        "Mendukung kelancaran layanan pendidikan dan penyelesaian program unit.",
      status: n === 3 ? "Disetujui" : "Diajukan",
      decisionNote:
        n === 3
          ? "Disetujui sesuai kebutuhan program. Laporkan hasil pelaksanaan."
          : "",
      fulfillment: "Belum dimulai",
      created: day(-2),
      createdBy: settings.principal,
      updatedAt: day(-1),
    });
    for (const item of all(school, "interventions")) {
      const student = all(school, "students").find(
        (s) => s.id === item.studentId,
      );
      if (!student) continue;
      const grades = all(school, "grades").filter(
        (g) => g.studentId === student.id,
      );
      const score = Math.round(
        grades.reduce((a, g) => a + g.score, 0) / Math.max(grades.length, 1),
      );
      put("interventions", school, {
        ...item,
        expectedOutcome:
          "Kehadiran membaik dan tugas tertunda berkurang setelah pendampingan.",
        baselineAttendance: student.attendance,
        baselineScore: score,
        baselineOverdue: student.overdue,
        evaluationDate: item.due,
        outcome: item.status === "Selesai" ? "Membaik" : null,
        evaluationNote: item.status === "Selesai" ? item.note : "",
        evaluatedAt: item.status === "Selesai" ? day(-1) : null,
        afterAttendance: item.status === "Selesai" ? student.attendance : null,
        afterScore: item.status === "Selesai" ? score : null,
        afterOverdue: item.status === "Selesai" ? student.overdue : null,
      });
    }
    const improved = all(school, "students").find(
      (st) => st.id === `${school}-st-14`,
    );
    if (improved)
      put("interventions", school, {
        id: `${school}-iv-evaluated-demo`,
        studentId: improved.id,
        title: "Evaluasi kebiasaan belajar pekanan",
        pic: "Ratna Wulandari, S.Pd.",
        due: day(-2),
        status: "Selesai",
        note: "Skenario dummy: siswa mengikuti latihan bertahap dan evaluasi bersama wali kelas.",
        expectedOutcome: "Kehadiran meningkat dan tugas tertunda berkurang.",
        baselineAttendance: 85,
        baselineScore: improved.history[0],
        baselineOverdue: 3,
        outcome: "Membaik",
        evaluationNote:
          "Evaluasi skenario menunjukkan kehadiran lebih konsisten dan tugas pekan sebelumnya sudah selesai.",
        evaluatedAt: day(-1),
        afterAttendance: improved.attendance,
        afterScore: improved.history.at(-1),
        afterOverdue: improved.overdue,
        evaluationDate: day(-2),
        created: day(-16),
      });
    put("gateIncidents", school, {
      id: `${school}-gate-incident`,
      studentId: `${school}-st-0`,
      category: "Penjemput tidak terdaftar",
      personName: "Bapak Hendra Azzahra",
      relationship: "Saudara",
      note: "Penjemput pengganti datang tanpa kartu. Siswa tetap menunggu di area aman.",
      status: "Menunggu",
      created: day() + "T07:00:00+07:00",
      date: day(),
      recordedBy: "Bambang Suryanto",
      decisionNote: "",
      used: false,
    });
  }
}
