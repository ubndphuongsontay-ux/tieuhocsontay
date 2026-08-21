import { redirect } from "next/navigation";
import { cache } from "react";
import { clearSessionCookie, getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import type { Access, RoleScope } from "@/lib/permissions";

export * from "@/lib/permissions";
export type { Access };

type AccessRow = {
  id: string;
  username: string | null;
  email: string | null;
  full_name: string;
  staff_id: string | null;
  is_active: boolean;
  scopes: RoleScope[];
  extra_campus_ids: string[];
};

export const getAccess = cache(async function getAccess(): Promise<Access | null> {
  const session = await getSession();
  if (!session) return null;
  const [row] = await sql<AccessRow[]>`
    select
      p.id::text,
      p.username,
      p.email,
      p.full_name,
      p.staff_id::text,
      p.is_active,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', s.id::text,
          'role', s.role,
          'campus_id', s.campus_id::text,
          'grade', s.grade,
          'class_id', s.class_id::text,
          'department_id', s.department_id::text,
          'domain', s.domain
        ))
        from user_role_scopes s
        where s.profile_id = p.id
          and s.is_active
          and (s.starts_on is null or s.starts_on <= current_date)
          and (s.ends_on is null or s.ends_on >= current_date)
      ), '[]'::jsonb) as scopes,
      coalesce((
        select jsonb_agg(distinct cl.campus_id::text)
        from user_role_scopes s
        join classes cl on cl.id = s.class_id
        where s.profile_id = p.id
          and s.is_active
          and s.class_id is not null
          and (s.starts_on is null or s.starts_on <= current_date)
          and (s.ends_on is null or s.ends_on >= current_date)
      ), '[]'::jsonb) as extra_campus_ids
    from profiles p
    where p.id = ${session.sub}::uuid
    limit 1
  `;
  if (!row?.is_active) return null;
  const scopes = row.scopes ?? [];
  const roles = [...new Set(scopes.map((s) => s.role))];
  const schoolWide = roles.includes("principal") || roles.includes("system_admin");
  const campusIds = [
    ...new Set([
      ...scopes.map((s) => s.campus_id).filter((x): x is string => Boolean(x)),
      ...(row.extra_campus_ids ?? []),
    ]),
  ];
  const classIds = [...new Set(scopes.map((s) => s.class_id).filter((x): x is string => Boolean(x)))];
  return {
    profileId: row.id,
    name: row.full_name,
    username: row.username ?? undefined,
    email: row.email ?? undefined,
    roles,
    scopes,
    schoolWide,
    campusIds,
    classIds,
  };
});

export async function requireAccess(): Promise<Access> {
  const access = await getAccess();
  if (!access) {
    await clearSessionCookie();
    redirect("/login");
  }
  return access;
}
