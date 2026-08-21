export function stripVietnamese(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function titleAscii(part: string): string {
  const raw = stripVietnamese(part).replace(/[^A-Za-z]/g, "");
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/** Hà Thanh Hương → HuongHT */
export function usernameFromFullName(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .map(titleAscii)
    .filter(Boolean);
  if (parts.length === 0) return "";
  const given = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
  return `${given}${initials}`;
}

export function uniqueUsername(base: string, taken: Set<string>): string {
  const root = base || "Gv";
  let candidate = root;
  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${root}${n}`;
    n += 1;
  }
  return candidate;
}
