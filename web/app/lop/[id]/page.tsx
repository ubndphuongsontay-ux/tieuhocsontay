import { Avatar } from "@/components/Avatar";
import { ClassTeachersPanel } from "@/components/class/ClassTeachersPanel";
import { PageHeader, Panel } from "@/components/PageHeader";
import { canSeeClass, requireAccess } from "@/lib/access";
import { sql } from "@/lib/db";
import { formatDate, genderLabel } from "@/lib/format";
import { getClassDetail, getClassRoster, getCurrentHomerooms } from "@/lib/queries";
import { notFound } from "next/navigation";
import Link from "@/components/AppLink";

export default async function ClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireAccess();
  const cls = await getClassDetail(id);
  if (!cls) notFound();
  const [meta] = await sql<{ campus_id: string; homeroom_staff_id: string | null }[]>`
    select campus_id::text, homeroom_staff_id::text from classes where id = ${id}::uuid
  `;
  if (!canSeeClass(access, id, meta.campus_id)) notFound();
  const [roster, assignments, staff, occupiedHomerooms] = await Promise.all([
    getClassRoster(id),
    sql<{
      id: string;
      staff_id: string;
      full_name: string;
      subject: string | null;
      is_homeroom: boolean;
      campus_code: string;
    }[]>`
      select
        a.id::text,
        a.staff_id::text,
        s.full_name,
        a.subject,
        a.is_homeroom,
        camp.code as campus_code
      from staff_assignments a
      join staff s on s.id = a.staff_id
      join campuses camp on camp.id = s.campus_id
      where a.class_id = ${id}::uuid and a.is_active
      order by a.is_homeroom desc, a.subject, s.full_name
    `,
    sql<{ id: string; full_name: string; campus_code: string; campus_name: string; campus_id: string }[]>`
      select s.id::text, s.full_name, c.code as campus_code, c.name as campus_name, s.campus_id::text
      from staff s
      join campuses c on c.id = s.campus_id
      where s.is_active
      order by (s.campus_id = ${meta.campus_id}::uuid) desc, s.full_name
    `,
    getCurrentHomerooms(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={`/phan-hieu/${cls.campus_code}`} className="hover:text-blue-800">
            {cls.campus_name} · khối {cls.grade}
          </Link>
        }
        title={`Lớp ${cls.name}`}
        description={`${roster.length} học sinh đang học`}
      />

      <ClassTeachersPanel
        classId={id}
        classCampusId={meta.campus_id}
        homeroomStaffId={meta.homeroom_staff_id}
        assignments={[...assignments]}
        staff={
          access.schoolWide
            ? [...staff]
            : staff.filter((s) => access.campusIds.includes(s.campus_id))
        }
        access={access}
        occupiedHomerooms={[...occupiedHomerooms]}
      />

      <Panel>
        <div className="overflow-x-auto">
          <table className="ledger">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Học sinh</th>
                <th>Ngày sinh</th>
                <th>Giới tính</th>
                <th>Dân tộc</th>
                <th>Định danh</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((hs, i) => (
                <tr key={hs.student_id}>
                  <td className="tabular-nums text-muted-foreground">{i + 1}</td>
                  <td>
                    <a
                      href={`/hoc-sinh/${hs.student_id}`}
                      className="flex items-center gap-3 hover:text-primary"
                    >
                      <Avatar name={hs.full_name} size="sm" />
                      <span className="font-semibold">{hs.full_name}</span>
                    </a>
                  </td>
                  <td className="tabular-nums text-muted-foreground">{formatDate(hs.dob)}</td>
                  <td className="text-muted-foreground">{genderLabel(hs.gender)}</td>
                  <td className="text-muted-foreground">{hs.ethnicity ?? "—"}</td>
                  <td className="text-[13px] tabular-nums text-muted-foreground">
                    {hs.national_id ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
