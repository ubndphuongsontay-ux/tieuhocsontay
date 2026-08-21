import { describe, expect, it } from "vitest";
import { uniqueUsername, usernameFromFullName } from "../lib/username";

describe("tên đăng nhập từ họ tên", () => {
  it("Hà Thanh Hương → HuongHT", () => {
    expect(usernameFromFullName("Hà Thanh Hương")).toBe("HuongHT");
  });

  it("bỏ dấu và lấy chữ lót", () => {
    expect(usernameFromFullName("Nguyễn Thị Ánh")).toBe("AnhNT");
    expect(usernameFromFullName("Đỗ Văn Minh")).toBe("MinhDV");
  });

  it("trùng thì thêm số", () => {
    const taken = new Set(["huonght"]);
    expect(uniqueUsername("HuongHT", taken)).toBe("HuongHT2");
  });
});
