
-- Extensão para UUID aleatório (usada por gen_random_uuid)
create extension if not exists pgcrypto;

-- 1) Perfis de usuário (não referencie auth.users diretamente; use uma tabela própria)
create table public.profiles (
  id uuid primary key, -- deverá ser igual a auth.uid()
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Usuários só podem gerenciar o próprio perfil
create policy "Users can manage their own profile"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

-- 2) Portfólio por usuário
create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  base_balance numeric not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Um portfólio por usuário (ajuste se quiser permitir vários)
create unique index if not exists portfolios_user_id_key on public.portfolios(user_id);

alter table public.portfolios enable row level security;

create policy "Users can manage own portfolios"
on public.portfolios
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 3) Ativos do portfólio
create table public.portfolio_assets (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  symbol text not null,
  name text,
  quantity numeric not null default 0,
  average_price numeric not null default 0,
  total_invested numeric not null default 0,
  current_price numeric not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists portfolio_assets_portfolio_id_symbol_idx
  on public.portfolio_assets (portfolio_id, symbol);

alter table public.portfolio_assets enable row level security;

create policy "Users can manage assets in own portfolios"
on public.portfolio_assets
for all
using (exists (
  select 1 from public.portfolios p
  where p.id = portfolio_id and p.user_id = auth.uid()
))
with check (exists (
  select 1 from public.portfolios p
  where p.id = portfolio_id and p.user_id = auth.uid()
));

-- 4) Transações
do $$
begin
  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type public.transaction_type as enum ('buy', 'sell');
  end if;
end$$;

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  type public.transaction_type not null,
  symbol text not null,
  name text,
  quantity numeric not null,
  price numeric not null,
  total numeric not null,
  fee numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists transactions_portfolio_id_created_at_idx
  on public.transactions (portfolio_id, created_at desc);

alter table public.transactions enable row level security;

create policy "Users can manage transactions in own portfolios"
on public.transactions
for all
using (exists (
  select 1 from public.portfolios p
  where p.id = portfolio_id and p.user_id = auth.uid()
))
with check (exists (
  select 1 from public.portfolios p
  where p.id = portfolio_id and p.user_id = auth.uid()
));

-- 5) Trigger para updated_at
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_portfolios
before update on public.portfolios
for each row
execute function public.tg_set_updated_at();

create trigger set_updated_at_portfolio_assets
before update on public.portfolio_assets
for each row
execute function public.tg_set_updated_at();
