export type IssueSeverity = "bad" | "warn";

export type QualityIssue = {
  code: string;
  label: string;
  severity: IssueSeverity;
};

export const STUDENT_ISSUE_META: Record<string, { label: string; severity: IssueSeverity }> = {
  missing_dob: { label: "Thiếu ngày sinh", severity: "bad" },
  missing_gender: { label: "Thiếu giới tính", severity: "bad" },
  missing_ethnicity: { label: "Thiếu dân tộc", severity: "warn" },
  missing_cccd: { label: "Thiếu CCCD", severity: "warn" },
  invalid_cccd: { label: "CCCD không đúng định dạng", severity: "bad" },
  odd_age: { label: "Tuổi không phù hợp tiểu học", severity: "bad" },
  missing_contact: { label: "Thiếu liên hệ phụ huynh", severity: "bad" },
  missing_contact_phone: { label: "Thiếu SĐT phụ huynh", severity: "warn" },
  invalid_contact_phone: { label: "SĐT phụ huynh không hợp lệ", severity: "bad" },
};

export const STAFF_ISSUE_META: Record<string, { label: string; severity: IssueSeverity }> = {
  missing_gender: { label: "Thiếu giới tính", severity: "bad" },
  missing_cccd: { label: "Thiếu CCCD", severity: "warn" },
  invalid_cccd: { label: "CCCD không đúng định dạng", severity: "bad" },
  invalid_phone: { label: "SĐT không hợp lệ", severity: "bad" },
  missing_education: { label: "Thiếu trình độ", severity: "warn" },
  missing_employment: { label: "Thiếu loại hợp đồng", severity: "warn" },
  missing_account: { label: "Chưa gắn tài khoản", severity: "warn" },
  odd_age: { label: "Tuổi không phù hợp cán bộ", severity: "bad" },
};

const CCCD_RE = /^[0-9]{9}$|^[0-9]{12}$/;
const PHONE_RE = /^0[0-9]{9}$/;

export function normalizeDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, "").trim();
}

export function isValidCccd(value: string | null | undefined): boolean {
  const v = normalizeDigits(value);
  return CCCD_RE.test(v);
}

export function isValidVnPhone(value: string | null | undefined): boolean {
  const v = normalizeDigits(value);
  if (PHONE_RE.test(v)) return true;
  if (/^[3-9][0-9]{8}$/.test(v)) return false;
  return false;
}

export function looksLikePhoneMissingZero(value: string | null | undefined): boolean {
  return /^[3-9][0-9]{8}$/.test(normalizeDigits(value));
}

function ageFromDob(dob: string | null | undefined, on = new Date()): number | null {
  if (!dob) return null;
  const m = dob.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  let age = on.getFullYear() - d.getFullYear();
  const month = on.getMonth() - d.getMonth();
  if (month < 0 || (month === 0 && on.getDate() < d.getDate())) age -= 1;
  return age;
}

function push(list: QualityIssue[], catalog: Record<string, { label: string; severity: IssueSeverity }>, code: string) {
  const meta = catalog[code];
  if (meta) list.push({ code, ...meta });
}

export function studentIssues(row: {
  dob?: string | null;
  gender?: string | null;
  ethnicity?: string | null;
  national_id?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  has_contact?: boolean;
}): QualityIssue[] {
  const out: QualityIssue[] = [];
  if (!row.dob) push(out, STUDENT_ISSUE_META, "missing_dob");
  if (!row.gender) push(out, STUDENT_ISSUE_META, "missing_gender");
  if (!row.ethnicity?.trim()) push(out, STUDENT_ISSUE_META, "missing_ethnicity");
  if (!normalizeDigits(row.national_id)) push(out, STUDENT_ISSUE_META, "missing_cccd");
  else if (!isValidCccd(row.national_id)) push(out, STUDENT_ISSUE_META, "invalid_cccd");
  const age = ageFromDob(row.dob);
  if (age != null && (age < 5 || age > 15)) push(out, STUDENT_ISSUE_META, "odd_age");
  const hasContact = row.has_contact ?? Boolean(row.contact_name || row.contact_phone);
  if (!hasContact) push(out, STUDENT_ISSUE_META, "missing_contact");
  else if (!normalizeDigits(row.contact_phone)) push(out, STUDENT_ISSUE_META, "missing_contact_phone");
  else if (!isValidVnPhone(row.contact_phone)) push(out, STUDENT_ISSUE_META, "invalid_contact_phone");
  return out;
}

export function staffIssues(row: {
  dob?: string | null;
  gender?: string | null;
  national_id?: string | null;
  phone?: string | null;
  education_level?: string | null;
  employment_kind?: string | null;
  username?: string | null;
}): QualityIssue[] {
  const out: QualityIssue[] = [];
  if (!row.gender) push(out, STAFF_ISSUE_META, "missing_gender");
  if (!normalizeDigits(row.national_id)) push(out, STAFF_ISSUE_META, "missing_cccd");
  else if (!isValidCccd(row.national_id)) push(out, STAFF_ISSUE_META, "invalid_cccd");
  if (row.phone && !isValidVnPhone(row.phone)) push(out, STAFF_ISSUE_META, "invalid_phone");
  if (!row.education_level?.trim()) push(out, STAFF_ISSUE_META, "missing_education");
  if (!row.employment_kind) push(out, STAFF_ISSUE_META, "missing_employment");
  if (!row.username) push(out, STAFF_ISSUE_META, "missing_account");
  const age = ageFromDob(row.dob);
  if (age != null && (age < 20 || age > 70)) push(out, STAFF_ISSUE_META, "odd_age");
  return out;
}

export function issueLabel(code: string, kind: "student" | "staff") {
  const catalog = kind === "student" ? STUDENT_ISSUE_META : STAFF_ISSUE_META;
  return catalog[code]?.label ?? code;
}
