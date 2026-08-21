"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updateStudentAction, upsertStudentContactAction } from "@/lib/actions-records";
import type { ContactRow } from "@/lib/queries";
import type { StudentProfile } from "@/lib/queries";
import { relationLabel } from "@/lib/format";

export function StudentEditForm({
  student,
}: {
  student: StudentProfile;
}) {
  const [state, action, pending] = useActionState(updateStudentAction, null);
  const dob = student.dob?.slice(0, 10) ?? "";
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="studentId" value={student.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          <span>Họ tên</span>
          <input name="fullName" required defaultValue={student.full_name} />
        </label>
        <label className="field">
          <span>Ngày sinh</span>
          <input name="dob" type="date" defaultValue={dob} />
        </label>
        <label className="field">
          <span>Giới tính</span>
          <select name="gender" defaultValue={student.gender ?? ""}>
            <option value="">Chưa rõ</option>
            <option value="nam">Nam</option>
            <option value="nu">Nữ</option>
          </select>
        </label>
        <label className="field">
          <span>Dân tộc</span>
          <input name="ethnicity" defaultValue={student.ethnicity ?? ""} />
        </label>
        <label className="field">
          <span>CCCD / định danh (9 hoặc 12 số)</span>
          <input name="nationalId" defaultValue={student.national_id ?? student.national_id_raw ?? ""} inputMode="numeric" />
        </label>
        <label className="field">
          <span>Mã Bộ GDĐT</span>
          <input name="bgdCode" defaultValue={student.bgd_code ?? ""} />
        </label>
      </div>
      {state?.error ? <p className="text-sm font-medium text-destructive">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm font-medium text-teal">Đã lưu hồ sơ.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Đang lưu…" : "Lưu hồ sơ"}
      </Button>
    </form>
  );
}

export function StudentContactForm({
  studentId,
  contact,
}: {
  studentId: string;
  contact?: ContactRow;
}) {
  const [state, action, pending] = useActionState(upsertStudentContactAction, null);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[6.5rem_1fr_9rem_auto] sm:items-end">
      <input type="hidden" name="studentId" value={studentId} />
      {contact ? <input type="hidden" name="contactId" value={contact.id} /> : null}
      <label className="field">
        <span>Quan hệ</span>
        {contact ? (
          <>
            <input readOnly value={relationLabel(contact.relation)} />
            <input type="hidden" name="relation" value={contact.relation} />
          </>
        ) : (
          <select name="relation" defaultValue="me">
            <option value="me">Mẹ</option>
            <option value="cha">Cha</option>
            <option value="khac">Khác</option>
          </select>
        )}
      </label>
      <label className="field">
        <span>Họ tên</span>
        <input name="fullName" defaultValue={contact?.full_name ?? ""} />
      </label>
      <label className="field">
        <span>Điện thoại (10 số, bắt đầu 0)</span>
        <input name="phone" defaultValue={contact?.phone ?? ""} inputMode="tel" />
      </label>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "…" : contact ? "Lưu" : "Thêm"}
      </Button>
      {state?.error ? <p className="text-sm font-medium text-destructive sm:col-span-4">{state.error}</p> : null}
    </form>
  );
}
