import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ds/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAccess } from "@/lib/access";
import { listTasks } from "@/lib/tasks";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const access = await requireAccess();
  const { tab, q } = await searchParams;
  const filters =
    tab === "mine"
      ? { mine: access.profileId, q }
      : tab === "assigned"
        ? { createdBy: access.profileId, q }
        : tab === "overdue"
          ? { overdue: true, q }
          : tab === "pending"
            ? { status: "submitted", q }
            : { q };
  const rows = await listTasks(filters);

  return (
    <>
      <PageHeader
        title="Công việc"
        description="Giao việc, theo dõi tiến độ và gửi phê duyệt"
        actions={
          <Button asChild>
            <Link href="/tasks/new">Tạo nhiệm vụ</Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {[
          ["", "Tất cả"],
          ["mine", "Của tôi"],
          ["assigned", "Tôi đã giao"],
          ["overdue", "Quá hạn"],
          ["pending", "Chờ phê duyệt"],
        ].map(([id, label]) => (
          <Link
            key={id}
            href={id ? `/tasks?tab=${id}` : "/tasks"}
            className={`rounded-full border px-3 py-1 ${tab === id || (!tab && !id) ? "border-primary bg-accent font-semibold" : "border-border"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Chưa có công việc" description="Khi được giao hoặc tạo nhiệm vụ, danh sách sẽ hiện tại đây." />
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-border bg-card">
          <table className="ledger">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Nhiệm vụ</th>
                <th>Chủ trì</th>
                <th>Hạn</th>
                <th>Tiến độ</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono text-[12.5px]">{t.code}</td>
                  <td>
                    <Link href={`/tasks/${t.id}`} className="font-semibold hover:text-primary">
                      {t.title}
                    </Link>
                  </td>
                  <td>{t.owner_name}</td>
                  <td className="tabular-nums">{t.due_on ?? "—"}</td>
                  <td className="tabular-nums">{t.progress}%</td>
                  <td>
                    {t.is_overdue ? (
                      <Badge variant="destructive">Quá hạn</Badge>
                    ) : (
                      <Badge variant="secondary">{t.status}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
