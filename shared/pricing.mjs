/** Annual reference prices. Counts between anchors are interpolated, not tiered. */
const anchors = [
  { students: 200, standardAnnual: 3_500_000, proAnnual: 5_500_000 },
  { students: 500, standardAnnual: 5_500_000, proAnnual: 8_500_000 },
  { students: 1_000, standardAnnual: 8_500_000, proAnnual: 13_500_000 },
  { students: 2_000, standardAnnual: 14_000_000, proAnnual: 22_000_000 },
];

function validateStudents(students) {
  if (!Number.isSafeInteger(students) || students < 1)
    throw new RangeError("Jumlah siswa harus berupa bilangan bulat positif.");
}

/** Round the annual bill before calculating any per-student comparisons. */
export function quoteSchool(students) {
  validateStudents(students);
  if (students > 2_000)
    return { students, standardAnnual: null, proAnnual: null, customQuote: true };
  if (students <= anchors[0].students)
    return {
      students,
      standardAnnual: anchors[0].standardAnnual,
      proAnnual: anchors[0].proAnnual,
      customQuote: false,
    };
  const upperIndex = anchors.findIndex((anchor) => students <= anchor.students);
  const lower = anchors[upperIndex - 1], upper = anchors[upperIndex];
  const proportion = (students - lower.students) / (upper.students - lower.students);
  const interpolate = (key) =>
    Math.round((lower[key] + proportion * (upper[key] - lower[key])) / 1_000) * 1_000;
  return {
    students,
    standardAnnual: interpolate("standardAnnual"),
    proAnnual: interpolate("proAnnual"),
    customQuote: false,
  };
}

/** A foundation pays each unit's Pro price once, plus annual management per unit. */
export function quoteFoundation(unitStudentCounts) {
  if (!Array.isArray(unitStudentCounts) || unitStudentCounts.length < 2)
    throw new RangeError("Paket Yayasan membutuhkan sedikitnya dua unit sekolah.");
  const units = Array.from(unitStudentCounts, (students, index) => {
    const quote = quoteSchool(students);
    return {
      unit: index + 1,
      students,
      proAnnual: quote.proAnnual,
      managementAnnual: 1_500_000,
      annual: quote.proAnnual === null ? null : quote.proAnnual + 1_500_000,
      customQuote: quote.customQuote,
    };
  });
  const customQuote = units.some((unit) => unit.customQuote);
  const proAnnual = customQuote ? null : units.reduce((sum, unit) => sum + unit.proAnnual, 0);
  const managementAnnual = units.length * 1_500_000;
  return {
    units,
    students: units.reduce((sum, unit) => sum + unit.students, 0),
    proAnnual,
    managementAnnual,
    annual: proAnnual === null ? null : proAnnual + managementAnnual,
    customQuote,
  };
}
