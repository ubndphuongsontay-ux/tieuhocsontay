import { notFound } from "next/navigation";
import { AttendanceForm } from "@/components/attendance/AttendanceForm";
import { PageHeader } from "@/components/PageHeader";
import { canEditAttendance, canSeeClass, requireAccess } from "@/lib/access";
import { sql } from "@/lib/db";
import { getClassDetail, getClassRoster } from "@/lib/queries";

export default async function ClassAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ngay?: string; buoi?: string }>;
}) {
  const access = await requireAccess();
  const { id } = await params;
  const { ngay, buoi } = await searchParams;
  const cls = await getClassDetail(id);
  if (!cls) notFound();
  const [meta] = await sql<{ campus_id: string }[]>`select campus_id::text from classes where id = ${id}::uuid`;
  if (!canSeeClass(access, id, meta.campus_id)) notFound();

  const attendedOn = ngay && /^\d{4}-\d{2}-\d{2}$/.test(ngay) ? ngay : new Date().toISOString().slice(0, 10);
  const sessionKind = buoi === "chieu" ? "chieu" : "sang";
  const roster = await getClassRoster(id);
  const existing = await sql<{ student_id: string; status: string; reason: string | null }[]>`
    select r.student_id::text, r.status, r.reason
    from student_attendance_records r
    join attendance_days d on d.id = r.attendance_day_id
    where d.class_id = ${id}::uuid and d.attended_on = ${attendedOn}::date and d.session_kind = ${sessionKind}
  `;
  const map = new Map(existing.map((r) => [r.student_id, r]));
  const initial = roster.map((hs) => ({
    studentId: hs.student_id,
    fullName: hs.full_name,
    status: map.get(hs.student_id)?.status ?? "present",
    reason: map.get(hs.student_id)?.reason ?? "",
  }));

  return (
    <>
      <PageHeader
        eyebrow={cls.campus_name}
        title={`Điểm danh lớp ${cls.name}`}
        description={`${roster.length} học sinh · ${attendedOn} · buổi ${sessionKind}`}
      />
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input type="date" name="ngay" defaultValue={attendedOn} className="h-10 rounded-[12px] border px-2 text-sm" />
        <select name="buoi" defaultValue={sessionKind} className="h-10 rounded-[12px] border px-2 text-sm">
          <option value="sang">Sáng</option>
          <option value="chieu">Chiều</option>
        </select>
        <button className="h-10 rounded-[12px] bg-primary px-3 text-sm font-semibold text-white" type="submit">
          Xem ngày
        </button>
      </form>
      <AttendanceForm
        classId={id}
        attendedOn={attendedOn}
        sessionKind={sessionKind}
        initial={initial}
        canEdit={canEditAttendance(access, id, meta.campus_id)}
      />
    </>
  );
}
