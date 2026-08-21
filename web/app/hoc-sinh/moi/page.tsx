import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ds/EmptyState";
import { PageHeader, Panel } from "@/components/PageHeader";
import { StudentCreateForm } from "@/components/records/StudentCreateForm";
import { canCreateStudent, classesUserCanEnroll, requireAccess } from "@/lib/access";
import { getCurrentClasses } from "@/lib/queries";

export default async function NewStudentPage() {
  const access = await requireAccess();
  if (!canCreateStudent(access)) redirect("/hoc-sinh");

  const classes = classesUserCanEnroll(access, await getCurrentClasses());

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/hoc-sinh" className="hover:text-blue-800">
            Học sinh
          </Link>
        }
        title="Thêm học sinh"
        description="Hồ sơ và chỗ học năm nay được ghi vào cơ sở dữ liệu nhà trường. Có thể bổ sung phụ huynh ngay trên form."
      />
      {classes.length === 0 ? (
        <EmptyState
          title="Chưa có lớp để ghi danh"
          description="Cần được phân công lớp hoặc phân hiệu trước khi thêm học sinh."
        />
      ) : (
        <Panel className="max-w-3xl p-6">
          <StudentCreateForm classes={classes} defaultClassId={classes.length === 1 ? classes[0].id : undefined} />
        </Panel>
      )}
    </>
  );
}
