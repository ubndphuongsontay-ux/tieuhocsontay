import { Avatar } from "@/components/Avatar";
import Link from "@/components/AppLink";
import { EmptyState } from "@/components/ds/EmptyState";
import { PageHeader, Panel } from "@/components/PageHeader";
import { searchPeople } from "@/lib/queries";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const hits = query.length >= 2 ? await searchPeople(query) : [];

  return (
    <>
      <PageHeader
        title={query ? `Kết quả cho “${query}”` : "Học sinh"}
        description="Tìm theo họ tên, lớp hoặc số định danh."
      />
      {query.length < 2 ? (
        <EmptyState title="Nhập ít nhất 2 ký tự" description="Dùng ô tìm kiếm trên thanh công cụ hoặc gõ Ctrl K." />
      ) : hits.length === 0 ? (
        <EmptyState title="Không có kết quả" description="Thử họ tên khác, mã lớp hoặc số CCCD." />
      ) : (
        <Panel>
          <ul>
            {hits.map((h) => (
              <li key={`${h.kind}-${h.id}`} className="border-b border-border last:border-0">
                <Link href={h.href} className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-accent">
                  <Avatar name={h.title} size="sm" />
                  <span className="w-8 text-[11px] font-semibold text-muted-foreground">
                    {h.kind === "hs" ? "HS" : "GV"}
                  </span>
                  <span className="font-semibold">{h.title}</span>
                  <span className="text-[13px] text-muted-foreground">{h.subtitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
