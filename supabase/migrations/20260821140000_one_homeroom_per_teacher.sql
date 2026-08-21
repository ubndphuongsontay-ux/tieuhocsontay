-- Một GVCN chỉ chủ nhiệm một lớp trong cùng năm học.
-- Một lớp vẫn có nhiều GV bộ môn (kể cả cùng môn, khác người).

create unique index if not exists staff_assignments_one_homeroom_staff_year_uidx
  on public.staff_assignments (staff_id, school_year_id)
  where is_active and is_homeroom;

create unique index if not exists classes_one_homeroom_staff_year_uidx
  on public.classes (school_year_id, homeroom_staff_id)
  where homeroom_staff_id is not null;

comment on index public.staff_assignments_one_homeroom_staff_year_uidx is
  'Mỗi giáo viên chỉ được GVCN một lớp trong một năm học.';
comment on index public.classes_one_homeroom_staff_year_uidx is
  'Cùng một giáo viên không thể gắn homeroom_staff_id cho hai lớp cùng năm.';
