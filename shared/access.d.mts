export type AccessUser = {
  role: string;
  isHomeroom?: boolean;
  homeroomClassId?: string | null;
  school?: string;
  [key: string]: unknown;
};
export const roleNames: Record<string, string>;
export function canAccessPage(
  user: AccessUser,
  page: string,
  settings?: Record<string, any>,
): boolean;
export function canEditAcademic(user: AccessUser): boolean;
export function canManageSchool(user: AccessUser): boolean;
export function canReviewReport(user: AccessUser, classId?: string): boolean;
export function canIntervene(user: AccessUser): boolean;
export function canReadAcademic(user: AccessUser): boolean;
export function displayRole(user: AccessUser): string;
export function normalizeUser(user: AccessUser): AccessUser;
export const roleResponsibilities: Record<string, string>;
export const pagesByRole: Record<string, string[]>;
export const collectionsByRole: Record<string, string[]>;
export const administrativeBackupKinds: string[];
export function canReadCollection(user: AccessUser, kind: string): boolean;
export function isPro(settings?: Record<string, any>): boolean;
export function canPublishReport(
  user: AccessUser,
  report?: Record<string, any>,
  settings?: Record<string, any>,
): boolean;
