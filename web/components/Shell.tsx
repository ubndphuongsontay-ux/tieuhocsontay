import { AppFrame } from "@/components/layout/AppFrame";
import { getAccess } from "@/lib/access";
import { getDashboardData } from "@/lib/dashboard";
import { getCurrentYear, getSchoolName } from "@/lib/queries";

export async function Shell({ children }: { children: React.ReactNode }) {
  const access = await getAccess();
  const [school, year, dash] = await Promise.all([
    getSchoolName(),
    getCurrentYear(),
    getDashboardData(access),
  ]);

  const campuses = dash.campuses.map((c) => ({ code: c.code, name: c.name }));

  return (
    <AppFrame
      yearCode={year?.code ?? "2026-2027"}
      campuses={campuses}
      alerts={dash.alerts}
      userName={access?.name ?? "Người dùng"}
      userUsername={access?.username ?? ""}
      userRole={access?.roles[0] ?? ""}
    >
      <span className="sr-only">{school}</span>
      {children}
    </AppFrame>
  );
}
