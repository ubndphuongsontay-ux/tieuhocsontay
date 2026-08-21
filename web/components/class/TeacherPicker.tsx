"use client";

import { useEffect, useMemo, useState } from "react";

export type TeacherOption = {
  id: string;
  full_name: string;
  campus_code: string;
  campus_name: string;
  campus_id?: string;
};

export function TeacherPicker({
  name,
  staff,
  defaultCampusId,
  defaultStaffId,
  allowEmpty,
  emptyLabel = "Chưa phân công",
  required,
  unavailable = {},
}: {
  name: string;
  staff: TeacherOption[];
  defaultCampusId?: string | null;
  defaultStaffId?: string | null;
  allowEmpty?: boolean;
  emptyLabel?: string;
  required?: boolean;
  unavailable?: Record<string, string>;
}) {
  const campuses = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of staff) {
      if (s.campus_id) map.set(s.campus_id, `${s.campus_name} (${s.campus_code})`);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "vi"));
  }, [staff]);

  const initialCampus =
    defaultCampusId && campuses.some(([id]) => id === defaultCampusId) ? defaultCampusId : "ALL";
  const [campusId, setCampusId] = useState(initialCampus);
  const [staffId, setStaffId] = useState(defaultStaffId ?? "");

  useEffect(() => {
    setStaffId(defaultStaffId ?? "");
  }, [defaultStaffId]);

  const filtered = campusId === "ALL" ? staff : staff.filter((s) => s.campus_id === campusId);
  const selected = staff.find((s) => s.id === staffId);
  const options =
    selected && !filtered.some((s) => s.id === selected.id) ? [selected, ...filtered] : filtered;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
      <select
        aria-label="Lọc giáo viên theo phân hiệu"
        value={campusId}
        onChange={(e) => setCampusId(e.target.value)}
        className="h-10 w-full rounded-[12px] border border-input bg-background px-2 text-sm sm:max-w-[200px]"
      >
        <option value="ALL">Mọi phân hiệu</option>
        {campuses.map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      <select
        name={name}
        required={required}
        value={staffId}
        onChange={(e) => setStaffId(e.target.value)}
        className="h-10 min-w-0 flex-1 rounded-[12px] border border-input bg-background px-2 text-sm"
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : <option value="">Chọn giáo viên…</option>}
        {options.map((s) => {
          const taken = unavailable[s.id];
          const isCurrent = s.id === defaultStaffId;
          const blocked = Boolean(taken) && !isCurrent;
          return (
            <option key={s.id} value={s.id} disabled={blocked}>
              {s.full_name} · {s.campus_code}
              {blocked ? ` — ${taken}` : isCurrent ? " — đang CN lớp này" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
}
