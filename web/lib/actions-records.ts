"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assert, canCreateStaff, canCreateStudent, canEditStaff, canEditStudentRecord, requireAccess } from "@/lib/access";
import { writeAudit } from "@/lib/audit";
import { sql } from "@/lib/db";
import { isValidCccd, isValidVnPhone } from "@/lib/quality";
import {
  staffCreateSchema,
  staffUpdateSchema,
  studentContactUpsertSchema,
  studentCreateSchema,
  studentUpdateSchema,
} from "@/lib/validators";

function emptyToNull(value: string | null | undefined) {
  const v = value?.trim() ?? "";
  return v ? v : null;
}

function pgCode(err: unknown) {
  return typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
}

function parseGender(value: string | null | undefined) {
  return value === "nam" || value === "nu" ? value : null;
}

function parseEmployment(value: string | null | undefined) {
  return value === "bien_che" || value === "hop_dong" || value === "thinh_giang" ? value : null;
}

function parseParty(value: string | null | undefined) {
  return value === "yes" ? true : value === "no" ? false : null;
}

function optionalId(value: string | null | undefined, kind: "cccd" | "phone") {
  const v = emptyToNull(value);
  if (!v) return { ok: true as const, value: null };
  if (kind === "cccd" && !isValidCccd(v)) return { ok: false as const, error: "CCCD phải gồm 9 hoặc 12 chữ số." };
  if (kind === "phone" && !isValidVnPhone(v)) return { ok: false as const, error: "Số điện thoại phải gồm 10 số, bắt đầu bằng 0." };
  return { ok: true as const, value: v };
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
  const gender = parseGender(parsed.data.gender);

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
    if (pgCode(err) === "23505") return { error: "CCCD hoặc mã Bộ GDĐT đã tồn tại trên hồ sơ khác." };
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

  const gender = parseGender(parsed.data.gender);
  const dob = emptyToNull(parsed.data.dob);
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return { error: "Ngày sinh không hợp lệ" };
  const employment = parseEmployment(parsed.data.employmentKind);
  const party = parseParty(parsed.data.partyMember);

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
    if (pgCode(err) === "23505") return { error: "CCCD đã tồn tại trên hồ sơ khác." };
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

export async function createStaffAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const access = await requireAccess();
  assert(canCreateStaff(access), "Không có quyền thêm cán bộ");
  const parsed = staffCreateSchema.safeParse({
    campusId: formData.get("campusId"),
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
  assert(canEditStaff(access, parsed.data.campusId), "Không có quyền thêm cán bộ tại phân hiệu này");

  const dob = emptyToNull(parsed.data.dob);
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return { error: "Ngày sinh không hợp lệ" };
  const nationalId = optionalId(parsed.data.nationalId, "cccd");
  if (!nationalId.ok) return { error: nationalId.error };
  const phone = optionalId(parsed.data.phone, "phone");
  if (!phone.ok) return { error: phone.error };

  let staffId: string;
  try {
    const [row] = await sql<{ id: string }[]>`
      insert into staff (
        campus_id, full_name, dob, gender, ethnicity, national_id, phone,
        education_level, professional_qualification, it_level, foreign_language_level,
        political_theory_level, employment_kind, is_party_member, is_active
      ) values (
        ${parsed.data.campusId}::uuid,
        ${parsed.data.fullName},
        ${dob}::date,
        ${parseGender(parsed.data.gender)},
        ${emptyToNull(parsed.data.ethnicity)},
        ${nationalId.value},
        ${phone.value},
        ${emptyToNull(parsed.data.educationLevel)},
        ${emptyToNull(parsed.data.professionalQualification)},
        ${emptyToNull(parsed.data.itLevel)},
        ${emptyToNull(parsed.data.foreignLanguageLevel)},
        ${emptyToNull(parsed.data.politicalTheoryLevel)},
        ${parseEmployment(parsed.data.employmentKind)},
        ${parseParty(parsed.data.partyMember)},
        true
      )
      returning id::text
    `;
    staffId = row.id;
  } catch (err) {
    if (pgCode(err) === "23505") return { error: "CCCD đã tồn tại trên hồ sơ khác." };
    return { error: "Không thêm được cán bộ. Kiểm tra kết nối cơ sở dữ liệu." };
  }

  await writeAudit({
    actorId: access.profileId,
    action: "staff.create",
    entityType: "staff",
    entityId: staffId,
    after: { campusId: parsed.data.campusId, fullName: parsed.data.fullName },
  });
  revalidatePath("/nhan-su");
  revalidatePath(`/nhan-su/${staffId}`);
  revalidatePath("/");
  redirect(`/nhan-su/${staffId}`);
}

export async function createStudentAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const access = await requireAccess();
  assert(canCreateStudent(access), "Không có quyền thêm học sinh");
  const parsed = studentCreateSchema.safeParse({
    fullName: formData.get("fullName"),
    dob: formData.get("dob") || null,
    gender: formData.get("gender") || null,
    ethnicity: formData.get("ethnicity"),
    nationalId: formData.get("nationalId"),
    bgdCode: formData.get("bgdCode"),
    classId: formData.get("classId"),
    contactRelation: formData.get("contactRelation") || null,
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const [cls] = await sql<{ campus_id: string; school_year_id: string }[]>`
    select campus_id::text, school_year_id::text
    from classes
    where id = ${parsed.data.classId}::uuid
    limit 1
  `;
  if (!cls) return { error: "Không tìm thấy lớp" };
  assert(canEditStudentRecord(access, parsed.data.classId, cls.campus_id), "Không có quyền thêm học sinh vào lớp này");

  const dob = emptyToNull(parsed.data.dob);
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return { error: "Ngày sinh không hợp lệ" };
  const nationalId = optionalId(parsed.data.nationalId, "cccd");
  if (!nationalId.ok) return { error: nationalId.error };
  const contactPhone = optionalId(parsed.data.contactPhone, "phone");
  if (!contactPhone.ok) return { error: contactPhone.error };
  const contactName = emptyToNull(parsed.data.contactName);
  const relation =
    parsed.data.contactRelation === "me" || parsed.data.contactRelation === "cha" || parsed.data.contactRelation === "khac"
      ? parsed.data.contactRelation
      : "me";

  let studentId: string;
  try {
    studentId = await sql.begin(async (tx) => {
      const [created] = await tx<{ id: string }[]>`
        insert into students (full_name, dob, gender, ethnicity, national_id, bgd_code)
        values (
          ${parsed.data.fullName},
          ${dob}::date,
          ${parseGender(parsed.data.gender)},
          ${emptyToNull(parsed.data.ethnicity)},
          ${nationalId.value},
          ${emptyToNull(parsed.data.bgdCode)}
        )
        returning id::text
      `;
      await tx`
        insert into enrollments (student_id, class_id, school_year_id, started_on, ended_on, status)
        values (
          ${created.id}::uuid,
          ${parsed.data.classId}::uuid,
          ${cls.school_year_id}::uuid,
          current_date,
          null,
          'dang_hoc'
        )
      `;
      if (contactName || contactPhone.value) {
        await tx`
          insert into student_contacts (student_id, relation, full_name, phone, is_primary)
          values (
            ${created.id}::uuid,
            ${relation},
            ${contactName},
            ${contactPhone.value},
            true
          )
        `;
      }
      return created.id;
    });
  } catch (err) {
    if (pgCode(err) === "23505") return { error: "CCCD hoặc mã Bộ GDĐT đã tồn tại trên hồ sơ khác." };
    return { error: "Không thêm được học sinh. Kiểm tra kết nối cơ sở dữ liệu." };
  }

  await writeAudit({
    actorId: access.profileId,
    action: "student.create",
    entityType: "student",
    entityId: studentId,
    after: { classId: parsed.data.classId, fullName: parsed.data.fullName },
  });
  revalidatePath("/hoc-sinh");
  revalidatePath(`/hoc-sinh/${studentId}`);
  revalidatePath(`/lop/${parsed.data.classId}`);
  revalidatePath("/");
  redirect(`/hoc-sinh/${studentId}`);
}
