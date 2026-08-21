import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { canApproveTasks, requireAccess } from "@/lib/access";
import {
  attachTaskFileAction,
  commentTaskAction,
  decideTaskAction,
  submitTaskAction,
  updateProgressAction,
} from "@/lib/actions-tasks";
import { sql } from "@/lib/db";
import { getTask } from "@/lib/tasks";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireAccess();
  const { id } = await params;
  const task = await getTask(id);
  if (!task) notFound();

  const [events, comments, approvals, files] = await Promise.all([
    sql<{ event_type: string; created_at: string; payload: unknown; name: string | null }[]>`
      select e.event_type, e.created_at::text, e.payload, p.full_name as name
      from task_events e left join profiles p on p.id = e.profile_id
      where e.task_id = ${id}::uuid order by e.created_at
    `,
    sql<{ body: string; created_at: string; name: string }[]>`
      select c.body, c.created_at::text, p.full_name as name
      from task_comments c join profiles p on p.id = c.profile_id
      where c.task_id = ${id}::uuid order by c.created_at
    `,
    sql<{ decision: string; comment: string | null; decided_at: string; name: string }[]>`
      select a.decision, a.comment, a.decided_at::text, p.full_name as name
      from task_approvals a join profiles p on p.id = a.decided_by
      where a.task_id = ${id}::uuid order by a.decided_at
    `,
    sql<{ original_name: string; created_at: string }[]>`
      select original_name, created_at::text from task_attachments
      where task_id = ${id}::uuid order by created_at
    `,
  ]);

  const isOwner = task.owner_id === access.profileId;
  const canDecide = canApproveTasks(access) && task.status === "submitted";

  return (
    <>
      <PageHeader
        eyebrow={task.code}
        title={task.title}
        description={`${task.owner_name} chủ trì · hạn ${task.due_on ?? "—"}`}
        actions={
          task.is_overdue ? <Badge variant="destructive">Quá hạn</Badge> : <Badge variant="secondary">{task.status}</Badge>
        }
      />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <section className="rounded-[12px] border border-border bg-card p-5">
            <h2 className="text-[16px] font-bold">Thông tin</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{task.description || "Không có mô tả"}</p>
            <p className="mt-3 text-[13px]">Sản phẩm: {task.deliverable ?? "—"} · Tiến độ {task.progress}%</p>
          </section>

          {isOwner ? (
            <form action={updateProgressAction} className="space-y-3 rounded-[12px] border border-border bg-card p-5">
              <input type="hidden" name="taskId" value={task.id} />
              <h2 className="text-[16px] font-bold">Cập nhật tiến độ</h2>
              <Label htmlFor="progress">Phần trăm</Label>
              <Input id="progress" name="progress" type="number" min={0} max={100} defaultValue={task.progress} className="h-10" />
              <Label htmlFor="note">Đã thực hiện</Label>
              <Textarea id="note" name="note" required />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="blocked" /> Báo vướng mắc
              </label>
              <Button type="submit">Lưu tiến độ</Button>
            </form>
          ) : null}

          {isOwner && task.status !== "submitted" && task.status !== "completed" ? (
            <form action={submitTaskAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <Button type="submit">Gửi phê duyệt</Button>
            </form>
          ) : null}

          {isOwner ? (
            <form action={attachTaskFileAction} encType="multipart/form-data" className="rounded-[12px] border border-border bg-card p-5">
              <input type="hidden" name="taskId" value={task.id} />
              <h2 className="mb-2 text-[16px] font-bold">Minh chứng</h2>
              <input type="file" name="file" className="text-sm" />
              <Button type="submit" variant="outline" className="mt-2">
                Tải lên
              </Button>
              <ul className="mt-3 text-sm">
                {files.map((f) => (
                  <li key={f.original_name + f.created_at}>{f.original_name}</li>
                ))}
              </ul>
            </form>
          ) : null}

          {canDecide ? (
            <form action={decideTaskAction} className="space-y-3 rounded-[12px] border border-border bg-card p-5">
              <input type="hidden" name="taskId" value={task.id} />
              <h2 className="text-[16px] font-bold">Phê duyệt</h2>
              <Textarea name="comment" placeholder="Ý kiến" />
              <div className="flex gap-2">
                <Button name="decision" value="approved" type="submit">
                  Phê duyệt
                </Button>
                <Button name="decision" value="changes_requested" type="submit" variant="outline">
                  Yêu cầu bổ sung
                </Button>
              </div>
            </form>
          ) : null}

          <form action={commentTaskAction} className="space-y-2 rounded-[12px] border border-border bg-card p-5">
            <input type="hidden" name="taskId" value={task.id} />
            <h2 className="text-[16px] font-bold">Bình luận</h2>
            <Textarea name="body" required />
            <Button type="submit" variant="outline">
              Gửi
            </Button>
            <ul className="mt-3 space-y-2 text-sm">
              {comments.map((c, i) => (
                <li key={i}>
                  <span className="font-semibold">{c.name}</span>: {c.body}
                </li>
              ))}
            </ul>
          </form>
        </div>
        <aside className="space-y-4 lg:col-span-2">
          <section className="rounded-[12px] border border-border bg-card p-5">
            <h2 className="text-[16px] font-bold">Lịch sử</h2>
            <ol className="mt-3 space-y-2 text-[13px]">
              {events.map((e, i) => (
                <li key={i}>
                  <span className="font-semibold">{e.event_type}</span> · {e.name ?? "Hệ thống"}
                  <span className="block text-muted-foreground">{e.created_at}</span>
                </li>
              ))}
            </ol>
          </section>
          {approvals.length > 0 ? (
            <section className="rounded-[12px] border border-border bg-card p-5">
              <h2 className="text-[16px] font-bold">Kết quả phê duyệt</h2>
              {approvals.map((a, i) => (
                <p key={i} className="mt-2 text-sm">
                  {a.decision} · {a.name}
                  {a.comment ? ` — ${a.comment}` : ""}
                </p>
              ))}
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
