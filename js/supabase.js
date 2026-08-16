// Cliente do Supabase — ponto único de conexão com o banco.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
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
