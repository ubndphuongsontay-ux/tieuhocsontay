import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  MapPin,
  School,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

export type NavItem = {
  href?: string;
  label: string;
  icon: LucideIcon;
  match?: (path: string) => boolean;
  disabled?: boolean;
  children?: { href: string; label: string; hint?: string }[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export function schoolNav(campuses: { code: string; name: string }[]): NavGroup[] {
  return [
    {
      label: "Điều hành",
      items: [
        { href: "/", label: "Tổng quan", icon: LayoutDashboard, match: (p) => p === "/" },
        {
          href: "/hoc-sinh",
          label: "Học sinh",
          icon: GraduationCap,
          match: (p) => p.startsWith("/hoc-sinh") || p.startsWith("/tim"),
        },
        { href: "/nhan-su", label: "Giáo viên – nhân sự", icon: Users, match: (p) => p.startsWith("/nhan-su") },
        { href: "/lop", label: "Lớp học", icon: School, match: (p) => p.startsWith("/lop") },
        { href: "/phan-cong", label: "Phân công GV", icon: UserCog, match: (p) => p.startsWith("/phan-cong") },
        { href: "/diem-danh", label: "Điểm danh", icon: ClipboardCheck, match: (p) => p.startsWith("/diem-danh") },
        { href: "/tasks", label: "Công việc", icon: ListChecks, match: (p) => p.startsWith("/tasks") },
        { href: "/approvals", label: "Phê duyệt", icon: ShieldCheck, match: (p) => p.startsWith("/approvals") },
      ],
    },
    {
      label: "Tổ chức",
      items: [
        {
          href: "/#phan-hieu",
          label: "Phân hiệu",
          icon: MapPin,
          match: (p) => p.startsWith("/phan-hieu"),
          children: campuses.map((c) => ({
            href: `/phan-hieu/${c.code}`,
            label: c.name,
            hint: c.code,
          })),
        },
      ],
    },
  ];
}

export function pageTitleFromPath(path: string, campusName?: string) {
  if (path === "/") return "Tổng quan";
  if (path.startsWith("/nhan-su")) return "Giáo viên – nhân sự";
  if (path.startsWith("/tim")) return "Tìm kiếm";
  if (path.startsWith("/phan-hieu")) return campusName ?? "Phân hiệu";
  if (path.startsWith("/lop") && path.includes("diem-danh")) return "Điểm danh";
  if (path.startsWith("/lop")) return "Lớp học";
  if (path.startsWith("/phan-cong")) return "Phân công giáo viên";
  if (path.startsWith("/hoc-sinh")) return "Học sinh";
  if (path.startsWith("/diem-danh")) return "Điểm danh";
  if (path.startsWith("/tasks")) return "Công việc";
  if (path.startsWith("/approvals")) return "Phê duyệt";
  return "Điều hành";
}

export function roleLabel(role: string) {
  const map: Record<string, string> = {
    principal: "Hiệu trưởng",
    vice_principal: "Phó Hiệu trưởng",
    department_head: "Tổ trưởng",
    department_deputy: "Tổ phó",
    teacher: "Giáo viên",
    homeroom_teacher: "Giáo viên chủ nhiệm",
    staff: "Nhân viên",
    campus_coordinator: "Đầu mối phân hiệu",
    system_admin: "Quản trị hệ thống",
  };
  return map[role] ?? role;
}
