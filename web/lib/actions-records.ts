"use server";

import { revalidatePath } from "next/cache";
import { assert, canEditStaff, canEditStudentRecord, requireAccess } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { sql } from "@/lib/db";
import { staffUpdateSchema, studentContactUpsertSchema, studentUpdateSchema } from "@/lib/validators";

function emptyToNull(value: string | null | undefined) {
  const v = value?.trim() ?? "";
  return v ? v : null;
}

async function studentScope(studentId: string) {
  const [row] = await sql<{ class_id: string | null; campus_id: string | null }[]>`
    select class_id::text, campus_id::text
    from v_enrollments_current
    where student_id = ${studentId}::uuid
    limit 1
  `;
  return row ?? { class_id: null, campus_id: null };
}

export async function updateStudentAction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const access = await requireAccess();
  const parsed = studentUpdateSchema.safeParse({
    studentId: formData.get("studentId"),
    fullName: formData.get("fullName"),
    dob: formData.get("dob") || null,
    gender: formData.get("gender") || null,
    ethnicity: formData.get("ethnicity"),
    nationalId: formData.get("nationalId"),
    bgdCode: formData.get("bgdCode"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const scope = await studentScope(parsed.data.studentId);
  assert(canEditStudentRecord(access, scope.class_id, scope.campus_id), "Không có quyền sửa hồ sơ học sinh này");

  const nationalId = emptyToNull(parsed.data.nationalId);
  const dob = emptyToNull(parsed.data.dob);
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return { error: "Ngày sinh không hợp lệ" };
  const gender = parsed.data.gender === "nam" || parsed.data.gender === "nu" ? parsed.data.gender : null;

  try {
    await sql`
      update students
      set
        full_name = ${parsed.data.fullName},
        dob = ${dob}::date,
        gender = ${gender},
        ethnicity = ${emptyToNull(parsed.data.ethnicity)},
        national_id = ${nationalId},
        bgd_code = ${emptyToNull(parsed.data.bgdCode)}
      where id = ${parsed.data.studentId}::uuid
    `;
  } catch (err) {
    const code = typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "23505") return { error: "CCCD hoặc mã Bộ GDĐT đã tồn tại trên hồ sơ khác." };
    return { error: "Không lưu được hồ sơ học sinh." };
  }

  await writeAudit({
    actorId: access.profileId,
    action: "student.update",
    entityType: "student",
    entityId: parsed.data.studentId,
  });
  revalidatePath(`/hoc-sinh/${parsed.data.studentId}`);
  revalidatePath("/hoc-sinh");
  return { ok: true };
}

export async function upsertStudentContactAction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const access = await requireAccess();
  const parsed = studentContactUpsertSchema.safeParse({
    studentId: formData.get("studentId"),
    contactId: formData.get("contactId") || null,
    relation: formData.get("relation"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu liên hệ không hợp lệ" };
  const scope = await studentScope(parsed.data.studentId);
  assert(canEditStudentRecord(access, scope.class_id, scope.campus_id), "Không có quyền sửa liên hệ học sinh này");

  if (parsed.data.contactId) {
    await sql`
      update student_contacts
      set full_name = ${emptyToNull(parsed.data.fullName)}, phone = ${emptyToNull(parsed.data.phone)}
      where id = ${parsed.data.contactId}::uuid and student_id = ${parsed.data.studentId}::uuid
    `;
  } else {
    await sql`
      insert into student_contacts (student_id, relation, full_name, phone, is_primary)
      values (
        ${parsed.data.studentId}::uuid,
        ${parsed.data.relation},
        ${emptyToNull(parsed.data.fullName)},
        ${emptyToNull(parsed.data.phone)},
        not exists (select 1 from student_contacts c where c.student_id = ${parsed.data.studentId}::uuid)
      )
    `;
  }
  await writeAudit({
    actorId: access.profileId,
    action: "student.contact_update",
    entityType: "student",
    entityId: parsed.data.studentId,
  });
  revalidatePath(`/hoc-sinh/${parsed.data.studentId}`);
  revalidatePath("/hoc-sinh");
  return { ok: true };
}

export async function updateStaffAction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const access = await requireAccess();
  const parsed = staffUpdateSchema.safeParse({
    staffId: formData.get("staffId"),
    fullName: formData.get("fullName"),
    dob: formData.get("dob") || null,
    gender: formData.get("gender") || null,
    ethnicity: formData.get("ethnicity"),
    nationalId: formData.get("nationalId"),
    phone: formData.get("phone"),
    educationLevel: formData.get("educationLevel"),
    professionalQualification: formData.get("professionalQualification"),
    itLevel: formData.get("itLevel"),
    foreignLanguageLevel: formData.get("foreignLanguageLevel"),
    politicalTheoryLevel: formData.get("politicalTheoryLevel"),
    employmentKind: formData.get("employmentKind") || null,
    partyMember: formData.get("partyMember") || "unknown",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const [staff] = await sql<{ campus_id: string }[]>`
    select campus_id::text from staff where id = ${parsed.data.staffId}::uuid limit 1
  `;
  if (!staff) return { error: "Không tìm thấy cán bộ" };
  assert(canEditStaff(access, staff.campus_id), "Không có quyền sửa hồ sơ cán bộ này");

  const gender = parsed.data.gender === "nam" || parsed.data.gender === "nu" ? parsed.data.gender : null;
  const dob = emptyToNull(parsed.data.dob);
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return { error: "Ngày sinh không hợp lệ" };
  const employment =
    parsed.data.employmentKind === "bien_che" ||
    parsed.data.employmentKind === "hop_dong" ||
    parsed.data.employmentKind === "thinh_giang"
      ? parsed.data.employmentKind
      : null;
  const party =
    parsed.data.partyMember === "yes" ? true : parsed.data.partyMember === "no" ? false : null;

  try {
    await sql`
      update staff
      set
        full_name = ${parsed.data.fullName},
        dob = ${dob}::date,
        gender = ${gender},
        ethnicity = ${emptyToNull(parsed.data.ethnicity)},
        national_id = ${emptyToNull(parsed.data.nationalId)},
        phone = ${emptyToNull(parsed.data.phone)},
        education_level = ${emptyToNull(parsed.data.educationLevel)},
        professional_qualification = ${emptyToNull(parsed.data.professionalQualification)},
        it_level = ${emptyToNull(parsed.data.itLevel)},
        foreign_language_level = ${emptyToNull(parsed.data.foreignLanguageLevel)},
        political_theory_level = ${emptyToNull(parsed.data.politicalTheoryLevel)},
        employment_kind = ${employment},
        is_party_member = ${party}
      where id = ${parsed.data.staffId}::uuid
    `;
  } catch (err) {
    const code = typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "23505") return { error: "CCCD đã tồn tại trên hồ sơ khác." };
    return { error: "Không lưu được hồ sơ cán bộ." };
  }

  await writeAudit({
    actorId: access.profileId,
    action: "staff.update",
    entityType: "staff",
    entityId: parsed.data.staffId,
  });
  revalidatePath(`/nhan-su/${parsed.data.staffId}`);
  revalidatePath("/nhan-su");
  return { ok: true };
}
