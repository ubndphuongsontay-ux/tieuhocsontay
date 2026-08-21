import { describe, expect, it } from "vitest";
import { isValidCccd, isValidVnPhone, staffIssues, studentIssues } from "../lib/quality";

describe("kiểm tra dữ liệu hồ sơ", () => {
  it("CCCD 9 hoặc 12 số", () => {
    expect(isValidCccd("001234567890")).toBe(true);
    expect(isValidCccd("123456789")).toBe(true);
    expect(isValidCccd("12345")).toBe(false);
  });

  it("SĐT Việt Nam 10 số bắt đầu 0; thiếu số 0 là chưa chuẩn", () => {
    expect(isValidVnPhone("0987654321")).toBe(true);
    expect(isValidVnPhone("979218388")).toBe(false);
    expect(isValidVnPhone("Đã mất")).toBe(false);
  });

  it("học sinh thiếu CCCD và SĐT phụ huynh", () => {
    const issues = studentIssues({
      dob: "2018-05-01",
      gender: "nu",
      ethnicity: "Kinh",
      national_id: null,
      contact_name: "Nguyễn Thị A",
      contact_phone: "943122981",
      has_contact: true,
    }).map((i) => i.code);
    expect(issues).toContain("missing_cccd");
    expect(issues).toContain("invalid_contact_phone");
  });

  it("cán bộ thiếu loại hợp đồng", () => {
    const issues = staffIssues({
      dob: "1985-01-01",
      gender: "nu",
      national_id: "001234567890",
      phone: "0987654321",
      education_level: "Đại học",
      employment_kind: null,
      username: "HuongHT",
    }).map((i) => i.code);
    expect(issues).toEqual(["missing_employment"]);
  });
});
