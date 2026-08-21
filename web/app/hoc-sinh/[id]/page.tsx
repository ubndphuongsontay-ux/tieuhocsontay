import { notFound } from "next/navigation";
import { PageHeader, Panel } from "@/components/PageHeader";
import { StudentContactForm, StudentEditForm } from "@/components/records/StudentEditForm";
import { TransferForm } from "@/components/TransferForm";
import { canEditStudentRecord, canSeeClass, requireAccess } from "@/lib/access";
import {
  formatDate,
  genderLabel,
  relationLabel,
  statusLabel,
  supportKindLabel,
} from "@/lib/format";
import { studentIssues } from "@/lib/quality";
import {
  getCurrentClasses,
  getEnrollmentHistory,
  getStudent,
  getStudentContacts,
  getStudentSupports,
} from "@/lib/queries";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireAccess();
  const student = await getStudent(id);
  if (!student) notFound();
  if (student.class_id && student.campus_id && !canSeeClass(access, student.class_id, student.campus_id)) {
    notFound();
  }

  const canEdit = canEditStudentRecord(access, student.class_id, student.campus_id);
  const [contacts, supports, history, classes] = await Promise.all([
    getStudentContacts(id),
    getStudentSupports(id),
    getEnrollmentHistory(id),
    getCurrentClasses(),
  ]);
  const issues = studentIssues({
    dob: student.dob,
    gender: student.gender,
    ethnicity: student.ethnicity,
    national_id: student.national_id ?? student.national_id_raw,
    contact_name: contacts[0]?.full_name,
    contact_phone: contacts[0]?.phone,
    has_contact: contacts.length > 0,
  });

  return (
    <>
      <PageHeader
        eyebrow="Hồ sơ học sinh"
        title={student.full_name}
        description={
          student.class_name ? (
            <>
              {student.campus_name} ·{" "}
              <a href={`/lop/${student.class_id}`} className="font-semibold text-foreground hover:text-primary">
                Lớp {student.class_name}
              </a>
            </>
          ) : (
            "Chưa có chỗ học đang mở"
          )
        }
      />

      {issues.length > 0 ? (
        <div className="mb-4 rounded-[12px] border border-amber-300 bg-amber-50 px-4 py-3 text-[14px]">
          <p className="font-bold text-amber-950">Hồ sơ chưa chuẩn xác</p>
          <ul className="mt-1 list-disc pl-5 text-amber-900">
            {issues.map((i) => (
              <li key={i.code}>{i.label}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Panel className="p-6">
            <h2 className="mb-4 text-[16px] font-bold">Định danh</h2>
            {canEdit ? (
              <StudentEditForm student={student} />
            ) : (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[14.5px]">
                <Item label="Ngày sinh" value={formatDate(student.dob)} />
                <Item label="Giới tính" value={genderLabel(student.gender)} />
                <Item label="Dân tộc" value={student.ethnicity ?? "—"} />
                <Item label="CCCD" value={student.national_id ?? student.national_id_raw ?? "—"} />
                <Item label="Mã Bộ GDĐT" value={student.bgd_code ?? "—"} />
              </dl>
            )}
          </Panel>

          <Panel className="p-6">
            <h2 className="mb-4 text-[16px] font-bold">Liên hệ phụ huynh</h2>
            <div className="space-y-4">
              {contacts.map((ct) =>
                canEdit ? (
                  <StudentContactForm key={ct.id} studentId={id} contact={ct} />
                ) : (
                  <p key={ct.id} className="text-[14.5px]">
                    <span className="font-medium">{relationLabel(ct.relation)}</span>
                    {ct.full_name ? ` · ${ct.full_name}` : ""}
                    {ct.phone ? ` · ${ct.phone}` : ""}
                  </p>
                )
              )}
              {contacts.length === 0 && canEdit ? <StudentContactForm studentId={id} /> : null}
              {contacts.length === 0 && !canEdit ? (
                <p className="text-sm text-muted-foreground">Chưa có liên hệ.</p>
              ) : null}
            </div>
          </Panel>

          {supports.length > 0 ? (
            <Panel className="p-6">
              <h2 className="mb-4 text-[16px] font-bold">Hỗ trợ</h2>
              <ul className="space-y-2">
                {supports.map((sp) => (
                  <li key={sp.id} className="flex gap-3 rounded-[12px] bg-muted px-3 py-2.5 text-[14.5px]">
                    <span className="shrink-0 text-[12.5px] font-semibold text-teal">
                      {supportKindLabel(sp.kind)}
                    </span>
                    <span>{sp.label}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <aside className="space-y-4 lg:col-span-2">
          {canEdit ? (
            <Panel className="p-6">
              <h2 className="mb-2 text-[16px] font-bold">Chuyển lớp</h2>
              <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
                Đóng chỗ học hiện tại và mở chỗ mới — cùng một hồ sơ người.
              </p>
              <TransferForm studentId={id} currentClassId={student.class_id} classes={classes} />
            </Panel>
          ) : null}
          <Panel className="p-6">
            <h2 className="mb-4 text-[16px] font-bold">Lịch sử chỗ học</h2>
            <ul className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="text-[14px]">
                  <p className="font-semibold">
                    {h.campus_name} · {h.class_name}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {h.year_code} · {statusLabel(h.status)} · {formatDate(h.started_on)}
                    {h.ended_on ? ` → ${formatDate(h.ended_on)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12.5px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
