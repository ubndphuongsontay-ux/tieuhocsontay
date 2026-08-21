import { describe, expect, it } from "vitest";
import { canApproveTasks, canAssignTeachers, canEditAttendance, canEditStaff, canEditStudentRecord, canSeeClass, type Access } from "../lib/permissions";

function access(
  partial: Pick<Access, "roles" | "campusIds" | "classIds" | "schoolWide">
): Access {
  return {
    profileId: "x",
    scopes: [],
    ...partial,
  };
}

describe("phân quyền phía server", () => {
  it("Hiệu trưởng xem toàn trường; PHT chỉ phân hiệu được giao", () => {
    const ht = access({ roles: ["principal"], schoolWide: true, campusIds: [], classIds: [] });
    const pht = access({
      roles: ["vice_principal"],
      schoolWide: false,
      campusIds: ["pt"],
      classIds: [],
    });
    expect(canSeeClass(ht, "any-class", "th")).toBe(true);
    expect(canSeeClass(pht, "c1", "pt")).toBe(true);
    expect(canSeeClass(pht, "c2", "th")).toBe(false);
  });

  it("GVCN nhập được lớp mình, không nhập lớp khác", () => {
    const gvcn = access({
      roles: ["homeroom_teacher"],
      schoolWide: false,
      campusIds: ["th"],
      classIds: ["lop-a"],
    });
    expect(canEditAttendance(gvcn, "lop-a", "th")).toBe(true);
    expect(canEditAttendance(gvcn, "lop-b", "th")).toBe(false);
    expect(canSeeClass(gvcn, "lop-b", "th")).toBe(false);
  });

  it("system_admin không phê duyệt nhiệm vụ", () => {
    const admin = access({ roles: ["system_admin"], schoolWide: true, campusIds: [], classIds: [] });
    expect(canApproveTasks(admin)).toBe(false);
  });

  it("Hiệu trưởng/PHT được gán giáo viên; GVCN thì không", () => {
    const ht = access({ roles: ["principal"], schoolWide: true, campusIds: [], classIds: [] });
    const gvcn = access({
      roles: ["homeroom_teacher"],
      schoolWide: false,
      campusIds: ["th"],
      classIds: ["lop-a"],
    });
    expect(canAssignTeachers(ht)).toBe(true);
    expect(canAssignTeachers(gvcn)).toBe(false);
  });

  it("GVCN chỉ sửa học sinh lớp mình; PHT sửa trong phân hiệu; không sửa nhân sự ngoài phạm vi", () => {
    const gvcn = access({
      roles: ["homeroom_teacher"],
      schoolWide: false,
      campusIds: ["th"],
      classIds: ["lop-a"],
    });
    const pht = access({
      roles: ["vice_principal"],
      schoolWide: false,
      campusIds: ["pt"],
      classIds: [],
    });
    expect(canEditStudentRecord(gvcn, "lop-a", "th")).toBe(true);
    expect(canEditStudentRecord(gvcn, "lop-b", "th")).toBe(false);
    expect(canEditStaff(gvcn, "th")).toBe(false);
    expect(canEditStaff(pht, "pt")).toBe(true);
    expect(canEditStaff(pht, "th")).toBe(false);
  });
});
