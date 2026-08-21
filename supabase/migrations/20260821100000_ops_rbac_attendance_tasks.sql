-- Additive: RBAC, chuyên cần, giao việc, audit. Không xóa dữ liệu lõi.

create extension if not exists pgcrypto;

do $$
begin
  if to_regnamespace('auth') is null then
    execute 'create schema auth';
  end if;
  if to_regprocedure('auth.uid()') is null then
    execute $fn$
      create function auth.uid()
      returns uuid
      language sql
      stable
      as $inner$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $inner$;
    $fn$;
  end if;
end
$$;

alter table public.students add column if not exists student_code text;
create unique index if not exists students_student_code_uidx
  on public.students (student_code) where student_code is not null;

alter table public.staff
  add column if not exists staff_code text,
  add column if not exists job_title text;
create unique index if not exists staff_staff_code_uidx
  on public.staff (staff_code) where staff_code is not null;

alter table public.classes
  add column if not exists is_active boolean not null default true;

create or replace view public.academic_years as select * from public.school_years;
create or replace view public.student_enrollments as select * from public.enrollments;
