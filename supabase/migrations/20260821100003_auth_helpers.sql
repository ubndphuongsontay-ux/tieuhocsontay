create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public
as $$ select auth.uid(); $$;

create or replace function public.scope_is_live(s public.user_role_scopes)
returns boolean language sql immutable as $$
  select s.is_active
    and (s.starts_on is null or s.starts_on <= current_date)
    and (s.ends_on is null or s.ends_on >= current_date);
$$;

create or replace function public.has_role(p_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_role_scopes s
    where s.profile_id = auth.uid()
      and s.role = any (p_roles)
      and public.scope_is_live(s)
  );
$$;

create or replace function public.is_principal()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(array['principal']);
$$;

create or replace function public.is_system_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(array['system_admin']);
$$;

create or replace function public.can_approve_tasks()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(array['principal','vice_principal']);
$$;

create or replace function public.can_assign_tasks()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(array['principal','vice_principal','department_head','campus_coordinator']);
$$;

create or replace function public.can_access_campus(p_campus_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.has_role(array['principal','system_admin'])
    or exists (
      select 1 from public.user_role_scopes s
      where s.profile_id = auth.uid()
        and public.scope_is_live(s)
        and (
          s.campus_id is null
          or (s.campus_id = p_campus_id and s.class_id is null)
        )
    );
$$;

create or replace function public.can_access_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.has_role(array['principal','system_admin'])
    or exists (
      select 1 from public.classes c
      join public.user_role_scopes s on s.profile_id = auth.uid()
      where c.id = p_class_id
        and public.scope_is_live(s)
        and (
          s.class_id = p_class_id
          or (s.class_id is null and s.campus_id = c.campus_id)
          or (s.class_id is null and s.campus_id is null and (s.grade is null or s.grade = c.grade))
        )
        and s.role <> 'teacher'
    )
    or exists (
      select 1 from public.user_role_scopes s
      where s.profile_id = auth.uid()
        and public.scope_is_live(s)
        and s.role in ('teacher','homeroom_teacher')
        and s.class_id = p_class_id
    );
$$;

create or replace function public.can_edit_attendance(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    (
      public.has_role(array['principal','vice_principal','campus_coordinator'])
      and public.can_access_class(p_class_id)
    )
    or exists (
      select 1 from public.user_role_scopes s
      where s.profile_id = auth.uid()
        and public.scope_is_live(s)
        and s.role = 'homeroom_teacher'
        and s.class_id = p_class_id
    );
$$;
