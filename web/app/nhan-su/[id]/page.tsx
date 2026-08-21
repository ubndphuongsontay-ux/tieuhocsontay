import Link from "@/components/AppLink";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { PageHeader, Panel } from "@/components/PageHeader";
import { StaffEditForm } from "@/components/records/StaffEditForm";
import { Badge } from "@/components/ui/badge";
import { canEditStaff, canSeeStaff, requireAccess } from "@/lib/access";
import { ageYears, employmentLabel, formatDate, genderLabel, partyLabel } from "@/lib/format";
import { staffIssues } from "@/lib/quality";
import { getStaffProfile } from "@/lib/queries";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireAccess();
  if (!canSeeStaff(access)) notFound();
  const staff = await getStaffProfile(id);
  if (!staff) notFound();
  if (!access.schoolWide && !access.campusIds.includes(staff.campus_id)) notFound();
  const canEdit = canEditStaff(access, staff.campus_id);
  const issues = staffIssues(staff);

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/nhan-su" className="hover:text-blue-800">
            Giáo viên – nhân sự
          </Link>
        }
        title={staff.full_name}
        description={`${staff.campus_name} · ${genderLabel(staff.gender)} · ${ageYears(staff.dob)} tuổi`}
        actions={
          <Link
            href={`/phan-cong?campus=${staff.campus_code}`}
            className="inline-flex h-9 items-center rounded-[12px] border border-border px-3 text-sm font-semibold hover:bg-muted"
          >
            Phân công lớp
          </Link>
        }
      />

      {issues.length > 0 ? (
        <div className="mb-4 rounded-[12px] border border-amber-300 bg-amber-50 px-4 py-3 text-[14px]">
          <p className="font-bold text-amber-950">Hồ sơ chưa chuẩn xác</p>
          <ul className="mt-1 list-disc pl-5 text-amber-900">
            {issues.map((i) => (
              <li key={i.code}>{i.label}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-5 flex items-center gap-4 rounded-[12px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <Avatar name={staff.full_name} size="lg" />
        <div>
          <p className="text-[18px] font-bold">{staff.full_name}</p>
          <p className="text-[13px] text-muted-foreground">
            {staff.username ? (
              <>
                Tài khoản <code className="font-semibold text-foreground">{staff.username}</code>
              </>
            ) : (
              "Chưa gắn tài khoản đăng nhập"
            )}
          </p>
          {staff.homeroom_classes ? (
            <Badge className="mt-2 bg-teal text-white">Chủ nhiệm {staff.homeroom_classes}</Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="p-6 lg:col-span-3">
          <h2 className="mb-4 text-[16px] font-bold">Hồ sơ</h2>
          {canEdit ? (
            <StaffEditForm staff={staff} />
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[14.5px]">
              <Item label="Ngày sinh" value={`${formatDate(staff.dob)} (${ageYears(staff.dob)} tuổi)`} />
              <Item label="Giới tính" value={genderLabel(staff.gender)} />
              <Item label="Dân tộc" value={staff.ethnicity ?? "—"} />
              <Item label="CCCD" value={staff.national_id ?? "—"} />
              <Item label="Điện thoại" value={staff.phone ?? "—"} />
              <Item label="Phân hiệu" value={staff.campus_name} />
              <Item label="Trình độ" value={staff.education_level ?? "—"} />
              <Item label="Chuyên môn" value={staff.professional_qualification ?? "—"} />
              <Item label="Tin học" value={staff.it_level ?? "—"} />
              <Item label="Ngoại ngữ" value={staff.foreign_language_level ?? "—"} />
              <Item label="Lý luận chính trị" value={staff.political_theory_level ?? "—"} />
              <Item label="Hợp đồng" value={employmentLabel(staff.employment_kind)} />
              <Item label="Đảng viên" value={partyLabel(staff.is_party_member)} />
            </dl>
          )}
        </Panel>

        <aside className="lg:col-span-2">
          <Panel className="p-6">
            <h2 className="mb-4 text-[16px] font-bold">Phân công năm học hiện hành</h2>
            {staff.assignments.length === 0 && !staff.homeroom_classes ? (
              <p className="text-sm text-muted-foreground">Chưa gán lớp hoặc môn.</p>
            ) : (
              <ul className="space-y-3 text-[14px]">
                {staff.homeroom_classes && staff.assignments.every((a) => !a.is_homeroom) ? (
                  <li>
                    <p className="font-semibold">GVCN {staff.homeroom_classes}</p>
                    <p className="text-[13px] text-muted-foreground">{staff.campus_name}</p>
                  </li>
                ) : null}
                {staff.assignments.map((a) => (
                  <li key={a.id}>
                    <Link href={`/lop/${a.class_id}`} className="font-semibold hover:text-primary">
                      {a.is_homeroom ? "GVCN" : a.subject ?? "Bộ môn"} · {a.class_name}
                    </Link>
                    <p className="text-[13px] text-muted-foreground">{a.campus_code}</p>
                  </li>
                ))}
              </ul>
            )}
            {staff.phone ? (
              <a href={`tel:${staff.phone}`} className="mt-4 inline-block text-sm font-semibold text-primary">
                Gọi {staff.phone}
              </a>
            ) : null}
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12.5px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
