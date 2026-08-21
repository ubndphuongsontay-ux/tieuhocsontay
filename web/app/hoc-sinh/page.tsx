import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { IssuePills, QualityBanner } from "@/components/directory/QualityBanner";
import { Pager, StatStrip } from "@/components/directory/Pager";
import { EmptyState } from "@/components/ds/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canEditStudentRecord, classListMode, requireAccess } from "@/lib/access";
import { ageYears, formatDate, genderLabel, relationLabel, supportKindLabel } from "@/lib/format";
import { STUDENT_ISSUE_META } from "@/lib/quality";
import { getCampusOverview, listStudentsDirectory } from "@/lib/queries";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; campus?: string; khoi?: string; gender?: string; support?: string; issue?: string }>;
}) {
  const access = await requireAccess();
  const sp = await searchParams;
  const pageNum = Math.max(1, Number(sp.page ?? 1) || 1);
  const limit = 40;
  const term = sp.q?.trim() ? `%${sp.q.trim()}%` : null;
  const campusCode = sp.campus?.toUpperCase() || null;
  const gradeNum = sp.khoi && /^[1-5]$/.test(sp.khoi) ? Number(sp.khoi) : null;
  const gender = sp.gender === "nam" || sp.gender === "nu" ? sp.gender : null;
  const support = ["chinh_sach", "khuyet_tat", "doi_tuong", "hoan_canh"].includes(sp.support ?? "")
    ? sp.support!
    : null;
  const issue = sp.issue && sp.issue in STUDENT_ISSUE_META ? sp.issue : null;

  const mode = classListMode(access);
  if (mode === "none") {
    return (
      <>
        <PageHeader title="Học sinh" description="Danh sách đang học trong phạm vi được phân quyền" />
        <EmptyState
          title="Chưa được phân công lớp"
          description="Khi được gán chủ nhiệm hoặc bộ môn, danh sách học sinh sẽ hiện tại đây."
        />
      </>
    );
  }

  const campuses = (await getCampusOverview())
    .filter((c) => access.schoolWide || access.campusIds.includes(c.id))
    .map((c) => ({ code: c.code, name: c.name }));

  const { rows, stats } = await listStudentsDirectory({
    term,
    campusCode,
    grade: gradeNum,
    gender,
    support,
    issue,
    classIds: mode === "class" ? access.classIds : null,
    campusIds: mode === "campus" ? access.campusIds : null,
    limit,
    offset: (pageNum - 1) * limit,
  });

  const params = {
    q: sp.q,
    campus: campusCode ?? undefined,
    khoi: gradeNum ? String(gradeNum) : undefined,
    gender: gender ?? undefined,
    support: support ?? undefined,
    issue: issue ?? undefined,
  };

  return (
    <>
      <PageHeader
        title="Học sinh"
        description="Hồ sơ đang học: lớp, phụ huynh, đối tượng hỗ trợ. Hồ sơ chưa chuẩn được cảnh báo để rà soát."
      />
      <QualityBanner
        flagged={stats.flagged}
        items={stats.quality}
        kind="student"
        current={issue ?? undefined}
        params={params}
        href="/hoc-sinh"
      />
      <StatStrip
        items={[
          { label: "Đang học", value: stats.total.toLocaleString("vi-VN") },
          { label: "Nam", value: stats.nam.toLocaleString("vi-VN") },
          { label: "Nữ", value: stats.nu.toLocaleString("vi-VN") },
          { label: "Chính sách", value: stats.chinh_sach.toLocaleString("vi-VN") },
        ]}
      />

      <form method="get" className="mb-4 rounded-[12px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="block text-[13px] font-medium xl:col-span-2">
            Tìm kiếm
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Tên, lớp, CCCD, SĐT phụ huynh"
              className="mt-1 h-10 w-full rounded-[12px] border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="block text-[13px] font-medium">
            Phân hiệu
            <select name="campus" defaultValue={campusCode ?? ""} className="mt-1 h-10 w-full rounded-[12px] border border-input bg-background px-2 text-sm">
              <option value="">Tất cả</option>
              {campuses.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[13px] font-medium">
            Khối
            <select name="khoi" defaultValue={gradeNum ? String(gradeNum) : ""} className="mt-1 h-10 w-full rounded-[12px] border border-input bg-background px-2 text-sm">
              <option value="">Tất cả</option>
              {[1, 2, 3, 4, 5].map((g) => (
                <option key={g} value={String(g)}>
                  Khối {g}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[13px] font-medium">
            Giới tính
            <select name="gender" defaultValue={gender ?? ""} className="mt-1 h-10 w-full rounded-[12px] border border-input bg-background px-2 text-sm">
              <option value="">Tất cả</option>
              <option value="nam">Nam</option>
              <option value="nu">Nữ</option>
            </select>
          </label>
          <label className="block text-[13px] font-medium">
            Hỗ trợ
            <select name="support" defaultValue={support ?? ""} className="mt-1 h-10 w-full rounded-[12px] border border-input bg-background px-2 text-sm">
              <option value="">Tất cả</option>
              <option value="chinh_sach">Chính sách</option>
              <option value="khuyet_tat">Khuyết tật</option>
              <option value="doi_tuong">Đối tượng</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <Button type="submit">Lọc</Button>
          <Link href="/hoc-sinh" className="inline-flex h-9 items-center rounded-[12px] border border-border px-3 text-sm font-medium hover:bg-muted">
            Xóa lọc
          </Link>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="Không có học sinh khớp bộ lọc" />
      ) : (
        <div className="overflow-x-auto rounded-[12px] border bg-card">
          <table className="ledger">
            <thead>
              <tr>
                <th>Học sinh</th>
                <th>Ngày sinh</th>
                <th>Lớp</th>
                <th>Phụ huynh</th>
                <th>CCCD</th>
                <th>Hỗ trợ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_id}>
                  <td>
                    <Link href={`/hoc-sinh/${r.student_id}`} className="flex items-center gap-3 hover:text-primary">
                      <Avatar name={r.full_name} size="sm" />
                      <span>
                        <span className="block font-semibold">{r.full_name}</span>
                        <span className="text-[12.5px] text-muted-foreground">
                          {genderLabel(r.gender)}
                          {r.ethnicity ? ` · ${r.ethnicity}` : ""}
                        </span>
                        <IssuePills codes={r.issues ?? []} kind="student" />
                      </span>
                    </Link>
                  </td>
                  <td className="tabular-nums text-muted-foreground">
                    {formatDate(r.dob)}
                    <span className="mt-0.5 block text-[12.5px]">{ageYears(r.dob)} tuổi</span>
                  </td>
                  <td>
                    <Link href={`/lop/${r.class_id}`} className="font-semibold hover:text-primary">
                      {r.class_name}
                    </Link>
                    <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                      {r.campus_name}
                      {r.homeroom_name ? ` · CN ${r.homeroom_name}` : ""}
                    </span>
                  </td>
                  <td>
                    {r.contact_name || r.contact_phone ? (
                      <>
                        <span className="block font-medium">
                          {r.contact_name ?? "—"}
                          {r.contact_relation ? (
                            <span className="font-normal text-muted-foreground"> · {relationLabel(r.contact_relation)}</span>
                          ) : null}
                        </span>
                        {r.contact_phone ? (
                          <a href={`tel:${r.contact_phone}`} className="text-[12.5px] tabular-nums text-primary">
                            {r.contact_phone}
                          </a>
                        ) : (
                          <span className="text-[12.5px] text-muted-foreground">Chưa có SĐT</span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="tabular-nums text-[13px] text-muted-foreground">{r.national_id ?? "—"}</td>
                  <td>
                    {r.support_kinds ? (
                      <span className="flex flex-wrap gap-1">
                        {r.support_kinds.split(",").map((kind) => (
                          <Badge key={kind} variant="secondary" className="font-medium">
                            {supportKindLabel(kind)}
                          </Badge>
                        ))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-[13px]">
                    <Link className="font-semibold text-primary" href={`/hoc-sinh/${r.student_id}`}>
                      {canEditStudentRecord(access, r.class_id, r.campus_id) ? "Sửa" : "Hồ sơ"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager total={stats.total} page={pageNum} pageSize={limit} params={params} />
    </>
  );
}
