import Link from "next/link";
import { OrgScopeFilters } from "@/components/class/OrgScopeFilters";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ds/EmptyState";
import { classListMode, requireAccess } from "@/lib/access";
import { sql } from "@/lib/db";
import { getCampusOverview } from "@/lib/queries";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; khoi?: string }>;
}) {
  const access = await requireAccess();
  const { campus, khoi } = await searchParams;
  const campusCode = campus?.toUpperCase() || null;
  const gradeNum = khoi && /^[1-5]$/.test(khoi) ? Number(khoi) : null;

  const campuses = (await getCampusOverview())
    .filter((c) => access.schoolWide || access.campusIds.includes(c.id))
    .map((c) => ({ code: c.code, name: c.name }));

  let rows: {
    id: string;
    name: string;
    grade: number;
    campus_name: string;
    campus_id: string;
    campus_code: string;
    n: number;
    homeroom: string | null;
  }[] = [
    ...(await sql<{
      id: string;
      name: string;
      grade: number;
      campus_name: string;
      campus_id: string;
      campus_code: string;
      n: number;
      homeroom: string | null;
    }[]>`
    select
      c.id::text, c.name, c.grade, camp.name as campus_name, c.campus_id::text,
      camp.code as campus_code,
      coalesce(sz.enrollment_count, 0)::int as n,
      st.full_name as homeroom
    from classes c
    join school_years y on y.id = c.school_year_id
    join campuses camp on camp.id = c.campus_id
    left join v_class_sizes sz on sz.class_id = c.id
    left join staff st on st.id = c.homeroom_staff_id
    where y.is_current
      and (${campusCode}::text is null or camp.code = ${campusCode})
      and (${gradeNum}::int is null or c.grade = ${gradeNum})
    order by camp.sort_order, c.grade, c.name
  `),
  ];
  const mode = classListMode(access);
  if (mode === "class") rows = rows.filter((r) => access.classIds.includes(r.id));
  else if (mode === "campus") rows = rows.filter((r) => access.campusIds.includes(r.campus_id));
  else if (mode === "none") rows = [];

  return (
    <>
      <PageHeader
        title="Lớp học"
        description="Lọc theo phân hiệu và khối. Sĩ số tính từ enrollment đang mở."
        actions={
          <Link
            href="/phan-cong"
            className="inline-flex h-9 items-center rounded-[12px] bg-primary px-3 text-sm font-semibold text-primary-foreground"
          >
            Phân công giáo viên
          </Link>
        }
      />
      <OrgScopeFilters campuses={campuses} campus={campusCode ?? undefined} grade={khoi} action="/lop" />
      {rows.length === 0 ? (
        <EmptyState title="Không có lớp trong phạm vi" />
      ) : (
        <div className="overflow-x-auto rounded-[12px] border bg-card">
          <table className="ledger">
            <thead>
              <tr>
                <th>Lớp</th>
                <th>Phân hiệu</th>
                <th>Khối</th>
                <th>Sĩ số</th>
                <th>GVCN</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold">
                    <Link href={`/lop/${r.id}`}>{r.name}</Link>
                  </td>
                  <td>{r.campus_name}</td>
                  <td>{r.grade}</td>
                  <td className="tabular-nums">{r.n}</td>
                  <td>{r.homeroom ?? "Chưa phân công"}</td>
                  <td>
                    <Link
                      className="text-primary"
                      href={`/phan-cong?campus=${r.campus_code}&khoi=${r.grade}`}
                    >
                      Phân công
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
