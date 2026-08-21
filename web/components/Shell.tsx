import { AppFrame } from "@/components/layout/AppFrame";
import { getAccess } from "@/lib/access";
import { getCampusNav, getCurrentYear } from "@/lib/queries";

export async function Shell({ children }: { children: React.ReactNode }) {
  const [access, year, campuses] = await Promise.all([getAccess(), getCurrentYear(), getCampusNav()]);

  return (
    <AppFrame
      yearCode={year?.code ?? "2026-2027"}
      campuses={campuses}
      alerts={[]}
      userName={access?.name ?? "Người dùng"}
      userUsername={access?.username ?? ""}
      userRole={access?.roles[0] ?? ""}
    >
      <span className="sr-only">Trường Tiểu học Sơn Tây</span>
      {children}
    </AppFrame>
  );
}
