export type AccessUser = {
  role: string;
  isHomeroom?: boolean;
  homeroomClassId?: string | null;
  school?: string;
  [key: string]: unknown;
};
export const roleNames: Record<string, string>;
export function canAccessPage(user: AccessUser, page: string): boolean;
export function canEditAcademic(user: AccessUser): boolean;
export function canManageSchool(user: AccessUser): boolean;
export function canReviewReport(user: AccessUser, classId?: string): boolean;
export function canIntervene(user: AccessUser): boolean;
export function canReadAcademic(user: AccessUser): boolean;
export function displayRole(user: AccessUser): string;
export function normalizeUser(user: AccessUser): AccessUser;
