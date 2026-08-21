"use client";

import { ChevronDown, ChevronsLeft, GraduationCap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { schoolNav, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarProvider";

type Campus = { code: string; name: string };

export function Sidebar({
  campuses,
  collapsed = false,
  onNavigate,
  showCollapse = true,
}: {
  campuses: Campus[];
  collapsed?: boolean;
  onNavigate?: () => void;
  showCollapse?: boolean;
}) {
  const path = usePathname();
  const groups = schoolNav(campuses);
  const { toggleCollapsed } = useSidebar();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex items-center gap-3 border-b border-sidebar-border px-3 py-4",
          collapsed && "justify-center px-2"
        )}
      >
        <Link href="/" onClick={onNavigate} className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="size-5" aria-hidden />
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-bold leading-tight text-white">
                Tiểu học Sơn Tây
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] font-medium text-slate-400">
                Hệ thống quản lý nhà trường
              </span>
            </span>
          ) : (
            <span className="sr-only">Trường Tiểu học Sơn Tây</span>
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Điều hướng chính">
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.label}>
              {!collapsed ? (
                <p className="px-2.5 pb-1.5 text-[11.5px] font-semibold text-slate-400">
                  {group.label}
                </p>
              ) : (
                <p className="sr-only">{group.label}</p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavEntry
                    key={item.label}
                    item={item}
                    path={path}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <div className={cn("flex items-center gap-2.5 rounded-xl px-2 py-2", collapsed && "justify-center")}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground">
            HT
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-white">Hiệu trưởng</span>
              <span className="block truncate text-[11.5px] text-slate-400">Chưa gắn đăng nhập</span>
            </span>
          ) : null}
        </div>
        {showCollapse ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="mt-1 hidden h-8 w-full items-center justify-center gap-2 rounded-lg text-[12.5px] font-medium text-slate-400 transition-colors duration-150 hover:bg-sidebar-accent hover:text-white lg:flex"
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          >
            <ChevronsLeft
              className={cn("size-4 transition-transform duration-150", collapsed && "rotate-180")}
            />
            {!collapsed ? <span>Thu gọn</span> : null}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function NavEntry({
  item,
  path,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  path: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = item.match?.(path) ?? false;
  const [open, setOpen] = useState(active);
  const Icon = item.icon;
  const showChildren = Boolean(item.children?.length) && !collapsed && (open || active);

  const body = (
    <>
      {active && !collapsed ? (
        <span className="absolute top-1 bottom-1 left-0 w-[3px] rounded-r bg-sidebar-primary" />
      ) : null}
      <Icon className={cn("size-[18px] shrink-0", active ? "text-sidebar-primary" : "text-slate-400")} />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.disabled ? (
            <span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              Sắp có
            </span>
          ) : null}
          {item.children?.length ? (
            <ChevronDown
              className={cn(
                "size-3.5 text-slate-500 transition-transform duration-150",
                showChildren && "rotate-180"
              )}
            />
          ) : null}
        </>
      ) : null}
    </>
  );

  const className = cn(
    "relative flex w-full items-center gap-2.5 rounded-lg py-2 text-[13.5px] font-medium transition-colors duration-150",
    collapsed ? "justify-center px-0" : "px-2.5",
    active && "bg-sidebar-accent text-white",
    !active && !item.disabled && "text-slate-300 hover:bg-sidebar-accent hover:text-white",
    item.disabled && "cursor-not-allowed text-slate-500"
  );

  return (
    <div>
      {item.disabled ? (
        <span className={className} title="Chức năng sẽ mở khi có dữ liệu" aria-disabled>
          {body}
        </span>
      ) : item.children?.length && !collapsed ? (
        <button
          type="button"
          className={className}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={showChildren}
        >
          {body}
        </button>
      ) : (
        <Link
          href={item.href ?? "/"}
          onClick={onNavigate}
          className={className}
          title={collapsed ? item.label : undefined}
        >
          {body}
        </Link>
      )}
      {showChildren ? (
        <div className="mt-0.5 ml-4 flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
          {item.children!.map((child) => {
            const childActive = path === child.href || path.startsWith(`${child.href}/`);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center justify-between rounded-md px-2 py-1.5 text-[12.5px] font-medium transition-colors duration-150",
                  childActive
                    ? "bg-sidebar-accent text-white"
                    : "text-slate-400 hover:bg-sidebar-accent hover:text-white"
                )}
              >
                <span className="truncate">{child.label}</span>
                {child.hint ? (
                  <span className="ml-2 font-mono text-[10px] text-slate-500">{child.hint}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
