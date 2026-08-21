import {
  AlertBoard,
  CampusBoard,
  CampusScaleChart,
  GradeChart,
  KpiStrip,
  WorkQueue,
} from "@/components/dashboard/Overview";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { requireAccess } from "@/lib/access";
import { getDashboardData } from "@/lib/dashboard";

export default async function HomePage() {
  const access = await requireAccess();
  const data = await getDashboardData(access);
  const year = data.year;

  return (
    <>
      <PageHeader
        title="Tổng quan toàn trường"
        description={
          access.schoolWide
            ? "Theo dõi quy mô, nhân sự và hoạt động tại 7 phân hiệu"
            : "Phạm vi được phân công — dữ liệu ngoài phạm vi không hiển thị"
        }
        actions={
          year ? (
            <Badge variant="secondary" className="h-8 rounded-full px-3 text-[13px] font-semibold">
              Năm học {year.code}
            </Badge>
          ) : null
        }
      />
      <p className="mb-4 text-[12.5px] text-muted-foreground">
        Dữ liệu tính lúc {new Date(data.generatedAt).toLocaleString("vi-VN")}
      </p>

      <div className="space-y-5">
        <KpiStrip data={data.kpi} />
        <AlertBoard alerts={data.alerts} />
        <section className="grid gap-3 lg:grid-cols-2">
          <GradeChart data={data.byGrade} />
          <CampusScaleChart campuses={data.campuses} />
        </section>
        <CampusBoard campuses={data.campuses} crowded={data.crowded} />
        <WorkQueue recent={data.recent} />
      </div>
    </>
  );
}
