import { redirect } from "next/navigation";
import { clearSessionCookie, getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import type { Access, RoleScope } from "@/lib/permissions";

export * from "@/lib/permissions";
export type { Access };

export async function getAccess(): Promise<Access | null> {
  const session = await getSession();
  if (!session) return null;
  const [profile] = await sql<{ id: string; username: string | null; email: string | null; full_name: string; staff_id: string | null; is_active: boolean }[]>`
    select id::text, username, email, full_name, staff_id::text, is_active
    from profiles
    where id = ${session.sub}::uuid
    limit 1
  `;
  if (!profile?.is_active) return null;
  const scopes = await sql<RoleScope[]>`
    select
      id::text,
      role,
      campus_id::text,
      grade,
      class_id::text,
      department_id::text,
      domain
    from user_role_scopes
    where profile_id = ${profile.id}::uuid
      and is_active
      and (starts_on is null or starts_on <= current_date)
      and (ends_on is null or ends_on >= current_date)
  `;
  const roles = [...new Set(scopes.map((s) => s.role))];
  const schoolWide = roles.includes("principal") || roles.includes("system_admin");
  const campusIds = [...new Set(scopes.map((s) => s.campus_id).filter((x): x is string => Boolean(x)))];
  const classIds = [...new Set(scopes.map((s) => s.class_id).filter((x): x is string => Boolean(x)))];
  if (classIds.length > 0) {
    const extra = await sql<{ campus_id: string }[]>`
      select distinct campus_id::text
      from classes
      where id in ${sql(classIds)}
    `;
    for (const row of extra) {
      if (!campusIds.includes(row.campus_id)) campusIds.push(row.campus_id);
    }
  }
  return {
    profileId: profile.id,
    name: profile.full_name,
    username: profile.username ?? undefined,
    email: profile.email ?? undefined,
    roles,
    scopes,
    schoolWide,
    campusIds,
    classIds,
  };
}

export async function requireAccess(): Promise<Access> {
  const access = await getAccess();
  if (!access) {
    await clearSessionCookie();
    redirect("/login");
  }
  return access;
}
