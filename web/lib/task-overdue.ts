export function isTaskOverdue(status: string, dueOn: string | null, today = "2026-08-21") {
  if (!dueOn) return false;
  if (["completed", "cancelled", "approved"].includes(status)) return false;
  return dueOn < today;
}
