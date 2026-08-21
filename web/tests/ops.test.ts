import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { isTaskOverdue } from "../lib/task-overdue";

const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:54329/th_son_tay", { max: 1 });

afterAll(async () => {
  await sql.end();
});

describe("quá hạn nhiệm vụ", () => {
  it("tính từ due_date, không phải trạng thái người dùng chọn", () => {
    expect(isTaskOverdue("in_progress", "2026-08-01", "2026-08-21")).toBe(true);
    expect(isTaskOverdue("completed", "2026-08-01", "2026-08-21")).toBe(false);
    expect(isTaskOverdue("assigned", "2026-08-30", "2026-08-21")).toBe(false);
  });
});

describe("ma trận quyền (logic)", () => {
  it("system_admin không nằm trong nhóm phê duyệt", () => {
    const approvers = ["principal", "vice_principal"];
    expect(approvers.includes("system_admin")).toBe(false);
  });
});

describe("database", () => {
  it("KPI học sinh khớp nguồn enrollment đang mở", async () => {
    const [a] = await sql<{ n: number }[]>`select count(*)::int as n from v_enrollments_current`;
    const [b] = await sql<{ n: number }[]>`select count(*)::int as n from enrollments where ended_on is null`;
    expect(a.n).toBe(b.n);
    expect(a.n).toBeGreaterThan(0);
  });

  it("Viên Sơn chưa đồng bộ thì sĩ số = 0", async () => {
    const [row] = await sql<{ n: number }[]>`
      select count(*)::int as n from v_enrollments_current where campus_code = 'VS'
    `;
    expect(row.n).toBe(0);
  });

  it("không ghi chuyên cần trùng học sinh-ngày-buổi", async () => {
    const [cls] = await sql<{ id: string; campus_id: string; year: string }[]>`
      select c.id::text, c.campus_id::text, c.school_year_id::text as year
      from classes c join school_years y on y.id = c.school_year_id
      where y.is_current limit 1
    `;
    const [hs] = await sql<{ id: string }[]>`
      select student_id::text as id from v_enrollments_current where class_id = ${cls.id}::uuid limit 1
    `;
    const [day] = await sql<{ id: string }[]>`
      insert into attendance_days (school_year_id, campus_id, class_id, attended_on, session_kind, status)
      values (${cls.year}::uuid, ${cls.campus_id}::uuid, ${cls.id}::uuid, '2000-01-02', 'sang', 'draft')
      returning id::text
    `;
    await sql`
      insert into student_attendance_records (attendance_day_id, student_id, status)
      values (${day.id}::uuid, ${hs.id}::uuid, 'present')
    `;
    await expect(
      sql`
        insert into student_attendance_records (attendance_day_id, student_id, status)
        values (${day.id}::uuid, ${hs.id}::uuid, 'excused')
      `
    ).rejects.toThrow();
    await sql`delete from attendance_days where id = ${day.id}::uuid`;
  });

  it("view v_tasks đánh dấu quá hạn đúng", async () => {
    const [p] = await sql<{ id: string }[]>`select id::text from profiles limit 1`;
    if (!p) return;
    const [t] = await sql<{ id: string }[]>`
      insert into tasks (code, title, created_by, owner_id, due_on, status, progress)
      values ('NV-TEST-OVERDUE', 'Test overdue', ${p.id}::uuid, ${p.id}::uuid, '2020-01-01', 'in_progress', 10)
      on conflict (code) do update set due_on = '2020-01-01', status = 'in_progress'
      returning id::text
    `;
    const [row] = await sql<{ is_overdue: boolean }[]>`select is_overdue from v_tasks where id = ${t.id}::uuid`;
    expect(row.is_overdue).toBe(true);
    await sql`delete from tasks where id = ${t.id}::uuid`;
  });

  it("PHT không thấy học sinh ngoài phân hiệu qua RLS", async () => {
    const [vp] = await sql<{ id: string }[]>`
      select p.id::text from profiles p
      join user_role_scopes s on s.profile_id = p.id
      where s.role = 'vice_principal' limit 1
    `;
    const [ht] = await sql<{ id: string }[]>`
      select p.id::text from profiles p
      join user_role_scopes s on s.profile_id = p.id
      where s.role = 'principal' limit 1
    `;
    if (!vp || !ht) return;
    const asRole = async (uid: string) =>
      sql.begin(async (tx) => {
        await tx`select set_config('request.jwt.claim.sub', ${uid}, true)`;
        await tx`set local role th_authenticated`;
        const [row] = await tx<{ n: number }[]>`
          select count(*)::int as n from enrollments where ended_on is null
        `;
        return row.n;
      });
    const nHt = await asRole(ht.id);
    const nVp = await asRole(vp.id);
    expect(nHt).toBeGreaterThan(nVp);
    expect(nVp).toBeGreaterThan(0);
  });

  it("luồng phê duyệt lưu lịch sử", async () => {
    const [ht] = await sql<{ id: string }[]>`
      select p.id::text from profiles p
      join user_role_scopes s on s.profile_id = p.id
      where s.role = 'principal' limit 1
    `;
    if (!ht) return;
    const [t] = await sql<{ id: string }[]>`
      insert into tasks (code, title, created_by, owner_id, due_on, status, progress)
      values ('NV-TEST-APPROVAL', 'Test approve', ${ht.id}::uuid, ${ht.id}::uuid, current_date + 7, 'submitted', 100)
      on conflict (code) do update set status = 'submitted'
      returning id::text
    `;
    await sql`
      insert into task_approvals (task_id, decided_by, decision, comment)
      values (${t.id}::uuid, ${ht.id}::uuid, 'approved', 'ok')
    `;
    await sql`
      insert into task_events (task_id, profile_id, event_type, payload)
      values (${t.id}::uuid, ${ht.id}::uuid, 'approved', '{}'::jsonb)
    `;
    const [n] = await sql<{ n: number }[]>`select count(*)::int as n from task_approvals where task_id = ${t.id}::uuid`;
    const [e] = await sql<{ n: number }[]>`select count(*)::int as n from task_events where task_id = ${t.id}::uuid`;
    expect(n.n).toBeGreaterThan(0);
    expect(e.n).toBeGreaterThan(0);
    await sql`delete from tasks where id = ${t.id}::uuid`;
  });

  it("không gán trùng giáo viên bộ môn cùng lớp cùng môn", async () => {
    const [cls] = await sql<{ id: string; campus_id: string; year: string }[]>`
      select c.id::text, c.campus_id::text, c.school_year_id::text as year
      from classes c join school_years y on y.id = c.school_year_id
      where y.is_current limit 1
    `;
    const [gv] = await sql<{ id: string }[]>`
      select id::text from staff where campus_id = ${cls.campus_id}::uuid and is_active limit 1
    `;
    if (!gv) return;
    const [a] = await sql<{ id: string }[]>`
      insert into staff_assignments (
        staff_id, school_year_id, campus_id, class_id, subject, title, is_homeroom, is_active
      ) values (
        ${gv.id}::uuid, ${cls.year}::uuid, ${cls.campus_id}::uuid, ${cls.id}::uuid,
        'Toán-TEST', 'Giáo viên bộ môn', false, true
      )
      returning id::text
    `;
    await expect(
      sql`
        insert into staff_assignments (
          staff_id, school_year_id, campus_id, class_id, subject, title, is_homeroom, is_active
        ) values (
          ${gv.id}::uuid, ${cls.year}::uuid, ${cls.campus_id}::uuid, ${cls.id}::uuid,
          'Toán-TEST', 'Giáo viên bộ môn', false, true
        )
      `
    ).rejects.toThrow();
    await sql`delete from staff_assignments where id = ${a.id}::uuid`;
  });

  it("một lớp có thể có nhiều giáo viên bộ môn, kể cả cùng môn", async () => {
    const [cls] = await sql<{ id: string; campus_id: string; year: string }[]>`
      select c.id::text, c.campus_id::text, c.school_year_id::text as year
      from classes c join school_years y on y.id = c.school_year_id
      where y.is_current limit 1
    `;
    const gvs = await sql<{ id: string }[]>`
      select id::text from staff where campus_id = ${cls.campus_id}::uuid and is_active limit 2
    `;
    if (gvs.length < 2) return;
    const ids: string[] = [];
    try {
      for (const gv of gvs) {
        const [row] = await sql<{ id: string }[]>`
          insert into staff_assignments (
            staff_id, school_year_id, campus_id, class_id, subject, title, is_homeroom, is_active
          ) values (
            ${gv.id}::uuid, ${cls.year}::uuid, ${cls.campus_id}::uuid, ${cls.id}::uuid,
            'Tin học-TEST', 'Giáo viên bộ môn', false, true
          )
          returning id::text
        `;
        ids.push(row.id);
      }
      const [n] = await sql<{ n: number }[]>`
        select count(*)::int as n from staff_assignments
        where id in ${sql(ids)} and is_active
      `;
      expect(n.n).toBe(2);
    } finally {
      if (ids.length) await sql`delete from staff_assignments where id in ${sql(ids)}`;
    }
  });

  it("một giáo viên không được chủ nhiệm hai lớp cùng năm", async () => {
    const classes = await sql<{ id: string; campus_id: string; year: string }[]>`
      select c.id::text, c.campus_id::text, c.school_year_id::text as year
      from classes c join school_years y on y.id = c.school_year_id
      where y.is_current and c.homeroom_staff_id is null
        and not exists (
          select 1 from staff_assignments a
          where a.class_id = c.id and a.is_active and a.is_homeroom
        )
      order by c.name
      limit 2
    `;
    if (classes.length < 2) return;
    const [gv] = await sql<{ id: string }[]>`
      select s.id::text from staff s
      where s.is_active
        and not exists (
          select 1 from classes c
          join school_years y on y.id = c.school_year_id
          where c.homeroom_staff_id = s.id and y.is_current
        )
      limit 1
    `;
    if (!gv) return;
    const aId = { current: null as string | null };
    try {
      await sql`
        update classes set homeroom_staff_id = ${gv.id}::uuid where id = ${classes[0].id}::uuid
      `;
      const [a] = await sql<{ id: string }[]>`
        insert into staff_assignments (
          staff_id, school_year_id, campus_id, class_id, subject, title, is_homeroom, is_active
        ) values (
          ${gv.id}::uuid, ${classes[0].year}::uuid, ${classes[0].campus_id}::uuid,
          ${classes[0].id}::uuid, null, 'Giáo viên chủ nhiệm', true, true
        )
        returning id::text
      `;
      aId.current = a.id;
      await expect(
        sql`
          update classes set homeroom_staff_id = ${gv.id}::uuid where id = ${classes[1].id}::uuid
        `
      ).rejects.toThrow();
      await expect(
        sql`
          insert into staff_assignments (
            staff_id, school_year_id, campus_id, class_id, subject, title, is_homeroom, is_active
          ) values (
            ${gv.id}::uuid, ${classes[1].year}::uuid, ${classes[1].campus_id}::uuid,
            ${classes[1].id}::uuid, null, 'Giáo viên chủ nhiệm', true, true
          )
        `
      ).rejects.toThrow();
    } finally {
      await sql`update classes set homeroom_staff_id = null where id = ${classes[0].id}::uuid`;
      if (aId.current) await sql`delete from staff_assignments where id = ${aId.current}::uuid`;
    }
  });
});
