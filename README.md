# Painel Administrativo — Minha Loja

Site (funciona igual bem no computador e no celular, pelo navegador) para você
gerenciar a loja: cadastrar/editar produtos com fotos e preços, e acompanhar
pedidos com filtro por data e relatório exportável.

## Passo 1 — Criar o banco de dados (Supabase)

1. Crie uma conta gratuita em [supabase.com](https://supabase.com)
2. Clique em "New Project", dê um nome (ex: `minha-loja`) e uma senha para o
   banco (guarde essa senha)
3. Espere o projeto terminar de ser criado (leva 1-2 minutos)
4. No menu lateral, clique em **SQL Editor** → **New query**
5. Abra o arquivo `supabase/schema.sql` (dentro desta pasta), copie todo o
   conteúdo, cole no editor e clique em **Run**
   - Isso cria as tabelas de produtos, pedidos, clientes e o espaço de
     armazenamento das imagens
6. Vá em **Project Settings** (ícone de engrenagem) → **API**
7. Copie a **Project URL** e a chave **anon public**

## Passo 2 — Criar seu usuário de acesso ao painel

1. No Supabase, vá em **Authentication** → **Users** → **Add user**
2. Preencha seu e-mail e uma senha — esse é o login que você vai usar para
   entrar no painel administrativo

## Passo 3 — Configurar o projeto

1. Duplique o arquivo `.env.local.example` e renomeie a cópia para `.env.local`
2. Preencha com os dados que você copiou no Passo 1:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

## Passo 4 — Instalar e rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` no navegador (computador ou celular, desde que
estejam na mesma rede) e faça login com o e-mail/senha criados no Passo 2.

## O que já funciona

- **Login** protegido (só você acessa)
- **Produtos:** cadastrar, editar, excluir, upload de foto, definir preço,
  estoque, categoria e status ativo/inativo
- **Vendas (Pedidos):** listagem com filtro por período (data inicial e
  final) e por status, exportação para CSV (abre no Excel/Google Sheets)
- **CRM:** cada pessoa (lead ou cliente) tem uma ficha com dados de
  contato, histórico de compras e linha do tempo de interações
  (ligação, e-mail, WhatsApp, reunião). A tela principal do CRM mostra
  todo mundo organizado por etapa: **Lead → Contato Feito → Negociação →
  Cliente** — dá pra mover a pessoa de etapa direto na ficha dela
- **Painel inicial:** resumo com total de produtos, pedidos, faturamento do
  dia e pedidos pendentes

## Se você já tinha criado o banco antes (sem CRM)

Só rode o script `supabase/migration_crm.sql` no SQL Editor do Supabase —
ele adiciona as tabelas e campos novos do CRM sem apagar nada que já
existia. Se está criando o banco pela primeira vez, ignore esse arquivo:
o `schema.sql` já vem completo.

## Próximo passo importante

Hoje o **app do cliente** (o projeto `minha-loja` em React Native) ainda
mostra produtos fixos, carregados de um arquivo (`data/products.js`), e não
salva pedidos de verdade em lugar nenhum.

Para que os cadastros feitos aqui no painel apareçam de fato no app do
cliente, e para que os pedidos finalizados por ele apareçam aqui nos
relatórios, o próximo passo é conectar o app do cliente a este mesmo banco
Supabase (troca simples: em vez de importar de `data/products.js`, o app
passa a buscar da tabela `products`). Posso fazer essa conexão a seguir,
assim que este painel estiver funcionando para você.

## Publicar o site (para acessar de qualquer lugar, não só localhost)

Quando estiver tudo funcionando localmente, o jeito mais simples de colocar
no ar é a [Vercel](https://vercel.com) (gratuita para esse uso):
1. Suba esta pasta para um repositório no GitHub
2. Na Vercel, clique em "New Project" e importe o repositório
3. Nas configurações do projeto, adicione as mesmas variáveis do seu
   `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Clique em Deploy

Depois disso você recebe um link (ex: `minha-loja-admin.vercel.app`) que
funciona de qualquer lugar, computador ou celular.
