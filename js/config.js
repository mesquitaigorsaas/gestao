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

export const SUPABASE_URL = 'https://zvrllurfevvcbmmxyyby.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_WPl4MBY3LIh5IAe1-79e9w_GVD45R0e';

// Nome que aparece no cabeçalho do painel e nos relatórios.
export const EMPRESA = {
  nome: 'GRÃO CENTRAL',
  ramo: 'Insumos para pizzarias',
};

// ============================================================
// MODO DEMONSTRAÇÃO
// ============================================================
// Com DEMO ligado, o sistema não fala com banco nenhum: entra
// direto, cheio de dados inventados, e recusa qualquer gravação.
// É assim que ele é mostrado a um possível comprador.
//
// Para instalar em um cliente de verdade, veja as instruções no
// topo de js/store.js.
export const DEMO = true;

export const configurado =
  !SUPABASE_URL.startsWith('COLE_AQUI') && !SUPABASE_ANON_KEY.startsWith('COLE_AQUI');
