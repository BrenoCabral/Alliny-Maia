-- Tabela de leads (captura de contato pelo site).
create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  contato    text not null,
  servico    text,
  mensagem   text,
  created_at timestamptz not null default now()
);

-- RLS ligado: a function usa a service_role key, que ignora o RLS.
-- Sem nenhuma policy de insert para a anon key, o front nao escreve direto aqui.
alter table public.leads enable row level security;
