-- Execute uma vez no SQL Editor do Supabase.
-- Mantém o controle separado das tabelas existentes para reduzir risco de regressão.
create table if not exists public.portal_page_maintenance (
  report_key text primary key,
  arquivo text not null,
  maintenance boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id)
);

alter table public.portal_page_maintenance enable row level security;
revoke all on table public.portal_page_maintenance from anon, authenticated;

create or replace function public.portal_get_maintenance_pages()
returns table(report_key text, arquivo text, maintenance boolean)
language sql
security definer
set search_path = public
stable
as $$
  select m.report_key, m.arquivo, m.maintenance
  from public.portal_page_maintenance m
  where m.maintenance = true;
$$;

create or replace function public.portal_admin_list_maintenance()
returns table(report_key text, arquivo text, maintenance boolean, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if coalesce(auth.jwt()->>'email','') not ilike '%demetrius377%' then
    raise exception 'Acesso restrito ao administrador';
  end if;
  return query select m.report_key,m.arquivo,m.maintenance,m.updated_at from public.portal_page_maintenance m order by m.report_key;
end;
$$;

create or replace function public.portal_admin_set_maintenance(p_report_key text,p_arquivo text,p_maintenance boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare k text:=trim(lower(coalesce(p_report_key,''))); a text:=trim(lower(coalesce(p_arquivo,'')));
begin
  if coalesce(auth.jwt()->>'email','') not ilike '%demetrius377%' then
    raise exception 'Acesso restrito ao administrador';
  end if;
  if k='' or a='' or a !~ '^[a-z0-9_./-]+\.html?$' or a like '%..%' then
    raise exception 'Relatório ou caminho inválido';
  end if;
  if a in ('index.html','admin_relatorios.html','manutencao.html','404.html') or a like 'admin\_%' escape '\' or a like 'admin-%' then
    raise exception 'Página protegida não pode entrar em manutenção';
  end if;
  insert into public.portal_page_maintenance(report_key,arquivo,maintenance,updated_at,updated_by)
  values(k,a,coalesce(p_maintenance,false),now(),auth.uid())
  on conflict(report_key) do update set arquivo=excluded.arquivo,maintenance=excluded.maintenance,updated_at=now(),updated_by=auth.uid();
  return true;
end;
$$;

revoke all on function public.portal_get_maintenance_pages() from public;
revoke all on function public.portal_admin_list_maintenance() from public;
revoke all on function public.portal_admin_set_maintenance(text,text,boolean) from public;
grant execute on function public.portal_get_maintenance_pages() to authenticated;
grant execute on function public.portal_admin_list_maintenance() to authenticated;
grant execute on function public.portal_admin_set_maintenance(text,text,boolean) to authenticated;
