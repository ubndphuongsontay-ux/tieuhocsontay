import type { Access } from "./access";
import { sql } from "./db";
import { getCampusOverview, getTotals, type CampusOverview } from "./queries";

export type DashboardKpi = {
  students: number;
  staff: number;
  classes: number;
  avgClassSize: number | null;
  completenessPct: number | null;
  missingCccd: number;
  presentToday: number | null;
  excusedToday: number | null;
  unexcusedToday: number | null;
  staffLeaveToday: number | null;
  tasksOpen: number;
  tasksOverdue: number;
  tasksPendingApproval: number;
};

export type DashboardAlert = {
  id: string;
  tone: "warning" | "danger" | "info";
  title: string;
  detail: string;
  href?: string;
  owner?: string;
};

export type GradePoint = { grade: number; students: number };

export type CrowdedClass = {
  class_id: string;
  class_name: string;
  campus_code: string;
  campus_name: string;
  enrollment_count: number;
};

export type RecentEvent = {
  id: string;
  title: string;
  meta: string;
  href: string;
};

export type CampusBoardRow = CampusOverview & {
  synced: boolean;
  presentToday: number | null;
  excusedToday: number | null;
  unexcusedToday: number | null;
  staffLeaveToday: number | null;
  tasksOpen: number;
  tasksOverdue: number;
  health: "green" | "yellow" | "red" | "gray";
  updatedAt: string | null;
};

export type DashboardData = {
  kpi: DashboardKpi;
  alerts: DashboardAlert[];
  byGrade: GradePoint[];
  campuses: CampusBoardRow[];
  crowded: CrowdedClass[];
  recent: RecentEvent[];
  missingCccd: number;
  missingGender: number;
  generatedAt: string;
};

export async function getDashboardData(access?: Access | null): Promise<DashboardData> {
  const [totals, campuses, avgRow, gradeRows, missing, crowded, recent, todayAtt, leaves, taskStats, pending, overdueTasks, missingAtt] =
    await Promise.all([
      getTotals(),
      getCampusOverview(),
      sql<{ avg: string | null }[]>`
        select round(avg(enrollment_count)::numeric, 1)::text as avg
        from v_class_sizes where enrollment_count > 0
      `,
      sql<GradePoint[]>`
        select grade, count(*)::int as students
        from v_enrollments_current group by grade order by grade
      `,
      sql<{ missing_cccd: number; missing_gender: number }[]>`
        select
          count(*) filter (where national_id is null)::int as missing_cccd,
          count(*) filter (where gender is null)::int as missing_gender
        from v_enrollments_current
      `,
      sql<CrowdedClass[]>`
        select class_id::text, class_name, campus_code, campus_name, enrollment_count
        from v_class_sizes where enrollment_count >= 40
        order by enrollment_count desc limit 8
      `,
      sql<{ student_id: string; full_name: string; status: string; class_name: string; campus_name: string }[]>`
        select s.id::text as student_id, s.full_name, e.status, cl.name as class_name, camp.name as campus_name
        from enrollments e
        join students s on s.id = e.student_id
        join classes cl on cl.id = e.class_id
        join campuses camp on camp.id = cl.campus_id
        where e.status in ('chuyen_lop','chuyen_phan_hieu','chuyen_truong')
        order by e.updated_at desc limit 6
      `,
      sql<{ campus_id: string; submitted: number; present: number; excused: number; unexcused: number; last_at: string | null }[]>`
        select
          d.campus_id::text,
          count(*) filter (where d.status = 'submitted')::int as submitted,
          count(r.id) filter (where r.status = 'present')::int as present,
          count(r.id) filter (where r.status = 'excused')::int as excused,
          count(r.id) filter (where r.status = 'unexcused')::int as unexcused,
          max(d.updated_at)::text as last_at
        from attendance_days d
        left join student_attendance_records r on r.attendance_day_id = d.id
        where d.attended_on = current_date
        group by d.campus_id
      `,
      sql<{ campus_id: string; n: number }[]>`
        select coalesce(s.campus_id, l.campus_id)::text as campus_id, count(*)::int as n
        from staff_leave_requests l
        join staff s on s.id = l.staff_id
        where l.status = 'approved'
          and current_date between l.starts_on and l.ends_on
        group by coalesce(s.campus_id, l.campus_id)
      `,
      sql<{ campus_id: string | null; open: number; overdue: number }[]>`
        select campus_id::text, count(*) filter (where not is_overdue)::int as open,
          count(*) filter (where is_overdue)::int as overdue
        from v_tasks
        where status not in ('completed','cancelled')
        group by campus_id
      `,
      sql<{ n: number }[]>`
        select count(*)::int as n from v_tasks where status = 'submitted'
      `,
      sql<{ id: string; title: string; due_on: string; owner_name: string }[]>`
        select t.id::text, t.title, t.due_on::text, p.full_name as owner_name
        from v_tasks t
        join profiles p on p.id = t.owner_id
        where t.is_overdue
        order by t.due_on
        limit 8
      `,
      sql<{ class_id: string; class_name: string; campus_name: string }[]>`
        select c.id::text as class_id, c.name as class_name, camp.name as campus_name
        from classes c
        join school_years y on y.id = c.school_year_id
        join campuses camp on camp.id = c.campus_id
        where y.is_current and c.is_active
          and not exists (
            select 1 from attendance_days d
            where d.class_id = c.id and d.attended_on = current_date and d.status = 'submitted'
          )
        order by camp.sort_order, c.grade, c.name
        limit 12
      `,
    ]);

  const attMap = new Map(todayAtt.map((r) => [r.campus_id, r]));
  const leaveMap = new Map(leaves.map((r) => [r.campus_id, r.n]));
  const taskMap = new Map(taskStats.map((r) => [r.campus_id, r]));
  const submittedAny = todayAtt.some((r) => r.submitted > 0);

  let rows: CampusBoardRow[] = campuses.map((c) => {
    const synced = c.student_count > 0 || c.staff_count > 0;
    const att = attMap.get(c.id);
    const presentToday = att && att.submitted > 0 ? att.present : null;
    const excusedToday = att && att.submitted > 0 ? att.excused : null;
    const unexcusedToday = att && att.submitted > 0 ? att.unexcused : null;
    const staffLeaveToday = leaveMap.get(c.id) ?? (synced ? 0 : null);
    const t = taskMap.get(c.id);
    const tasksOpen = t ? t.open + t.overdue : 0;
    const tasksOverdue = t?.overdue ?? 0;
    let health: CampusBoardRow["health"] = "green";
    if (!synced) health = "gray";
    else if (tasksOverdue > 0 || (unexcusedToday ?? 0) > 0) health = "red";
    else if ((excusedToday ?? 0) > 0 || !att) health = "yellow";
    return {
      ...c,
      synced,
      presentToday,
      excusedToday,
      unexcusedToday,
      staffLeaveToday,
      tasksOpen,
      tasksOverdue,
      health,
      updatedAt: att?.last_at ?? null,
    };
  });

  if (access && !access.schoolWide) {
    rows = rows.filter((c) => access.campusIds.includes(c.id));
  }

  const missingCccd = missing[0]?.missing_cccd ?? 0;
  const missingGender = missing[0]?.missing_gender ?? 0;
  const vs = rows.find((c) => c.code === "VS");

  const alerts: DashboardAlert[] = [];
  if (vs && !vs.synced) {
    alerts.push({
      id: "vs",
      tone: "warning",
      title: "Viên Sơn chưa đồng bộ dữ liệu",
      detail: "Phân hiệu đã mở, chưa có học sinh và giáo viên.",
      href: "/phan-hieu/VS",
    });
  }
  if (missingCccd > 0) {
    alerts.push({
      id: "cccd",
      tone: "warning",
      title: `${missingCccd.toLocaleString("vi-VN")} học sinh thiếu CCCD`,
      detail: "Định danh chưa đủ — cần rà trước khi lên lớp.",
      href: "/hoc-sinh",
    });
  }
  if (crowded.length > 0) {
    alerts.push({
      id: "crowded",
      tone: "danger",
      title: `${crowded.length} lớp sĩ số ≥ 40`,
      detail: crowded.slice(0, 3).map((c) => `${c.campus_name} ${c.class_name}`).join(" · "),
      href: crowded[0] ? `/lop/${crowded[0].class_id}` : undefined,
    });
  }
  for (const t of overdueTasks) {
    alerts.push({
      id: `ov-${t.id}`,
      tone: "danger",
      title: `Công việc quá hạn: ${t.title}`,
      detail: `Hạn ${t.due_on} · chủ trì ${t.owner_name}`,
      href: `/tasks/${t.id}`,
      owner: t.owner_name,
    });
  }
  if (pending[0]?.n) {
    alerts.push({
      id: "pending",
      tone: "warning",
      title: `${pending[0].n} nhiệm vụ chờ phê duyệt`,
      detail: "Hiệu trưởng / PHT cần xem xét.",
      href: "/approvals",
    });
  }
  if (submittedAny && missingAtt.length > 0) {
    alerts.push({
      id: "att",
      tone: "warning",
      title: `${missingAtt.length} lớp chưa nhập chuyên cần hôm nay`,
      detail: missingAtt.slice(0, 3).map((c) => `${c.campus_name} ${c.class_name}`).join(" · "),
      href: "/diem-danh",
    });
  }

  const presentSum = rows.reduce((n, c) => n + (c.presentToday ?? 0), 0);
  const excusedSum = rows.reduce((n, c) => n + (c.excusedToday ?? 0), 0);
  const unexcusedSum = rows.reduce((n, c) => n + (c.unexcusedToday ?? 0), 0);
  const leaveSum = rows.reduce((n, c) => n + (c.staffLeaveToday ?? 0), 0);

  return {
    kpi: {
      students: totals.students,
      staff: totals.staff,
      classes: totals.classes,
      avgClassSize: avgRow[0]?.avg ? Number(avgRow[0].avg) : null,
      completenessPct:
        totals.students > 0
          ? Math.round(((totals.students - missingCccd) / totals.students) * 1000) / 10
          : null,
      missingCccd,
      presentToday: submittedAny ? presentSum : null,
      excusedToday: submittedAny ? excusedSum : null,
      unexcusedToday: submittedAny ? unexcusedSum : null,
      staffLeaveToday: leaveSum,
      tasksOpen: rows.reduce((n, c) => n + c.tasksOpen, 0) + (taskStats.find((t) => t.campus_id == null)?.open ?? 0),
      tasksOverdue: overdueTasks.length,
      tasksPendingApproval: pending[0]?.n ?? 0,
    },
    alerts,
    byGrade: gradeRows,
    campuses: rows,
    crowded,
    recent: recent.map((r) => ({
      id: r.student_id + r.status,
      title: r.full_name,
      meta: `${r.campus_name} · ${r.class_name}`,
      href: `/hoc-sinh/${r.student_id}`,
    })),
    missingCccd,
    missingGender,
    generatedAt: new Date().toISOString(),
  };
}
