import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { canAssignTasks, requireAccess } from "@/lib/access";
import { createTaskAction } from "@/lib/actions-tasks";
import { getCampusOverview } from "@/lib/queries";
import { listProfiles } from "@/lib/tasks";
import { redirect } from "next/navigation";

export default async function NewTaskPage() {
  const access = await requireAccess();
  if (!canAssignTasks(access)) redirect("/tasks");
  const [people, campuses] = await Promise.all([listProfiles(), getCampusOverview()]);

  return (
    <>
      <PageHeader title="Tạo nhiệm vụ" description="Giao việc cho người chủ trì trong phạm vi được phân công" />
      <form action={createTaskAction} className="max-w-2xl space-y-4 rounded-[12px] border border-border bg-card p-6">
        <div className="space-y-1.5">
          <Label htmlFor="title">Tên nhiệm vụ</Label>
          <Input id="title" name="title" required className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Mô tả</Label>
          <Textarea id="description" name="description" rows={4} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ownerId">Người chủ trì</Label>
            <select id="ownerId" name="ownerId" required className="h-10 w-full rounded-[12px] border border-input bg-background px-2 text-sm">
              <option value="">Chọn…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.username})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campusId">Phân hiệu</Label>
            <select id="campusId" name="campusId" className="h-10 w-full rounded-[12px] border border-input bg-background px-2 text-sm">
              <option value="">Toàn trường</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dueOn">Hạn hoàn thành</Label>
            <Input id="dueOn" name="dueOn" type="date" required className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priority">Ưu tiên</Label>
            <select id="priority" name="priority" className="h-10 w-full rounded-[12px] border border-input bg-background px-2 text-sm" defaultValue="normal">
              <option value="low">Thấp</option>
              <option value="normal">Bình thường</option>
              <option value="high">Cao</option>
              <option value="urgent">Khẩn</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deliverable">Sản phẩm bàn giao</Label>
          <Input id="deliverable" name="deliverable" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="domain">Lĩnh vực</Label>
          <Input id="domain" name="domain" className="h-10" placeholder="chuyên cần, nhân sự, chuyên môn…" />
        </div>
        <Button type="submit">Giao việc</Button>
      </form>
    </>
  );
}
