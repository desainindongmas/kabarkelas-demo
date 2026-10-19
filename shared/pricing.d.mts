export type SchoolQuote = {
  students: number;
  standardAnnual: number | null;
  proAnnual: number | null;
  customQuote: boolean;
};
export type FoundationUnitQuote = {
  unit: number;
  students: number;
  proAnnual: number | null;
  managementAnnual: number;
  annual: number | null;
  customQuote: boolean;
};
export type FoundationQuote = {
  units: FoundationUnitQuote[];
  students: number;
  proAnnual: number | null;
  managementAnnual: number;
  annual: number | null;
  customQuote: boolean;
};
export function quoteSchool(students: number): SchoolQuote;
export function quoteFoundation(unitStudentCounts: readonly number[]): FoundationQuote;
