import postgres from "postgres";
import { randomBytes, scryptSync } from "node:crypto";

const url = process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:54329/th_son_tay";
const sql = postgres(url, { max: 1 });
const password = process.env.SEED_PASSWORD ?? "SonTay@2026";

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

async function upsertUser({ username, name, role, campusCode }) {
  const [school] = await sql`select id from schools limit 1`;
  let campusId = null;
  if (campusCode) {
    const [c] = await sql`select id from campuses where code = ${campusCode}`;
    campusId = c?.id ?? null;
  }
  let classId = null;
  if (role === "homeroom_teacher") {
    const [cl] = await sql`
      select c.id
      from classes c
      join school_years y on y.id = c.school_year_id
      join campuses camp on camp.id = c.campus_id
      where y.is_current and camp.code = ${campusCode ?? "TH"}
      order by c.grade, c.name
      limit 1
    `;
    classId = cl?.id ?? null;
  }

  const [existing] = await sql`
    select id from profiles
    where lower(username) = ${username.toLowerCase()}
    limit 1
  `;
  let profileId = existing?.id;
  if (!profileId) {
    const [p] = await sql`
      insert into profiles (username, full_name, is_active)
      values (${username}, ${name}, true)
      returning id
    `;
    profileId = p.id;
  } else {
    await sql`update profiles set username = ${username}, full_name = ${name}, is_active = true where id = ${profileId}`;
  }

  const hash = hashPassword(password);
  await sql`
    insert into local_credentials (profile_id, password_hash)
    values (${profileId}, ${hash})
    on conflict (profile_id) do update set password_hash = excluded.password_hash
  `;
  const [dup] = await sql`
    select id from user_role_scopes
    where profile_id = ${profileId} and role = ${role}
      and coalesce(campus_id::text,'') = coalesce(${campusId}::text,'')
      and coalesce(class_id::text,'') = coalesce(${classId}::text,'')
    limit 1
  `;
  if (!dup) {
    await sql`
      insert into user_role_scopes (profile_id, role, school_id, campus_id, class_id, is_active)
      values (${profileId}, ${role}, ${school.id}, ${campusId}, ${classId}, true)
    `;
  }
  return { username, role, classId };
}

const users = [
  { username: "hieutruong", name: "Hiệu trưởng", role: "principal" },
  { username: "phoht", name: "Phó Hiệu trưởng Phú Thịnh", role: "vice_principal", campusCode: "PT" },
  { username: "gvcn", name: "GVCN Trung Hưng", role: "homeroom_teacher", campusCode: "TH" },
  { username: "admin", name: "Quản trị hệ thống", role: "system_admin" },
];

for (const u of users) {
  const r = await upsertUser(u);
  console.log("seeded", r.username, r.role, r.classId ?? "");
}
await sql.end();
