-- ═══════════════════════════════════════════════════════════════════════
-- Migração: módulo Financeiro — lançamentos de entrada/saída, com
-- vencimento e status (funciona como contas a pagar/receber).
-- Cole este script inteiro no SQL Editor do Supabase e clique em "Run".
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists financial_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- entrada | saida
  description text not null,
  category text, -- ex: Venda, Fornecedor, Salário, Imposto, Aluguel...
  amount numeric(10,2) not null,
  due_date date not null, -- data de vencimento
  payment_date date, -- data em que foi de fato pago/recebido (em branco = ainda pendente)
  status text not null default 'pendente', -- pendente | concluido
  order_id uuid references orders(id), -- opcional: vincula a um pedido de venda
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_financial_due_date on financial_transactions(due_date);
create index if not exists idx_financial_status on financial_transactions(status);

alter table financial_transactions enable row level security;

-- Dados financeiros são internos — só quem está logado no painel (você)
-- pode ver ou mexer, nunca o app do cliente.
drop policy if exists "Usuários autenticados podem gerenciar o financeiro" on financial_transactions;
create policy "Usuários autenticados podem gerenciar o financeiro"
on financial_transactions for all
using ( auth.role() = 'authenticated' )
with check ( auth.role() = 'authenticated' );
