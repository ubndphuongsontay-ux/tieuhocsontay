create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  code integer not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grades_code_chk check (code between 1 and 5),
  constraint grades_school_code_key unique (school_id, code)
);

insert into public.grades (school_id, code, name)
select s.id, g.code, g.name
from public.schools s
cross join (values (1,'Khối 1'),(2,'Khối 2'),(3,'Khối 3'),(4,'Khối 4'),(5,'Khối 5')) as g(code, name)
on conflict (school_id, code) do nothing;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  campus_id uuid references public.campuses (id) on delete restrict,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departments_school_code_key unique (school_id, code)
);

insert into public.departments (school_id, code, name)
select s.id, d.code, d.name
from public.schools s
cross join (values
  ('TV','Tổ Tiếng Việt'),
  ('TOAN','Tổ Toán'),
  ('TN','Tổ Tự nhiên – Xã hội'),
  ('NN','Tổ Ngoại ngữ'),
  ('VP','Văn phòng')
) as d(code, name)
on conflict (school_id, code) do nothing;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  staff_id uuid references public.staff (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.local_credentials (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_role_scopes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  school_id uuid not null references public.schools (id) on delete restrict,
  campus_id uuid references public.campuses (id) on delete restrict,
  grade integer,
  class_id uuid references public.classes (id) on delete cascade,
  department_id uuid references public.departments (id) on delete set null,
  domain text,
  starts_on date,
  ends_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_role_scopes_role_chk check (role in (
    'principal','vice_principal','department_head','department_deputy',
    'teacher','homeroom_teacher','staff','campus_coordinator','system_admin'
  )),
  constraint user_role_scopes_grade_chk check (grade is null or grade between 1 and 5),
  constraint user_role_scopes_dates_chk check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create index if not exists user_role_scopes_profile_id_idx on public.user_role_scopes (profile_id);
create index if not exists user_role_scopes_campus_id_idx on public.user_role_scopes (campus_id);
create index if not exists user_role_scopes_class_id_idx on public.user_role_scopes (class_id);

create table if not exists public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  school_year_id uuid not null references public.school_years (id) on delete restrict,
  campus_id uuid not null references public.campuses (id) on delete restrict,
  department_id uuid references public.departments (id) on delete set null,
  class_id uuid references public.classes (id) on delete set null,
  subject text,
  title text,
  is_homeroom boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_assignments_staff_year_idx on public.staff_assignments (staff_id, school_year_id);
create index if not exists staff_assignments_class_id_idx on public.staff_assignments (class_id);

create table if not exists public.staff_leave_requests (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  school_year_id uuid not null references public.school_years (id) on delete restrict,
  campus_id uuid references public.campuses (id) on delete restrict,
  starts_on date not null,
  ends_on date not null,
  kind text not null default 'phep',
  status text not null default 'pending',
  reason text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_leave_dates_chk check (ends_on >= starts_on),
  constraint staff_leave_status_chk check (status in ('pending','approved','rejected','cancelled')),
  constraint staff_leave_kind_chk check (kind in ('phep','om','viec_rieng','cong_tac'))
);

create index if not exists staff_leave_staff_dates_idx on public.staff_leave_requests (staff_id, starts_on, ends_on);

create table if not exists public.attendance_days (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years (id) on delete restrict,
  campus_id uuid not null references public.campuses (id) on delete restrict,
  class_id uuid not null references public.classes (id) on delete restrict,
  attended_on date not null,
  session_kind text not null default 'sang',
  status text not null default 'draft',
  recorded_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_days_session_chk check (session_kind in ('sang','chieu')),
  constraint attendance_days_status_chk check (status in ('draft','submitted')),
  constraint attendance_days_unique unique (class_id, attended_on, session_kind)
);

create index if not exists attendance_days_date_idx on public.attendance_days (attended_on, campus_id);
create index if not exists attendance_days_class_idx on public.attendance_days (class_id, attended_on);

create table if not exists public.student_attendance_records (
  id uuid primary key default gen_random_uuid(),
  attendance_day_id uuid not null references public.attendance_days (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status text not null,
  reason text,
  note text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_attendance_status_chk check (
    status in ('present','excused','unexcused','late','early_leave')
  ),
  constraint student_attendance_unique unique (attendance_day_id, student_id)
);

create index if not exists student_attendance_student_idx on public.student_attendance_records (student_id);
