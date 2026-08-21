import { sql } from "./db";

export type CampusOverview = {
  id: string;
  code: string;
  name: string;
  former_name: string | null;
  class_letter: string | null;
  sort_order: number;
  staff_count: number;
  class_count: number;
  student_count: number;
};

export type SchoolYear = {
  id: string;
  code: string;
  starts_on: string;
  ends_on: string;
};

export async function getCurrentYear(): Promise<SchoolYear | null> {
  const rows = await sql<SchoolYear[]>`
    select id::text, code, starts_on::text, ends_on::text
    from school_years
    where is_current
    limit 1
  `;
  return rows[0] ?? null;
}

export async function getSchoolName(): Promise<string> {
  const rows = await sql<{ name: string }[]>`select name from schools limit 1`;
  return rows[0]?.name ?? "Trường Tiểu học Sơn Tây";
}

export async function getCampusOverview(): Promise<CampusOverview[]> {
  return sql<CampusOverview[]>`
    select
      c.id::text,
      c.code,
      c.name,
      c.former_name,
      c.class_letter,
      c.sort_order,
      (select count(*)::int from staff s where s.campus_id = c.id) as staff_count,
      (
        select count(*)::int
        from classes cl
        join school_years y on y.id = cl.school_year_id
        where cl.campus_id = c.id and y.is_current
      ) as class_count,
      (
        select count(*)::int
        from v_enrollments_current v
        where v.campus_code = c.code
      ) as student_count
    from campuses c
    order by c.sort_order
  `;
}

export async function getTotals() {
  const [row] = await sql<{
    students: number;
    staff: number;
    classes: number;
    campuses: number;
  }[]>`
    select
      (select count(*)::int from v_enrollments_current) as students,
      (select count(*)::int from staff where is_active) as staff,
      (
        select count(*)::int
        from classes cl
        join school_years y on y.id = cl.school_year_id
        where y.is_current
      ) as classes,
      (select count(*)::int from campuses) as campuses
  `;
  return row;
}

export type CampusDetail = {
  id: string;
  code: string;
  name: string;
  former_name: string | null;
  class_letter: string | null;
};

export type ClassRow = {
  id: string;
  name: string;
  grade: number;
  enrollment_count: number;
};

export type StaffRow = {
  id: string;
  full_name: string;
  gender: string | null;
  phone: string | null;
  education_level: string | null;
  employment_kind: string | null;
  is_party_member: boolean | null;
};

export async function getCampus(code: string): Promise<CampusDetail | null> {
  const rows = await sql<CampusDetail[]>`
    select id::text, code, name, former_name, class_letter
    from campuses
    where code = ${code.toUpperCase()}
    limit 1
  `;
  return rows[0] ?? null;
}

export async function getCampusClasses(code: string): Promise<ClassRow[]> {
  return sql<ClassRow[]>`
    select
      c.id::text,
      c.name,
      c.grade,
      coalesce(sz.enrollment_count, 0)::int as enrollment_count
    from classes c
    join campuses camp on camp.id = c.campus_id
    join school_years y on y.id = c.school_year_id
    left join v_class_sizes sz on sz.class_id = c.id
    where camp.code = ${code.toUpperCase()} and y.is_current
    order by c.grade, c.name
  `;
}

export async function getCampusStaff(code: string): Promise<StaffRow[]> {
  return sql<StaffRow[]>`
    select
      s.id::text,
      s.full_name,
      s.gender,
      s.phone,
      s.education_level,
      s.employment_kind,
      s.is_party_member
    from staff s
    join campuses c on c.id = s.campus_id
    where c.code = ${code.toUpperCase()}
    order by s.full_name
  `;
}

export type RosterStudent = {
  student_id: string;
  enrollment_id: string;
  full_name: string;
  dob: string | null;
  gender: string | null;
  ethnicity: string | null;
  national_id: string | null;
};

export type ClassDetail = {
  id: string;
  name: string;
  grade: number;
  campus_code: string;
  campus_name: string;
};

export async function getClassDetail(id: string): Promise<ClassDetail | null> {
  const rows = await sql<ClassDetail[]>`
    select
      c.id::text,
      c.name,
      c.grade,
      camp.code as campus_code,
      camp.name as campus_name
    from classes c
    join campuses camp on camp.id = c.campus_id
    where c.id = ${id}::uuid
    limit 1
  `;
  return rows[0] ?? null;
}

export async function getClassRoster(id: string): Promise<RosterStudent[]> {
  return sql<RosterStudent[]>`
    select
      student_id::text,
      enrollment_id::text,
      full_name,
      dob::text,
      gender,
      ethnicity,
      national_id
    from v_enrollments_current
    where class_id = ${id}::uuid
    order by full_name
  `;
}

export type StudentProfile = {
  id: string;
  full_name: string;
  dob: string | null;
  gender: string | null;
  ethnicity: string | null;
  national_id: string | null;
  national_id_raw: string | null;
  bgd_code: string | null;
  class_id: string | null;
  class_name: string | null;
  grade: number | null;
  campus_id: string | null;
  campus_code: string | null;
  campus_name: string | null;
  enrollment_id: string | null;
  status: string | null;
};

export async function getStudent(id: string): Promise<StudentProfile | null> {
  const rows = await sql<StudentProfile[]>`
    select
      s.id::text,
      s.full_name,
      s.dob::text,
      s.gender,
      s.ethnicity,
      s.national_id,
      s.national_id_raw,
      s.bgd_code,
      v.class_id::text,
      v.class_name,
      v.grade,
      v.campus_id::text,
      v.campus_code,
      v.campus_name,
      v.enrollment_id::text,
      v.status
    from students s
    left join v_enrollments_current v on v.student_id = s.id
    where s.id = ${id}::uuid
    limit 1
  `;
  return rows[0] ?? null;
}

export type ContactRow = {
  id: string;
  relation: string;
  full_name: string | null;
  phone: string | null;
  is_primary: boolean;
};

export async function getStudentContacts(id: string): Promise<ContactRow[]> {
  return sql<ContactRow[]>`
    select id::text, relation, full_name, phone, is_primary
    from student_contacts
    where student_id = ${id}::uuid
    order by
      case relation when 'me' then 1 when 'cha' then 2 else 3 end,
      created_at
  `;
}

export type SupportRow = {
  id: string;
  kind: string;
  label: string;
  note: string | null;
};

export async function getStudentSupports(id: string): Promise<SupportRow[]> {
  return sql<SupportRow[]>`
    select id::text, kind, label, note
    from student_supports
    where student_id = ${id}::uuid
      and closed_on is null
    order by kind, label
  `;
}

export type EnrollmentHistory = {
  id: string;
  class_name: string;
  campus_name: string;
  year_code: string;
  started_on: string;
  ended_on: string | null;
  status: string;
};

export async function getEnrollmentHistory(id: string): Promise<EnrollmentHistory[]> {
  return sql<EnrollmentHistory[]>`
    select
      e.id::text,
      cl.name as class_name,
      camp.name as campus_name,
      y.code as year_code,
      e.started_on::text,
      e.ended_on::text,
      e.status
    from enrollments e
    join classes cl on cl.id = e.class_id
    join campuses camp on camp.id = cl.campus_id
    join school_years y on y.id = e.school_year_id
    where e.student_id = ${id}::uuid
    order by e.started_on desc, e.created_at desc
  `;
}

export type ClassOption = {
  id: string;
  name: string;
  grade: number;
  campus_code: string;
  campus_name: string;
};

export async function getCurrentClasses(): Promise<ClassOption[]> {
  return sql<ClassOption[]>`
    select
      cl.id::text,
      cl.name,
      cl.grade,
      camp.code as campus_code,
      camp.name as campus_name
    from classes cl
    join campuses camp on camp.id = cl.campus_id
    join school_years y on y.id = cl.school_year_id
    where y.is_current
    order by camp.sort_order, cl.grade, cl.name
  `;
}

export type SearchHit = {
  kind: "hs" | "gv";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export async function searchPeople(q: string): Promise<SearchHit[]> {
  const term = `%${q.trim()}%`;
  const students = await sql<SearchHit[]>`
    select
      'hs'::text as kind,
      student_id::text as id,
      full_name as title,
      (campus_name || ' · ' || class_name) as subtitle,
      ('/hoc-sinh/' || student_id::text) as href
    from v_enrollments_current
    where full_name ilike ${term}
       or class_name ilike ${term}
       or coalesce(national_id, '') ilike ${term}
    order by full_name
    limit 30
  `;
  const staff = await sql<SearchHit[]>`
    select
      'gv'::text as kind,
      s.id::text as id,
      s.full_name as title,
      ('GV · ' || c.name) as subtitle,
      ('/phan-hieu/' || c.code) as href
    from staff s
    join campuses c on c.id = s.campus_id
    where s.full_name ilike ${term}
       or coalesce(s.phone, '') ilike ${term}
       or coalesce(s.national_id, '') ilike ${term}
    order by s.full_name
    limit 15
  `;
  return [...students, ...staff];
}

export type HomeroomOccupancy = {
  staff_id: string;
  class_id: string;
  class_name: string;
  campus_code: string;
  campus_name: string;
};

export async function getCurrentHomerooms(): Promise<HomeroomOccupancy[]> {
  return sql<HomeroomOccupancy[]>`
    select
      c.homeroom_staff_id::text as staff_id,
      c.id::text as class_id,
      c.name as class_name,
      camp.code as campus_code,
      camp.name as campus_name
    from classes c
    join school_years y on y.id = c.school_year_id
    join campuses camp on camp.id = c.campus_id
    where y.is_current and c.homeroom_staff_id is not null
  `;
}

export async function getAllStaff(): Promise<(StaffRow & { campus_code: string; campus_name: string })[]> {
  return sql<(StaffRow & { campus_code: string; campus_name: string })[]>`
    select
      s.id::text,
      s.full_name,
      s.gender,
      s.phone,
      s.education_level,
      s.employment_kind,
      s.is_party_member,
      c.code as campus_code,
      c.name as campus_name
    from staff s
    join campuses c on c.id = s.campus_id
    order by c.sort_order, s.full_name
  `;
}

const emptyUuid = ["00000000-0000-0000-0000-000000000000"];

export type StudentDirectoryRow = {
  student_id: string;
  full_name: string;
  dob: string | null;
  gender: string | null;
  ethnicity: string | null;
  national_id: string | null;
  bgd_code: string | null;
  class_id: string;
  class_name: string;
  grade: number;
  campus_id: string;
  campus_code: string;
  campus_name: string;
  status: string;
  homeroom_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_relation: string | null;
  support_kinds: string | null;
  issues: string[];
};

export type QualityCount = { code: string; count: number };

export type StudentDirectoryStats = {
  total: number;
  nam: number;
  nu: number;
  chinh_sach: number;
  flagged: number;
  quality: QualityCount[];
};

const studentIssueWhere = (issue: string | null) => sql`
  (${issue}::text is null
    or (${issue} = 'missing_dob' and v.dob is null)
    or (${issue} = 'missing_gender' and v.gender is null)
    or (${issue} = 'missing_ethnicity' and coalesce(trim(v.ethnicity), '') = '')
    or (${issue} = 'missing_cccd' and coalesce(v.national_id, '') = '')
    or (${issue} = 'invalid_cccd' and v.national_id is not null and v.national_id !~ '^[0-9]{9}$' and v.national_id !~ '^[0-9]{12}$')
    or (${issue} = 'odd_age' and v.dob is not null and (extract(year from age(v.dob::timestamp)) < 5 or extract(year from age(v.dob::timestamp)) > 15))
    or (${issue} = 'missing_contact' and not exists (select 1 from student_contacts x where x.student_id = v.student_id))
    or (${issue} = 'missing_contact_phone' and exists (select 1 from student_contacts x where x.student_id = v.student_id)
        and not exists (select 1 from student_contacts x where x.student_id = v.student_id and coalesce(trim(x.phone), '') <> ''))
    or (${issue} = 'invalid_contact_phone' and ct.phone is not null and trim(ct.phone) <> '' and ct.phone !~ '^0[0-9]{9}$'))
`;

const studentIssuesExpr = sql`
  array_remove(array[
    case when v.dob is null then 'missing_dob' end,
    case when v.gender is null then 'missing_gender' end,
    case when coalesce(trim(v.ethnicity), '') = '' then 'missing_ethnicity' end,
    case when coalesce(v.national_id, '') = '' then 'missing_cccd' end,
    case when v.national_id is not null and v.national_id !~ '^[0-9]{9}$' and v.national_id !~ '^[0-9]{12}$' then 'invalid_cccd' end,
    case when v.dob is not null and (extract(year from age(v.dob::timestamp)) < 5 or extract(year from age(v.dob::timestamp)) > 15) then 'odd_age' end,
    case when not exists (select 1 from student_contacts x where x.student_id = v.student_id) then 'missing_contact' end,
    case when exists (select 1 from student_contacts x where x.student_id = v.student_id)
          and not exists (select 1 from student_contacts x where x.student_id = v.student_id and coalesce(trim(x.phone), '') <> '')
         then 'missing_contact_phone' end,
    case when ct.phone is not null and trim(ct.phone) <> '' and ct.phone !~ '^0[0-9]{9}$' then 'invalid_contact_phone' end
  ]::text[], null)
`;

export async function listStudentsDirectory(input: {
  term: string | null;
  campusCode: string | null;
  grade: number | null;
  gender: string | null;
  support: string | null;
  issue: string | null;
  classIds: string[] | null;
  campusIds: string[] | null;
  limit: number;
  offset: number;
}): Promise<{ rows: StudentDirectoryRow[]; stats: StudentDirectoryStats }> {
  const classIds = input.classIds;
  const campusIds = input.campusIds;
  const term = input.term;
  const scopeWhere = sql`
    (${term}::text is null
      or v.full_name ilike ${term}
      or v.class_name ilike ${term}
      or coalesce(v.national_id, '') ilike ${term}
      or coalesce(s.bgd_code, '') ilike ${term}
      or coalesce(ct.phone, '') ilike ${term}
      or coalesce(ct.full_name, '') ilike ${term})
    and (${input.campusCode}::text is null or v.campus_code = ${input.campusCode})
    and (${input.grade}::int is null or v.grade = ${input.grade})
    and (${input.gender}::text is null or v.gender = ${input.gender})
    and (${input.support}::text is null or exists (
      select 1 from student_supports sp
      where sp.student_id = v.student_id
        and sp.closed_on is null
        and sp.kind = ${input.support}
    ))
    and (${classIds}::uuid[] is null or v.class_id in ${sql(classIds ?? emptyUuid)})
    and (${campusIds}::uuid[] is null or v.campus_id in ${sql(campusIds ?? emptyUuid)})
  `;
  const where = sql`${scopeWhere} and ${studentIssueWhere(input.issue)}`;

  const [stats] = await sql<
    {
      total: number;
      nam: number;
      nu: number;
      chinh_sach: number;
      flagged: number;
      missing_dob: number;
      missing_gender: number;
      missing_ethnicity: number;
      missing_cccd: number;
      invalid_cccd: number;
      odd_age: number;
      missing_contact: number;
      missing_contact_phone: number;
      invalid_contact_phone: number;
    }[]
  >`
    select
      count(*) filter (where ${studentIssueWhere(input.issue)})::int as total,
      count(*) filter (where v.gender = 'nam' and ${studentIssueWhere(input.issue)})::int as nam,
      count(*) filter (where v.gender = 'nu' and ${studentIssueWhere(input.issue)})::int as nu,
      count(*) filter (
        where exists (
          select 1 from student_supports sp
          where sp.student_id = v.student_id and sp.closed_on is null and sp.kind = 'chinh_sach'
        ) and ${studentIssueWhere(input.issue)}
      )::int as chinh_sach,
      count(*) filter (where cardinality(${studentIssuesExpr}) > 0)::int as flagged,
      count(*) filter (where v.dob is null)::int as missing_dob,
      count(*) filter (where v.gender is null)::int as missing_gender,
      count(*) filter (where coalesce(trim(v.ethnicity), '') = '')::int as missing_ethnicity,
      count(*) filter (where coalesce(v.national_id, '') = '')::int as missing_cccd,
      count(*) filter (where v.national_id is not null and v.national_id !~ '^[0-9]{9}$' and v.national_id !~ '^[0-9]{12}$')::int as invalid_cccd,
      count(*) filter (where v.dob is not null and (extract(year from age(v.dob::timestamp)) < 5 or extract(year from age(v.dob::timestamp)) > 15))::int as odd_age,
      count(*) filter (where not exists (select 1 from student_contacts x where x.student_id = v.student_id))::int as missing_contact,
      count(*) filter (
        where exists (select 1 from student_contacts x where x.student_id = v.student_id)
          and not exists (select 1 from student_contacts x where x.student_id = v.student_id and coalesce(trim(x.phone), '') <> '')
      )::int as missing_contact_phone,
      count(*) filter (where ct.phone is not null and trim(ct.phone) <> '' and ct.phone !~ '^0[0-9]{9}$')::int as invalid_contact_phone
    from v_enrollments_current v
    join students s on s.id = v.student_id
    left join lateral (
      select full_name, phone, relation
      from student_contacts
      where student_id = v.student_id
      order by is_primary desc, (phone is not null) desc
      limit 1
    ) ct on true
    where ${scopeWhere}
  `;

  const rows = await sql<StudentDirectoryRow[]>`
    select
      v.student_id::text,
      v.full_name,
      v.dob::text,
      v.gender,
      v.ethnicity,
      v.national_id,
      s.bgd_code,
      v.class_id::text,
      v.class_name,
      v.grade,
      v.campus_id::text,
      v.campus_code,
      v.campus_name,
      v.status,
      st.full_name as homeroom_name,
      ct.full_name as contact_name,
      ct.phone as contact_phone,
      ct.relation as contact_relation,
      (
        select string_agg(distinct sp.kind, ',')
        from student_supports sp
        where sp.student_id = v.student_id and sp.closed_on is null
      ) as support_kinds,
      ${studentIssuesExpr} as issues
    from v_enrollments_current v
    join students s on s.id = v.student_id
    join classes c on c.id = v.class_id
    left join staff st on st.id = c.homeroom_staff_id
    left join lateral (
      select full_name, phone, relation
      from student_contacts
      where student_id = v.student_id
      order by is_primary desc, (phone is not null) desc
      limit 1
    ) ct on true
    where ${where}
    order by (cardinality(${studentIssuesExpr}) > 0) desc, v.campus_name, v.grade, v.class_name, v.full_name
    limit ${input.limit} offset ${input.offset}
  `;

  const qualityKeys = [
    "missing_dob",
    "missing_gender",
    "missing_ethnicity",
    "missing_cccd",
    "invalid_cccd",
    "odd_age",
    "missing_contact",
    "missing_contact_phone",
    "invalid_contact_phone",
  ] as const;
  const quality = stats
    ? qualityKeys.map((code) => ({ code, count: stats[code] })).filter((x) => x.count > 0)
    : [];

  return {
    rows: rows.map((r) => ({ ...r, issues: r.issues ?? [] })),
    stats: {
      total: stats?.total ?? 0,
      nam: stats?.nam ?? 0,
      nu: stats?.nu ?? 0,
      chinh_sach: stats?.chinh_sach ?? 0,
      flagged: stats?.flagged ?? 0,
      quality,
    },
  };
}

export type StaffDirectoryRow = {
  id: string;
  full_name: string;
  gender: string | null;
  dob: string | null;
  ethnicity: string | null;
  phone: string | null;
  national_id: string | null;
  education_level: string | null;
  it_level: string | null;
  foreign_language_level: string | null;
  political_theory_level: string | null;
  professional_qualification: string | null;
  employment_kind: string | null;
  is_party_member: boolean | null;
  is_active: boolean;
  campus_id: string;
  campus_code: string;
  campus_name: string;
  username: string | null;
  homeroom_classes: string | null;
  subject_count: number;
  issues: string[];
};

export type StaffDirectoryStats = {
  total: number;
  party: number;
  with_account: number;
  homeroom: number;
  flagged: number;
  quality: QualityCount[];
};

const staffIssueWhere = (issue: string | null) => sql`
  (${issue}::text is null
    or (${issue} = 'missing_gender' and s.gender is null)
    or (${issue} = 'missing_cccd' and coalesce(s.national_id, '') = '')
    or (${issue} = 'invalid_cccd' and s.national_id is not null and s.national_id !~ '^[0-9]{9}$' and s.national_id !~ '^[0-9]{12}$')
    or (${issue} = 'invalid_phone' and s.phone is not null and trim(s.phone) <> '' and s.phone !~ '^0[0-9]{9}$')
    or (${issue} = 'missing_education' and coalesce(trim(s.education_level), '') = '')
    or (${issue} = 'missing_employment' and s.employment_kind is null)
    or (${issue} = 'missing_account' and p.username is null)
    or (${issue} = 'odd_age' and s.dob is not null and (extract(year from age(s.dob::timestamp)) < 20 or extract(year from age(s.dob::timestamp)) > 70)))
`;

const staffIssuesExpr = sql`
  array_remove(array[
    case when s.gender is null then 'missing_gender' end,
    case when coalesce(s.national_id, '') = '' then 'missing_cccd' end,
    case when s.national_id is not null and s.national_id !~ '^[0-9]{9}$' and s.national_id !~ '^[0-9]{12}$' then 'invalid_cccd' end,
    case when s.phone is not null and trim(s.phone) <> '' and s.phone !~ '^0[0-9]{9}$' then 'invalid_phone' end,
    case when coalesce(trim(s.education_level), '') = '' then 'missing_education' end,
    case when s.employment_kind is null then 'missing_employment' end,
    case when p.username is null then 'missing_account' end,
    case when s.dob is not null and (extract(year from age(s.dob::timestamp)) < 20 or extract(year from age(s.dob::timestamp)) > 70) then 'odd_age' end
  ]::text[], null)
`;

export async function listStaffDirectory(input: {
  term: string | null;
  campusCode: string | null;
  gender: string | null;
  party: string | null;
  gvcn: boolean;
  issue: string | null;
  campusIds: string[] | null;
  limit: number;
  offset: number;
}): Promise<{ rows: StaffDirectoryRow[]; stats: StaffDirectoryStats }> {
  const campusIds = input.campusIds;
  const term = input.term;
  const scopeWhere = sql`
    s.is_active
    and (${term}::text is null
      or s.full_name ilike ${term}
      or coalesce(s.phone, '') ilike ${term}
      or coalesce(s.national_id, '') ilike ${term}
      or coalesce(p.username, '') ilike ${term})
    and (${input.campusCode}::text is null or c.code = ${input.campusCode})
    and (${input.gender}::text is null or s.gender = ${input.gender})
    and (
      ${input.party}::text is null
      or (${input.party} = 'yes' and s.is_party_member is true)
      or (${input.party} = 'no' and s.is_party_member is not true)
    )
    and (
      ${input.gvcn}::boolean is not true
      or exists (
        select 1 from classes cl
        join school_years y on y.id = cl.school_year_id
        where cl.homeroom_staff_id = s.id and y.is_current
      )
    )
    and (${campusIds}::uuid[] is null or s.campus_id in ${sql(campusIds ?? emptyUuid)})
  `;
  const where = sql`${scopeWhere} and ${staffIssueWhere(input.issue)}`;

  const [stats] = await sql<
    {
      total: number;
      party: number;
      with_account: number;
      homeroom: number;
      flagged: number;
      missing_gender: number;
      missing_cccd: number;
      invalid_cccd: number;
      invalid_phone: number;
      missing_education: number;
      missing_employment: number;
      missing_account: number;
      odd_age: number;
    }[]
  >`
    select
      count(*) filter (where ${staffIssueWhere(input.issue)})::int as total,
      count(*) filter (where s.is_party_member is true and ${staffIssueWhere(input.issue)})::int as party,
      count(*) filter (where p.username is not null and ${staffIssueWhere(input.issue)})::int as with_account,
      count(*) filter (
        where exists (
          select 1 from classes cl
          join school_years y on y.id = cl.school_year_id
          where cl.homeroom_staff_id = s.id and y.is_current
        ) and ${staffIssueWhere(input.issue)}
      )::int as homeroom,
      count(*) filter (where cardinality(${staffIssuesExpr}) > 0)::int as flagged,
      count(*) filter (where s.gender is null)::int as missing_gender,
      count(*) filter (where coalesce(s.national_id, '') = '')::int as missing_cccd,
      count(*) filter (where s.national_id is not null and s.national_id !~ '^[0-9]{9}$' and s.national_id !~ '^[0-9]{12}$')::int as invalid_cccd,
      count(*) filter (where s.phone is not null and trim(s.phone) <> '' and s.phone !~ '^0[0-9]{9}$')::int as invalid_phone,
      count(*) filter (where coalesce(trim(s.education_level), '') = '')::int as missing_education,
      count(*) filter (where s.employment_kind is null)::int as missing_employment,
      count(*) filter (where p.username is null)::int as missing_account,
      count(*) filter (where s.dob is not null and (extract(year from age(s.dob::timestamp)) < 20 or extract(year from age(s.dob::timestamp)) > 70))::int as odd_age
    from staff s
    join campuses c on c.id = s.campus_id
    left join profiles p on p.staff_id = s.id and p.is_active
    where ${scopeWhere}
  `;

  const rows = await sql<StaffDirectoryRow[]>`
    select
      s.id::text,
      s.full_name,
      s.gender,
      s.dob::text,
      s.ethnicity,
      s.phone,
      s.national_id,
      s.education_level,
      s.it_level,
      s.foreign_language_level,
      s.political_theory_level,
      s.professional_qualification,
      s.employment_kind,
      s.is_party_member,
      s.is_active,
      s.campus_id::text,
      c.code as campus_code,
      c.name as campus_name,
      p.username,
      (
        select string_agg(cl.name, ', ' order by cl.name)
        from classes cl
        join school_years y on y.id = cl.school_year_id
        where cl.homeroom_staff_id = s.id and y.is_current
      ) as homeroom_classes,
      (
        select count(*)::int
        from staff_assignments a
        where a.staff_id = s.id and a.is_active and not a.is_homeroom
      ) as subject_count,
      ${staffIssuesExpr} as issues
    from staff s
    join campuses c on c.id = s.campus_id
    left join profiles p on p.staff_id = s.id and p.is_active
    where ${where}
    order by (cardinality(${staffIssuesExpr}) > 0) desc, c.sort_order, s.full_name
    limit ${input.limit} offset ${input.offset}
  `;

  const qualityKeys = [
    "missing_gender",
    "missing_cccd",
    "invalid_cccd",
    "invalid_phone",
    "missing_education",
    "missing_employment",
    "missing_account",
    "odd_age",
  ] as const;
  const quality = stats
    ? qualityKeys.map((code) => ({ code, count: stats[code] })).filter((x) => x.count > 0)
    : [];

  return {
    rows: rows.map((r) => ({ ...r, issues: r.issues ?? [] })),
    stats: {
      total: stats?.total ?? 0,
      party: stats?.party ?? 0,
      with_account: stats?.with_account ?? 0,
      homeroom: stats?.homeroom ?? 0,
      flagged: stats?.flagged ?? 0,
      quality,
    },
  };
}

export type StaffProfile = StaffDirectoryRow & {
  assignments: { id: string; class_id: string; class_name: string; campus_code: string; subject: string | null; is_homeroom: boolean }[];
};

export async function getStaffProfile(id: string): Promise<StaffProfile | null> {
  const [row] = await sql<StaffDirectoryRow[]>`
    select
      s.id::text,
      s.full_name,
      s.gender,
      s.dob::text,
      s.ethnicity,
      s.phone,
      s.national_id,
      s.education_level,
      s.it_level,
      s.foreign_language_level,
      s.political_theory_level,
      s.professional_qualification,
      s.employment_kind,
      s.is_party_member,
      s.is_active,
      s.campus_id::text,
      c.code as campus_code,
      c.name as campus_name,
      p.username,
      (
        select string_agg(cl.name, ', ' order by cl.name)
        from classes cl
        join school_years y on y.id = cl.school_year_id
        where cl.homeroom_staff_id = s.id and y.is_current
      ) as homeroom_classes,
      (
        select count(*)::int
        from staff_assignments a
        where a.staff_id = s.id and a.is_active and not a.is_homeroom
      ) as subject_count
    from staff s
    join campuses c on c.id = s.campus_id
    left join profiles p on p.staff_id = s.id and p.is_active
    where s.id = ${id}::uuid
    limit 1
  `;
  if (!row) return null;
  const assignments = await sql<StaffProfile["assignments"]>`
    select
      a.id::text,
      a.class_id::text,
      cl.name as class_name,
      camp.code as campus_code,
      a.subject,
      a.is_homeroom
    from staff_assignments a
    join classes cl on cl.id = a.class_id
    join campuses camp on camp.id = cl.campus_id
    where a.staff_id = ${id}::uuid and a.is_active
    order by a.is_homeroom desc, cl.name, a.subject
  `;
  return { ...row, issues: [], assignments: [...assignments] };
}
