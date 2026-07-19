-- ═══════════════════════════════════════════════════════════════════════
-- Schema do banco de dados — Minha Loja
-- Como usar: cole este arquivo inteiro no SQL Editor do seu projeto
-- Supabase (https://app.supabase.com -> seu projeto -> SQL Editor -> New query)
-- e clique em "Run".
-- ═══════════════════════════════════════════════════════════════════════

-- Produtos
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  category text,
  image_url text,
  stock integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clientes (também funciona como CRM: lead até virar cliente fechado)
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  address text,
  reference_point text, -- ponto de referência para entrega
  stage text not null default 'lead', -- lead | contato_feito | negociacao | cliente
  source text, -- de onde veio: indicação, instagram, site, etc.
  notes text,
  created_at timestamptz not null default now()
);

-- Histórico de interações do CRM (ligações, e-mails, mensagens, reuniões...)
create table interactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  type text not null default 'outro', -- ligacao | email | whatsapp | reuniao | outro
  description text not null,
  created_at timestamptz not null default now()
);

create index idx_interactions_customer on interactions(customer_id);

-- Sequência do número do pedido, começando em 1000
create sequence order_number_seq start 1000;

-- Pedidos
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number integer not null default nextval('order_number_seq'),
  customer_id uuid references customers(id),
  status text not null default 'pendente', -- pendente | confirmado | enviado | entregue | cancelado
  payment_method text not null default 'cod', -- cod | mercadopago | stripe | pagbank
  shipping_cost numeric(10,2) not null default 0,
  subtotal numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text, -- observação escrita pelo cliente no checkout
  created_at timestamptz not null default now()
);

create unique index idx_orders_order_number on orders(order_number);

-- Itens de cada pedido
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null, -- guardado aqui também para manter histórico
  unit_price numeric(10,2) not null,
  quantity integer not null default 1
);

-- Índices para acelerar os filtros de relatório por data
create index idx_orders_created_at on orders(created_at);
create index idx_orders_status on orders(status);

-- Bucket de armazenamento para as imagens de produto
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Permite leitura pública das imagens (necessário pro app do cliente mostrar as fotos)
create policy "Imagens de produtos são públicas"
on storage.objects for select
using ( bucket_id = 'product-images' );

-- Permite que usuários autenticados (você, no painel admin) façam upload
create policy "Usuários autenticados podem subir imagens"
on storage.objects for insert
with check ( bucket_id = 'product-images' and auth.role() = 'authenticated' );

-- Row Level Security: produtos ativos são visíveis para todo mundo (app do cliente),
-- mas só usuários autenticados (você) podem criar/editar/excluir.
alter table products enable row level security;

create policy "Qualquer um pode ver produtos ativos"
on products for select
using ( active = true );

create policy "Usuários autenticados podem gerenciar produtos"
on products for all
using ( auth.role() = 'authenticated' )
with check ( auth.role() = 'authenticated' );

-- Pedidos: só usuários autenticados (o painel admin) podem ver/gerenciar.
-- O app do cliente cria pedidos por uma rota própria (ver README).
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "Usuários autenticados podem gerenciar pedidos"
on orders for all
using ( auth.role() = 'authenticated' )
with check ( auth.role() = 'authenticated' );

create policy "Usuários autenticados podem gerenciar itens de pedido"
on order_items for all
using ( auth.role() = 'authenticated' )
with check ( auth.role() = 'authenticated' );

create policy "Qualquer um pode criar pedido"
on orders for insert
with check ( true );

create policy "Qualquer um pode criar itens de pedido"
on order_items for insert
with check ( true );

-- Clientes / CRM: só usuários autenticados (o painel) veem e gerenciam
alter table customers enable row level security;

create policy "Usuários autenticados podem gerenciar clientes"
on customers for all
using ( auth.role() = 'authenticated' )
with check ( auth.role() = 'authenticated' );

create policy "Qualquer um pode se cadastrar como cliente"
on customers for insert
with check ( true );

-- Interações: só o painel (autenticado) vê e registra
alter table interactions enable row level security;

create policy "Usuários autenticados podem gerenciar interações"
on interactions for all
using ( auth.role() = 'authenticated' )
with check ( auth.role() = 'authenticated' );
