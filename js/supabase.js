// Cliente do Supabase — ponto único de conexão com o banco.
// Fixado na linha 2.x: as chaves novas (sb_publishable_) e o JWT
// assimétrico do Supabase precisam de uma versão recente do cliente.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, configurado } from './config.js';

export const sb = configurado
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,      // mantém o funcionário logado ao fechar o navegador
        autoRefreshToken: true,
        storageKey: 'grao-central-sessao',
      },
    })
  : null;

export { configurado };
