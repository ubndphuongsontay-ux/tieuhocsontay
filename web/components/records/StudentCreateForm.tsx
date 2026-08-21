"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createStudentAction } from "@/lib/actions-records";

export function StudentCreateForm({
  classes,
  defaultClassId,
}: {
  classes: { id: string; name: string; grade: number; campus_name: string }[];
  defaultClassId?: string;
}) {
  const [state, action, pending] = useActionState(createStudentAction, null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field sm:col-span-2">
          <span>Lớp đang học</span>
          <select name="classId" required defaultValue={defaultClassId ?? ""}>
            <option value="" disabled>
              Chọn lớp…
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.campus_name} · {c.name}
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
          <span>CCCD / định danh (9 hoặc 12 số)</span>
          <input name="nationalId" inputMode="numeric" />
        </label>
        <label className="field">
          <span>Mã Bộ GDĐT</span>
          <input name="bgdCode" />
        </label>
      </div>
      <div className="rounded-[12px] border border-border bg-muted/40 p-4">
        <p className="mb-3 text-[13px] font-semibold">Liên hệ phụ huynh (tuỳ chọn)</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="field">
            <span>Quan hệ</span>
            <select name="contactRelation" defaultValue="me">
              <option value="me">Mẹ</option>
              <option value="cha">Cha</option>
              <option value="khac">Khác</option>
            </select>
          </label>
          <label className="field">
            <span>Họ tên</span>
            <input name="contactName" />
          </label>
          <label className="field">
            <span>Điện thoại</span>
            <input name="contactPhone" inputMode="tel" />
          </label>
        </div>
      </div>
      {state?.error ? <p className="text-sm font-medium text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Đang lưu…" : "Thêm học sinh"}
      </Button>
    </form>
  );
}
