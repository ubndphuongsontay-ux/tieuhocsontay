-- Trường Tiểu học Sơn Tây — schema lõi pha 0
-- 1 trường, 7 phân hiệu; hồ sơ GV/HS; chỗ học có lịch sử.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. schools
-- ---------------------------------------------------------------------------
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.schools is 'Pháp nhân trường (một dòng: Tiểu học Sơn Tây)';

-- ---------------------------------------------------------------------------
-- 2. campuses
-- ---------------------------------------------------------------------------
create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  code text not null unique,
  name text not null,
  former_name text,
  class_letter text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campuses_class_letter_chk
    check (class_letter is null or class_letter in ('A', 'C', 'D', 'E', 'G', 'H'))
);

create index campuses_school_id_idx on public.campuses (school_id);

comment on table public.campuses is 'Bảy phân hiệu — trường cũ sau sáp nhập';
comment on column public.campuses.former_name is 'Tên trường cũ, dùng đối chiếu văn bản/Excel';

-- ---------------------------------------------------------------------------
-- 3. school_years
-- ---------------------------------------------------------------------------
create table public.school_years (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_years_dates_chk check (ends_on > starts_on)
);

comment on table public.school_years is 'Năm học; lớp và chỗ học gắn theo năm';

-- Chỉ một năm is_current = true
create unique index school_years_one_current_uidx
  on public.school_years ((is_current))
  where is_current;

-- ---------------------------------------------------------------------------
-- 4. staff
-- ---------------------------------------------------------------------------
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses (id) on delete restrict,
  full_name text not null,
  national_id text,
  national_id_raw text,
  dob date,
  gender text,
  ethnicity text,
  phone text,
  is_party_member boolean,
  education_level text,
  foreign_language_level text,
  it_level text,
  political_theory_level text,
  professional_qualification text,
  employment_kind text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_gender_chk check (gender is null or gender in ('nam', 'nu')),
  constraint staff_employment_kind_chk
    check (
      employment_kind is null
      or employment_kind in ('bien_che', 'hop_dong', 'thinh_giang')
    )
);

create index staff_campus_id_idx on public.staff (campus_id);
create unique index staff_national_id_uidx
  on public.staff (national_id)
  where national_id is not null;

comment on table public.staff is 'Cán bộ — giáo viên — nhân viên';
comment on column public.staff.is_party_member is 'true=Có, false=Không, null=chưa rõ';
comment on column public.staff.employment_kind is 'bien_che | hop_dong | thinh_giang';

-- ---------------------------------------------------------------------------
-- 5. staff_reviews
-- ---------------------------------------------------------------------------
create table public.staff_reviews (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  school_year_id uuid not null references public.school_years (id) on delete restrict,
  rating text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_reviews_staff_year_key unique (staff_id, school_year_id)
);

create index staff_reviews_staff_id_idx on public.staff_reviews (staff_id);
create index staff_reviews_school_year_id_idx on public.staff_reviews (school_year_id);

comment on table public.staff_reviews is 'Đánh giá viên chức theo năm học';

-- ---------------------------------------------------------------------------
-- 6. classes
-- ---------------------------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years (id) on delete restrict,
  campus_id uuid not null references public.campuses (id) on delete restrict,
  name text not null,
  grade integer not null,
  homeroom_staff_id uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_grade_chk check (grade between 1 and 5),
  constraint classes_year_campus_name_key unique (school_year_id, campus_id, name)
);

create index classes_school_year_id_idx on public.classes (school_year_id);
create index classes_campus_id_idx on public.classes (campus_id);
create index classes_homeroom_staff_id_idx on public.classes (homeroom_staff_id);

comment on table public.classes is 'Lớp theo năm học và phân hiệu. Sĩ số = đếm enrollments đang mở';

-- ---------------------------------------------------------------------------
-- 7. students
-- ---------------------------------------------------------------------------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  dob date,
  gender text,
  ethnicity text,
  national_id text,
  national_id_raw text,
  bgd_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_gender_chk check (gender is null or gender in ('nam', 'nu'))
);

create unique index students_national_id_uidx
  on public.students (national_id)
  where national_id is not null;
create unique index students_bgd_code_uidx
  on public.students (bgd_code)
  where bgd_code is not null;

comment on table public.students is 'Hồ sơ người học — không gắn cứng một lớp';

-- ---------------------------------------------------------------------------
-- 8. enrollments
-- ---------------------------------------------------------------------------
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete restrict,
  school_year_id uuid not null references public.school_years (id) on delete restrict,
  started_on date not null,
  ended_on date,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollments_status_chk check (
    status in (
      'dang_hoc',
      'chuyen_lop',
      'chuyen_phan_hieu',
      'chuyen_truong',
      'thoi_hoc'
    )
  ),
  constraint enrollments_dates_chk check (ended_on is null or ended_on >= started_on)
);

create index enrollments_student_id_idx on public.enrollments (student_id);
create index enrollments_class_id_idx on public.enrollments (class_id);
create index enrollments_school_year_id_idx on public.enrollments (school_year_id);
create index enrollments_class_open_idx
  on public.enrollments (class_id)
  where ended_on is null;
create unique index enrollments_one_open_per_year_uidx
  on public.enrollments (student_id, school_year_id)
  where ended_on is null;

comment on table public.enrollments is 'Chỗ học theo thời gian: lên lớp, chuyển lớp, chuyển phân hiệu';
comment on column public.enrollments.ended_on is 'Null = đang học lớp này';

-- ---------------------------------------------------------------------------
-- 9. student_contacts
-- ---------------------------------------------------------------------------
create table public.student_contacts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  relation text not null,
  full_name text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_contacts_relation_chk check (relation in ('me', 'cha', 'khac'))
);

create index student_contacts_student_id_idx on public.student_contacts (student_id);

comment on table public.student_contacts is 'Mẹ, cha, số liên hệ khác';

-- ---------------------------------------------------------------------------
-- 10. student_supports
-- ---------------------------------------------------------------------------
create table public.student_supports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  school_year_id uuid references public.school_years (id) on delete restrict,
  kind text not null,
  label text not null,
  note text,
  opened_on date,
  closed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_supports_kind_chk check (
    kind in ('khuyet_tat', 'chinh_sach', 'hoan_canh', 'doi_tuong')
  )
);

create index student_supports_student_id_idx on public.student_supports (student_id);
create index student_supports_school_year_id_idx on public.student_supports (school_year_id);

comment on table public.student_supports is 'Khuyết tật, đối tượng chính sách, hoàn cảnh';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'schools',
    'campuses',
    'school_years',
    'staff',
    'staff_reviews',
    'classes',
    'students',
    'enrollments',
    'student_contacts',
    'student_supports'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at
       before update on public.%I
       for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: bật sẵn; superuser local vẫn nhập được. Policy Auth thêm khi lên Supabase.
-- ---------------------------------------------------------------------------
alter table public.schools enable row level security;
alter table public.campuses enable row level security;
alter table public.school_years enable row level security;
alter table public.staff enable row level security;
alter table public.staff_reviews enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.student_contacts enable row level security;
alter table public.student_supports enable row level security;

-- ---------------------------------------------------------------------------
-- Views tổng hợp
-- ---------------------------------------------------------------------------
create view public.v_enrollments_current as
select
  e.id as enrollment_id,
  e.student_id,
  e.class_id,
  e.school_year_id,
  e.status,
  e.started_on,
  s.full_name,
  s.dob,
  s.gender,
  s.ethnicity,
  s.national_id,
  c.name as class_name,
  c.grade,
  camp.id as campus_id,
  camp.code as campus_code,
  camp.name as campus_name
from public.enrollments e
join public.students s on s.id = e.student_id
join public.classes c on c.id = e.class_id
join public.campuses camp on camp.id = c.campus_id
where e.ended_on is null;

comment on view public.v_enrollments_current is 'Học sinh đang học — nguồn form và sĩ số';

create view public.v_class_sizes as
select
  c.id as class_id,
  y.code as school_year_code,
  camp.code as campus_code,
  camp.name as campus_name,
  c.grade,
  c.name as class_name,
  count(e.id)::integer as enrollment_count
from public.classes c
join public.school_years y on y.id = c.school_year_id
join public.campuses camp on camp.id = c.campus_id
left join public.enrollments e
  on e.class_id = c.id and e.ended_on is null
group by c.id, y.code, camp.code, camp.name, c.grade, c.name;

comment on view public.v_class_sizes is 'Sĩ số lớp = đếm enrollments đang mở';

-- ---------------------------------------------------------------------------
-- Dữ liệu nền
-- ---------------------------------------------------------------------------
insert into public.schools (name, short_name)
values ('Trường Tiểu học Sơn Tây', 'TH Sơn Tây');

insert into public.campuses (
  school_id, code, name, former_name, class_letter, is_active, sort_order
)
select
  sch.id,
  v.code,
  v.name,
  v.former_name,
  v.class_letter,
  true,
  v.sort_order
from public.schools sch
cross join (
  values
    ('TH', 'Trung Hưng',  'Trường Tiểu học Trung Hưng',  'A', 1),
    ('PT', 'Phú Thịnh',   'Trường Tiểu học Phú Thịnh',   'C', 2),
    ('TP', 'Trần Phú',    'Trường Tiểu học Trần Phú',    'D', 3),
    ('DL', 'Đường Lâm',   'Trường Tiểu học Đường Lâm',   'E', 4),
    ('LL', 'Lê Lợi',      'Trường Tiểu học Lê Lợi',      'G', 5),
    ('QT', 'Quang Trung', 'Trường Tiểu học Quang Trung', 'H', 6),
    ('VS', 'Viên Sơn',    'Trường Tiểu học Viên Sơn',    null, 7)
) as v(code, name, former_name, class_letter, sort_order);

insert into public.school_years (code, starts_on, ends_on, is_current)
values ('2026-2027', date '2026-09-05', date '2027-05-31', true);
