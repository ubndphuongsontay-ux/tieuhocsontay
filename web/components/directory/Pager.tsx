import Link from "@/components/AppLink";

export function Pager({
  total,
  page,
  pageSize,
  params,
}: {
  total: number;
  page: number;
  pageSize: number;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const qs = (p: number) => {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) q.set(key, value);
    }
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `?${s}` : "?";
  };

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px]">
      <p className="text-muted-foreground">
        {total.toLocaleString("vi-VN")} kết quả
        {pages > 1 ? ` · trang ${page}/${pages}` : ""}
      </p>
      {pages > 1 ? (
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={qs(page - 1)} className="rounded-[10px] border border-border px-3 py-1.5 font-medium hover:bg-muted">
              Trước
            </Link>
          ) : null}
          {page < pages ? (
            <Link href={qs(page + 1)} className="rounded-[10px] border border-border px-3 py-1.5 font-medium hover:bg-muted">
              Sau
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function StatStrip({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-[12px] border border-border bg-card px-4 py-3 shadow-[var(--shadow-card)]">
          <p className="text-[12.5px] font-medium text-muted-foreground">{item.label}</p>
          <p className="mt-0.5 text-[22px] font-extrabold tabular-nums tracking-tight">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
