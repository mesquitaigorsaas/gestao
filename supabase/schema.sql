-- ============================================================
-- GRÃO CENTRAL — Estrutura do banco de dados
-- ============================================================
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma vez,
-- ao instalar o sistema para uma nova empresa.
--
-- Cada empresa tem o seu próprio projeto Supabase, então aqui
-- não existe separação por cliente: quem está logado no projeto
-- é funcionário da empresa. O que muda de pessoa para pessoa é
-- o CARGO, que define o que ela pode alterar.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Perfis dos funcionários
-- ------------------------------------------------------------
-- Espelha auth.users (o login do Supabase) e guarda os dados
-- que o painel mostra: nome, cargo, setor e situação.

create table if not exists public.perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  cargo       text not null default 'estoque'
                check (cargo in ('admin','estoque','logistica','financeiro')),
  setor       text not null default 'Operação',
  status      text not null default 'ativo'
                check (status in ('ativo','ferias','inativo')),
  criado_em   timestamptz not null default now()
);

comment on table public.perfis is 'Funcionários com acesso ao painel. O cargo define as permissões.';


-- Descobre o cargo de quem está fazendo a requisição.
-- security definer é obrigatório aqui: sem isso, uma política de
-- RLS na tabela perfis que consultasse a própria perfis entraria
-- em recursão infinita.
create or replace function public.meu_cargo()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select cargo from public.perfis where id = auth.uid();
$$;

create or replace function public.sou_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and cargo = 'admin'
  );
$$;


-- Todo usuário criado no Authentication ganha um perfil automático.
--
-- O primeiro a se cadastrar vira admin — é o dono do sistema. Do segundo
-- em diante, o cadastro NÃO define o próprio cargo e nasce sem acesso:
-- o endereço do painel é público, então qualquer pessoa pode chamar o
-- cadastro. Quem libera e define o cargo é o administrador, na aba
-- Funcionários — e é isso que o app faz logo após criar a conta.
create or replace function public.criar_perfil_no_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  eh_o_primeiro boolean;
  cargo_novo    text;
  status_novo   text;
begin
  select not exists (select 1 from public.perfis) into eh_o_primeiro;

  if eh_o_primeiro then
    cargo_novo  := 'admin';
    status_novo := 'ativo';
  else
    cargo_novo  := 'estoque';
    status_novo := 'inativo';
  end if;

  insert into public.perfis (id, nome, cargo, setor, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    cargo_novo,
    coalesce(new.raw_user_meta_data->>'setor', 'Operação'),
    status_novo
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_criar_perfil on auth.users;
create trigger trg_criar_perfil
  after insert on auth.users
  for each row execute function public.criar_perfil_no_signup();


-- A tela de login precisa saber se o sistema já tem dono, para decidir
-- se oferece o "primeiro acesso". Quem ainda não entrou é anon, e o RLS
-- esconde a tabela perfis dele — uma contagem simples voltaria zero e a
-- tela ofereceria o primeiro acesso para sempre. Daí esta função, que
-- responde só sim ou não, sem expor nada de ninguém.
create or replace function public.sistema_instalado()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.perfis);
$$;

grant execute on function public.sistema_instalado() to anon, authenticated;


-- ------------------------------------------------------------
-- 2. Cadastros base
-- ------------------------------------------------------------

create table if not exists public.fornecedores (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  fornece       text,
  contato       text,
  prazo_medio   int not null default 0,   -- em dias
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

create table if not exists public.transportadoras (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  regiao        text,
  prazo_medio   text,
  status        text not null default 'ativa'
                  check (status in ('ativa','pausada','inativa')),
  criado_em     timestamptz not null default now()
);

create table if not exists public.produtos (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  categoria       text,
  unidade         text,                              -- "Saco 25kg", "Caixa 5kg"...
  preco_venda     numeric(12,2) not null default 0,
  quantidade      numeric(12,2) not null default 0,  -- saldo atual, mantido por trigger
  estoque_minimo  numeric(12,2) not null default 0,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

comment on column public.produtos.quantidade is
  'Saldo atual. Nunca edite na mão: é recalculado pelo trigger de movimentações.';

create index if not exists idx_produtos_nome on public.produtos (nome);


-- ------------------------------------------------------------
-- 3. Movimentações de estoque
-- ------------------------------------------------------------
-- É o livro-caixa do estoque: toda alteração de saldo nasce aqui,
-- registrada com o autor. O saldo em produtos.quantidade é só o
-- acumulado, atualizado por trigger.

create table if not exists public.movimentacoes (
  id           uuid primary key default gen_random_uuid(),
  produto_id   uuid not null references public.produtos(id) on delete cascade,
  tipo         text not null check (tipo in ('entrada','saida','ajuste')),
  quantidade   numeric(12,2) not null check (quantidade > 0),
  observacao   text,
  usuario_id   uuid references public.perfis(id) on delete set null,
  criado_em    timestamptz not null default now()
);

create index if not exists idx_mov_produto on public.movimentacoes (produto_id);
create index if not exists idx_mov_data    on public.movimentacoes (criado_em desc);


-- Converte o tipo da movimentação no sinal que ela tem sobre o saldo.
-- 'ajuste' é tratado como correção para baixo (perda, quebra, inventário).
create or replace function public.delta_movimentacao(p_tipo text, p_qtd numeric)
returns numeric
language sql
immutable
as $$
  select case when p_tipo = 'entrada' then p_qtd else -p_qtd end;
$$;

create or replace function public.aplicar_movimentacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Desfaz o efeito da linha antiga (update ou delete)
  if (tg_op = 'UPDATE' or tg_op = 'DELETE') then
    update public.produtos
       set quantidade = quantidade - public.delta_movimentacao(old.tipo, old.quantidade)
     where id = old.produto_id;
  end if;

  -- Aplica o efeito da linha nova (insert ou update)
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    update public.produtos
       set quantidade = quantidade + public.delta_movimentacao(new.tipo, new.quantidade)
     where id = new.produto_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_aplicar_movimentacao on public.movimentacoes;
create trigger trg_aplicar_movimentacao
  after insert or update or delete on public.movimentacoes
  for each row execute function public.aplicar_movimentacao();


-- Preenche sozinho o autor da movimentação com quem está logado.
-- Assim a coluna "Responsável" nunca depende do que o front mandar.
create or replace function public.carimbar_autor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.usuario_id is null then
    new.usuario_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_carimbar_autor_mov on public.movimentacoes;
create trigger trg_carimbar_autor_mov
  before insert on public.movimentacoes
  for each row execute function public.carimbar_autor();


-- ------------------------------------------------------------
-- 4. Pedidos de reposição
-- ------------------------------------------------------------

create sequence if not exists public.pedido_numero_seq start 1001;

create table if not exists public.pedidos (
  id                uuid primary key default gen_random_uuid(),
  numero            int not null unique default nextval('public.pedido_numero_seq'),
  fornecedor_id     uuid references public.fornecedores(id) on delete set null,
  status            text not null default 'rascunho'
                      check (status in ('rascunho','enviado','transito','recebido','cancelado')),
  data_pedido       date not null default current_date,
  data_recebimento  date,
  observacao        text,
  usuario_id        uuid references public.perfis(id) on delete set null,
  criado_em         timestamptz not null default now()
);

create table if not exists public.pedido_itens (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references public.pedidos(id) on delete cascade,
  produto_id      uuid not null references public.produtos(id) on delete cascade,
  quantidade      numeric(12,2) not null check (quantidade > 0),
  preco_unitario  numeric(12,2) not null default 0
);

create index if not exists idx_itens_pedido on public.pedido_itens (pedido_id);

drop trigger if exists trg_carimbar_autor_pedido on public.pedidos;
create trigger trg_carimbar_autor_pedido
  before insert on public.pedidos
  for each row execute function public.carimbar_autor();


-- Quando um pedido passa para "recebido", cada item vira entrada de
-- estoque automaticamente. Se sair de "recebido" (correção de erro),
-- as entradas geradas são desfeitas.
create or replace function public.receber_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'recebido' and old.status is distinct from 'recebido' then
    insert into public.movimentacoes (produto_id, tipo, quantidade, observacao, usuario_id)
    select i.produto_id,
           'entrada',
           i.quantidade,
           'Recebimento do pedido #' || new.numero,
           coalesce(auth.uid(), new.usuario_id)
      from public.pedido_itens i
     where i.pedido_id = new.id;

    new.data_recebimento := coalesce(new.data_recebimento, current_date);

  elsif old.status = 'recebido' and new.status is distinct from 'recebido' then
    delete from public.movimentacoes
     where observacao = 'Recebimento do pedido #' || new.numero;

    new.data_recebimento := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_receber_pedido on public.pedidos;
create trigger trg_receber_pedido
  before update of status on public.pedidos
  for each row execute function public.receber_pedido();


-- ------------------------------------------------------------
-- 5. Financeiro e agenda
-- ------------------------------------------------------------

create table if not exists public.lancamentos (
  id           uuid primary key default gen_random_uuid(),
  descricao    text not null,
  tipo         text not null check (tipo in ('pagar','receber')),
  vencimento   date not null,
  valor        numeric(12,2) not null,
  status       text not null default 'pendente'
                 check (status in ('pendente','quitado','cancelado')),
  pedido_id    uuid references public.pedidos(id) on delete set null,
  usuario_id   uuid references public.perfis(id) on delete set null,
  criado_em    timestamptz not null default now()
);

create index if not exists idx_lanc_venc on public.lancamentos (vencimento);

drop trigger if exists trg_carimbar_autor_lanc on public.lancamentos;
create trigger trg_carimbar_autor_lanc
  before insert on public.lancamentos
  for each row execute function public.carimbar_autor();

create table if not exists public.eventos (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  data_hora    timestamptz not null,
  tipo         text not null default 'geral'
                 check (tipo in ('geral','entrega','reuniao','vencimento','inventario')),
  descricao    text,
  usuario_id   uuid references public.perfis(id) on delete set null,
  criado_em    timestamptz not null default now()
);

create index if not exists idx_eventos_data on public.eventos (data_hora);

drop trigger if exists trg_carimbar_autor_evento on public.eventos;
create trigger trg_carimbar_autor_evento
  before insert on public.eventos
  for each row execute function public.carimbar_autor();


-- ------------------------------------------------------------
-- 6. Segurança (RLS)
-- ------------------------------------------------------------
-- Regra geral: quem está logado enxerga tudo — é a mesma empresa.
-- Quem PODE ALTERAR depende do cargo.

alter table public.perfis           enable row level security;
alter table public.fornecedores     enable row level security;
alter table public.transportadoras  enable row level security;
alter table public.produtos         enable row level security;
alter table public.movimentacoes    enable row level security;
alter table public.pedidos          enable row level security;
alter table public.pedido_itens     enable row level security;
alter table public.lancamentos      enable row level security;
alter table public.eventos          enable row level security;

-- Leitura liberada para qualquer funcionário autenticado
do $$
declare t text;
begin
  foreach t in array array[
    'perfis','fornecedores','transportadoras','produtos',
    'movimentacoes','pedidos','pedido_itens','lancamentos','eventos'
  ] loop
    execute format('drop policy if exists ler_%1$s on public.%1$I', t);
    execute format(
      'create policy ler_%1$s on public.%1$I for select to authenticated using (true)', t);
  end loop;
end $$;

-- Escrita por cargo.
-- O admin passa em todas; os demais só no que é do seu setor.
do $$
declare
  regras text[][] := array[
    -- tabela            cargos que podem escrever
    ['fornecedores',    'admin,estoque'],
    ['transportadoras', 'admin,logistica'],
    ['produtos',        'admin,estoque'],
    ['movimentacoes',   'admin,estoque,logistica'],
    ['pedidos',         'admin,estoque,logistica'],
    ['pedido_itens',    'admin,estoque,logistica'],
    ['lancamentos',     'admin,financeiro'],
    ['eventos',         'admin,estoque,logistica,financeiro']
  ];
  i int;
  tabela text;
  cargos text;
begin
  for i in 1 .. array_length(regras, 1) loop
    tabela := regras[i][1];
    cargos := regras[i][2];

    execute format('drop policy if exists escrever_%1$s on public.%1$I', tabela);
    execute format($f$
      create policy escrever_%1$s on public.%1$I
        for all to authenticated
        using      (public.meu_cargo() = any (string_to_array(%2$L, ',')))
        with check (public.meu_cargo() = any (string_to_array(%2$L, ',')))
    $f$, tabela, cargos);
  end loop;
end $$;

-- Perfis: cada um edita o próprio nome; só o admin mexe em cargo e nos outros.
drop policy if exists editar_meu_perfil on public.perfis;
create policy editar_meu_perfil on public.perfis
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists admin_gerencia_perfis on public.perfis;
create policy admin_gerencia_perfis on public.perfis
  for all to authenticated
  using (public.sou_admin()) with check (public.sou_admin());


-- ------------------------------------------------------------
-- 7. Visões de apoio
-- ------------------------------------------------------------
-- security_invoker faz a view respeitar o RLS de quem consulta,
-- em vez de rodar com os poderes de quem a criou.

create or replace view public.vw_estoque
with (security_invoker = true) as
select
  p.id,
  p.nome,
  p.categoria,
  p.unidade,
  p.quantidade,
  p.estoque_minimo,
  case
    when p.estoque_minimo = 0 then 'ok'
    when p.quantidade <= p.estoque_minimo * 0.5 then 'critico'
    when p.quantidade <= p.estoque_minimo       then 'baixo'
    else 'ok'
  end as situacao,
  case
    when p.estoque_minimo = 0 then 100
    else least(round((p.quantidade / (p.estoque_minimo * 2)) * 100), 100)
  end as percentual
from public.produtos p
where p.ativo = true;

create or replace view public.vw_movimentacoes
with (security_invoker = true) as
select
  m.id,
  m.criado_em,
  m.tipo,
  m.quantidade,
  m.observacao,
  p.nome    as produto,
  p.unidade as unidade,
  coalesce(u.nome, 'Sistema') as responsavel
from public.movimentacoes m
join public.produtos p on p.id = m.produto_id
left join public.perfis u on u.id = m.usuario_id
order by m.criado_em desc;
