import { sql } from "./db";

export type TaskRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  created_by: string;
  owner_id: string;
  campus_id: string | null;
  domain: string | null;
  starts_on: string | null;
  due_on: string | null;
  priority: string;
  deliverable: string | null;
  progress: number;
  status: string;
  is_overdue: boolean;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  owner_name: string;
  creator_name: string;
  campus_name: string | null;
};

export async function listTasks(filters: {
  status?: string;
  overdue?: boolean;
  mine?: string;
  createdBy?: string;
  q?: string;
  campusId?: string;
}) {
  const status = filters.status || null;
  const q = filters.q?.trim() ? `%${filters.q.trim()}%` : null;
  return sql<TaskRow[]>`
    select
      t.id::text, t.code, t.title, t.description, t.created_by::text, t.owner_id::text,
      t.campus_id::text, t.domain, t.starts_on::text, t.due_on::text, t.priority,
      t.deliverable, t.progress, t.status, t.is_overdue, t.submitted_at::text,
      t.completed_at::text, t.created_at::text,
      o.full_name as owner_name, c.full_name as creator_name, camp.name as campus_name
    from v_tasks t
    join profiles o on o.id = t.owner_id
    join profiles c on c.id = t.created_by
    left join campuses camp on camp.id = t.campus_id
    where (${status}::text is null or t.status = ${status})
      and (${filters.overdue ? true : false} = false or t.is_overdue)
      and (${filters.mine ?? null}::uuid is null or t.owner_id = ${filters.mine ?? null}::uuid)
      and (${filters.createdBy ?? null}::uuid is null or t.created_by = ${filters.createdBy ?? null}::uuid)
      and (${q}::text is null or t.title ilike ${q} or t.code ilike ${q})
      and (${filters.campusId ?? null}::uuid is null or t.campus_id = ${filters.campusId ?? null}::uuid)
    order by t.is_overdue desc, t.due_on nulls last, t.created_at desc
    limit 100
  `;
}

export async function getTask(id: string) {
  const [row] = await sql<TaskRow[]>`
    select
      t.id::text, t.code, t.title, t.description, t.created_by::text, t.owner_id::text,
      t.campus_id::text, t.domain, t.starts_on::text, t.due_on::text, t.priority,
      t.deliverable, t.progress, t.status, t.is_overdue, t.submitted_at::text,
      t.completed_at::text, t.created_at::text,
      o.full_name as owner_name, c.full_name as creator_name, camp.name as campus_name
    from v_tasks t
    join profiles o on o.id = t.owner_id
    join profiles c on c.id = t.created_by
    left join campuses camp on camp.id = t.campus_id
    where t.id = ${id}::uuid
    limit 1
  `;
  return row ?? null;
}

export async function listProfiles() {
  return sql<{ id: string; full_name: string; username: string }[]>`
    select id::text, full_name, username from profiles where is_active order by full_name
  `;
}
