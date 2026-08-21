export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const [y, m, day] = value.slice(0, 10).split("-");
      return `${day}/${m}/${y}`;
    }
    return "—";
  }
  return d.toLocaleDateString("vi-VN");
}

function parseDay(value: Date | string): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const m = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function ageYears(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = parseDay(value);
  if (!d) return "—";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const month = now.getMonth() - d.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < d.getDate())) age -= 1;
  if (age < 0 || age > 120) return "—";
  return String(age);
}

export function partyLabel(value: boolean | null | undefined): string {
  if (value === true) return "Đảng viên";
  if (value === false) return "Không";
  return "—";
}

export function genderLabel(value: string | null | undefined): string {
  if (value === "nam") return "Nam";
  if (value === "nu") return "Nữ";
  return "—";
}

export function statusLabel(value: string | null | undefined): string {
  switch (value) {
    case "dang_hoc":
      return "Đang học";
    case "chuyen_lop":
      return "Chuyển lớp";
    case "chuyen_phan_hieu":
      return "Chuyển phân hiệu";
    case "chuyen_truong":
      return "Chuyển trường";
    case "thoi_hoc":
      return "Thôi học";
    default:
      return value ?? "—";
  }
}

export function supportKindLabel(value: string | null | undefined): string {
  switch (value) {
    case "khuyet_tat":
      return "Khuyết tật";
    case "chinh_sach":
      return "Chính sách";
    case "hoan_canh":
      return "Hoàn cảnh";
    case "doi_tuong":
      return "Đối tượng";
    default:
      return value ?? "—";
  }
}

export function employmentLabel(value: string | null | undefined): string {
  switch (value) {
    case "thinh_giang":
      return "Thỉnh giảng";
    case "hop_dong":
      return "Hợp đồng";
    case "bien_che":
      return "Biên chế";
    default:
      return "—";
  }
}

export function relationLabel(value: string | null | undefined): string {
  switch (value) {
    case "me":
      return "Mẹ";
    case "cha":
      return "Cha";
    case "khac":
      return "Liên hệ";
    default:
      return value ?? "—";
  }
}
