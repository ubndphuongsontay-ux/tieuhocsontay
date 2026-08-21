create sequence if not exists public.task_code_seq;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  campus_id uuid references public.campuses (id) on delete restrict,
  domain text,
  starts_on date,
  due_on date,
  priority text not null default 'normal',
  deliverable text,
  progress integer not null default 0,
  status text not null default 'draft',
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_priority_chk check (priority in ('low','normal','high','urgent')),
  constraint tasks_progress_chk check (progress between 0 and 100),
  constraint tasks_status_chk check (status in (
    'draft','assigned','in_progress','blocked','submitted',
    'changes_requested','approved','completed','cancelled'
  ))
);

create index if not exists tasks_owner_id_idx on public.tasks (owner_id);
create index if not exists tasks_created_by_idx on public.tasks (created_by);
create index if not exists tasks_campus_id_idx on public.tasks (campus_id);
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_due_on_idx on public.tasks (due_on);

create table if not exists public.task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'collaborator',
  created_at timestamptz not null default now(),
  constraint task_assignees_kind_chk check (kind in ('owner','collaborator')),
  constraint task_assignees_unique unique (task_id, profile_id)
);

create table if not exists public.task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  progress integer,
  note text,
  created_at timestamptz not null default now(),
  constraint task_updates_progress_chk check (progress is null or progress between 0 and 100)
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  original_name text not null,
  storage_backend text not null default 'local',
  storage_path text not null,
  mime_type text,
  byte_size integer,
  created_at timestamptz not null default now(),
  constraint task_attachments_backend_chk check (storage_backend in ('local','supabase'))
);

create table if not exists public.task_approvals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  decided_by uuid not null references public.profiles (id) on delete restrict,
  decision text not null,
  comment text,
  decided_at timestamptz not null default now(),
  constraint task_approvals_decision_chk check (decision in ('approved','changes_requested'))
);

create table if not exists public.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists task_events_task_id_idx on public.task_events (task_id, created_at);

create or replace view public.v_tasks as
select
  t.*,
  (
    t.status not in ('completed','cancelled','approved')
    and t.due_on is not null
    and t.due_on < current_date
  ) as is_overdue
from public.tasks t;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  href text,
  kind text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_profile_unread_idx
  on public.notifications (profile_id, created_at desc)
  where read_at is null;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array[
    'grades','departments','profiles','local_credentials','user_role_scopes',
    'staff_assignments','staff_leave_requests','attendance_days',
    'student_attendance_records','tasks'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end
$$;
