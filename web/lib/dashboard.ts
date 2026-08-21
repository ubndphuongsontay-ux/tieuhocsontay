import type { Access } from "./access";
import { sql } from "./db";
import type { CampusOverview, SchoolYear } from "./queries";

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
  year: SchoolYear | null;
};

type DashboardRow = {
  students: number;
  staff: number;
  classes: number;
  avg_class_size: string | null;
  missing_cccd: number;
  missing_gender: number;
  by_grade: GradePoint[];
  campuses: CampusOverview[];
  crowded: CrowdedClass[];
  recent: { student_id: string; full_name: string; status: string; class_name: string; campus_name: string }[];
  today_att: { campus_id: string; submitted: number; present: number; excused: number; unexcused: number; last_at: string | null }[];
  leaves: { campus_id: string; n: number }[];
  task_stats: { campus_id: string | null; open: number; overdue: number }[];
  pending: number;
  overdue_tasks: { id: string; title: string; due_on: string; owner_name: string }[];
  missing_att: { class_id: string; class_name: string; campus_name: string }[];
  year: SchoolYear | null;
};

export async function getDashboardData(access?: Access | null): Promise<DashboardData> {
  const [row] = await sql<DashboardRow[]>`
    select
      (select count(*)::int from v_enrollments_current) as students,
      (select count(*)::int from staff where is_active) as staff,
      (
        select count(*)::int
        from classes cl
        join school_years y on y.id = cl.school_year_id
        where y.is_current
      ) as classes,
      (
        select round(avg(enrollment_count)::numeric, 1)::text
        from v_class_sizes
        where enrollment_count > 0
      ) as avg_class_size,
      (select count(*) filter (where national_id is null)::int from v_enrollments_current) as missing_cccd,
      (select count(*) filter (where gender is null)::int from v_enrollments_current) as missing_gender,
      coalesce((
        select jsonb_agg(jsonb_build_object('grade', g.grade, 'students', g.students) order by g.grade)
        from (
          select grade, count(*)::int as students
          from v_enrollments_current
          group by grade
        ) g
      ), '[]'::jsonb) as by_grade,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', c.id::text,
          'code', c.code,
          'name', c.name,
          'former_name', c.former_name,
          'class_letter', c.class_letter,
          'sort_order', c.sort_order,
          'staff_count', coalesce(st.n, 0),
          'class_count', coalesce(cl.n, 0),
          'student_count', coalesce(en.n, 0)
        ) order by c.sort_order)
        from campuses c
        left join (select campus_id, count(*)::int as n from staff group by campus_id) st
          on st.campus_id = c.id
        left join (
          select cl.campus_id, count(*)::int as n
          from classes cl
          join school_years y on y.id = cl.school_year_id
          where y.is_current
          group by cl.campus_id
        ) cl on cl.campus_id = c.id
        left join (
          select campus_code, count(*)::int as n
          from v_enrollments_current
          group by campus_code
        ) en on en.campus_code = c.code
      ), '[]'::jsonb) as campuses,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'class_id', class_id::text,
          'class_name', class_name,
          'campus_code', campus_code,
          'campus_name', campus_name,
          'enrollment_count', enrollment_count
        ) order by enrollment_count desc)
        from (
          select class_id, class_name, campus_code, campus_name, enrollment_count
          from v_class_sizes
          where enrollment_count >= 40
          order by enrollment_count desc
          limit 8
        ) crowded
      ), '[]'::jsonb) as crowded,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'student_id', student_id,
          'full_name', full_name,
          'status', status,
          'class_name', class_name,
          'campus_name', campus_name
        ))
        from (
          select s.id::text as student_id, s.full_name, e.status, cl.name as class_name, camp.name as campus_name
          from enrollments e
          join students s on s.id = e.student_id
          join classes cl on cl.id = e.class_id
          join campuses camp on camp.id = cl.campus_id
          where e.status in ('chuyen_lop','chuyen_phan_hieu','chuyen_truong')
          order by e.updated_at desc
          limit 6
        ) recent
      ), '[]'::jsonb) as recent,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'campus_id', campus_id,
          'submitted', submitted,
          'present', present,
          'excused', excused,
          'unexcused', unexcused,
          'last_at', last_at
        ))
        from (
          select
            d.campus_id::text as campus_id,
            count(*) filter (where d.status = 'submitted')::int as submitted,
            count(r.id) filter (where r.status = 'present')::int as present,
            count(r.id) filter (where r.status = 'excused')::int as excused,
            count(r.id) filter (where r.status = 'unexcused')::int as unexcused,
            max(d.updated_at)::text as last_at
          from attendance_days d
          left join student_attendance_records r on r.attendance_day_id = d.id
          where d.attended_on = current_date
          group by d.campus_id
        ) att
      ), '[]'::jsonb) as today_att,
      coalesce((
        select jsonb_agg(jsonb_build_object('campus_id', campus_id, 'n', n))
        from (
          select coalesce(s.campus_id, l.campus_id)::text as campus_id, count(*)::int as n
          from staff_leave_requests l
          join staff s on s.id = l.staff_id
          where l.status = 'approved'
            and current_date between l.starts_on and l.ends_on
          group by coalesce(s.campus_id, l.campus_id)
        ) lv
      ), '[]'::jsonb) as leaves,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'campus_id', campus_id,
          'open', open,
          'overdue', overdue
        ))
        from (
          select campus_id::text as campus_id,
            count(*) filter (where not is_overdue)::int as open,
            count(*) filter (where is_overdue)::int as overdue
          from v_tasks
          where status not in ('completed','cancelled')
          group by campus_id
        ) ts
      ), '[]'::jsonb) as task_stats,
      (select count(*)::int from v_tasks where status = 'submitted') as pending,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', id,
          'title', title,
          'due_on', due_on,
          'owner_name', owner_name
        ))
        from (
          select t.id::text as id, t.title, t.due_on::text as due_on, p.full_name as owner_name
          from v_tasks t
          join profiles p on p.id = t.owner_id
          where t.is_overdue
          order by t.due_on
          limit 8
        ) ov
      ), '[]'::jsonb) as overdue_tasks,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'class_id', class_id,
          'class_name', class_name,
          'campus_name', campus_name
        ))
        from (
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
        ) miss
      ), '[]'::jsonb) as missing_att,
      (
        select jsonb_build_object(
          'id', id::text,
          'code', code,
          'starts_on', starts_on::text,
          'ends_on', ends_on::text
        )
        from school_years
        where is_current
        limit 1
      ) as year
  `;

  const totals = row ?? {
    students: 0,
    staff: 0,
    classes: 0,
    avg_class_size: null,
    missing_cccd: 0,
    missing_gender: 0,
    by_grade: [],
    campuses: [],
    crowded: [],
    recent: [],
    today_att: [],
    leaves: [],
    task_stats: [],
    pending: 0,
    overdue_tasks: [],
    missing_att: [],
    year: null,
  };

  const attMap = new Map((totals.today_att ?? []).map((r) => [r.campus_id, r]));
  const leaveMap = new Map((totals.leaves ?? []).map((r) => [r.campus_id, r.n]));
  const taskMap = new Map((totals.task_stats ?? []).map((r) => [r.campus_id, r]));
  const submittedAny = (totals.today_att ?? []).some((r) => r.submitted > 0);
  const crowded = totals.crowded ?? [];
  const overdueTasks = totals.overdue_tasks ?? [];
  const missingAtt = totals.missing_att ?? [];
  const missingCccd = totals.missing_cccd ?? 0;
  const missingGender = totals.missing_gender ?? 0;

  let rows: CampusBoardRow[] = (totals.campuses ?? []).map((c) => {
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
  if (totals.pending) {
    alerts.push({
      id: "pending",
      tone: "warning",
      title: `${totals.pending} nhiệm vụ chờ phê duyệt`,
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
      avgClassSize: totals.avg_class_size ? Number(totals.avg_class_size) : null,
      completenessPct:
        totals.students > 0 ? Math.round(((totals.students - missingCccd) / totals.students) * 1000) / 10 : null,
      missingCccd,
      presentToday: submittedAny ? presentSum : null,
      excusedToday: submittedAny ? excusedSum : null,
      unexcusedToday: submittedAny ? unexcusedSum : null,
      staffLeaveToday: leaveSum,
      tasksOpen: rows.reduce((n, c) => n + c.tasksOpen, 0) + (taskMap.get(null)?.open ?? 0),
      tasksOverdue: overdueTasks.length,
      tasksPendingApproval: totals.pending ?? 0,
    },
    alerts,
    byGrade: totals.by_grade ?? [],
    campuses: rows,
    crowded,
    recent: (totals.recent ?? []).map((r) => ({
      id: r.student_id + r.status,
      title: r.full_name,
      meta: `${r.campus_name} · ${r.class_name}`,
      href: `/hoc-sinh/${r.student_id}`,
    })),
    missingCccd,
    missingGender,
    generatedAt: new Date().toISOString(),
    year: totals.year,
  };
}
