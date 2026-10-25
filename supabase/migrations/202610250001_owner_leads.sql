-- First production slice: private owner lead workspace and database-first inquiry capture.
create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner','admin','project_manager','editor','designer','developer','marketing_specialist')),
  granted_by uuid null references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz null,
  primary key (user_id, role)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique default ('HM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 24))),
  full_name text not null check (char_length(full_name) between 1 and 120),
  email_normalized text not null check (char_length(email_normalized) between 3 and 254),
  phone text null,
  company_name text null,
  website_url text null,
  service_areas text not null check (char_length(service_areas) between 1 and 260),
  project_description text not null check (char_length(project_description) between 1 and 3000),
  budget_band text null,
  preferred_contact_method text null check (preferred_contact_method is null or preferred_contact_method in ('Email','Phone','WhatsApp')),
  source text not null default 'website' check (source = 'website'),
  status text not null default 'new' check (status in ('new','contacted','qualified','proposal_sent','negotiation','won','lost')),
  follow_up_at timestamptz null,
  consent_version text not null,
  consented_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  activity_type text not null check (activity_type in ('inquiry_received','status_changed','follow_up_changed','note_added')),
  summary text not null check (char_length(summary) between 1 and 200),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text null,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.integration_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text not null check (entity_type = 'lead'),
  entity_id uuid not null references public.leads(id) on delete cascade,
  destination text not null check (destination = 'google_sheets'),
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending','processing','succeeded','retryable_failure','permanent_failure')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz null
);

create table if not exists public.inquiry_rate_limits (
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists inquiry_rate_limits_created_at_idx on public.inquiry_rate_limits(created_at);
create index if not exists leads_created_at_idx on public.leads(created_at desc, id desc);
create index if not exists leads_status_created_at_idx on public.leads(status, created_at desc, id desc);
create index if not exists lead_notes_lead_created_idx on public.lead_notes(lead_id, created_at desc);
create index if not exists lead_activities_lead_created_idx on public.lead_activities(lead_id, created_at desc);
create index if not exists integration_outbox_pending_idx on public.integration_outbox(status, next_attempt_at) where status in ('pending','retryable_failure');

create or replace function public.current_user_can_manage_leads()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role in ('owner','admin')
      and r.revoked_at is null
  );
$$;
revoke all on function public.current_user_can_manage_leads() from public, anon;
grant execute on function public.current_user_can_manage_leads() to authenticated;

alter table public.user_roles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;
alter table public.lead_activities enable row level security;
alter table public.audit_logs enable row level security;
alter table public.integration_outbox enable row level security;
alter table public.inquiry_rate_limits enable row level security;

revoke all on public.user_roles, public.leads, public.lead_notes, public.lead_activities,
  public.audit_logs, public.integration_outbox, public.inquiry_rate_limits from anon, authenticated;
grant select on public.user_roles to authenticated;
grant select, update on public.leads to authenticated;
grant select, insert on public.lead_notes to authenticated;
grant select on public.lead_activities, public.audit_logs to authenticated;
grant select, update on public.integration_outbox to service_role;

drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists leads_owner_read on public.leads;
create policy leads_owner_read on public.leads for select to authenticated using (public.current_user_can_manage_leads());
drop policy if exists leads_owner_update on public.leads;
create policy leads_owner_update on public.leads for update to authenticated using (public.current_user_can_manage_leads()) with check (public.current_user_can_manage_leads());
drop policy if exists lead_notes_owner_read on public.lead_notes;
create policy lead_notes_owner_read on public.lead_notes for select to authenticated using (public.current_user_can_manage_leads());
drop policy if exists lead_notes_owner_insert on public.lead_notes;
create policy lead_notes_owner_insert on public.lead_notes for insert to authenticated with check (public.current_user_can_manage_leads() and created_by = (select auth.uid()));
drop policy if exists lead_activities_owner_read on public.lead_activities;
create policy lead_activities_owner_read on public.lead_activities for select to authenticated using (public.current_user_can_manage_leads());
drop policy if exists audit_logs_owner_read on public.audit_logs;
create policy audit_logs_owner_read on public.audit_logs for select to authenticated using (public.current_user_can_manage_leads());
drop policy if exists integration_outbox_owner_read on public.integration_outbox;
create policy integration_outbox_owner_read on public.integration_outbox for select to authenticated using (public.current_user_can_manage_leads());

create or replace function public.set_lead_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_lead_updated_at();

create or replace function public.log_lead_change()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_activities(lead_id, actor_user_id, activity_type, summary)
      values (new.id, null, 'inquiry_received', 'Project inquiry received');
    insert into public.integration_outbox(event_type, entity_type, entity_id, destination, idempotency_key)
      values ('lead.created', 'lead', new.id, 'google_sheets', 'google_sheets:lead:' || new.id::text);
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.lead_activities(lead_id, actor_user_id, activity_type, summary)
      values (new.id, auth.uid(), 'status_changed', 'Lead status changed to ' || new.status);
    insert into public.audit_logs(actor_user_id, action, resource_type, resource_id, safe_metadata)
      values (auth.uid(), 'lead.status_changed', 'lead', new.id::text, jsonb_build_object('status', new.status));
  end if;
  if new.follow_up_at is distinct from old.follow_up_at then
    insert into public.lead_activities(lead_id, actor_user_id, activity_type, summary)
      values (new.id, auth.uid(), 'follow_up_changed', 'Lead follow-up date updated');
    insert into public.audit_logs(actor_user_id, action, resource_type, resource_id)
      values (auth.uid(), 'lead.follow_up_changed', 'lead', new.id::text);
  end if;
  return new;
end;
$$;
drop trigger if exists leads_log_change on public.leads;
create trigger leads_log_change after insert or update on public.leads for each row execute function public.log_lead_change();

create or replace function public.log_lead_note()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  insert into public.lead_activities(lead_id, actor_user_id, activity_type, summary)
    values (new.lead_id, new.created_by, 'note_added', 'Internal note added');
  insert into public.audit_logs(actor_user_id, action, resource_type, resource_id)
    values (new.created_by, 'lead.note_added', 'lead', new.lead_id::text);
  return new;
end;
$$;
drop trigger if exists lead_notes_log_change on public.lead_notes;
create trigger lead_notes_log_change after insert on public.lead_notes for each row execute function public.log_lead_note();

create or replace function public.submit_public_inquiry(p_payload jsonb, p_ip_hash text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_name text := btrim(coalesce(p_payload->>'name',''));
  v_email text := lower(btrim(coalesce(p_payload->>'email','')));
  v_area text := btrim(coalesce(p_payload->>'area',''));
  v_message text := btrim(coalesce(p_payload->>'message',''));
  v_website text := btrim(coalesce(p_payload->>'website',''));
  v_phone text := btrim(coalesce(p_payload->>'phone',''));
  v_contact text := btrim(coalesce(p_payload->>'contactPreference',''));
  v_budget text := btrim(coalesce(p_payload->>'budget',''));
  v_reference text;
  v_attempts integer;
begin
  if (select auth.role()) <> 'service_role' then raise exception using errcode = '42501', message = 'Not authorized'; end if;
  if coalesce(jsonb_typeof(p_payload), '') <> 'object' or char_length(v_name) not between 1 and 120
     or char_length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or char_length(v_area) not between 1 and 260 or char_length(v_message) not between 1 and 3000
     or coalesce(p_payload->>'consent','') <> 'true'
     or char_length(v_website) > 500 or (v_website <> '' and v_website !~ '^https://[^[:space:]/?#]+([/?#].*)?$')
     or char_length(v_phone) > 30 or (v_phone <> '' and v_phone !~ '^[+()0-9 .-]{7,30}$')
     or char_length(v_budget) > 80 or char_length(v_contact) > 40
     or char_length(coalesce(p_payload->>'organization','')) > 160
     or char_length(coalesce(p_payload->>'companyWebsite','')) > 500
     or (v_contact <> '' and v_contact not in ('Email','Phone','WhatsApp'))
     or p_payload->>'companyWebsite' is not null and btrim(p_payload->>'companyWebsite') <> '' then
    raise exception using errcode = '22023', message = 'Invalid inquiry';
  end if;
  if p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'Inquiry protection is unavailable';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));
  delete from public.inquiry_rate_limits where created_at < now() - interval '24 hours';
  select count(*) into v_attempts from public.inquiry_rate_limits
   where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
  if v_attempts >= 10 then raise exception using errcode = 'P0001', message = 'Rate limit exceeded'; end if;
  insert into public.inquiry_rate_limits(ip_hash) values (p_ip_hash);

  v_reference := 'HM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 24));
  insert into public.leads(public_reference, full_name, email_normalized, phone, company_name, website_url,
    service_areas, project_description, budget_band, preferred_contact_method, consent_version, consented_at)
  values (v_reference, v_name, v_email, nullif(v_phone,''), nullif(btrim(coalesce(p_payload->>'organization','')),''),
    nullif(v_website,''), v_area, v_message, nullif(v_budget,''), nullif(v_contact,''), 'privacy-v1', now());
  return v_reference;
end;
$$;
revoke all on function public.submit_public_inquiry(jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_public_inquiry(jsonb, text) to service_role;

create or replace function public.public_health_check()
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$ select true; $$;
revoke all on function public.public_health_check() from public, authenticated;
grant execute on function public.public_health_check() to anon;

create or replace function public.claim_google_sheets_outbox(p_batch_size integer default 10)
returns table(event_id uuid, idempotency_key text, record jsonb, attempt_count integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;
  return query
  with claimable as (
    select o.id from public.integration_outbox o
    where o.destination = 'google_sheets'
      and (o.status in ('pending','retryable_failure') or (o.status = 'processing' and o.updated_at < now() - interval '15 minutes'))
      and o.next_attempt_at <= now() and o.attempt_count < 5
    order by o.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_batch_size, 10), 10))
  ), claimed as (
    update public.integration_outbox o
    set status = 'processing', attempt_count = o.attempt_count + 1, updated_at = now()
    from claimable c where o.id = c.id
    returning o.id, o.entity_id, o.idempotency_key, o.attempt_count
  )
  select c.id, c.idempotency_key,
    jsonb_build_object(
      'type','partners','id',l.id::text,'submittedAt',l.created_at,'name',l.full_name,'email',l.email_normalized,
      'organization',l.company_name,'area',l.service_areas,'message',l.project_description,'consent',true,
      'phone',l.phone,'website',l.website_url,'budget',l.budget_band,'contactPreference',l.preferred_contact_method
    ), c.attempt_count
  from claimed c join public.leads l on l.id = c.entity_id;
end;
$$;
revoke all on function public.claim_google_sheets_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_google_sheets_outbox(integer) to service_role;

create or replace function public.log_owner_lead_export(p_row_count integer)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not public.current_user_can_manage_leads() or p_row_count < 0 or p_row_count > 5000 then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;
  insert into public.audit_logs(actor_user_id, action, resource_type, safe_metadata)
    values (auth.uid(), 'lead.exported', 'lead', jsonb_build_object('row_count', p_row_count));
end;
$$;
revoke all on function public.log_owner_lead_export(integer) from public, anon;
grant execute on function public.log_owner_lead_export(integer) to authenticated;

create or replace function public.owner_sheets_sync_counts()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare counts jsonb;
begin
  if not public.current_user_can_manage_leads() then raise exception using errcode = '42501', message = 'Not authorized'; end if;
  select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) into counts
    from (select status, count(*) as total from public.integration_outbox where destination = 'google_sheets' group by status) grouped;
  return counts;
end;
$$;
revoke all on function public.owner_sheets_sync_counts() from public, anon;
grant execute on function public.owner_sheets_sync_counts() to authenticated;

create or replace function public.retry_failed_sheets_sync()
returns integer language plpgsql security definer set search_path = pg_catalog, public as $$
declare retried integer;
begin
  if not public.current_user_can_manage_leads() then raise exception using errcode = '42501', message = 'Not authorized'; end if;
  update public.integration_outbox set status = 'retryable_failure', attempt_count = 0, next_attempt_at = now(),
    last_error_code = null, processed_at = null, updated_at = now()
    where destination = 'google_sheets' and status = 'permanent_failure';
  get diagnostics retried = row_count;
  insert into public.audit_logs(actor_user_id, action, resource_type, safe_metadata)
    values (auth.uid(), 'sheets.sync_retried', 'integration_outbox', jsonb_build_object('row_count', retried));
  return retried;
end;
$$;
revoke all on function public.retry_failed_sheets_sync() from public, anon;
grant execute on function public.retry_failed_sheets_sync() to authenticated;
