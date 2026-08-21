"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updateStaffAction } from "@/lib/actions-records";
import type { StaffProfile } from "@/lib/queries";

export function StaffEditForm({ staff }: { staff: StaffProfile }) {
  const [state, action, pending] = useActionState(updateStaffAction, null);
  const dob = staff.dob?.slice(0, 10) ?? "";
  const party = staff.is_party_member === true ? "yes" : staff.is_party_member === false ? "no" : "unknown";
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="staffId" value={staff.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          <span>Họ tên</span>
          <input name="fullName" required defaultValue={staff.full_name} />
        </label>
        <label className="field">
          <span>Ngày sinh</span>
          <input name="dob" type="date" defaultValue={dob} />
        </label>
        <label className="field">
          <span>Giới tính</span>
          <select name="gender" defaultValue={staff.gender ?? ""}>
            <option value="">Chưa rõ</option>
            <option value="nam">Nam</option>
            <option value="nu">Nữ</option>
          </select>
        </label>
        <label className="field">
          <span>Dân tộc</span>
          <input name="ethnicity" defaultValue={staff.ethnicity ?? ""} />
        </label>
        <label className="field">
          <span>CCCD (9 hoặc 12 số)</span>
          <input name="nationalId" defaultValue={staff.national_id ?? ""} inputMode="numeric" />
        </label>
        <label className="field">
          <span>Điện thoại (10 số, bắt đầu 0)</span>
          <input name="phone" defaultValue={staff.phone ?? ""} inputMode="tel" />
        </label>
        <label className="field">
          <span>Trình độ</span>
          <input name="educationLevel" defaultValue={staff.education_level ?? ""} />
        </label>
        <label className="field">
          <span>Chuyên môn</span>
          <input name="professionalQualification" defaultValue={staff.professional_qualification ?? ""} />
        </label>
        <label className="field">
          <span>Tin học</span>
          <input name="itLevel" defaultValue={staff.it_level ?? ""} />
        </label>
        <label className="field">
          <span>Ngoại ngữ</span>
          <input name="foreignLanguageLevel" defaultValue={staff.foreign_language_level ?? ""} />
        </label>
        <label className="field">
          <span>Lý luận chính trị</span>
          <input name="politicalTheoryLevel" defaultValue={staff.political_theory_level ?? ""} />
        </label>
        <label className="field">
          <span>Loại hợp đồng</span>
          <select name="employmentKind" defaultValue={staff.employment_kind ?? ""}>
            <option value="">Chưa rõ</option>
            <option value="bien_che">Biên chế</option>
            <option value="hop_dong">Hợp đồng</option>
            <option value="thinh_giang">Thỉnh giảng</option>
          </select>
        </label>
        <label className="field">
          <span>Đảng viên</span>
          <select name="partyMember" defaultValue={party}>
            <option value="unknown">Chưa rõ</option>
            <option value="yes">Có</option>
            <option value="no">Không</option>
          </select>
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
