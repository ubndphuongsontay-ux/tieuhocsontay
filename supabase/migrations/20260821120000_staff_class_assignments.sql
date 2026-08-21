-- Phân công GVCN / GV bộ môn: ràng buộc duy nhất + quyền ghi

create unique index if not exists staff_assignments_one_homeroom_uidx
  on public.staff_assignments (class_id)
  where is_active and is_homeroom and class_id is not null;

create unique index if not exists staff_assignments_staff_class_subject_uidx
  on public.staff_assignments (staff_id, class_id, coalesce(subject, ''))
  where is_active and class_id is not null and not is_homeroom;

create or replace function public.can_assign_teachers(p_campus_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.has_role(array['principal','system_admin'])
    or (
      public.has_role(array['vice_principal','campus_coordinator','department_head'])
      and public.can_access_campus(p_campus_id)
    );
$$;

drop policy if exists st_assign_write on public.staff_assignments;
create policy st_assign_write on public.staff_assignments for insert
  with check (public.can_assign_teachers(campus_id));

drop policy if exists st_assign_update on public.staff_assignments;
create policy st_assign_update on public.staff_assignments for update
  using (public.can_assign_teachers(campus_id))
  with check (public.can_assign_teachers(campus_id));

drop policy if exists st_classes_homeroom on public.classes;
create policy st_classes_homeroom on public.classes for update
  using (public.can_assign_teachers(campus_id))
  with check (public.can_assign_teachers(campus_id));
