import Link from "@/components/AppLink";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ds/EmptyState";
import { canApproveTasks, requireAccess } from "@/lib/access";
import { listTasks } from "@/lib/tasks";

export default async function ApprovalsPage() {
  const access = await requireAccess();
  if (!canApproveTasks(access)) redirect("/tasks");
  const rows = await listTasks({ status: "submitted" });
  return (
    <>
      <PageHeader title="Trung tâm phê duyệt" description="Nhiệm vụ đã gửi, chờ hiệu trưởng hoặc PHT quyết định" />
      {rows.length === 0 ? (
        <EmptyState title="Không có hồ sơ chờ duyệt" />
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => (
            <li key={t.id} className="rounded-[12px] border border-border bg-card p-4">
              <Link href={`/tasks/${t.id}`} className="font-semibold hover:text-primary">
                {t.code} · {t.title}
              </Link>
              <p className="text-[13px] text-muted-foreground">
                {t.owner_name} · hạn {t.due_on}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
