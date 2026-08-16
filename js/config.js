// ============================================================
// Conexão com o banco de dados
// ============================================================
// Cada empresa que compra o sistema tem o seu próprio projeto no
// Supabase. Para instalar em um cliente novo:
//
//   1. Crie um projeto em https://supabase.com
//   2. Rode o arquivo supabase/schema.sql no SQL Editor
//   3. Copie os dois valores abaixo de: Project Settings > API
//
// A chave "anon" é pública de propósito — ela só permite o que as
// políticas de RLS do banco autorizam. Nunca coloque aqui a chave
// "service_role": essa ignora todas as regras de segurança.
// ============================================================

export const SUPABASE_URL = 'COLE_AQUI_A_URL_DO_PROJETO';
export const SUPABASE_ANON_KEY = 'COLE_AQUI_A_CHAVE_ANON';

// Nome que aparece no cabeçalho do painel e nos relatórios.
export const EMPRESA = {
  nome: 'GRÃO CENTRAL',
  ramo: 'Insumos para pizzarias',
};

export const configurado =
  !SUPABASE_URL.startsWith('COLE_AQUI') && !SUPABASE_ANON_KEY.startsWith('COLE_AQUI');
