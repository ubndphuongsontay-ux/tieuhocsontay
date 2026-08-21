"use client";

import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import Link from "@/components/AppLink";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DashboardAlert } from "@/lib/dashboard";
import { pageTitleFromPath, roleLabel } from "@/lib/nav";
import { useSidebar } from "./SidebarProvider";

type CampusOpt = { code: string; name: string };

export function TopHeader({
  yearCode,
  campuses,
  alerts,
  userName = "Người dùng",
  userUsername = "",
  userRole = "",
}: {
  yearCode: string;
  campuses: CampusOpt[];
  alerts: DashboardAlert[];
  userName?: string;
  userUsername?: string;
  userRole?: string;
}) {
  const path = usePathname();
  const router = useRouter();
  const { setMobileOpen } = useSidebar();
  const searchRef = useRef<HTMLInputElement>(null);
  const match = path.match(/^\/phan-hieu\/([^/]+)/);
  const currentCode = match?.[1] ?? "ALL";
  const campusName = campuses.find((c) => c.code === currentCode)?.name;
  const title = pageTitleFromPath(path, campusName);
  const actionable = alerts.filter((a) => a.tone !== "info");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="flex h-full items-center gap-3 px-3 sm:px-5 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Mở menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-5" />
        </Button>

        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-foreground">{title}</p>
          <p className="hidden truncate text-[12px] font-medium text-muted-foreground sm:block">
            Trường Tiểu học Sơn Tây
          </p>
        </div>

        <form action="/tim" method="get" className="mx-2 hidden min-w-0 flex-1 justify-center md:flex">
          <label className="relative w-full max-w-xl">
            <span className="sr-only">Tìm kiếm toàn hệ thống</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              name="q"
              type="search"
              placeholder="Tìm học sinh, giáo viên, lớp, CCCD"
              className="h-10 rounded-[12px] border-border bg-background pr-16 pl-9"
            />
            <Kbd className="absolute top-1/2 right-2.5 -translate-y-1/2 hidden lg:inline-flex">
              Ctrl K
            </Kbd>
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Tìm kiếm"
            onClick={() => router.push("/tim")}
          >
            <Search className="size-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden h-9 gap-1.5 sm:inline-flex">
                Năm học {yearCode}
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Năm học đang xem</DropdownMenuLabel>
              <DropdownMenuItem disabled>{yearCode} (hiện hành)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden h-9 max-w-[10rem] gap-1.5 lg:inline-flex">
                <span className="truncate">
                  {currentCode === "ALL" ? "Toàn trường" : campusName ?? currentCode}
                </span>
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuLabel>Lọc phân hiệu</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push("/")}>Toàn trường</DropdownMenuItem>
              <DropdownMenuSeparator />
              {campuses.map((c) => (
                <DropdownMenuItem key={c.code} onClick={() => router.push(`/phan-hieu/${c.code}`)}>
                  {c.name}
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{c.code}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Thông báo" className="relative">
                <Bell className="size-4" />
                {actionable.length > 0 ? (
                  <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive" />
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <p className="border-b px-3 py-2 text-sm font-semibold">Thông báo</p>
              {alerts.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">Không có cảnh báo.</p>
              ) : (
                <ul className="max-h-72 overflow-auto py-1">
                  {alerts.map((a) => (
                    <li key={a.id}>
                      <Link href={a.href ?? "/"} className="block px-3 py-2 text-sm transition-colors duration-150 hover:bg-accent">
                        <span className="font-semibold">{a.title}</span>
                        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted-foreground">
                          {a.detail}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 pl-1.5">
                <span className="flex size-6 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">
                  {userName.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-[12.5px] leading-none font-semibold">{userName}</span>
                  <span className="mt-0.5 block text-[11px] leading-none text-muted-foreground">
                    {roleLabel(userRole)}
                  </span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <span className="block">{userName}</span>
                {userUsername ? (
                  <span className="mt-0.5 block font-normal text-muted-foreground">{userUsername}</span>
                ) : null}
              </DropdownMenuLabel>
              <DropdownMenuItem disabled>{userRole ? roleLabel(userRole) : "Chưa có vai trò"}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  const form = document.createElement("form");
                  form.method = "post";
                  form.action = "/logout";
                  document.body.appendChild(form);
                  form.submit();
                }}
              >
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
