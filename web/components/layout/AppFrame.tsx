"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { DashboardAlert } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { SidebarProvider, useSidebar } from "./SidebarProvider";
import { TopHeader } from "./TopHeader";

type Campus = { code: string; name: string };

export function AppFrame({
  children,
  yearCode,
  campuses,
  alerts,
  userName,
  userUsername,
  userRole,
}: {
  children: React.ReactNode;
  yearCode: string;
  campuses: Campus[];
  alerts: DashboardAlert[];
  userName?: string;
  userUsername?: string;
  userRole?: string;
}) {
  return (
    <SidebarProvider>
      <AppFrameInner
        yearCode={yearCode}
        campuses={campuses}
        alerts={alerts}
        userName={userName}
        userUsername={userUsername}
        userRole={userRole}
      >
        {children}
      </AppFrameInner>
    </SidebarProvider>
  );
}

function AppFrameInner({
  children,
  yearCode,
  campuses,
  alerts,
  userName,
  userUsername,
  userRole,
}: {
  children: React.ReactNode;
  yearCode: string;
  campuses: Campus[];
  alerts: DashboardAlert[];
  userName?: string;
  userUsername?: string;
  userRole?: string;
}) {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <div className="flex min-h-svh">
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 transition-[width] duration-200 ease-out lg:block",
          collapsed ? "w-[72px]" : "w-[256px]"
        )}
      >
        <Sidebar campuses={campuses} collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[264px] gap-0 border-0 bg-sidebar p-0 sm:max-w-[264px]"
        >
          <SheetTitle className="sr-only">Menu điều hướng</SheetTitle>
          <Sidebar
            campuses={campuses}
            collapsed={false}
            showCollapse={false}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader
          yearCode={yearCode}
          campuses={campuses}
          alerts={alerts}
          userName={userName}
          userUsername={userUsername}
          userRole={userRole}
        />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
