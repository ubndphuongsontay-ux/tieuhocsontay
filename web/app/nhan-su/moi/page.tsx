import Link from "@/components/AppLink";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ds/EmptyState";
import { PageHeader, Panel } from "@/components/PageHeader";
import { StaffCreateForm } from "@/components/records/StaffCreateForm";
import { campusesUserCanEditStaff, canCreateStaff, requireAccess } from "@/lib/access";
import { getCampusOverview } from "@/lib/queries";

export default async function NewStaffPage() {
  const access = await requireAccess();
  if (!canCreateStaff(access)) redirect("/nhan-su");

  const campuses = campusesUserCanEditStaff(access, await getCampusOverview()).map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/nhan-su" className="hover:text-blue-800">
            Giáo viên – nhân sự
          </Link>
        }
        title="Thêm cán bộ / giáo viên"
        description="Hồ sơ mới được ghi vào cơ sở dữ liệu nhà trường. Có thể bổ sung trình độ và phân công lớp sau."
      />
      {campuses.length === 0 ? (
        <EmptyState title="Không có phân hiệu trong phạm vi được thêm nhân sự" />
      ) : (
        <Panel className="max-w-3xl p-6">
          <StaffCreateForm campuses={campuses} defaultCampusId={campuses.length === 1 ? campuses[0].id : undefined} />
        </Panel>
      )}
    </>
  );
}
