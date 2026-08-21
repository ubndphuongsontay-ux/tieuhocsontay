-- Tài khoản đăng nhập bằng username, không bắt buộc email

alter table public.profiles
  add column if not exists username text;

update public.profiles
set username = case lower(email)
  when 'admin@sontay.edu.vn' then 'admin'
  when 'hieutruong@sontay.edu.vn' then 'hieutruong'
  when 'phoht.pt@sontay.edu.vn' then 'phoht'
  when 'gvcn.th@sontay.edu.vn' then 'gvcn'
  else username
end
where username is null and email is not null;

alter table public.profiles
  alter column email drop not null;

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null;

comment on column public.profiles.username is 'Tên đăng nhập; không gắn phân hiệu. Phạm vi công tác nằm ở staff.campus_id / staff_assignments.';
