create type public.app_role as enum ('admin','doctor','staff','patient');
create type public.appt_status as enum ('booked','checked_in','in_consultation','completed','no_show','cancelled');

create table public.user_roles(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

create policy "own roles or admin" on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.departments(
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ur text not null default '',
  description text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.departments to authenticated;
grant all on public.departments to service_role;
alter table public.departments enable row level security;
create policy "read departments" on public.departments for select to authenticated using (true);
create policy "admin manage departments" on public.departments for all to authenticated
using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.profiles(
  id uuid primary key,
  email text,
  full_name text not null default '',
  phone text,
  date_of_birth date,
  gender text,
  language text not null default 'en',
  photo_path text,
  photo_locked_at timestamptz,
  photo_consent_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant update (full_name, phone, date_of_birth, gender, language) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.doctors(
  user_id uuid primary key,
  full_name text not null,
  department_id uuid references public.departments(id) on delete set null,
  specialty text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.doctors to authenticated;
grant update (department_id, specialty, active, full_name), delete on public.doctors to authenticated;
grant all on public.doctors to service_role;
alter table public.doctors enable row level security;
create policy "read doctors" on public.doctors for select to authenticated using (true);
create policy "admin update doctors" on public.doctors for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete doctors" on public.doctors for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.staff_members(
  user_id uuid primary key,
  full_name text not null,
  department_id uuid references public.departments(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, delete on public.staff_members to authenticated;
grant all on public.staff_members to service_role;
alter table public.staff_members enable row level security;
create policy "staff/admin read staff" on public.staff_members for select to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'staff'));
create policy "admin delete staff" on public.staff_members for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.queue_settings(
  id int primary key default 1 check (id = 1),
  slot_minutes int not null default 10,
  max_daily_patients int not null default 40,
  walkins_allowed boolean not null default true,
  max_daily_walkins int not null default 15,
  updated_at timestamptz not null default now()
);
insert into public.queue_settings default values;
grant select, update on public.queue_settings to authenticated;
grant all on public.queue_settings to service_role;
alter table public.queue_settings enable row level security;
create policy "read settings" on public.queue_settings for select to authenticated using (true);
create policy "admin update settings" on public.queue_settings for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.appointments(
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.profiles(id) on delete set null,
  walkin_name text,
  walkin_phone text,
  doctor_id uuid not null references public.doctors(user_id),
  appt_date date not null default current_date,
  token_number int not null,
  is_walkin boolean not null default false,
  status public.appt_status not null default 'booked',
  checked_in_at timestamptz,
  called_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique(doctor_id, appt_date, token_number)
);
grant select on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;

create table public.break_glass_access(
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null,
  patient_id uuid not null,
  justification text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
grant select on public.break_glass_access to authenticated;
grant all on public.break_glass_access to service_role;
alter table public.break_glass_access enable row level security;
create policy "own or admin bg" on public.break_glass_access for select to authenticated
using (doctor_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.doctor_can_view(_doc uuid, _patient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_doc,'doctor') and (
    exists(select 1 from public.appointments where doctor_id=_doc and patient_id=_patient)
    or exists(select 1 from public.break_glass_access where doctor_id=_doc and patient_id=_patient and expires_at > now())
  )
$$;

create policy "profiles read" on public.profiles for select to authenticated
using (id = auth.uid() or public.has_role(auth.uid(),'staff') or public.has_role(auth.uid(),'admin') or public.doctor_can_view(auth.uid(), id));
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "appointments read" on public.appointments for select to authenticated
using (patient_id = auth.uid() or doctor_id = auth.uid() or public.has_role(auth.uid(),'staff') or public.has_role(auth.uid(),'admin'));

create table public.triage_records(
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  blood_pressure text,
  temperature numeric,
  pulse int,
  weight numeric,
  chief_complaint text,
  recorded_by uuid,
  created_at timestamptz not null default now()
);
grant select on public.triage_records to authenticated;
grant all on public.triage_records to service_role;
alter table public.triage_records enable row level security;
create policy "triage read" on public.triage_records for select to authenticated
using (public.has_role(auth.uid(),'staff') or exists(
  select 1 from public.appointments a where a.id = appointment_id and (
    a.patient_id = auth.uid() or a.doctor_id = auth.uid() or (a.patient_id is not null and public.doctor_can_view(auth.uid(), a.patient_id)))));

create table public.clinical_records(
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id),
  patient_id uuid,
  doctor_id uuid not null,
  notes text not null default '',
  diagnosis text not null default '',
  prescription text not null default '',
  finalized boolean not null default false,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.clinical_records to authenticated;
grant update (notes, diagnosis, prescription) on public.clinical_records to authenticated;
grant all on public.clinical_records to service_role;
alter table public.clinical_records enable row level security;
create policy "clinical read doctors only" on public.clinical_records for select to authenticated
using (doctor_id = auth.uid() or (patient_id is not null and public.doctor_can_view(auth.uid(), patient_id)));
create policy "clinical update own draft" on public.clinical_records for update to authenticated
using (doctor_id = auth.uid() and not finalized) with check (doctor_id = auth.uid() and not finalized);

create or replace function public.protect_clinical() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'Clinical records cannot be deleted'; end if;
  if old.finalized then raise exception 'Transcript is finalized and locked'; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger protect_clinical before update or delete on public.clinical_records for each row execute function public.protect_clinical();

create table public.notifications(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title_en text not null, title_ur text not null,
  body_en text not null default '', body_ur text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update (read) on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notif read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "own notif update" on public.notifications for update to authenticated using (user_id = auth.uid());

create table public.audit_logs(
  id bigserial primary key,
  actor_id uuid,
  actor_name text,
  action text not null,
  entity text,
  entity_id text,
  details jsonb not null default '{}',
  priority text not null default 'normal',
  created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "admin read audit" on public.audit_logs for select to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.block_audit_change() returns trigger language plpgsql as $$
begin raise exception 'Audit log is immutable'; end $$;
create trigger audit_immutable before update or delete on public.audit_logs for each row execute function public.block_audit_change();
create trigger audit_no_truncate before truncate on public.audit_logs for each statement execute function public.block_audit_change();

create or replace function public.log_audit(_action text, _entity text, _entity_id text, _details jsonb default '{}', _priority text default 'normal')
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(actor_id, actor_name, action, entity, entity_id, details, priority)
  values (auth.uid(), (select full_name from public.profiles where id = auth.uid()), _action, _entity, _entity_id, coalesce(_details,'{}'), _priority);
end $$;
revoke execute on function public.log_audit(text,text,text,jsonb,text) from public, anon, authenticated;

create or replace function public.notify_user(_user uuid, _te text, _tu text, _be text, _bu text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id,title_en,title_ur,body_en,body_ur) select _user,_te,_tu,_be,_bu where _user is not null;
$$;
revoke execute on function public.notify_user(uuid,text,text,text,text) from public, anon, authenticated;

-- ===== RPCs =====
create or replace function public.ensure_profile(_full_name text default null)
returns text language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); _email text;
begin
  if _uid is null then raise exception 'Not authenticated'; end if;
  select email into _email from auth.users where id = _uid;
  insert into public.profiles(id, email, full_name) values (_uid, _email, coalesce(_full_name, split_part(_email,'@',1)))
  on conflict (id) do nothing;
  if not exists(select 1 from public.user_roles where user_id = _uid) then
    if not exists(select 1 from public.user_roles where role = 'admin') then
      insert into public.user_roles(user_id, role) values (_uid, 'admin');
      perform public.log_audit('admin_bootstrapped','user',_uid::text);
    else
      insert into public.user_roles(user_id, role) values (_uid, 'patient');
    end if;
  end if;
  return 'ok';
end $$;

create or replace function public.assign_role(_email text, _role public.app_role, _department_id uuid default null, _specialty text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare _uid uuid; _name text;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  select id into _uid from auth.users where lower(email) = lower(trim(_email));
  if _uid is null then raise exception 'No registered user with that email. Ask them to sign up first.'; end if;
  insert into public.profiles(id, email, full_name) values (_uid, _email, split_part(_email,'@',1)) on conflict (id) do nothing;
  select full_name into _name from public.profiles where id = _uid;
  insert into public.user_roles(user_id, role) values (_uid, _role) on conflict do nothing;
  if _role = 'doctor' then
    insert into public.doctors(user_id, full_name, department_id, specialty) values (_uid, _name, _department_id, _specialty)
    on conflict (user_id) do update set department_id = excluded.department_id, specialty = excluded.specialty, active = true;
  elsif _role = 'staff' then
    insert into public.staff_members(user_id, full_name, department_id) values (_uid, _name, _department_id)
    on conflict (user_id) do update set department_id = excluded.department_id;
  end if;
  perform public.log_audit('role_assigned','user',_uid::text, jsonb_build_object('role',_role,'email',_email));
  return _uid;
end $$;

create or replace function public.revoke_role(_user_id uuid, _role public.app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  if _user_id = auth.uid() and _role = 'admin' then raise exception 'You cannot remove your own admin role'; end if;
  delete from public.user_roles where user_id = _user_id and role = _role;
  if _role = 'doctor' then update public.doctors set active = false where user_id = _user_id; end if;
  if _role = 'staff' then delete from public.staff_members where user_id = _user_id; end if;
  perform public.log_audit('role_revoked','user',_user_id::text, jsonb_build_object('role',_role));
end $$;

create or replace function public.next_token(_doctor uuid, _date date) returns int
language plpgsql security definer set search_path = public as $$
declare t int;
begin
  perform pg_advisory_xact_lock(hashtext(_doctor::text || _date::text));
  select coalesce(max(token_number),0)+1 into t from public.appointments where doctor_id=_doctor and appt_date=_date;
  return t;
end $$;
revoke execute on function public.next_token(uuid,date) from public, anon, authenticated;

create or replace function public.book_appointment(_doctor_id uuid, _date date)
returns uuid language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); s public.queue_settings; _id uuid; _tok int;
begin
  if not public.has_role(_uid,'patient') then raise exception 'Only patients can book'; end if;
  if (select photo_locked_at from public.profiles where id=_uid) is null then raise exception 'PHOTO_REQUIRED'; end if;
  if _date < current_date then raise exception 'Date is in the past'; end if;
  if not exists(select 1 from public.doctors where user_id=_doctor_id and active) then raise exception 'Doctor unavailable'; end if;
  if exists(select 1 from public.appointments where patient_id=_uid and doctor_id=_doctor_id and appt_date=_date and status in ('booked','checked_in','in_consultation')) then
    raise exception 'You already have a booking with this doctor on this date'; end if;
  select * into s from public.queue_settings where id=1;
  if (select count(*) from public.appointments where doctor_id=_doctor_id and appt_date=_date and status <> 'cancelled') >= s.max_daily_patients then
    raise exception 'Doctor is fully booked on this date'; end if;
  _tok := public.next_token(_doctor_id, _date);
  insert into public.appointments(patient_id, doctor_id, appt_date, token_number, created_by)
  values (_uid, _doctor_id, _date, _tok, _uid) returning id into _id;
  perform public.log_audit('appointment_booked','appointment',_id::text, jsonb_build_object('token',_tok,'date',_date));
  return _id;
end $$;

create or replace function public.cancel_appointment(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.appointments;
begin
  select * into a from public.appointments where id=_id;
  if a.id is null then raise exception 'Not found'; end if;
  if not (a.patient_id = auth.uid() or public.has_role(auth.uid(),'staff') or public.has_role(auth.uid(),'admin')) then raise exception 'Not allowed'; end if;
  if a.status not in ('booked','checked_in') then raise exception 'Cannot cancel at this stage'; end if;
  update public.appointments set status='cancelled' where id=_id;
  perform public.log_audit('appointment_cancelled','appointment',_id::text);
end $$;

create or replace function public.register_walkin(_doctor_id uuid, _name text, _phone text)
returns uuid language plpgsql security definer set search_path = public as $$
declare s public.queue_settings; _id uuid; _tok int;
begin
  if not (public.has_role(auth.uid(),'staff') or public.has_role(auth.uid(),'admin')) then raise exception 'Staff only'; end if;
  if length(trim(coalesce(_name,''))) < 2 then raise exception 'Name required'; end if;
  select * into s from public.queue_settings where id=1;
  if not s.walkins_allowed then raise exception 'Walk-ins are currently disabled'; end if;
  if (select count(*) from public.appointments where doctor_id=_doctor_id and appt_date=current_date and is_walkin) >= s.max_daily_walkins then
    raise exception 'Daily walk-in limit reached'; end if;
  _tok := public.next_token(_doctor_id, current_date);
  insert into public.appointments(walkin_name, walkin_phone, doctor_id, appt_date, token_number, is_walkin, status, checked_in_at, created_by)
  values (trim(_name), _phone, _doctor_id, current_date, _tok, true, 'checked_in', now(), auth.uid()) returning id into _id;
  perform public.log_audit('walkin_registered','appointment',_id::text, jsonb_build_object('token',_tok,'name',_name));
  return _id;
end $$;

create or replace function public.check_in_patient(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.appointments;
begin
  if not (public.has_role(auth.uid(),'staff') or public.has_role(auth.uid(),'admin')) then raise exception 'Staff only'; end if;
  select * into a from public.appointments where id=_id;
  if a.status <> 'booked' then raise exception 'Appointment is not awaiting check-in'; end if;
  if a.appt_date <> current_date then raise exception 'Only today''s appointments can be checked in'; end if;
  update public.appointments set status='checked_in', checked_in_at=now() where id=_id;
  perform public.notify_user(a.patient_id,'You are checked in','آپ کی آمد درج ہو گئی',
    'Token #'||a.token_number||' is now active in the live queue.','ٹوکن #'||a.token_number||' اب قطار میں فعال ہے۔');
  perform public.log_audit('patient_checked_in','appointment',_id::text, jsonb_build_object('token',a.token_number));
end $$;

create or replace function public.record_triage(_appointment_id uuid, _bp text, _temp numeric, _pulse int, _weight numeric, _complaint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_role(auth.uid(),'staff') or public.has_role(auth.uid(),'admin')) then raise exception 'Staff only'; end if;
  if not exists(select 1 from public.appointments where id=_appointment_id and status in ('booked','checked_in','in_consultation')) then
    raise exception 'Appointment not active'; end if;
  insert into public.triage_records(appointment_id, blood_pressure, temperature, pulse, weight, chief_complaint, recorded_by)
  values (_appointment_id, _bp, _temp, _pulse, _weight, _complaint, auth.uid())
  on conflict (appointment_id) do update set blood_pressure=excluded.blood_pressure, temperature=excluded.temperature,
    pulse=excluded.pulse, weight=excluded.weight, chief_complaint=excluded.chief_complaint, recorded_by=excluded.recorded_by, created_at=now();
  perform public.log_audit('triage_recorded','appointment',_appointment_id::text,
    jsonb_build_object('bp',_bp,'temp',_temp,'pulse',_pulse,'weight',_weight));
end $$;

create or replace function public.call_next_patient()
returns uuid language plpgsql security definer set search_path = public as $$
declare _doc uuid := auth.uid(); a public.appointments; nxt public.appointments;
begin
  if not public.has_role(_doc,'doctor') then raise exception 'Doctors only'; end if;
  if exists(select 1 from public.appointments where doctor_id=_doc and appt_date=current_date and status='in_consultation') then
    raise exception 'FINISH_CURRENT'; end if;
  select * into a from public.appointments where doctor_id=_doc and appt_date=current_date and status='checked_in'
    order by token_number limit 1 for update skip locked;
  if a.id is null then raise exception 'QUEUE_EMPTY'; end if;
  update public.appointments set status='in_consultation', called_at=now() where id=a.id;
  insert into public.clinical_records(appointment_id, patient_id, doctor_id) values (a.id, a.patient_id, _doc) on conflict do nothing;
  perform public.notify_user(a.patient_id,'It''s your turn!','آپ کی باری ہے!',
    'Token #'||a.token_number||' — please proceed to the doctor''s room.','ٹوکن #'||a.token_number||' — براہ کرم ڈاکٹر کے کمرے میں تشریف لائیں۔');
  select * into nxt from public.appointments where doctor_id=_doc and appt_date=current_date and status in ('checked_in','booked')
    order by token_number limit 1;
  perform public.notify_user(nxt.patient_id,'You are next','اگلی باری آپ کی ہے',
    'Token #'||nxt.token_number||' — please be ready.','ٹوکن #'||nxt.token_number||' — براہ کرم تیار رہیں۔');
  perform public.log_audit('queue_advanced','appointment',a.id::text, jsonb_build_object('token',a.token_number));
  return a.id;
end $$;

create or replace function public.complete_visit(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.appointments; c public.clinical_records;
begin
  select * into a from public.appointments where id=_id;
  if a.doctor_id <> auth.uid() then raise exception 'Not your patient'; end if;
  if a.status <> 'in_consultation' then raise exception 'Visit not in consultation'; end if;
  select * into c from public.clinical_records where appointment_id=_id;
  if c.id is null or length(trim(c.diagnosis)) = 0 then raise exception 'DIAGNOSIS_REQUIRED'; end if;
  update public.clinical_records set finalized=true, finalized_at=now() where appointment_id=_id;
  update public.appointments set status='completed', completed_at=now() where id=_id;
  perform public.log_audit('transcript_finalized','clinical_record',c.id::text, jsonb_build_object('appointment',_id));
end $$;

create or replace function public.mark_no_show(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.appointments;
begin
  select * into a from public.appointments where id=_id;
  if not (a.doctor_id = auth.uid() or public.has_role(auth.uid(),'staff') or public.has_role(auth.uid(),'admin')) then raise exception 'Not allowed'; end if;
  if a.status not in ('booked','checked_in','in_consultation') then raise exception 'Cannot mark no-show'; end if;
  update public.appointments set status='no_show' where id=_id;
  perform public.log_audit('marked_no_show','appointment',_id::text, jsonb_build_object('token',a.token_number));
end $$;

create or replace function public.lock_photo(_path text)
returns void language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid();
begin
  if _path is null or split_part(_path,'/',1) <> _uid::text then raise exception 'Invalid photo path'; end if;
  if (select photo_locked_at from public.profiles where id=_uid) is not null then raise exception 'Photo already locked'; end if;
  update public.profiles set photo_path=_path, photo_locked_at=now(), photo_consent_at=coalesce(photo_consent_at, now()) where id=_uid;
  perform public.log_audit('photo_locked','profile',_uid::text, jsonb_build_object('path',_path));
end $$;

create or replace function public.reset_patient_photo(_patient_id uuid, _reason text, _remove boolean)
returns void language plpgsql security definer set search_path = public as $$
declare _old text;
begin
  if not (public.has_role(auth.uid(),'staff') or public.has_role(auth.uid(),'admin')) then raise exception 'Staff only'; end if;
  if length(trim(coalesce(_reason,''))) < 10 then raise exception 'A justification of at least 10 characters is required'; end if;
  select photo_path into _old from public.profiles where id=_patient_id;
  update public.profiles set photo_locked_at=null, photo_path = case when _remove then null else photo_path end where id=_patient_id;
  perform public.notify_user(_patient_id,'Please retake your photo','براہ کرم اپنی تصویر دوبارہ لیں',
    'Reception asked for a new identity photo: '||_reason,'استقبالیہ نے نئی شناختی تصویر کی درخواست کی ہے: '||_reason);
  perform public.log_audit(case when _remove then 'photo_removed' else 'photo_reset' end,'profile',_patient_id::text,
    jsonb_build_object('reason',_reason,'previous_path',_old), 'elevated');
end $$;

create or replace function public.request_break_glass(_patient_id uuid, _justification text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'doctor') then raise exception 'Doctors only'; end if;
  if length(trim(coalesce(_justification,''))) < 20 then raise exception 'Clinical justification must be at least 20 characters'; end if;
  if not exists(select 1 from public.profiles where id=_patient_id) then raise exception 'Patient not found'; end if;
  insert into public.break_glass_access(doctor_id, patient_id, justification, expires_at)
  values (auth.uid(), _patient_id, _justification, now() + interval '4 hours');
  perform public.log_audit('break_glass_access','profile',_patient_id::text, jsonb_build_object('justification',_justification), 'high');
end $$;

-- doctors look up patients by email/phone for break-glass, returning minimal identity only
create or replace function public.find_patient(_q text)
returns table(id uuid, full_name text, email text, phone text) language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'doctor') then raise exception 'Doctors only'; end if;
  if length(trim(coalesce(_q,''))) < 3 then return; end if;
  return query select p.id, p.full_name, p.email, p.phone from public.profiles p
    join public.user_roles r on r.user_id=p.id and r.role='patient'
    where p.email ilike '%'||_q||'%' or p.phone ilike '%'||_q||'%' or p.full_name ilike '%'||_q||'%' limit 10;
end $$;

create or replace function public.queue_info(_doctor_id uuid, _date date)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'current_token', (select token_number from public.appointments where doctor_id=_doctor_id and appt_date=_date and status='in_consultation' order by called_at desc limit 1),
    'last_called', (select max(token_number) from public.appointments where doctor_id=_doctor_id and appt_date=_date and called_at is not null),
    'waiting', (select count(*) from public.appointments where doctor_id=_doctor_id and appt_date=_date and status in ('booked','checked_in')),
    'total', (select count(*) from public.appointments where doctor_id=_doctor_id and appt_date=_date and status <> 'cancelled'),
    'slot_minutes', (select slot_minutes from public.queue_settings where id=1)
  )
$$;

create or replace function public.my_queue_position(_appointment_id uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare a public.appointments;
begin
  select * into a from public.appointments where id=_appointment_id;
  if a.patient_id <> auth.uid() then raise exception 'Not allowed'; end if;
  return json_build_object(
    'ahead', (select count(*) from public.appointments where doctor_id=a.doctor_id and appt_date=a.appt_date
              and token_number < a.token_number and status in ('booked','checked_in','in_consultation')),
    'info', public.queue_info(a.doctor_id, a.appt_date));
end $$;

-- ===== Storage policies (bucket created separately) =====
create or replace function public.photo_unlocked(_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select photo_locked_at is null from public.profiles where id=_uid), true)
$$;

create policy "patient upload own unlocked photo" on storage.objects for insert to authenticated
with check (bucket_id='patient-photos' and (storage.foldername(name))[1] = auth.uid()::text and public.photo_unlocked(auth.uid()));
create policy "patient replace own unlocked photo" on storage.objects for update to authenticated
using (bucket_id='patient-photos' and (storage.foldername(name))[1] = auth.uid()::text and public.photo_unlocked(auth.uid()));
create policy "role-gated photo read" on storage.objects for select to authenticated
using (bucket_id='patient-photos' and (
  (storage.foldername(name))[1] = auth.uid()::text
  or public.has_role(auth.uid(),'staff') or public.has_role(auth.uid(),'admin')
  or public.doctor_can_view(auth.uid(), ((storage.foldername(name))[1])::uuid)));
create policy "staff remove photos" on storage.objects for delete to authenticated
using (bucket_id='patient-photos' and (public.has_role(auth.uid(),'staff') or public.has_role(auth.uid(),'admin')));

alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.notifications;

insert into public.departments(name_en, name_ur, description) values
 ('General Medicine','جنرل میڈیسن','Primary care and common illnesses'),
 ('Pediatrics','امراض اطفال','Children''s health'),
 ('Cardiology','امراض قلب','Heart and blood vessels'),
 ('Orthopedics','ہڈیوں کا شعبہ','Bones, joints and muscles');