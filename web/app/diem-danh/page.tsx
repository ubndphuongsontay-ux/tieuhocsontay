import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ds/EmptyState";
import { canEditAttendance, classListMode, requireAccess } from "@/lib/access";
import { sql } from "@/lib/db";
import Link from "@/components/AppLink";

export default async function AttendanceIndexPage() {
  const access = await requireAccess();
  let rows: { id: string; name: string; campus_name: string; campus_id: string; n: number }[] = [
    ...(await sql<{ id: string; name: string; campus_name: string; campus_id: string; n: number }[]>`
    select c.id::text, c.name, camp.name as campus_name, c.campus_id::text,
      coalesce(sz.enrollment_count,0)::int as n
    from classes c
    join school_years y on y.id = c.school_year_id
    join campuses camp on camp.id = c.campus_id
    left join v_class_sizes sz on sz.class_id = c.id
    where y.is_current
    order by camp.sort_order, c.grade, c.name
  `),
  ];
  const mode = classListMode(access);
  if (mode === "class") rows = rows.filter((r) => access.classIds.includes(r.id));
  else if (mode === "campus") rows = rows.filter((r) => access.campusIds.includes(r.campus_id));
  else if (mode === "none") rows = [];
  rows = rows.filter((r) => canEditAttendance(access, r.id, r.campus_id) || access.schoolWide || mode === "campus");

  const editable = rows.filter((r) => canEditAttendance(access, r.id, r.campus_id));
  if (editable.length === 1) redirect(`/lop/${editable[0].id}/diem-danh`);

  return (
    <>
      <PageHeader title="Điểm danh" description="Chọn lớp để nhập chuyên cần trong ngày" />
      {rows.length === 0 ? (
        <EmptyState title="Không có lớp được phân công" />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/lop/${r.id}/diem-danh`}
                className="block rounded-[12px] border border-border bg-card p-4 hover:border-primary/30"
              >
                <p className="font-bold">{r.name}</p>
                <p className="text-[13px] text-muted-foreground">
                  {r.campus_name} · {r.n} học sinh
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
