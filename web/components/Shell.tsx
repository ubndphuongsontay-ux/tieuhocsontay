import { AppFrame } from "@/components/layout/AppFrame";
import { getAccess } from "@/lib/access";
import { getCampusNav, getCurrentYear, getSchoolName } from "@/lib/queries";

export async function Shell({ children }: { children: React.ReactNode }) {
  const access = await getAccess();
  const [school, year, campuses] = await Promise.all([
    getSchoolName(),
    getCurrentYear(),
    getCampusNav(),
  ]);

  return (
    <AppFrame
      yearCode={year?.code ?? "2026-2027"}
      campuses={campuses}
      alerts={[]}
      userName={access?.name ?? "Người dùng"}
      userUsername={access?.username ?? ""}
      userRole={access?.roles[0] ?? ""}
    >
      <span className="sr-only">{school}</span>
      {children}
    </AppFrame>
  );
}
