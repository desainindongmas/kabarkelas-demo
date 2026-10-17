export function seedOperations(add, all) {
  for (let n = 1; n <= 3; n++) {
    const school = `s${n}`,
      teachers = all(school, "teachers"),
      students = all(school, "students");
    for (const [index, teacher] of teachers.entries())
      for (let day = 12; day <= 16; day++)
        add("staffAttendance", school, {
          id: `${school}-staff-${index}-${day}`,
          teacherId: teacher.id,
          date: `2026-10-${day}`,
          status: index % 9 === 0 && day === 14 ? "Izin" : "Hadir",
          checkIn: `06:${String(40 + (index % 20)).padStart(2, "0")}`,
          checkOut: "15:10",
          source: "Mandiri",
        });
    teachers
      .slice(0, 3)
      .forEach((teacher, i) =>
        add("leaveRequests", school, {
          id: `${school}-leave-${i}`,
          teacherId: teacher.id,
          type: ["Izin keluarga", "Sakit", "Dinas luar"][i],
          from: `2026-10-${20 + i}`,
          to: `2026-10-${20 + i}`,
          reason: [
            "Menghadiri keperluan keluarga yang tidak dapat ditunda.",
            "Pemulihan kesehatan sesuai anjuran dokter.",
            "Mengikuti pelatihan pengembangan kompetensi guru.",
          ][i],
          status: i === 2 ? "Disetujui" : "Menunggu",
          created: "2026-10-16",
          decisionNote:
            i === 2
              ? "Izin disetujui. Pastikan materi pengganti tersedia."
              : "",
        }),
      );
    [
      "Putih abu-abu",
      "Batik sekolah",
      "Putih abu-abu",
      "Pramuka",
      "Busana muslim / seragam bebas rapi",
    ].forEach((name, i) =>
      add("uniforms", school, {
        id: `${school}-uniform-${i + 1}`,
        weekday: i + 1,
        name,
        note: [
          "Upacara bendera",
          "Sepatu hitam",
          "Dasi dan atribut lengkap",
          "Atribut pramuka lengkap",
          "Menyesuaikan ketentuan sekolah",
        ][i],
      }),
    );
    add("uniformOverrides", school, {
      id: `${school}-uniform-special-1`,
      date: "2026-10-22",
      name: "Batik sekolah",
      note: "Peringatan kegiatan kebudayaan sekolah",
    });
    for (const invoice of all(school, "invoices").filter(
      (i) => i.status === "Lunas",
    )) {
      add("payments", school, {
        id: `${invoice.id}-payment`,
        studentId: invoice.studentId,
        invoiceId: invoice.id,
        amount: invoice.amount,
        method: "Transfer manual",
        date: invoice.paidAt || "2026-10-08",
        receipt: invoice.receipt,
        note: "Penerimaan awal data demo",
        recordedBy: "Dewi Puspitasari",
      });
    }
    const dimensions = [
      "Beriman dan berakhlak mulia",
      "Berkebinekaan global",
      "Bergotong royong",
      "Mandiri",
      "Bernalar kritis",
      "Kreatif",
    ];
    students.forEach((student, i) => {
      dimensions.forEach((dimension, j) =>
        add("character", school, {
          id: `${school}-p5-${i}-${j}`,
          studentId: student.id,
          dimension,
          score: 2 + ((i + j) % 3),
          note: [
            "Mulai menunjukkan kebiasaan baik secara konsisten.",
            "Berkembang sesuai harapan dan aktif berpartisipasi.",
            "Mampu menjadi teladan dan membantu teman sebaya.",
          ][(i + j) % 3],
          project: "Gaya Hidup Berkelanjutan",
          date: "2026-10-16",
        }),
      );
      add("tahfizh", school, {
        id: `${school}-tahfizh-${i}`,
        studentId: student.id,
        surah: ["An-Naba", "An-Naziat", "Abasa"][i % 3],
        verses: `1–${20 + (i % 15)}`,
        fluency: ["Baik", "Sangat baik", "Perlu latihan"][i % 3],
        murajaah: "Latihan pengulangan 10 menit setiap hari",
        character: "Menjaga adab, disiplin, dan menghormati guru serta teman.",
        note: "Fokus pada kelancaran dan ketepatan tajwid.",
        date: "2026-10-16",
      });
      for (let p = 0; p < 2; p++)
        add("pickupPersons", school, {
          id: `${school}-guardian-${i}-${p}`,
          studentId: student.id,
          name: p
            ? `Bapak ${["Hendra", "Budi", "Agus"][i % 3]} ${student.name.split(" ").at(-1)}`
            : student.parent,
          relationship: p ? "Ayah" : "Ibu",
          phone: student.phone,
          status: "Aktif",
          validOn: null,
        });
      if (i < 20)
        add("pickupLogs", school, {
          id: `${school}-pickup-${i}`,
          studentId: student.id,
          action: "Antar",
          personId: `${school}-guardian-${i}-0`,
          personName: student.parent,
          relationship: "Ibu",
          verified: true,
          source: "Manual",
          note: "",
          date: "2026-10-17",
          time: `06:${String(40 + (i % 20)).padStart(2, "0")}`,
          recordedBy: "Dewi Puspitasari",
        });
    });
    const settings = all(school, "settings")[0];
    if (settings)
      add("settings", school, {
        gradeScale: "100",
        enableTahfizh: true,
        ...settings,
      });
  }
}
