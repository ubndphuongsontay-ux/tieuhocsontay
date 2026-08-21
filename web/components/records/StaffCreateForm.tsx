"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createStaffAction } from "@/lib/actions-records";

export function StaffCreateForm({
  campuses,
  defaultCampusId,
}: {
  campuses: { id: string; code: string; name: string }[];
  defaultCampusId?: string;
}) {
  const [state, action, pending] = useActionState(createStaffAction, null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field sm:col-span-2">
          <span>Phân hiệu</span>
          <select name="campusId" required defaultValue={defaultCampusId ?? ""}>
            <option value="" disabled>
              Chọn phân hiệu…
            </option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Họ tên</span>
          <input name="fullName" required maxLength={120} placeholder="Nguyễn Văn A" />
        </label>
        <label className="field">
          <span>Ngày sinh</span>
          <input name="dob" type="date" />
        </label>
        <label className="field">
          <span>Giới tính</span>
          <select name="gender" defaultValue="">
            <option value="">Chưa rõ</option>
            <option value="nam">Nam</option>
            <option value="nu">Nữ</option>
          </select>
        </label>
        <label className="field">
          <span>Dân tộc</span>
          <input name="ethnicity" placeholder="Kinh" />
        </label>
        <label className="field">
          <span>CCCD (9 hoặc 12 số)</span>
          <input name="nationalId" inputMode="numeric" />
        </label>
        <label className="field">
          <span>Điện thoại (10 số, bắt đầu 0)</span>
          <input name="phone" inputMode="tel" />
        </label>
        <label className="field">
          <span>Trình độ</span>
          <input name="educationLevel" />
        </label>
        <label className="field">
          <span>Chuyên môn</span>
          <input name="professionalQualification" />
        </label>
        <label className="field">
          <span>Loại hợp đồng</span>
          <select name="employmentKind" defaultValue="">
            <option value="">Chưa rõ</option>
            <option value="bien_che">Biên chế</option>
            <option value="hop_dong">Hợp đồng</option>
            <option value="thinh_giang">Thỉnh giảng</option>
          </select>
        </label>
        <label className="field">
          <span>Đảng viên</span>
          <select name="partyMember" defaultValue="unknown">
            <option value="unknown">Chưa rõ</option>
            <option value="yes">Có</option>
            <option value="no">Không</option>
          </select>
        </label>
      </div>
      {state?.error ? <p className="text-sm font-medium text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Đang lưu…" : "Thêm cán bộ"}
      </Button>
    </form>
  );
}
