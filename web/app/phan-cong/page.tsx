import Link from "next/link";
import { ClassTeachersPanel } from "@/components/class/ClassTeachersPanel";
import { OrgScopeFilters } from "@/components/class/OrgScopeFilters";
import { EmptyState } from "@/components/ds/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { canAssignTeachers, classListMode, requireAccess } from "@/lib/access";
import { sql } from "@/lib/db";
import { getCampusOverview, getCurrentHomerooms } from "@/lib/queries";
import { redirect } from "next/navigation";

export default async function AssignTeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; khoi?: string }>;
}) {
  const access = await requireAccess();
  if (!canAssignTeachers(access) && !access.schoolWide && access.classIds.length === 0) {
    redirect("/lop");
  }
  const { campus, khoi } = await searchParams;
  const campusCode = campus?.toUpperCase() || null;
  const gradeNum = khoi && /^[1-5]$/.test(khoi) ? Number(khoi) : null;

  const campuses = (await getCampusOverview())
    .filter((c) => access.schoolWide || access.campusIds.includes(c.id))
    .map((c) => ({ code: c.code, name: c.name, id: c.id }));

  const scoped = Boolean(campusCode || gradeNum);

  let classes: {
    id: string;
    name: string;
    grade: number;
    campus_id: string;
    campus_code: string;
    campus_name: string;
    n: number;
    homeroom_staff_id: string | null;
  }[] = [];

  if (scoped) {
    classes = [
      ...(await sql<{
        id: string;
        name: string;
        grade: number;
        campus_id: string;
        campus_code: string;
        campus_name: string;
        n: number;
        homeroom_staff_id: string | null;
      }[]>`
        select
          c.id::text, c.name, c.grade, c.campus_id::text, camp.code as campus_code,
          camp.name as campus_name, coalesce(sz.enrollment_count, 0)::int as n,
          c.homeroom_staff_id::text
        from classes c
        join school_years y on y.id = c.school_year_id
        join campuses camp on camp.id = c.campus_id
        left join v_class_sizes sz on sz.class_id = c.id
        where y.is_current
          and (${campusCode}::text is null or camp.code = ${campusCode})
          and (${gradeNum}::int is null or c.grade = ${gradeNum})
        order by camp.sort_order, c.grade, c.name
      `),
    ];
    const mode = classListMode(access);
    if (mode === "class") classes = classes.filter((r) => access.classIds.includes(r.id));
    else if (mode === "campus") classes = classes.filter((r) => access.campusIds.includes(r.campus_id));
    else if (mode === "none") classes = [];
  }

  const staff = scoped
    ? [
        ...(await sql<{
          id: string;
          full_name: string;
          campus_code: string;
          campus_name: string;
          campus_id: string;
        }[]>`
          select s.id::text, s.full_name, c.code as campus_code, c.name as campus_name, s.campus_id::text
          from staff s
          join campuses c on c.id = s.campus_id
          where s.is_active
          order by s.full_name
        `),
      ].filter((s) => access.schoolWide || access.campusIds.includes(s.campus_id))
    : [];

  const assignments = classes.length
    ? [
        ...(await sql<{
          id: string;
          class_id: string;
          staff_id: string;
          full_name: string;
          subject: string | null;
          is_homeroom: boolean;
          campus_code: string;
        }[]>`
          select
            a.id::text, a.class_id::text, a.staff_id::text, s.full_name, a.subject,
            a.is_homeroom, camp.code as campus_code
          from staff_assignments a
          join staff s on s.id = a.staff_id
          join campuses camp on camp.id = s.campus_id
          where a.is_active and a.class_id in ${sql(classes.map((c) => c.id))}
          order by a.is_homeroom desc, a.subject
        `),
      ]
    : [];

  const occupiedHomerooms = scoped ? await getCurrentHomerooms() : [];

  const scopeLabel = [
    campusCode ? campuses.find((c) => c.code === campusCode)?.name ?? campusCode : null,
    gradeNum ? `Khối ${gradeNum}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        title="Phân công giáo viên"
        description="Một lớp nhiều GV bộ môn. Mỗi giáo viên chỉ chủ nhiệm một lớp trong năm học."
      />
      <OrgScopeFilters campuses={campuses} campus={campusCode ?? undefined} grade={khoi} />

      {!scoped ? (
        <EmptyState
          title="Chọn phạm vi để bắt đầu"
          description="Chọn một phân hiệu (ví dụ Trung Hưng) hoặc một khối (1–5), hoặc cả hai, rồi bấm Xem lớp."
        />
      ) : classes.length === 0 ? (
        <EmptyState
          title="Chưa có lớp trong phạm vi này"
          description={
            campusCode === "VS"
              ? "Viên Sơn chưa đồng bộ dữ liệu lớp."
              : "Không có lớp khớp phân hiệu / khối đã chọn."
          }
        />
      ) : (
        <div className="space-y-6">
          <p className="text-[13px] text-muted-foreground">
            {scopeLabel} · {classes.length} lớp
          </p>
          {classes.map((cl) => (
            <article key={cl.id} className="rounded-[12px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[18px] font-bold">
                  <Link href={`/lop/${cl.id}`} className="hover:text-primary">
                    {cl.name}
                  </Link>
                  <span className="ml-2 text-[13px] font-medium text-muted-foreground">
                    {cl.campus_name} · khối {cl.grade} · {cl.n} học sinh
                  </span>
                </h2>
              </div>
              <ClassTeachersPanel
                classId={cl.id}
                classCampusId={cl.campus_id}
                homeroomStaffId={cl.homeroom_staff_id}
                assignments={assignments.filter((a) => a.class_id === cl.id)}
                staff={staff}
                access={access}
                occupiedHomerooms={occupiedHomerooms}
              />
            </article>
          ))}
        </div>
      )}
    </>
  );
}
