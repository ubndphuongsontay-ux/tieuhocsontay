import Link from "@/components/AppLink";
import { AlertTriangle } from "lucide-react";
import { issueLabel } from "@/lib/quality";

export function QualityBanner({
  flagged,
  items,
  kind,
  current,
  params,
  href,
}: {
  flagged: number;
  items: { code: string; count: number }[];
  kind: "student" | "staff";
  current?: string;
  params: Record<string, string | undefined>;
  href: string;
}) {
  if (flagged === 0 && items.length === 0) return null;

  function link(issue?: string) {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "issue" && key !== "page") q.set(key, value);
    }
    if (issue) q.set("issue", issue);
    const s = q.toString();
    return s ? `${href}?${s}` : href;
  }

  return (
    <section className="mb-4 rounded-[12px] border border-amber-300 bg-amber-50 px-4 py-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-amber-950">
            {flagged.toLocaleString("vi-VN")} hồ sơ chưa chuẩn xác
          </p>
          <p className="mt-0.5 text-[13px] text-amber-900/80">
            Thiếu trường bắt buộc hoặc SĐT/CCCD chưa đúng định dạng. Bấm nhóm để lọc, rồi sửa từng hồ sơ.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {items.map((item) => (
              <Link
                key={item.code}
                href={link(item.code)}
                className={`rounded-full border px-2.5 py-1 text-[12.5px] font-medium ${
                  current === item.code
                    ? "border-amber-700 bg-amber-700 text-white"
                    : "border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
                }`}
              >
                {issueLabel(item.code, kind)} · {item.count.toLocaleString("vi-VN")}
              </Link>
            ))}
            {current ? (
              <Link href={link()} className="rounded-full px-2.5 py-1 text-[12.5px] font-medium text-amber-900 underline">
                Xóa lọc cảnh báo
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function IssuePills({ codes, kind }: { codes: string[]; kind: "student" | "staff" }) {
  if (!codes.length) return null;
  const shown = codes.slice(0, 2);
  const extra = codes.length - shown.length;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {shown.map((code) => (
        <span key={code} className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
          {issueLabel(code, kind)}
        </span>
      ))}
      {extra > 0 ? <span className="text-[11px] text-amber-800">+{extra}</span> : null}
    </span>
  );
}
