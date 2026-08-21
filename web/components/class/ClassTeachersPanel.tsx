"use client";

import { useActionState } from "react";
import { CheckCircle2, UserRound } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { TeacherPicker, type TeacherOption } from "@/components/class/TeacherPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  assignHomeroomAction,
  assignSubjectTeacherAction,
  removeClassAssignmentAction,
} from "@/lib/actions-assignments";
import type { Access } from "@/lib/permissions";
import { canAssignTeachers } from "@/lib/permissions";
import { CLASS_SUBJECTS } from "@/lib/subjects";
import { cn } from "@/lib/utils";

export type ClassAssignment = {
  id: string;
  class_id?: string;
  staff_id: string;
  full_name: string;
  subject: string | null;
  is_homeroom: boolean;
  campus_code: string;
};

export { type TeacherOption };

export function ClassTeachersPanel({
  classId,
  classCampusId,
  homeroomStaffId,
  assignments,
  staff,
  access,
  occupiedHomerooms = [],
}: {
  classId: string;
  classCampusId?: string | null;
  homeroomStaffId: string | null;
  assignments: ClassAssignment[];
  staff: TeacherOption[];
  access: Access;
  occupiedHomerooms?: { staff_id: string; class_id: string; class_name: string; campus_code: string }[];
}) {
  const canEdit = canAssignTeachers(access);
  const homeroom = assignments.find((a) => a.is_homeroom);
  const subjects = assignments.filter((a) => !a.is_homeroom);
  const defaultCampus = classCampusId ?? staff.find((s) => s.id === homeroomStaffId)?.campus_id;
  const unavailable = Object.fromEntries(
    occupiedHomerooms
      .filter((row) => row.class_id !== classId)
      .map((row) => [row.staff_id, `đã CN ${row.class_name} (${row.campus_code})`])
  );
  const homeroomPerson =
    homeroom ??
    (homeroomStaffId ? staff.find((s) => s.id === homeroomStaffId) : null);
  const assigned = Boolean(homeroomPerson);

  return (
    <section className="mb-5 grid gap-4 lg:grid-cols-2">
      <div
        className={cn(
          "rounded-[12px] border bg-card p-5 shadow-[var(--shadow-card)]",
          assigned ? "border-teal/35 bg-teal/[0.04]" : "border-dashed border-border"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold">Giáo viên chủ nhiệm</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Một lớp một GVCN. Mỗi giáo viên chỉ chủ nhiệm một lớp trong năm học.
            </p>
          </div>
          {assigned ? (
            <Badge className="bg-teal text-white">Đã phân công</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Chưa phân công
            </Badge>
          )}
        </div>

        {assigned && homeroomPerson ? (
          <div className="mt-4 flex items-center gap-3 rounded-[12px] border border-teal/20 bg-white px-3 py-3">
            <Avatar name={homeroomPerson.full_name} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[15px] font-semibold">
                <CheckCircle2 className="size-4 shrink-0 text-teal" />
                {homeroomPerson.full_name}
              </p>
              <p className="text-[13px] text-muted-foreground">
                GVCN · {homeroomPerson.campus_code}
              </p>
            </div>
            {canEdit && homeroom ? (
              <form action={removeClassAssignmentAction}>
                <input type="hidden" name="classId" value={classId} />
                <input type="hidden" name="assignmentId" value={homeroom.id} />
                <Button type="submit" variant="outline" size="sm">
                  Gỡ
                </Button>
              </form>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-[12px] border border-dashed bg-muted/40 px-3 py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserRound className="size-4" />
            </span>
            <p className="text-[14px] text-muted-foreground">Chưa chọn giáo viên chủ nhiệm cho lớp này.</p>
          </div>
        )}

        {canEdit ? (
          <HomeroomForm
            key={`${classId}-${homeroomStaffId ?? "none"}`}
            classId={classId}
            staff={staff}
            defaultCampus={defaultCampus}
            homeroomStaffId={homeroomStaffId}
            unavailable={unavailable}
            assigned={assigned}
          />
        ) : null}
      </div>

      <div className="rounded-[12px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold">Giáo viên bộ môn</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Một lớp có thể có nhiều giáo viên bộ môn.
            </p>
          </div>
          {subjects.length > 0 ? (
            <Badge variant="secondary">{subjects.length} giáo viên</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Chưa gán
            </Badge>
          )}
        </div>
        {subjects.length === 0 ? (
          <p className="mt-4 text-[14px] text-muted-foreground">Chưa gán giáo viên bộ môn.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {subjects.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-[12px] border border-border bg-muted/30 px-3 py-2 text-[14px]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={a.full_name} size="sm" />
                  <span className="min-w-0">
                    <span className="block font-semibold">{a.full_name}</span>
                    <span className="text-[12.5px] text-muted-foreground">{a.subject}</span>
                  </span>
                </span>
                {canEdit ? (
                  <form action={removeClassAssignmentAction}>
                    <input type="hidden" name="classId" value={classId} />
                    <input type="hidden" name="assignmentId" value={a.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Gỡ
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canEdit ? (
          <SubjectForm classId={classId} staff={staff} defaultCampus={defaultCampus} />
        ) : null}
      </div>
    </section>
  );
}

function HomeroomForm({
  classId,
  staff,
  defaultCampus,
  homeroomStaffId,
  unavailable,
  assigned,
}: {
  classId: string;
  staff: TeacherOption[];
  defaultCampus?: string | null;
  homeroomStaffId: string | null;
  unavailable: Record<string, string>;
  assigned: boolean;
}) {
  const [state, action, pending] = useActionState(assignHomeroomAction, null);
  return (
    <form action={action} className="mt-4 flex flex-col gap-2">
      <input type="hidden" name="classId" value={classId} />
      <p className="text-[12.5px] font-medium text-muted-foreground">
        {assigned ? "Đổi giáo viên chủ nhiệm" : "Chọn giáo viên chủ nhiệm"}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <TeacherPicker
          name="staffId"
          staff={staff}
          defaultCampusId={defaultCampus}
          defaultStaffId={homeroomStaffId}
          allowEmpty
          emptyLabel={assigned ? "Bỏ phân công" : "Chưa phân công"}
          unavailable={unavailable}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : assigned ? "Cập nhật" : "Lưu GVCN"}
        </Button>
      </div>
      {state?.error ? <p className="text-sm font-medium text-destructive">{state.error}</p> : null}
    </form>
  );
}

function SubjectForm({
  classId,
  staff,
  defaultCampus,
}: {
  classId: string;
  staff: TeacherOption[];
  defaultCampus?: string | null;
}) {
  const [state, action, pending] = useActionState(assignSubjectTeacherAction, null);
  return (
    <form action={action} className="mt-4 grid gap-2 lg:grid-cols-[1fr_auto_auto]">
      <input type="hidden" name="classId" value={classId} />
      <TeacherPicker name="staffId" staff={staff} defaultCampusId={defaultCampus} required />
      <select name="subject" required className="h-10 rounded-[12px] border border-input bg-background px-2 text-sm">
        <option value="">Chọn môn…</option>
        {CLASS_SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={pending}>
        {pending ? "Đang thêm…" : "Thêm"}
      </Button>
      {state?.error ? (
        <p className="text-sm font-medium text-destructive lg:col-span-3">{state.error}</p>
      ) : null}
    </form>
  );
}
