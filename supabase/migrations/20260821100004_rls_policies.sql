alter table public.grades enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.local_credentials enable row level security;
alter table public.user_role_scopes enable row level security;
alter table public.staff_assignments enable row level security;
alter table public.staff_leave_requests enable row level security;
alter table public.attendance_days enable row level security;
alter table public.student_attendance_records enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_updates enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.task_approvals enable row level security;
alter table public.task_events enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

do $$
declare pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and policyname like 'st_%'
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end
$$;

create policy st_grades_read on public.grades for select using (auth.uid() is not null);
create policy st_departments_read on public.departments for select using (auth.uid() is not null);

create policy st_profiles_read on public.profiles for select
  using (
    id = auth.uid()
    or public.has_role(array['principal','system_admin','vice_principal','campus_coordinator','department_head'])
  );
create policy st_profiles_update_self on public.profiles for update using (id = auth.uid());

create policy st_credentials_self on public.local_credentials for select
  using (profile_id = auth.uid() or public.is_system_admin());

create policy st_scopes_read on public.user_role_scopes for select
  using (profile_id = auth.uid() or public.is_principal() or public.is_system_admin());
create policy st_scopes_admin on public.user_role_scopes for all
  using (public.is_system_admin()) with check (public.is_system_admin());

create policy st_schools_read on public.schools for select using (auth.uid() is not null);
create policy st_years_read on public.school_years for select using (auth.uid() is not null);
create policy st_campuses_read on public.campuses for select
  using (public.can_access_campus(id) or public.has_role(array['principal','system_admin']));

create policy st_staff_read on public.staff for select
  using (public.has_role(array['principal','system_admin']) or public.can_access_campus(campus_id));

create policy st_classes_read on public.classes for select using (public.can_access_class(id));

create policy st_students_read on public.students for select
  using (
    public.has_role(array['principal','system_admin'])
    or exists (
      select 1 from public.v_enrollments_current v
      where v.student_id = students.id and public.can_access_class(v.class_id)
    )
  );

create policy st_enrollments_read on public.enrollments for select using (public.can_access_class(class_id));
create policy st_enrollments_write on public.enrollments for insert
  with check (
    public.has_role(array['principal','vice_principal','campus_coordinator','homeroom_teacher'])
    and public.can_access_class(class_id)
  );
create policy st_enrollments_update on public.enrollments for update
  using (
    public.has_role(array['principal','vice_principal','campus_coordinator','homeroom_teacher'])
    and public.can_access_class(class_id)
  );

create policy st_contacts_read on public.student_contacts for select
  using (
    exists (
      select 1 from public.v_enrollments_current v
      where v.student_id = student_contacts.student_id and public.can_access_class(v.class_id)
    )
  );
create policy st_contacts_write on public.student_contacts for update
  using (
    public.has_role(array['principal','vice_principal','homeroom_teacher','campus_coordinator'])
    and exists (
      select 1 from public.v_enrollments_current v
      where v.student_id = student_contacts.student_id and public.can_access_class(v.class_id)
    )
  );

create policy st_supports_read on public.student_supports for select
  using (
    public.has_role(array['principal','vice_principal','homeroom_teacher','campus_coordinator','system_admin'])
    and exists (
      select 1 from public.v_enrollments_current v
      where v.student_id = student_supports.student_id and public.can_access_class(v.class_id)
    )
  );

create policy st_attendance_days_read on public.attendance_days for select using (public.can_access_class(class_id));
create policy st_attendance_days_write on public.attendance_days for insert with check (public.can_edit_attendance(class_id));
create policy st_attendance_days_update on public.attendance_days for update using (public.can_edit_attendance(class_id));

create policy st_attendance_rec_read on public.student_attendance_records for select
  using (
    exists (select 1 from public.attendance_days d where d.id = attendance_day_id and public.can_access_class(d.class_id))
  );
create policy st_attendance_rec_write on public.student_attendance_records for all
  using (
    exists (select 1 from public.attendance_days d where d.id = attendance_day_id and public.can_edit_attendance(d.class_id))
  )
  with check (
    exists (select 1 from public.attendance_days d where d.id = attendance_day_id and public.can_edit_attendance(d.class_id))
  );

create policy st_leave_read on public.staff_leave_requests for select
  using (
    public.has_role(array['principal','system_admin'])
    or (campus_id is not null and public.can_access_campus(campus_id))
  );

create policy st_assign_read on public.staff_assignments for select
  using (public.can_access_campus(campus_id) or public.has_role(array['principal','system_admin']));

create policy st_tasks_read on public.tasks for select
  using (
    public.is_principal() or public.is_system_admin()
    or created_by = auth.uid() or owner_id = auth.uid()
    or exists (select 1 from public.task_assignees a where a.task_id = tasks.id and a.profile_id = auth.uid())
    or (campus_id is not null and public.can_access_campus(campus_id) and public.can_assign_tasks())
  );
create policy st_tasks_insert on public.tasks for insert
  with check (public.can_assign_tasks() and created_by = auth.uid());
create policy st_tasks_update on public.tasks for update
  using (public.is_principal() or created_by = auth.uid() or owner_id = auth.uid() or public.can_approve_tasks());

create policy st_task_assignees_read on public.task_assignees for select
  using (exists (select 1 from public.tasks t where t.id = task_id));
create policy st_task_updates_read on public.task_updates for select
  using (exists (select 1 from public.tasks t where t.id = task_id));
create policy st_task_comments_read on public.task_comments for select
  using (exists (select 1 from public.tasks t where t.id = task_id));
create policy st_task_attach_read on public.task_attachments for select
  using (exists (select 1 from public.tasks t where t.id = task_id));
create policy st_task_approvals_read on public.task_approvals for select
  using (exists (select 1 from public.tasks t where t.id = task_id));
create policy st_task_events_read on public.task_events for select
  using (exists (select 1 from public.tasks t where t.id = task_id));

create policy st_task_updates_ins on public.task_updates for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and (t.owner_id = auth.uid() or t.created_by = auth.uid() or public.is_principal())
    )
  );
create policy st_task_comments_ins on public.task_comments for insert with check (profile_id = auth.uid());
create policy st_task_attach_ins on public.task_attachments for insert with check (profile_id = auth.uid());
create policy st_task_approvals_ins on public.task_approvals for insert
  with check (public.can_approve_tasks() and decided_by = auth.uid());
create policy st_task_events_ins on public.task_events for insert with check (true);

create policy st_notes_self on public.notifications for select using (profile_id = auth.uid());
create policy st_notes_update on public.notifications for update using (profile_id = auth.uid());
create policy st_notes_insert on public.notifications for insert with check (true);

create policy st_audit_read on public.audit_logs for select
  using (public.is_principal() or public.is_system_admin());
create policy st_audit_insert on public.audit_logs for insert with check (true);

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'th_authenticated') then
    create role th_authenticated nologin;
  end if;
end
$$;

grant usage on schema public to th_authenticated;
grant usage on schema auth to th_authenticated;
grant select, insert, update, delete on all tables in schema public to th_authenticated;
grant usage, select on all sequences in schema public to th_authenticated;
grant execute on all functions in schema public to th_authenticated;
grant execute on function auth.uid() to th_authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to th_authenticated;
alter default privileges in schema public grant execute on functions to th_authenticated;
