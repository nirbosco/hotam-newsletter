-- ניוזלטר שיתופי · סכמה לפרויקט hotamnemi · כל האובייקטים בקידומת nl_
-- הרצה חוזרת בטוחה (idempotent ככל האפשר)

create extension if not exists pgcrypto with schema extensions;

-- ===== טבלאות =====
create table if not exists public.nl_workspaces (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  subtitle text not null default 'מגזין שיתופי',
  template text not null default 'hotam',
  theme jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{"ai_enabled": true, "video_enabled": false, "video_quota": 3}'::jsonb,
  post_order uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.nl_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.nl_workspaces(id) on delete cascade,
  type text not null check (type in ('opinion','article','interview','letters','image','video','crossword','podcast','other')),
  title text not null check (char_length(title) between 1 and 200),
  subtitle text not null default '' check (char_length(subtitle) <= 400),
  author text not null default '' check (char_length(author) <= 200),
  content text not null default '' check (char_length(content) <= 200000),
  image text not null default '',
  items jsonb not null default '[]'::jsonb,
  crossword jsonb,
  hidden boolean not null default false,
  likes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nl_posts_ws_idx on public.nl_posts(workspace_id, created_at);

-- גיבובי מפתחות: סגור לגמרי ללקוח
create table if not exists public.nl_secrets (
  kind text not null check (kind in ('admin','post')),
  ref uuid not null,
  key_hash text not null,
  primary key (kind, ref)
);

create table if not exists public.nl_ai_usage (
  workspace_id uuid not null references public.nl_workspaces(id) on delete cascade,
  day date not null default current_date,
  kind text not null,
  count integer not null default 0,
  primary key (workspace_id, day, kind)
);

alter table public.nl_workspaces enable row level security;
alter table public.nl_posts enable row level security;
alter table public.nl_secrets enable row level security;
alter table public.nl_ai_usage enable row level security;
revoke all on public.nl_workspaces, public.nl_posts, public.nl_secrets, public.nl_ai_usage from anon, authenticated;

-- ===== עזרים =====
create or replace function public.nl_hash(p text) returns text
language sql immutable as $$ select encode(extensions.digest(coalesce(p,''), 'sha256'), 'hex') $$;

create or replace function public.nl_new_key() returns text
language sql volatile as $$ select replace(replace(encode(extensions.gen_random_bytes(18), 'base64'), '+', '-'), '/', '_') $$;

create or replace function public.nl_new_code() returns text
language plpgsql volatile as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c text; i int;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.nl_workspaces where code = c);
  end loop;
  return c;
end $$;

create or replace function public.nl_ws(p_code text) returns public.nl_workspaces
language sql stable security definer set search_path = public as $$
  select * from public.nl_workspaces where code = upper(trim(p_code)) limit 1
$$;

create or replace function public.nl_is_admin(p_ws uuid, p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.nl_secrets where kind = 'admin' and ref = p_ws and key_hash = public.nl_hash(p_key))
$$;

create or replace function public.nl_notify(p_code text, p_what text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(jsonb_build_object('what', p_what, 'at', now()), 'changed', 'nl-' || p_code, false);
exception when others then
  null; -- שידור שנכשל לא מפיל כתיבה. המסך מרענן גם בסקר תקופתי
end $$;

create or replace function public.nl_post_json(p public.nl_posts) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'id', p.id, 'type', p.type, 'title', p.title, 'subtitle', p.subtitle, 'author', p.author,
    'content', p.content, 'image', p.image, 'items', p.items, 'crossword', p.crossword,
    'hidden', p.hidden, 'likes', p.likes, 'created_at', p.created_at, 'updated_at', p.updated_at)
$$;

create or replace function public.nl_ws_json(w public.nl_workspaces) returns jsonb
language sql stable as $$
  select jsonb_build_object('code', w.code, 'name', w.name, 'subtitle', w.subtitle, 'template', w.template,
    'theme', w.theme, 'settings', w.settings, 'post_order', to_jsonb(w.post_order), 'created_at', w.created_at)
$$;

-- ניקוי שדות כתבה מהקלט
create or replace function public.nl_clean_post(p jsonb) returns jsonb
language plpgsql immutable as $$
begin
  return jsonb_build_object(
    'type', coalesce(p->>'type', 'article'),
    'title', left(trim(coalesce(p->>'title', '')), 200),
    'subtitle', left(coalesce(p->>'subtitle', ''), 400),
    'author', left(coalesce(p->>'author', ''), 200),
    'content', left(coalesce(p->>'content', ''), 200000),
    'image', left(coalesce(p->>'image', ''), 2000),
    'items', case when jsonb_typeof(p->'items') = 'array' then p->'items' else '[]'::jsonb end,
    'crossword', case when jsonb_typeof(p->'crossword') = 'object' then p->'crossword' else null end);
end $$;

-- ===== API ציבורי =====
create or replace function public.nl_create_workspace(p_name text, p_subtitle text default null, p_template text default 'hotam')
returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.nl_workspaces; k text;
begin
  if coalesce(trim(p_name), '') = '' or char_length(p_name) > 120 then
    raise exception 'invalid_name';
  end if;
  insert into public.nl_workspaces (code, name, subtitle, template)
  values (public.nl_new_code(), trim(p_name), coalesce(nullif(trim(p_subtitle), ''), 'מגזין שיתופי'), coalesce(nullif(p_template, ''), 'hotam'))
  returning * into w;
  k := public.nl_new_key();
  insert into public.nl_secrets (kind, ref, key_hash) values ('admin', w.id, public.nl_hash(k));
  return jsonb_build_object('code', w.code, 'admin_key', k);
end $$;

-- קריאה לכותבים ולמסך: כתבות גלויות בלבד
create or replace function public.nl_get(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare w public.nl_workspaces;
begin
  w := public.nl_ws(p_code);
  if w.id is null then return null; end if;
  return jsonb_build_object('workspace', public.nl_ws_json(w),
    'posts', coalesce((select jsonb_agg(public.nl_post_json(p) order by p.created_at desc)
                       from public.nl_posts p where p.workspace_id = w.id and not p.hidden), '[]'::jsonb));
end $$;

create or replace function public.nl_create_post(p_code text, p_post jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.nl_workspaces; c jsonb; new_id uuid; k text; n int;
begin
  w := public.nl_ws(p_code);
  if w.id is null then raise exception 'not_found'; end if;
  select count(*) into n from public.nl_posts where workspace_id = w.id;
  if n >= 300 then raise exception 'too_many_posts'; end if;
  c := public.nl_clean_post(p_post);
  if c->>'title' = '' then raise exception 'title_required'; end if;
  insert into public.nl_posts (workspace_id, type, title, subtitle, author, content, image, items, crossword)
  values (w.id, c->>'type', c->>'title', c->>'subtitle', c->>'author', c->>'content', c->>'image', c->'items', c->'crossword')
  returning id into new_id;
  k := public.nl_new_key();
  insert into public.nl_secrets (kind, ref, key_hash) values ('post', new_id, public.nl_hash(k));
  perform public.nl_notify(w.code, 'post');
  return jsonb_build_object('id', new_id, 'edit_key', k);
end $$;

-- עריכת כתבה: מפתח העריכה של הכתבה או מפתח המנחה
create or replace function public.nl_update_post(p_code text, p_id uuid, p_key text, p_post jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.nl_workspaces; c jsonb;
begin
  w := public.nl_ws(p_code);
  if w.id is null then raise exception 'not_found'; end if;
  if not exists (select 1 from public.nl_posts where id = p_id and workspace_id = w.id) then raise exception 'not_found'; end if;
  if not (public.nl_is_admin(w.id, p_key)
          or exists (select 1 from public.nl_secrets where kind = 'post' and ref = p_id and key_hash = public.nl_hash(p_key))) then
    raise exception 'forbidden';
  end if;
  c := public.nl_clean_post(p_post);
  if c->>'title' = '' then raise exception 'title_required'; end if;
  update public.nl_posts set type = c->>'type', title = c->>'title', subtitle = c->>'subtitle', author = c->>'author',
    content = c->>'content', image = c->>'image', items = c->'items', crossword = c->'crossword', updated_at = now()
  where id = p_id;
  perform public.nl_notify(w.code, 'post');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.nl_get_post_for_edit(p_code text, p_id uuid, p_key text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare w public.nl_workspaces; p public.nl_posts;
begin
  w := public.nl_ws(p_code);
  select * into p from public.nl_posts where id = p_id and workspace_id = w.id;
  if p.id is null then return null; end if;
  if not (public.nl_is_admin(w.id, p_key)
          or exists (select 1 from public.nl_secrets where kind = 'post' and ref = p_id and key_hash = public.nl_hash(p_key))) then
    raise exception 'forbidden';
  end if;
  return public.nl_post_json(p);
end $$;

-- ===== API מנחה =====
create or replace function public.nl_admin_get(p_code text, p_key text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare w public.nl_workspaces;
begin
  w := public.nl_ws(p_code);
  if w.id is null or not public.nl_is_admin(w.id, p_key) then raise exception 'forbidden'; end if;
  return jsonb_build_object('workspace', public.nl_ws_json(w),
    'posts', coalesce((select jsonb_agg(public.nl_post_json(p) order by p.created_at desc)
                       from public.nl_posts p where p.workspace_id = w.id), '[]'::jsonb),
    'ai_today', coalesce((select jsonb_object_agg(kind, count) from public.nl_ai_usage where workspace_id = w.id and day = current_date), '{}'::jsonb));
end $$;

create or replace function public.nl_admin_update_workspace(p_code text, p_key text, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.nl_workspaces;
begin
  w := public.nl_ws(p_code);
  if w.id is null or not public.nl_is_admin(w.id, p_key) then raise exception 'forbidden'; end if;
  update public.nl_workspaces set
    name = case when p_patch ? 'name' and trim(p_patch->>'name') <> '' then left(trim(p_patch->>'name'), 120) else name end,
    subtitle = case when p_patch ? 'subtitle' then left(coalesce(p_patch->>'subtitle', ''), 200) else subtitle end,
    template = case when p_patch ? 'template' then left(p_patch->>'template', 40) else template end,
    theme = case when jsonb_typeof(p_patch->'theme') = 'object' then p_patch->'theme' else theme end,
    settings = case when jsonb_typeof(p_patch->'settings') = 'object' then settings || (p_patch->'settings') else settings end,
    post_order = case when jsonb_typeof(p_patch->'post_order') = 'array'
                      then array(select (x)::uuid from jsonb_array_elements_text(p_patch->'post_order') x) else post_order end
  where id = w.id;
  perform public.nl_notify(w.code, 'workspace');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.nl_admin_post_action(p_code text, p_key text, p_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.nl_workspaces;
begin
  w := public.nl_ws(p_code);
  if w.id is null or not public.nl_is_admin(w.id, p_key) then raise exception 'forbidden'; end if;
  if p_action = 'hide' then update public.nl_posts set hidden = true where id = p_id and workspace_id = w.id;
  elsif p_action = 'unhide' then update public.nl_posts set hidden = false where id = p_id and workspace_id = w.id;
  elsif p_action = 'delete' then
    delete from public.nl_posts where id = p_id and workspace_id = w.id;
    delete from public.nl_secrets where kind = 'post' and ref = p_id;
  else raise exception 'bad_action';
  end if;
  perform public.nl_notify(w.code, 'post');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.nl_admin_check(p_code text, p_key text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare w public.nl_workspaces;
begin
  w := public.nl_ws(p_code);
  return w.id is not null and public.nl_is_admin(w.id, p_key);
end $$;

-- ===== מכסות AI (נקרא רק מה-Edge Function עם service role) =====
create or replace function public.nl_ai_consume(p_code text, p_kind text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.nl_workspaces; lim int; used int;
begin
  w := public.nl_ws(p_code);
  if w.id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if coalesce((w.settings->>'ai_enabled')::boolean, true) = false then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  end if;
  lim := case p_kind when 'image' then 60 when 'video' then coalesce((w.settings->>'video_quota')::int, 3) else 300 end;
  insert into public.nl_ai_usage (workspace_id, day, kind, count) values (w.id, current_date, p_kind, 1)
  on conflict (workspace_id, day, kind) do update set count = public.nl_ai_usage.count + 1
  returning count into used;
  if used > lim then
    update public.nl_ai_usage set count = count - 1 where workspace_id = w.id and day = current_date and kind = p_kind;
    return jsonb_build_object('ok', false, 'reason', 'quota');
  end if;
  return jsonb_build_object('ok', true, 'workspace_id', w.id);
end $$;

-- ===== הרשאות =====
-- זהירות: הפרויקט משותף. נוגעים רק בפונקציות nl_
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'nl\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
do $$
declare f text;
begin
  foreach f in array array[
    'nl_create_workspace(text,text,text)', 'nl_get(text)', 'nl_create_post(text,jsonb)',
    'nl_update_post(text,uuid,text,jsonb)', 'nl_get_post_for_edit(text,uuid,text)',
    'nl_admin_get(text,text)', 'nl_admin_update_workspace(text,text,jsonb)',
    'nl_admin_post_action(text,text,uuid,text)', 'nl_admin_check(text,text)'] loop
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
grant execute on function public.nl_ai_consume(text,text) to service_role;

-- ===== אחסון =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nl-media', 'nl-media', true, 26214400,
        array['image/png','image/jpeg','image/webp','image/gif','audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/webm','audio/ogg','font/woff2','font/woff','font/ttf','application/octet-stream','video/mp4'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "nl-media upload" on storage.objects;
create policy "nl-media upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'nl-media' and (storage.foldername(name))[1] = 'u');

-- החזרת מכסה כשקריאת AI נכשלה
create or replace function public.nl_ai_refund(p_code text, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
declare w public.nl_workspaces;
begin
  w := public.nl_ws(p_code);
  if w.id is null then return; end if;
  update public.nl_ai_usage set count = greatest(count - 1, 0) where workspace_id = w.id and day = current_date and kind = p_kind;
end $$;
revoke all on function public.nl_ai_refund(text,text) from public, anon, authenticated;
grant execute on function public.nl_ai_refund(text,text) to service_role;
