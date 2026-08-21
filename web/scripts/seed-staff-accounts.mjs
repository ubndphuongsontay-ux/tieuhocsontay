import postgres from "postgres";
import { randomBytes, scryptSync } from "node:crypto";
import { writeFileSync } from "node:fs";

function stripVietnamese(input) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function titleAscii(part) {
  const raw = stripVietnamese(part).replace(/[^A-Za-z]/g, "");
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function usernameFromFullName(fullName) {
  const parts = fullName.trim().split(/\s+/).map(titleAscii).filter(Boolean);
  if (!parts.length) return "Gv";
  const given = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map((p) => p.charAt(0).toUpperCase()).join("");
  return `${given}${initials}`;
}

function uniqueUsername(base, taken) {
  let candidate = base || "Gv";
  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${base}${n}`;
    n += 1;
  }
  return candidate;
}

const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:54329/th_son_tay", { max: 1 });
const password = process.env.SEED_PASSWORD ?? "SonTay@2026";

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

const staff = await sql`
  select s.id, s.full_name, s.campus_id, c.code as campus_code, c.name as campus_name
  from staff s
  join campuses c on c.id = s.campus_id
  where s.is_active
  order by c.sort_order, s.full_name
`;

const existing = await sql`select lower(username) as u from profiles where username is not null`;
const taken = new Set(existing.map((r) => r.u));

const [school] = await sql`select id from schools limit 1`;
const hash = hashPassword(password);
const rows = [];

for (const person of staff) {
  const [linked] = await sql`select id, username from profiles where staff_id = ${person.id} limit 1`;
  let username;
  let profileId;
  if (linked?.username) {
    username = linked.username;
    profileId = linked.id;
  } else {
    username = uniqueUsername(usernameFromFullName(person.full_name), taken);
    taken.add(username.toLowerCase());
    if (linked) {
      profileId = linked.id;
      await sql`update profiles set username = ${username}, full_name = ${person.full_name}, is_active = true where id = ${profileId}`;
    } else {
      const [p] = await sql`
        insert into profiles (username, full_name, staff_id, is_active)
        values (${username}, ${person.full_name}, ${person.id}, true)
        returning id
      `;
      profileId = p.id;
    }
  }

  await sql`
    insert into local_credentials (profile_id, password_hash)
    values (${profileId}, ${hash})
    on conflict (profile_id) do update set password_hash = excluded.password_hash, updated_at = now()
  `;

  const [hasTeacher] = await sql`
    select id from user_role_scopes
    where profile_id = ${profileId} and role in ('teacher','homeroom_teacher','staff') and is_active
    limit 1
  `;
  if (!hasTeacher) {
    await sql`
      insert into user_role_scopes (profile_id, role, school_id, campus_id, is_active)
      values (${profileId}, 'teacher', ${school.id}, ${person.campus_id}, true)
    `;
  }

  const homeroomClasses = await sql`
    select id from classes
    where homeroom_staff_id = ${person.id}
    union
    select class_id as id from staff_assignments
    where staff_id = ${person.id} and is_homeroom and is_active and class_id is not null
  `;
  for (const cl of homeroomClasses) {
    await sql`
      insert into user_role_scopes (profile_id, role, school_id, campus_id, class_id, is_active)
      select ${profileId}, 'homeroom_teacher', ${school.id}, c.campus_id, c.id, true
      from classes c
      where c.id = ${cl.id}
        and not exists (
          select 1 from user_role_scopes s
          where s.profile_id = ${profileId} and s.role = 'homeroom_teacher' and s.class_id = c.id and s.is_active
        )
    `;
  }

  const subjectClasses = await sql`
    select distinct class_id as id
    from staff_assignments
    where staff_id = ${person.id} and is_active and not is_homeroom and class_id is not null
  `;
  for (const cl of subjectClasses) {
    await sql`
      insert into user_role_scopes (profile_id, role, school_id, campus_id, class_id, is_active)
      select ${profileId}, 'teacher', ${school.id}, c.campus_id, c.id, true
      from classes c
      where c.id = ${cl.id}
        and not exists (
          select 1 from user_role_scopes s
          where s.profile_id = ${profileId} and s.role = 'teacher' and s.class_id = c.id and s.is_active
        )
    `;
  }

  rows.push({
    username,
    full_name: person.full_name,
    campus: person.campus_code,
    campus_name: person.campus_name,
  });
}

const csv = [
  "username,full_name,campus,campus_name,password",
  ...rows.map((r) => `${r.username},"${r.full_name.replaceAll('"', '""')}",${r.campus},${r.campus_name},${password}`),
].join("\n");
writeFileSync(new URL("./accounts-staff.csv", import.meta.url), csv, "utf8");

console.log(`created_or_updated ${rows.length} teacher accounts`);
console.log("example", rows.find((r) => r.username === "HuongHT") ?? rows[0]);
await sql.end();
