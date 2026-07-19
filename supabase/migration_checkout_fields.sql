-- ═══════════════════════════════════════════════════════════════════════
-- Migração: adiciona os campos completos de checkout (endereço, ponto de
-- referência, observação) e o número de pedido sequencial começando em
-- 1000. Não apaga nenhum dado existente.
-- Cole este script inteiro no SQL Editor do Supabase e clique em "Run".
-- ═══════════════════════════════════════════════════════════════════════

-- Remove a exigência de e-mail único (agora o cliente pode reaparecer sem
-- e-mail cadastrado, ou repetir e-mail em casos raros de família/loja)
alter table customers drop constraint if exists customers_email_key;

alter table customers add column if not exists reference_point text;

alter table orders add column if not exists notes text;

-- Cria a sequência do número do pedido, se ainda não existir
create sequence if not exists order_number_seq start 1000;

alter table orders add column if not exists order_number integer;
alter table orders alter column order_number set default nextval('order_number_seq');

-- Preenche o número dos pedidos que já existem e ainda não têm número
update orders set order_number = nextval('order_number_seq') where order_number is null;

alter table orders alter column order_number set not null;

create unique index if not exists idx_orders_order_number on orders(order_number);
