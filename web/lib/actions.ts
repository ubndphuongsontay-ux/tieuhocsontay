"use server";

import { revalidatePath } from "next/cache";
import { assert, canEditStudentRecord, canSeeClass, requireAccess } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { sql } from "./db";

export async function updateContact(formData: FormData) {
  const access = await requireAccess();
  const id = String(formData.get("id") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!id || !studentId) return;
  const [scope] = await sql<{ class_id: string | null; campus_id: string | null }[]>`
    select class_id::text, campus_id::text from v_enrollments_current where student_id = ${studentId}::uuid limit 1
  `;
  assert(canEditStudentRecord(access, scope?.class_id ?? null, scope?.campus_id ?? null));

  await sql`
    update student_contacts
    set full_name = ${fullName}, phone = ${phone}
    where id = ${id}::uuid
  `;
  await writeAudit({
    actorId: access.profileId,
    action: "student.contact_update",
    entityType: "student",
    entityId: studentId,
  });
  revalidatePath(`/hoc-sinh/${studentId}`);
}

export async function transferStudent(formData: FormData) {
  const access = await requireAccess();
  const studentId = String(formData.get("studentId") ?? "");
  const classId = String(formData.get("classId") ?? "");
  if (!studentId || !classId) {
    return { ok: false as const, error: "Chọn lớp đến" };
  }

  const [current] = await sql<{
    enrollment_id: string;
    campus_id: string;
    class_id: string;
    school_year_id: string;
  }[]>`
    select
      enrollment_id::text,
      campus_id::text,
      class_id::text,
      school_year_id::text
    from v_enrollments_current
    where student_id = ${studentId}::uuid
    limit 1
  `;

  if (!current) {
    return { ok: false as const, error: "Học sinh không có chỗ học đang mở" };
  }
  assert(canEditStudentRecord(access, current.class_id, current.campus_id), "Không có quyền chuyển lớp");
  assert(canSeeClass(access, current.class_id, current.campus_id), "Ngoài phạm vi");
  if (current.class_id === classId) {
    return { ok: false as const, error: "Đang học lớp này rồi" };
  }

  const [dest] = await sql<{ campus_id: string; school_year_id: string }[]>`
    select campus_id::text, school_year_id::text
    from classes
    where id = ${classId}::uuid
    limit 1
  `;
  if (!dest) return { ok: false as const, error: "Không tìm thấy lớp đến" };
  assert(canSeeClass(access, classId, dest.campus_id), "Lớp đến ngoài phạm vi");

  const status =
    dest.campus_id === current.campus_id ? "chuyen_lop" : "chuyen_phan_hieu";

  await sql.begin(async (tx) => {
    await tx`
      update enrollments
      set ended_on = current_date, status = ${status}
      where id = ${current.enrollment_id}::uuid
        and ended_on is null
    `;
    await tx`
      insert into enrollments (
        student_id, class_id, school_year_id, started_on, ended_on, status
      ) values (
        ${studentId}::uuid,
        ${classId}::uuid,
        ${dest.school_year_id}::uuid,
        current_date,
        null,
        'dang_hoc'
      )
    `;
  });

  await writeAudit({
    actorId: access.profileId,
    action: "student.transfer",
    entityType: "student",
    entityId: studentId,
    before: { classId: current.class_id },
    after: { classId, status },
  });

  revalidatePath(`/hoc-sinh/${studentId}`);
  revalidatePath(`/lop/${current.class_id}`);
  revalidatePath(`/lop/${classId}`);
  return { ok: true as const };
}
