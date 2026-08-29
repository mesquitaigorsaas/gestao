-- ============================================================
-- 002 — foto do produto
-- ============================================================
-- Cria o depósito de imagens e a coluna que guarda o endereço da
-- foto. As imagens em si não ficam no banco: ficam no Storage do
-- Supabase, e a tabela guarda só o link.
--
-- Instalações novas já saem com isto pelo schema.sql.
-- ============================================================

alter table public.produtos
  add column if not exists imagem_url text;


-- Depósito público: a foto do produto aparece na tela sem exigir
-- login para carregar a imagem em si. Quem PODE ENVIAR continua
-- restrito pelas políticas abaixo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'produtos',
  'produtos',
  true,
  5242880,  -- 5 MB por arquivo
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- Leitura livre das imagens (o bucket é público).
drop policy if exists ver_imagens_produtos on storage.objects;
create policy ver_imagens_produtos on storage.objects
  for select to public
  using (bucket_id = 'produtos');

-- Enviar, trocar e apagar: só quem já pode mexer no cadastro de
-- produtos, ou seja, os mesmos cargos da tabela produtos.
drop policy if exists enviar_imagens_produtos on storage.objects;
create policy enviar_imagens_produtos on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'produtos'
    and public.meu_cargo() in ('admin','estoque')
  );

drop policy if exists trocar_imagens_produtos on storage.objects;
create policy trocar_imagens_produtos on storage.objects
  for update to authenticated
  using (
    bucket_id = 'produtos'
    and public.meu_cargo() in ('admin','estoque')
  );

drop policy if exists apagar_imagens_produtos on storage.objects;
create policy apagar_imagens_produtos on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'produtos'
    and public.meu_cargo() in ('admin','estoque')
  );


-- A view do estoque passa a devolver a imagem, para a tela de estoque
-- poder mostrar a miniatura junto do item.
create or replace view public.vw_estoque
with (security_invoker = true) as
select
  p.id,
  p.nome,
  p.categoria,
  p.unidade,
  p.imagem_url,
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
