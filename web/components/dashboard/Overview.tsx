import {
  ArrowRight,
  BadgeCheck,
  GraduationCap,
  Layers3,
  School,
  Users,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/ds/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CampusBoardRow,
  CrowdedClass,
  DashboardAlert,
  DashboardData,
  GradePoint,
} from "@/lib/dashboard";
import { cn } from "@/lib/utils";

const KPI_TONES = {
  blue: "bg-blue-50 text-blue-700",
  teal: "bg-teal-50 text-teal-800",
  navy: "bg-slate-100 text-navy",
  amber: "bg-amber-50 text-amber-800",
  green: "bg-emerald-50 text-emerald-800",
} as const;

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: keyof typeof KPI_TONES;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-[10px]",
            KPI_TONES[tone]
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-[12.5px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-[30px] leading-none font-extrabold tracking-tight tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{hint}</p>
    </>
  );

  const className =
    "block rounded-[12px] border border-border bg-card p-4 shadow-[var(--shadow-card)] transition duration-150 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md";

  if (href) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }
  return <article className={className}>{inner}</article>;
}

export function KpiStrip({ data }: { data: DashboardData["kpi"] }) {
  const dash = (n: number | null, suffix = "") =>
    n == null ? "—" : `${n.toLocaleString("vi-VN")}${suffix}`;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard label="Tổng số học sinh" value={data.students.toLocaleString("vi-VN")} hint="Đang học năm hiện hành" icon={GraduationCap} tone="blue" href="/hoc-sinh" />
      <KpiCard label="Cán bộ – giáo viên" value={data.staff.toLocaleString("vi-VN")} hint="Đang làm việc tại trường" icon={Users} tone="teal" href="/nhan-su" />
      <KpiCard label="Tổng số lớp" value={data.classes.toLocaleString("vi-VN")} hint="Lớp thuộc năm học hiện hành" icon={School} tone="navy" href="/lop" />
      <KpiCard label="Sĩ số trung bình" value={data.avgClassSize != null ? data.avgClassSize.toLocaleString("vi-VN") : "—"} hint="Học sinh / lớp đang có sĩ số" icon={Layers3} tone="amber" />
      <KpiCard label="Hồ sơ có CCCD" value={data.completenessPct != null ? `${data.completenessPct}%` : "—"} hint={data.missingCccd > 0 ? `${data.missingCccd.toLocaleString("vi-VN")} hồ sơ còn thiếu` : "Định danh đã đủ"} icon={BadgeCheck} tone="green" />
      <KpiCard label="Có mặt hôm nay" value={dash(data.presentToday)} hint={data.presentToday == null ? "Chưa có dữ liệu chuyên cần" : "Từ phiếu đã xác nhận"} icon={GraduationCap} tone="green" href="/diem-danh" />
      <KpiCard label="Nghỉ có phép" value={dash(data.excusedToday)} hint={data.excusedToday == null ? "Chưa có dữ liệu" : "Học sinh"} icon={GraduationCap} tone="amber" />
      <KpiCard label="Nghỉ không phép" value={dash(data.unexcusedToday)} hint={data.unexcusedToday == null ? "Chưa có dữ liệu" : "Cần theo dõi"} icon={GraduationCap} tone="amber" />
      <KpiCard label="Công việc đang làm" value={data.tasksOpen.toLocaleString("vi-VN")} hint={`${data.tasksOverdue} quá hạn · ${data.tasksPendingApproval} chờ duyệt`} icon={Layers3} tone="navy" href="/tasks" />
      <KpiCard label="CB-GV nghỉ hôm nay" value={dash(data.staffLeaveToday)} hint="Đơn nghỉ đã duyệt" icon={Users} tone="teal" href="/nhan-su" />
    </div>
  );
}

export function AlertBoard({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-[16px] font-bold">Cần xử lý</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {alerts.map((a) => {
          const body = (
            <div
              className={cn(
                "rounded-[12px] border px-3 py-3 transition duration-150",
                a.tone === "danger" && "border-red-200 bg-red-50/70",
                a.tone === "warning" && "border-amber-200 bg-amber-50/70",
                a.tone === "info" && "border-blue-200 bg-blue-50/70"
              )}
            >
              <div className="flex items-center gap-2">
                <Badge
                  variant={a.tone === "danger" ? "destructive" : "secondary"}
                  className="font-semibold"
                >
                  {a.tone === "danger" ? "Ưu tiên" : a.tone === "warning" ? "Cảnh báo" : "Thông tin"}
                </Badge>
              </div>
              <p className="mt-2 text-[14px] font-semibold">{a.title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{a.detail}</p>
            </div>
          );
          return a.href ? (
            <a key={a.id} href={a.href} className="block hover:opacity-90">
              {body}
            </a>
          ) : (
            <div key={a.id}>{body}</div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function GradeChart({ data }: { data: GradePoint[] }) {
  const max = Math.max(...data.map((d) => d.students), 1);
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-[16px] font-bold">Học sinh theo khối</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState title="Chưa có sĩ số theo khối" />
        ) : (
          <div className="flex h-48 items-end gap-3">
            {data.map((d) => (
              <div key={d.grade} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[12px] font-semibold tabular-nums text-muted-foreground">
                  {d.students.toLocaleString("vi-VN")}
                </span>
                <div
                  className="w-full rounded-t-md bg-primary/85"
                  style={{ height: `${Math.max((d.students / max) * 100, 6)}%` }}
                />
                <span className="text-[12.5px] font-medium text-muted-foreground">Khối {d.grade}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CampusScaleChart({ campuses }: { campuses: CampusBoardRow[] }) {
  const filled = campuses.filter((c) => c.student_count > 0);
  const max = Math.max(...filled.map((c) => c.student_count), 1);
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-[16px] font-bold">Quy mô từng phân hiệu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {filled.map((c) => (
          <div key={c.code} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-2">
            <span className="truncate text-[13px] font-medium">{c.name}</span>
            <div className="h-2.5 rounded-full bg-muted">
              <div
                className="h-2.5 rounded-full bg-teal"
                style={{ width: `${(c.student_count / max) * 100}%` }}
              />
            </div>
            <span className="text-right text-[12.5px] font-semibold tabular-nums text-muted-foreground">
              {c.student_count.toLocaleString("vi-VN")}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function campusAvg(c: CampusBoardRow) {
  if (c.class_count <= 0 || c.student_count <= 0) return null;
  return Math.round((c.student_count / c.class_count) * 10) / 10;
}

export function CampusBoard({
  campuses,
  crowded = [],
}: {
  campuses: CampusBoardRow[];
  crowded?: CrowdedClass[];
}) {
  const crowdedCodes = new Set(crowded.map((c) => c.campus_code));

  return (
    <section id="phan-hieu">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-[20px] font-bold">Phân hiệu</h2>
        <p className="text-[13px] text-muted-foreground">{campuses.length} điểm trường</p>
      </div>

      <div className="grid gap-3 md:hidden">
        {campuses.map((c) => (
          <CampusMobileCard key={c.code} campus={c} crowded={crowdedCodes.has(c.code)} />
        ))}
      </div>

      <Card className="hidden shadow-none md:block">
        <CardContent className="px-0 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Phân hiệu</TableHead>
                <TableHead className="text-right">Học sinh</TableHead>
                <TableHead className="text-right">Lớp</TableHead>
                <TableHead className="text-right">Giáo viên</TableHead>
                <TableHead className="text-right">Sĩ số TB</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="pr-4 text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campuses.map((c, i) => {
                const empty = c.student_count === 0 && c.staff_count === 0;
                const avg = campusAvg(c);
                return (
                  <TableRow key={c.code} className={i % 2 === 1 ? "bg-muted/40" : undefined}>
                    <TableCell className="px-4">
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-[12.5px] font-medium text-muted-foreground">
                        Mã {c.code}
                        {c.class_letter ? ` · chữ ${c.class_letter}` : ""}
                      </p>
                    </TableCell>
                    {empty ? (
                      <TableCell colSpan={4} className="text-[13px] text-muted-foreground">
                        Dữ liệu phân hiệu chưa được đồng bộ
                      </TableCell>
                    ) : (
                      <>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {c.student_count.toLocaleString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{c.class_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.staff_count}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {avg != null ? avg.toLocaleString("vi-VN") : "—"}
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                    {empty ? (
                      <Badge variant="secondary">Chưa đồng bộ dữ liệu</Badge>
                    ) : c.health === "red" ? (
                      <Badge variant="destructive">Cần xử lý ngay</Badge>
                    ) : c.health === "yellow" ? (
                      <Badge variant="secondary">Cần theo dõi</Badge>
                    ) : (
                      <Badge variant="outline">Hoạt động bình thường</Badge>
                    )}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/phan-hieu/${c.code}`} className="gap-1">
                          Xem chi tiết
                          <ArrowRight className="size-3.5" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}

function CampusMobileCard({
  campus: c,
  crowded,
}: {
  campus: CampusBoardRow;
  crowded: boolean;
}) {
  const empty = c.student_count === 0 && c.staff_count === 0;
  const avg = campusAvg(c);

  return (
    <article className="rounded-[12px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{c.name}</p>
          <p className="text-[12.5px] font-medium text-muted-foreground">Mã {c.code}</p>
        </div>
        {empty ? (
          <Badge variant="secondary">Chưa có dữ liệu</Badge>
        ) : crowded ? (
          <Badge variant="destructive">Lớp đông</Badge>
        ) : (
          <Badge variant="outline">Đã đồng bộ</Badge>
        )}
      </div>
      {empty ? (
        <p className="mt-3 text-[13px] text-muted-foreground">
          Dữ liệu phân hiệu chưa được đồng bộ
        </p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
          <div>
            <dt className="font-medium text-muted-foreground">Học sinh</dt>
            <dd className="font-bold tabular-nums">{c.student_count.toLocaleString("vi-VN")}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Lớp</dt>
            <dd className="font-bold tabular-nums">{c.class_count}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Giáo viên</dt>
            <dd className="font-bold tabular-nums">{c.staff_count}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Sĩ số TB</dt>
            <dd className="font-bold tabular-nums">{avg != null ? avg.toLocaleString("vi-VN") : "—"}</dd>
          </div>
        </dl>
      )}
      <Button variant="outline" size="sm" className="mt-3" asChild>
        <a href={`/phan-hieu/${c.code}`}>Xem chi tiết</a>
      </Button>
    </article>
  );
}

export function WorkQueue({ recent }: { recent: DashboardData["recent"] }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-[16px] font-bold">Cập nhật gần đây</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <EmptyState
            title="Chưa có biến động chỗ học"
            description="Khi học sinh chuyển lớp hoặc phân hiệu, thao tác sẽ hiện tại đây."
            className="py-8"
          />
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((e) => (
              <li key={e.id}>
                <a
                  href={e.href}
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors duration-150 hover:text-primary"
                >
                  <span>
                    <span className="block text-[14px] font-semibold">{e.title}</span>
                    <span className="text-[12.5px] text-muted-foreground">{e.meta}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
