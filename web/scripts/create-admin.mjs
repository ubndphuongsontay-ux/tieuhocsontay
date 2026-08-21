import postgres from "postgres";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const sql = postgres("postgresql://postgres@127.0.0.1:54329/th_son_tay", { max: 1 });
const username = "admin";
const password = "SonTay@2026";

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(pw, stored) {
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const next = scryptSync(pw, salt, 32);
  const prev = Buffer.from(hash, "hex");
  return next.length === prev.length && timingSafeEqual(next, prev);
}

const [school] = await sql`select id from schools limit 1`;
if (!school) throw new Error("Chưa có trường trong database");

let [profile] = await sql`
  select id, username, full_name, is_active from profiles
  where lower(username) = ${username} or lower(email) = 'admin@sontay.edu.vn'
  limit 1
`;
if (!profile) {
  [profile] = await sql`
    insert into profiles (username, full_name, is_active)
    values (${username}, 'Quản trị hệ thống', true)
    returning id, username, full_name, is_active
  `;
} else {
  await sql`
    update profiles
    set username = ${username}, is_active = true, full_name = 'Quản trị hệ thống'
    where id = ${profile.id}
  `;
}

const hash = hashPassword(password);
await sql`
  insert into local_credentials (profile_id, password_hash)
  values (${profile.id}, ${hash})
  on conflict (profile_id) do update set password_hash = excluded.password_hash, updated_at = now()
`;

const [scope] = await sql`
  select id from user_role_scopes
  where profile_id = ${profile.id} and role = 'system_admin' and is_active
  limit 1
`;
if (!scope) {
  await sql`
    insert into user_role_scopes (profile_id, role, school_id, is_active)
    values (${profile.id}, 'system_admin', ${school.id}, true)
  `;
}

const [cred] = await sql`select password_hash from local_credentials where profile_id = ${profile.id}`;
const ok = verifyPassword(password, cred.password_hash);
console.log(JSON.stringify({ username, password, profileId: profile.id, passwordVerified: ok }, null, 2));
await sql.end();
if (!ok) process.exit(1);
