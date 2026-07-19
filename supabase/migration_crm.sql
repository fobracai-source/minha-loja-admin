-- ═══════════════════════════════════════════════════════════════════════
-- Migração: adiciona o CRM a um banco que já existia antes
-- Só rode este arquivo se você JÁ tinha executado o schema.sql anteriormente.
-- Se está criando o projeto do zero, ignore este arquivo — o schema.sql
-- já vem completo com essas tabelas.
-- ═══════════════════════════════════════════════════════════════════════

alter table customers add column if not exists stage text not null default 'lead';
alter table customers add column if not exists source text;
alter table customers add column if not exists notes text;

create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  type text not null default 'outro',
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_interactions_customer on interactions(customer_id);

alter table customers enable row level security;

create policy if not exists "Usuários autenticados podem gerenciar clientes"
on customers for all
using ( auth.role() = 'authenticated' )
with check ( auth.role() = 'authenticated' );

create policy if not exists "Qualquer um pode se cadastrar como cliente"
on customers for insert
with check ( true );

alter table interactions enable row level security;

create policy if not exists "Usuários autenticados podem gerenciar interações"
on interactions for all
using ( auth.role() = 'authenticated' )
with check ( auth.role() = 'authenticated' );
