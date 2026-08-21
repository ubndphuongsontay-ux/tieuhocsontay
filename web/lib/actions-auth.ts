"use server";

import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie, newSession, setSessionCookie } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { sql } from "@/lib/db";
import { loginSchema } from "@/lib/validators";

export async function loginAction(_prev: { error?: string } | null, formData: FormData) {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }
  const username = parsed.data.username;
  const [row] = await sql<
    { id: string; username: string; full_name: string; is_active: boolean; password_hash: string }[]
  >`
    select p.id::text, p.username, p.full_name, p.is_active, c.password_hash
    from profiles p
    join local_credentials c on c.profile_id = p.id
    where lower(p.username) = lower(${username})
    limit 1
  `;
  if (!row || !row.is_active || !verifyPassword(parsed.data.password, row.password_hash)) {
    return { error: "Tài khoản hoặc mật khẩu không đúng" };
  }
  await setSessionCookie(newSession({ id: row.id, username: row.username, full_name: row.full_name }));
  await writeAudit({
    actorId: row.id,
    action: "login",
    entityType: "session",
    entityId: row.id,
  });
  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
