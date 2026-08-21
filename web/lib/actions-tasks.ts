"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, canApproveTasks, canAssignTasks, requireAccess } from "@/lib/access";
import { notify, writeAudit } from "@/lib/audit";
import { sql } from "@/lib/db";
import { getTask } from "@/lib/tasks";
import {
  taskCommentSchema,
  taskCreateSchema,
  taskDecisionSchema,
  taskProgressSchema,
} from "@/lib/validators";

function revalidateTask(id: string) {
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/approvals");
  revalidatePath("/");
}

export async function createTaskAction(formData: FormData) {
  const access = await requireAccess();
  assert(canAssignTasks(access), "Bạn không được giao việc");
  const parsed = taskCreateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    ownerId: formData.get("ownerId"),
    campusId: formData.get("campusId") || null,
    domain: formData.get("domain") || null,
    startsOn: formData.get("startsOn") || null,
    dueOn: formData.get("dueOn"),
    priority: formData.get("priority") || "normal",
    deliverable: formData.get("deliverable") || null,
  });
  if (!parsed.success) return;

  const [codeRow] = await sql<{ n: string }[]>`select nextval('task_code_seq')::text as n`;
  const code = `NV-${new Date().getFullYear()}-${String(codeRow.n).padStart(4, "0")}`;
  const [row] = await sql<{ id: string }[]>`
    insert into tasks (
      code, title, description, created_by, owner_id, campus_id, domain,
      starts_on, due_on, priority, deliverable, status, progress
    ) values (
      ${code}, ${parsed.data.title}, ${parsed.data.description ?? null},
      ${access.profileId}::uuid, ${parsed.data.ownerId}::uuid,
      ${parsed.data.campusId ?? null}::uuid, ${parsed.data.domain ?? null},
      ${parsed.data.startsOn || null}::date, ${parsed.data.dueOn}::date,
      ${parsed.data.priority}, ${parsed.data.deliverable ?? null},
      'assigned', 0
    ) returning id::text
  `;
  await sql`
    insert into task_assignees (task_id, profile_id, kind)
    values (${row.id}::uuid, ${parsed.data.ownerId}::uuid, 'owner')
  `;
  await sql`
    insert into task_events (task_id, profile_id, event_type, payload)
    values (${row.id}::uuid, ${access.profileId}::uuid, 'created', ${JSON.stringify({ code })}::jsonb)
  `;
  await writeAudit({
    actorId: access.profileId,
    action: "task.create",
    entityType: "task",
    entityId: row.id,
    after: parsed.data,
  });
  await notify({
    profileId: parsed.data.ownerId,
    title: "Nhiệm vụ mới được giao",
    body: parsed.data.title,
    href: `/tasks/${row.id}`,
    kind: "task",
  });
  revalidateTask(row.id);
  redirect(`/tasks/${row.id}`);
}

export async function updateProgressAction(formData: FormData) {
  const access = await requireAccess();
  const parsed = taskProgressSchema.safeParse({
    taskId: formData.get("taskId"),
    progress: formData.get("progress"),
    note: formData.get("note"),
    blocked: formData.get("blocked") === "on",
  });
  if (!parsed.success) return;
  const task = await getTask(parsed.data.taskId);
  if (!task) return;
  assert(task.owner_id === access.profileId || task.created_by === access.profileId, "Chỉ chủ trì hoặc người giao được cập nhật");
  const status = parsed.data.blocked ? "blocked" : parsed.data.progress >= 100 ? "in_progress" : task.status === "assigned" ? "in_progress" : task.status;
  await sql`
    update tasks set progress = ${parsed.data.progress}, status = ${status}
    where id = ${task.id}::uuid
  `;
  await sql`
    insert into task_updates (task_id, profile_id, progress, note)
    values (${task.id}::uuid, ${access.profileId}::uuid, ${parsed.data.progress}, ${parsed.data.note})
  `;
  await sql`
    insert into task_events (task_id, profile_id, event_type, payload)
    values (${task.id}::uuid, ${access.profileId}::uuid, 'progress', ${JSON.stringify({ progress: parsed.data.progress, note: parsed.data.note })}::jsonb)
  `;
  await writeAudit({
    actorId: access.profileId,
    action: "task.progress",
    entityType: "task",
    entityId: task.id,
    before: { progress: task.progress, status: task.status },
    after: { progress: parsed.data.progress, status },
  });
  await notify({
    profileId: task.created_by,
    title: "Cập nhật tiến độ",
    body: `${task.title}: ${parsed.data.progress}%`,
    href: `/tasks/${task.id}`,
  });
  revalidateTask(task.id);
  return;
}

export async function submitTaskAction(formData: FormData) {
  const access = await requireAccess();
  const taskId = String(formData.get("taskId") ?? "");
  const task = await getTask(taskId);
  if (!task) return;
  assert(task.owner_id === access.profileId, "Chỉ chủ trì được gửi phê duyệt");
  await sql`
    update tasks set status = 'submitted', submitted_at = now()
    where id = ${task.id}::uuid
  `;
  await sql`
    insert into task_events (task_id, profile_id, event_type, payload)
    values (${task.id}::uuid, ${access.profileId}::uuid, 'submitted', '{}'::jsonb)
  `;
  await writeAudit({ actorId: access.profileId, action: "task.submit", entityType: "task", entityId: task.id });
  revalidateTask(task.id);
  return;
}

export async function decideTaskAction(formData: FormData) {
  const access = await requireAccess();
  assert(canApproveTasks(access), "Bạn không có quyền phê duyệt");
  const parsed = taskDecisionSchema.safeParse({
    taskId: formData.get("taskId"),
    decision: formData.get("decision"),
    comment: formData.get("comment") || null,
  });
  if (!parsed.success) return;
  const task = await getTask(parsed.data.taskId);
  if (!task) return;
  assert(task.status === "submitted", "Nhiệm vụ chưa gửi phê duyệt");
  const next = parsed.data.decision === "approved" ? "completed" : "changes_requested";
  await sql`
    insert into task_approvals (task_id, decided_by, decision, comment)
    values (${task.id}::uuid, ${access.profileId}::uuid, ${parsed.data.decision}, ${parsed.data.comment ?? null})
  `;
  await sql`
    update tasks
    set status = ${next},
        completed_at = case when ${next} = 'completed' then now() else completed_at end
    where id = ${task.id}::uuid
  `;
  await sql`
    insert into task_events (task_id, profile_id, event_type, payload)
    values (${task.id}::uuid, ${access.profileId}::uuid, ${parsed.data.decision}, ${JSON.stringify({ comment: parsed.data.comment })}::jsonb)
  `;
  await writeAudit({
    actorId: access.profileId,
    action: `task.${parsed.data.decision}`,
    entityType: "task",
    entityId: task.id,
  });
  await notify({
    profileId: task.owner_id,
    title: parsed.data.decision === "approved" ? "Nhiệm vụ đã được phê duyệt" : "Yêu cầu bổ sung",
    body: parsed.data.comment ?? task.title,
    href: `/tasks/${task.id}`,
  });
  revalidateTask(task.id);
  return;
}

export async function commentTaskAction(formData: FormData) {
  const access = await requireAccess();
  const parsed = taskCommentSchema.safeParse({
    taskId: formData.get("taskId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return;
  await sql`
    insert into task_comments (task_id, profile_id, body)
    values (${parsed.data.taskId}::uuid, ${access.profileId}::uuid, ${parsed.data.body})
  `;
  await sql`
    insert into task_events (task_id, profile_id, event_type, payload)
    values (${parsed.data.taskId}::uuid, ${access.profileId}::uuid, 'comment', ${JSON.stringify({ body: parsed.data.body })}::jsonb)
  `;
  revalidateTask(parsed.data.taskId);
  return;
}

export async function attachTaskFileAction(formData: FormData) {
  const access = await requireAccess();
  const taskId = String(formData.get("taskId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const task = await getTask(taskId);
  if (!task) return;
  assert(task.owner_id === access.profileId || task.created_by === access.profileId);
  const dir = path.join(process.cwd(), ".uploads", "tasks", taskId);
  await mkdir(dir, { recursive: true });
  const safe = `${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, safe), buf);
  await sql`
    insert into task_attachments (task_id, profile_id, original_name, storage_backend, storage_path, mime_type, byte_size)
    values (
      ${taskId}::uuid, ${access.profileId}::uuid, ${file.name}, 'local', ${`tasks/${taskId}/${safe}`},
      ${file.type || null}, ${file.size}
    )
  `;
  revalidateTask(taskId);
  return;
}
