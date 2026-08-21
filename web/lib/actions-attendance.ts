"use server";

import { revalidatePath } from "next/cache";
import { assert, canEditAttendance, requireAccess } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { sql } from "@/lib/db";
import { getClassDetail } from "@/lib/queries";
import { attendanceSaveSchema } from "@/lib/validators";

export async function saveAttendanceAction(formData: FormData) {
  const access = await requireAccess();
  const rawRecords = String(formData.get("records") ?? "[]");
  let records: unknown = [];
  try {
    records = JSON.parse(rawRecords);
  } catch {
    return { ok: false as const, error: "Dữ liệu điểm danh không hợp lệ" };
  }
  const parsed = attendanceSaveSchema.safeParse({
    classId: formData.get("classId"),
    attendedOn: formData.get("attendedOn"),
    sessionKind: formData.get("sessionKind") || "sang",
    submit: formData.get("submit") === "1",
    records,
  });
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Không hợp lệ" };

  const cls = await getClassDetail(parsed.data.classId);
  if (!cls) return { ok: false as const, error: "Không tìm thấy lớp" };
  const [camp] = await sql<{ id: string; school_year_id: string }[]>`
    select c.campus_id::text as id, c.school_year_id::text
    from classes c where c.id = ${parsed.data.classId}::uuid
  `;
  assert(canEditAttendance(access, parsed.data.classId, camp.id), "Chỉ GVCN hoặc cấp quản lý được nhập lớp này");

  const [day] = await sql<{ id: string }[]>`
    insert into attendance_days (
      school_year_id, campus_id, class_id, attended_on, session_kind, status, recorded_by, submitted_at
    ) values (
      ${camp.school_year_id}::uuid, ${camp.id}::uuid, ${parsed.data.classId}::uuid,
      ${parsed.data.attendedOn}::date, ${parsed.data.sessionKind},
      ${parsed.data.submit ? "submitted" : "draft"},
      ${access.profileId}::uuid,
      ${parsed.data.submit ? new Date().toISOString() : null}
    )
    on conflict (class_id, attended_on, session_kind) do update
      set status = excluded.status,
          recorded_by = excluded.recorded_by,
          submitted_at = excluded.submitted_at
    returning id::text
  `;

  for (const rec of parsed.data.records) {
    await sql`
      insert into student_attendance_records (
        attendance_day_id, student_id, status, reason, note, recorded_by
      ) values (
        ${day.id}::uuid, ${rec.studentId}::uuid, ${rec.status}, ${rec.reason ?? null}, ${rec.note ?? null},
        ${access.profileId}::uuid
      )
      on conflict (attendance_day_id, student_id) do update
        set status = excluded.status, reason = excluded.reason, note = excluded.note,
            recorded_by = excluded.recorded_by
    `;
  }

  await writeAudit({
    actorId: access.profileId,
    action: parsed.data.submit ? "attendance.submit" : "attendance.save",
    entityType: "attendance_day",
    entityId: day.id,
    after: { classId: parsed.data.classId, date: parsed.data.attendedOn, n: parsed.data.records.length },
  });
  revalidatePath(`/lop/${parsed.data.classId}/diem-danh`);
  revalidatePath("/");
  return { ok: true as const };
}
