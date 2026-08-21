"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveAttendanceAction } from "@/lib/actions-attendance";

type Row = { studentId: string; fullName: string; status: string; reason: string };

const STATUSES = [
  { id: "present", label: "Có mặt" },
  { id: "excused", label: "Có phép" },
  { id: "unexcused", label: "Không phép" },
  { id: "late", label: "Đi muộn" },
  { id: "early_leave", label: "Về sớm" },
];

export function AttendanceForm({
  classId,
  attendedOn,
  sessionKind,
  initial,
  canEdit,
}: {
  classId: string;
  attendedOn: string;
  sessionKind: string;
  initial: Row[];
  canEdit: boolean;
}) {
  const [rows, setRows] = useState(initial);
  const [pending, start] = useTransition();
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  function save(submit: boolean) {
    const fd = new FormData();
    fd.set("classId", classId);
    fd.set("attendedOn", attendedOn);
    fd.set("sessionKind", sessionKind);
    fd.set("submit", submit ? "1" : "0");
    fd.set(
      "records",
      JSON.stringify(rows.map((r) => ({ studentId: r.studentId, status: r.status, reason: r.reason })))
    );
    start(async () => {
      const res = await saveAttendanceAction(fd);
      if (!res.ok) toast.error(res.error);
      else toast.success(submit ? "Đã xác nhận chuyên cần" : "Đã lưu nháp");
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        Có mặt {counts.present ?? 0} · Có phép {counts.excused ?? 0} · Không phép {counts.unexcused ?? 0}
      </p>
      <ul className="divide-y rounded-[12px] border border-border bg-card">
        {rows.map((r, i) => (
          <li key={r.studentId} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center">
            <span className="min-w-0 flex-1 font-semibold">{r.fullName}</span>
            <select
              disabled={!canEdit}
              className="h-10 rounded-[10px] border border-input bg-background px-2 text-sm"
              value={r.status}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...r, status: e.target.value };
                setRows(next);
              }}
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {r.status !== "present" ? (
              <input
                disabled={!canEdit}
                className="h-10 rounded-[10px] border border-input px-2 text-sm sm:w-48"
                placeholder="Lý do"
                value={r.reason}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...r, reason: e.target.value };
                  setRows(next);
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>
      {canEdit ? (
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => save(false)}>
            Lưu nháp
          </Button>
          <Button type="button" disabled={pending} onClick={() => save(true)}>
            Xác nhận hoàn tất
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Bạn chỉ được xem, không nhập lớp này.</p>
      )}
    </div>
  );
}
