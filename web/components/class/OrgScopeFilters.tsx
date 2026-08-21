import { Button } from "@/components/ui/button";

export function OrgScopeFilters({
  campuses,
  campus,
  grade,
  action = "/phan-cong",
}: {
  campuses: { code: string; name: string }[];
  campus?: string;
  grade?: string;
  action?: string;
}) {
  return (
    <form method="get" action={action} className="mb-5 rounded-[12px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="text-[13px] font-medium text-muted-foreground">Chọn phạm vi phân công</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="block text-[13px] font-medium">
          Phân hiệu
          <select
            name="campus"
            defaultValue={campus ?? ""}
            className="mt-1 h-10 w-full rounded-[12px] border border-input bg-background px-2 text-sm"
          >
            <option value="">Tất cả phân hiệu</option>
            {campuses.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[13px] font-medium">
          Khối
          <select
            name="khoi"
            defaultValue={grade ?? ""}
            className="mt-1 h-10 w-full rounded-[12px] border border-input bg-background px-2 text-sm"
          >
            <option value="">Tất cả khối</option>
            {[1, 2, 3, 4, 5].map((g) => (
              <option key={g} value={String(g)}>
                Khối {g}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" className="h-10 w-full sm:w-auto">
            Xem lớp
          </Button>
        </div>
      </div>
    </form>
  );
}
