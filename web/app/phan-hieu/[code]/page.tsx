import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/ds/EmptyState";
import { PageHeader, Panel, SectionTitle } from "@/components/PageHeader";
import { genderLabel } from "@/lib/format";
import { canSeeCampus, canSeeStaff, classListMode, requireAccess } from "@/lib/access";
import { getCampus, getCampusClasses, getCampusStaff } from "@/lib/queries";
import { notFound } from "next/navigation";

export default async function CampusPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const access = await requireAccess();
  const campus = await getCampus(code);
  if (!campus) notFound();
  if (!canSeeCampus(access, campus.id) && !access.schoolWide && !access.campusIds.includes(campus.id)) {
    notFound();
  }

  const [classesRaw, staff] = await Promise.all([
    getCampusClasses(code),
    getCampusStaff(code),
  ]);
  const mode = classListMode(access);
  const classes =
    mode === "class"
      ? classesRaw.filter((c) => access.classIds.includes(c.id))
      : mode === "none"
        ? []
        : classesRaw;

  const byGrade = new Map<number, typeof classes>();
  for (const cl of classes) {
    const list = byGrade.get(cl.grade) ?? [];
    list.push(cl);
    byGrade.set(cl.grade, list);
  }

  const hs = classes.reduce((n, c) => n + c.enrollment_count, 0);
  const empty = classes.length === 0 && staff.length === 0;

  return (
    <>
      <PageHeader
        eyebrow={`Phân hiệu ${campus.code}`}
        title={campus.name}
        description={
          empty ? (
            "Dữ liệu phân hiệu chưa được đồng bộ"
          ) : (
            <>
              {campus.former_name}
              {campus.class_letter ? ` · chữ lớp ${campus.class_letter}` : ""}
              {" · "}
              {hs.toLocaleString("vi-VN")} học sinh · {classes.length} lớp · {staff.length} giáo viên
            </>
          )
        }
      />

      {empty ? (
        <EmptyState
          title="Chưa có dữ liệu"
          description={`Dữ liệu phân hiệu chưa được đồng bộ. Khi có danh sách lớp hoặc giáo viên, nhập vào mã ${campus.code}.`}
        />
      ) : (
        <>
      {classes.length === 0 ? (
        <EmptyState
          title="Chưa có danh sách lớp"
          description={`Khi có file lớp, nhập vào mã ${campus.code}.`}
        />
      ) : (
        <section className="mb-8">
          <SectionTitle>Lớp theo khối</SectionTitle>
          <div className="space-y-5">
            {[...byGrade.entries()].map(([grade, list]) => (
              <div key={grade}>
                <p className="mb-2 text-[13px] font-semibold text-muted-foreground">Khối {grade}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {list.map((cl) => (
                    <a
                      key={cl.id}
                      href={`/lop/${cl.id}`}
                      className="flex items-baseline justify-between rounded-[12px] border border-border bg-card px-4 py-3 shadow-[var(--shadow-card)] transition duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                    >
                      <span className="font-semibold">{cl.name}</span>
                      <span className="text-[13px] font-medium tabular-nums text-muted-foreground">
                        {cl.enrollment_count}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="nhan-su" className="mt-8">
        <SectionTitle>Nhân sự · {canSeeStaff(access) ? staff.length : "—"}</SectionTitle>
        {!canSeeStaff(access) ? (
          <EmptyState title="Không có quyền xem nhân sự" description="Phạm vi của bạn không gồm dữ liệu cán bộ – giáo viên." />
        ) : staff.length === 0 ? (
          <EmptyState title="Chưa có hồ sơ giáo viên" description="Dữ liệu nhân sự phân hiệu này chưa được đồng bộ." />
        ) : (
          <Panel>
            <div className="overflow-x-auto">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Họ tên</th>
                    <th>Giới tính</th>
                    <th>Điện thoại</th>
                    <th>Trình độ</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={s.full_name} size="sm" />
                          <a href={`/nhan-su/${s.id}`} className="font-semibold hover:text-primary">
                            {s.full_name}
                          </a>
                        </div>
                      </td>
                      <td className="text-muted-foreground">{genderLabel(s.gender)}</td>
                      <td className="tabular-nums text-muted-foreground">{s.phone ?? "—"}</td>
                      <td className="text-muted-foreground">{s.education_level ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </section>
        </>
      )}
    </>
  );
}
