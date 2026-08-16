-- ============================================================
-- Correção 001 — fecha o auto-cadastro pela tela de login
-- ============================================================
-- Aplicar apenas em bancos criados ANTES desta correção.
-- Instalações novas já saem corrigidas pelo schema.sql.
--
-- O problema: a tela de login perguntava "existe algum funcionário?"
-- contando a tabela perfis. Quem está nessa tela ainda é anônimo, e o
-- RLS esconde a tabela dele — a contagem voltava zero mesmo com a
-- empresa toda cadastrada. Resultado: a tela ofereceria "primeiro
-- acesso" para sempre, e qualquer visitante do endereço público
-- poderia criar uma conta de administrador para si.
--
-- A correção tem duas partes: uma função que responde só sim ou não,
-- e um gatilho que nunca mais entrega cargo nem acesso a quem se
-- cadastra sozinho.
-- ============================================================

-- 1. Pergunta segura: "o sistema já tem dono?"
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


-- 2. Cadastro vindo de fora não escolhe o próprio cargo nem entra
--    liberado. Quem define isso é o administrador, na aba Funcionários.
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
