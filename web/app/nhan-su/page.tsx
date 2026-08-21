import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { IssuePills, QualityBanner } from "@/components/directory/QualityBanner";
import { Pager, StatStrip } from "@/components/directory/Pager";
import { EmptyState } from "@/components/ds/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canEditStaff, canSeeStaff, requireAccess } from "@/lib/access";
import { ageYears, employmentLabel, genderLabel } from "@/lib/format";
import { STAFF_ISSUE_META } from "@/lib/quality";
import { getCampusOverview, listStaffDirectory } from "@/lib/queries";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; campus?: string; gender?: string; party?: string; gvcn?: string; issue?: string }>;
}) {
  const access = await requireAccess();
  if (!canSeeStaff(access)) {
    return (
      <>
        <PageHeader title="Giáo viên – nhân sự" />
        <EmptyState title="Không có quyền xem nhân sự" />
      </>
    );
  }

  const sp = await searchParams;
  const pageNum = Math.max(1, Number(sp.page ?? 1) || 1);
  const limit = 40;
  const campusCode = sp.campus?.toUpperCase() || null;
  const gender = sp.gender === "nam" || sp.gender === "nu" ? sp.gender : null;
  const party = sp.party === "yes" || sp.party === "no" ? sp.party : null;
  const gvcn = sp.gvcn === "1";
  const issue = sp.issue && sp.issue in STAFF_ISSUE_META ? sp.issue : null;

  const campuses = (await getCampusOverview())
    .filter((c) => access.schoolWide || access.campusIds.includes(c.id))
    .map((c) => ({ code: c.code, name: c.name }));

  const { rows, stats } = await listStaffDirectory({
    term: sp.q?.trim() ? `%${sp.q.trim()}%` : null,
    campusCode,
    gender,
    party,
    gvcn,
    issue,
    campusIds: access.schoolWide ? null : access.campusIds,
    limit,
    offset: (pageNum - 1) * limit,
  });

  const params = {
    q: sp.q,
    campus: campusCode ?? undefined,
    gender: gender ?? undefined,
    party: party ?? undefined,
    gvcn: gvcn ? "1" : undefined,
    issue: issue ?? undefined,
  };

  return (
    <>
      <PageHeader
        title="Giáo viên – nhân sự"
        description="Hồ sơ cán bộ, tài khoản, chủ nhiệm. Hồ sơ chưa chuẩn được cảnh báo để rà soát."
      />
      <QualityBanner
        flagged={stats.flagged}
        items={stats.quality}
        kind="staff"
        current={issue ?? undefined}
        params={params}
        href="/nhan-su"
      />
      <StatStrip
        items={[
          { label: "Cán bộ", value: stats.total.toLocaleString("vi-VN") },
          { label: "Có tài khoản", value: stats.with_account.toLocaleString("vi-VN") },
          { label: "Đảng viên", value: stats.party.toLocaleString("vi-VN") },
          { label: "Đang CN lớp", value: stats.homeroom.toLocaleString("vi-VN") },
        ]}
      />

      <form method="get" className="mb-4 rounded-[12px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="block text-[13px] font-medium xl:col-span-2">
            Tìm kiếm
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Tên, SĐT, CCCD, tài khoản"
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
            Giới tính
            <select name="gender" defaultValue={gender ?? ""} className="mt-1 h-10 w-full rounded-[12px] border border-input bg-background px-2 text-sm">
              <option value="">Tất cả</option>
              <option value="nam">Nam</option>
              <option value="nu">Nữ</option>
            </select>
          </label>
          <label className="block text-[13px] font-medium">
            Đảng viên
            <select name="party" defaultValue={party ?? ""} className="mt-1 h-10 w-full rounded-[12px] border border-input bg-background px-2 text-sm">
              <option value="">Tất cả</option>
              <option value="yes">Đảng viên</option>
              <option value="no">Chưa / không</option>
            </select>
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[13px] font-medium">
          <input type="checkbox" name="gvcn" value="1" defaultChecked={gvcn} className="size-4 rounded border-input" />
          Chỉ giáo viên đang chủ nhiệm
        </label>
        <div className="mt-3 flex gap-2">
          <Button type="submit">Lọc</Button>
          <Link href="/nhan-su" className="inline-flex h-9 items-center rounded-[12px] border border-border px-3 text-sm font-medium hover:bg-muted">
            Xóa lọc
          </Link>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="Không có cán bộ khớp bộ lọc" />
      ) : (
        <div className="overflow-x-auto rounded-[12px] border bg-card">
          <table className="ledger">
            <thead>
              <tr>
                <th>Cán bộ</th>
                <th>Tài khoản</th>
                <th>Phân hiệu</th>
                <th>Liên hệ</th>
                <th>Trình độ</th>
                <th>Phân công</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/nhan-su/${s.id}`} className="flex items-center gap-3 hover:text-primary">
                      <Avatar name={s.full_name} size="sm" />
                      <span>
                        <span className="block font-semibold">{s.full_name}</span>
                        <span className="text-[12.5px] text-muted-foreground">
                          {genderLabel(s.gender)} · {ageYears(s.dob)} tuổi
                          {s.is_party_member ? " · Đảng viên" : ""}
                        </span>
                        <IssuePills codes={s.issues ?? []} kind="staff" />
                      </span>
                    </Link>
                  </td>
                  <td>
                    {s.username ? (
                      <code className="rounded-md bg-muted px-1.5 py-0.5 text-[13px] font-semibold">{s.username}</code>
                    ) : (
                      <span className="text-muted-foreground">Chưa gắn</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/phan-hieu/${s.campus_code}`} className="hover:text-primary">
                      {s.campus_name}
                    </Link>
                  </td>
                  <td>
                    {s.phone ? (
                      <a href={`tel:${s.phone}`} className="tabular-nums text-primary">
                        {s.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    <span className="mt-0.5 block text-[12.5px] tabular-nums text-muted-foreground">{s.national_id ?? "—"}</span>
                  </td>
                  <td className="text-[13px] text-muted-foreground">
                    <span className="block text-foreground">{s.education_level ?? "—"}</span>
                    {s.it_level ? <span className="block">TH: {s.it_level}</span> : null}
                    {employmentLabel(s.employment_kind) !== "—" ? (
                      <span className="block">{employmentLabel(s.employment_kind)}</span>
                    ) : null}
                  </td>
                  <td>
                    {s.homeroom_classes ? (
                      <Badge className="bg-teal text-white">CN {s.homeroom_classes}</Badge>
                    ) : s.subject_count > 0 ? (
                      <span className="text-[13px] text-muted-foreground">{s.subject_count} môn</span>
                    ) : (
                      <span className="text-[13px] text-muted-foreground">Chưa phân công</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-[13px]">
                    <Link className="font-semibold text-primary" href={`/nhan-su/${s.id}`}>
                      {canEditStaff(access, s.campus_id) ? "Sửa" : "Hồ sơ"}
                    </Link>
                    <span className="px-1.5 text-muted-foreground">·</span>
                    <Link className="text-primary" href={`/phan-cong?campus=${s.campus_code}`}>
                      Phân công
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
