"use server";

import { revalidatePath } from "next/cache";
import { assert, canAssignTeachers, canSeeClass, requireAccess } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { sql } from "@/lib/db";
import { assignmentIdSchema, homeroomAssignSchema, subjectAssignSchema } from "@/lib/validators";

async function classContext(classId: string) {
  const [row] = await sql<{
    id: string;
    campus_id: string;
    school_year_id: string;
    school_id: string;
    homeroom_staff_id: string | null;
  }[]>`
    select
      c.id::text,
      c.campus_id::text,
      c.school_year_id::text,
      camp.school_id::text,
      c.homeroom_staff_id::text
    from classes c
    join campuses camp on camp.id = c.campus_id
    where c.id = ${classId}::uuid
    limit 1
  `;
  return row ?? null;
}

function revalidateClass(classId: string) {
  revalidatePath(`/lop/${classId}`);
  revalidatePath("/lop");
  revalidatePath("/phan-cong");
  revalidatePath("/");
}

async function syncHomeroomScope(classId: string, schoolId: string, staffId: string | null) {
  await sql`
    update user_role_scopes
    set is_active = false, ends_on = current_date
    where role = 'homeroom_teacher' and class_id = ${classId}::uuid and is_active
  `;
  if (!staffId) return;
  const [profile] = await sql<{ id: string }[]>`
    select id::text from profiles where staff_id = ${staffId}::uuid and is_active limit 1
  `;
  if (!profile) return;
  await sql`
    update user_role_scopes
    set is_active = false, ends_on = current_date
    where role = 'homeroom_teacher' and profile_id = ${profile.id}::uuid and is_active
      and class_id is distinct from ${classId}::uuid
  `;
  await sql`
    insert into user_role_scopes (profile_id, role, school_id, campus_id, class_id, is_active)
    select ${profile.id}::uuid, 'homeroom_teacher', ${schoolId}::uuid, c.campus_id, c.id, true
    from classes c
    where c.id = ${classId}::uuid
      and not exists (
        select 1 from user_role_scopes s
        where s.profile_id = ${profile.id}::uuid
          and s.role = 'homeroom_teacher'
          and s.class_id = ${classId}::uuid
          and s.is_active
      )
  `;
}

async function syncTeacherScope(classId: string, schoolId: string, staffId: string) {
  const [profile] = await sql<{ id: string }[]>`
    select id::text from profiles where staff_id = ${staffId}::uuid and is_active limit 1
  `;
  if (!profile) return;
  await sql`
    insert into user_role_scopes (profile_id, role, school_id, campus_id, class_id, is_active)
    select ${profile.id}::uuid, 'teacher', ${schoolId}::uuid, c.campus_id, c.id, true
    from classes c
    where c.id = ${classId}::uuid
      and not exists (
        select 1 from user_role_scopes s
        where s.profile_id = ${profile.id}::uuid
          and s.role = 'teacher'
          and s.class_id = ${classId}::uuid
          and s.is_active
      )
  `;
}

export async function assignHomeroomAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const access = await requireAccess();
  assert(canAssignTeachers(access), "Không có quyền phân công giáo viên");
  const parsed = homeroomAssignSchema.safeParse({
    classId: formData.get("classId"),
    staffId: formData.get("staffId") || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const cls = await classContext(parsed.data.classId);
  if (!cls) return { error: "Không tìm thấy lớp" };
  assert(canSeeClass(access, cls.id, cls.campus_id), "Lớp ngoài phạm vi");

  const staffId = parsed.data.staffId || null;
  if (staffId) {
    const [staff] = await sql<{ id: string; full_name: string }[]>`
      select id::text, full_name from staff where id = ${staffId}::uuid and is_active limit 1
    `;
    if (!staff) return { error: "Không tìm thấy giáo viên" };

    const [busy] = await sql<{ class_name: string; campus_name: string }[]>`
      select c.name as class_name, camp.name as campus_name
      from classes c
      join campuses camp on camp.id = c.campus_id
      where c.homeroom_staff_id = ${staffId}::uuid
        and c.school_year_id = ${cls.school_year_id}::uuid
        and c.id <> ${cls.id}::uuid
      limit 1
    `;
    if (busy) {
      return {
        error: `${staff.full_name} đã chủ nhiệm lớp ${busy.class_name} (${busy.campus_name}). Một giáo viên chỉ đứng một lớp trong năm học.`,
      };
    }
  }

  try {
    await sql.begin(async (tx) => {
      await tx`
        update classes
        set homeroom_staff_id = ${staffId}::uuid
        where id = ${cls.id}::uuid
      `;
      await tx`
        update staff_assignments
        set is_active = false
        where class_id = ${cls.id}::uuid and is_homeroom and is_active
      `;
      if (staffId) {
        await tx`
          insert into staff_assignments (
            staff_id, school_year_id, campus_id, class_id, subject, title, is_homeroom, is_active
          ) values (
            ${staffId}::uuid, ${cls.school_year_id}::uuid, ${cls.campus_id}::uuid,
            ${cls.id}::uuid, null, 'Giáo viên chủ nhiệm', true, true
          )
        `;
      }
    });
  } catch {
    return { error: "Không lưu được. Giáo viên này có thể đã chủ nhiệm lớp khác." };
  }

  await syncHomeroomScope(cls.id, cls.school_id, staffId);
  await writeAudit({
    actorId: access.profileId,
    action: "staff.assign_homeroom",
    entityType: "class",
    entityId: cls.id,
    before: { staffId: cls.homeroom_staff_id },
    after: { staffId },
  });
  revalidateClass(cls.id);
  return null;
}

export async function assignSubjectTeacherAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const access = await requireAccess();
  assert(canAssignTeachers(access), "Không có quyền phân công giáo viên");
  const parsed = subjectAssignSchema.safeParse({
    classId: formData.get("classId"),
    staffId: formData.get("staffId"),
    subject: formData.get("subject"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Chọn giáo viên và môn" };
  const cls = await classContext(parsed.data.classId);
  if (!cls) return { error: "Không tìm thấy lớp" };
  assert(canSeeClass(access, cls.id, cls.campus_id), "Lớp ngoài phạm vi");

  const [staff] = await sql<{ id: string }[]>`
    select id::text from staff where id = ${parsed.data.staffId}::uuid and is_active limit 1
  `;
  if (!staff) return { error: "Không tìm thấy giáo viên" };

  const [dup] = await sql<{ id: string }[]>`
    select id::text from staff_assignments
    where is_active and class_id = ${cls.id}::uuid and staff_id = ${staff.id}::uuid
      and not is_homeroom and coalesce(subject, '') = ${parsed.data.subject}
    limit 1
  `;
  if (dup) return { error: "Giáo viên này đã được gán môn đó cho lớp này." };

  try {
    await sql`
      insert into staff_assignments (
        staff_id, school_year_id, campus_id, class_id, subject, title, is_homeroom, is_active
      ) values (
        ${staff.id}::uuid, ${cls.school_year_id}::uuid, ${cls.campus_id}::uuid,
        ${cls.id}::uuid, ${parsed.data.subject}, 'Giáo viên bộ môn', false, true
      )
    `;
  } catch {
    return { error: "Không thêm được phân công bộ môn." };
  }
  await syncTeacherScope(cls.id, cls.school_id, staff.id);
  await writeAudit({
    actorId: access.profileId,
    action: "staff.assign_subject",
    entityType: "class",
    entityId: cls.id,
    after: { staffId: staff.id, subject: parsed.data.subject },
  });
  revalidateClass(cls.id);
  return null;
}

export async function removeClassAssignmentAction(formData: FormData): Promise<void> {
  const access = await requireAccess();
  assert(canAssignTeachers(access), "Không có quyền phân công giáo viên");
  const parsed = assignmentIdSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    classId: formData.get("classId"),
  });
  if (!parsed.success) return;
  const cls = await classContext(parsed.data.classId);
  if (!cls) return;
  assert(canSeeClass(access, cls.id, cls.campus_id), "Lớp ngoài phạm vi");

  const [row] = await sql<{ id: string; staff_id: string; is_homeroom: boolean; subject: string | null }[]>`
    select id::text, staff_id::text, is_homeroom, subject
    from staff_assignments
    where id = ${parsed.data.assignmentId}::uuid and class_id = ${cls.id}::uuid and is_active
    limit 1
  `;
  if (!row) return;

  await sql`update staff_assignments set is_active = false where id = ${row.id}::uuid`;
  if (row.is_homeroom) {
    await sql`
      update classes set homeroom_staff_id = null
      where id = ${cls.id}::uuid and homeroom_staff_id = ${row.staff_id}::uuid
    `;
    await syncHomeroomScope(cls.id, cls.school_id, null);
  }

  await writeAudit({
    actorId: access.profileId,
    action: "staff.unassign",
    entityType: "class",
    entityId: cls.id,
    before: { staffId: row.staff_id, homeroom: row.is_homeroom, subject: row.subject },
  });
  revalidateClass(cls.id);
}
