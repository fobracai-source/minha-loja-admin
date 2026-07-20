-- ═══════════════════════════════════════════════════════════════════════
-- Migração: Financeiro com baixa de contas (individual/agrupada) e Caixa.
-- Quando um pedido vira "Entregue" na Logística, gera automaticamente uma
-- conta a receber classificada como "RECEITA DE VENDA".
-- Cole este script inteiro no SQL Editor do Supabase e clique em "Run".
-- ═══════════════════════════════════════════════════════════════════════

-- Novos campos: origem do lançamento e agrupamento de baixa em lote
alter table financial_transactions add column if not exists origin text default 'manual'; -- manual | pedido_entregue
alter table financial_transactions add column if not exists settlement_group_id uuid;

-- Padroniza o nome do status: "concluido" passa a se chamar "baixado"
-- (mesmo sentido, só o nome que muda, para bater com o termo contábil usual)
update financial_transactions set status = 'baixado' where status = 'concluido';

create index if not exists idx_financial_category on financial_transactions(category);
create index if not exists idx_financial_settlement_group on financial_transactions(settlement_group_id);
create index if not exists idx_financial_payment_date on financial_transactions(payment_date);

-- Gera automaticamente uma conta a receber quando o pedido é marcado como
-- "entregue" na Logística. Não duplica se já existir uma receita de venda
-- gerada para esse pedido.
create or replace function generate_receivable_on_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  if new.status = 'entregue' and (old.status is distinct from 'entregue') then
    select * into v_order from orders where id = new.order_id;

    if found and not exists (
      select 1 from financial_transactions
      where order_id = v_order.id and category = 'RECEITA DE VENDA'
    ) then
      insert into financial_transactions
        (type, description, category, amount, due_date, status, order_id, origin)
      values
        ('entrada', 'Venda - Pedido #' || v_order.order_number, 'RECEITA DE VENDA',
         v_order.total, current_date, 'pendente', v_order.id, 'pedido_entregue');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_generate_receivable on deliveries;
create trigger trg_generate_receivable
after update on deliveries
for each row execute function generate_receivable_on_delivery();
