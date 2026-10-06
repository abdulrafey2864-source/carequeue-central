create or replace function public.book_appointment(_doctor_id uuid, _date date)
returns uuid language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); s public.queue_settings; _id uuid; _tok int;
begin
  if not public.has_role(_uid,'patient') then raise exception 'Only patients can book'; end if;
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

create table public.visit_photos(
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id),
  patient_id uuid not null,
  path text not null,
  taken_by uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.visit_photos to authenticated;
grant all on public.visit_photos to service_role;
alter table public.visit_photos enable row level security;

create or replace function public.doctor_owns_appt(_doc uuid, _appt uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.appointments where id=_appt and doctor_id=_doc and status in ('in_consultation','completed'))
$$;

create policy "visit photos read" on public.visit_photos for select to authenticated
using (patient_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.doctor_can_view(auth.uid(), patient_id));
create policy "doctor adds visit photo" on public.visit_photos for insert to authenticated
with check (taken_by = auth.uid() and public.doctor_owns_appt(auth.uid(), appointment_id)
  and patient_id = (select a.patient_id from public.appointments a where a.id = appointment_id)
  and split_part(path,'/',1) = patient_id::text);

create policy "doctor upload visit photo" on storage.objects for insert to authenticated
with check (bucket_id='patient-photos' and public.has_role(auth.uid(),'doctor')
  and public.doctor_can_view(auth.uid(), ((storage.foldername(name))[1])::uuid));

comment on column public.profiles.photo_locked_at is 'DEPRECATED: identity photo no longer required; photos are optional per visit (visit_photos)';