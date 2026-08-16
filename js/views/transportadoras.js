// Parceiros de entrega e rotas ativas.
import { telaCrud } from './crud.js';
import * as store from '../store.js';
import * as ui from '../ui.js';

export function montar(raiz) {
  return telaCrud({
    raiz,
    tabela: 'transportadoras',
    area: 'transportadoras',
    titulo: 'Transportadoras',
    subtitulo: 'Parceiros de entrega e rotas ativas',
    textoNovo: '+ Nova transportadora',
    buscaPlaceholder: 'Buscar por nome ou região…',
    vazio: 'Nenhuma transportadora cadastrada ainda.',
    carregar: store.transportadoras.listar,

    colunas: [
      { rotulo: 'Transportadora', classe: 'item-name', valor: (t) => ui.esc(t.nome) },
      { rotulo: 'Região atendida', valor: (t) => ui.esc(t.regiao || '—') },
      { rotulo: 'Prazo médio', valor: (t) => ui.esc(t.prazo_medio || '—') },
      { rotulo: 'Status', valor: (t) => ui.badge(t.status) },
    ],

    campos: [
      { nome: 'nome', rotulo: 'Nome da transportadora', obrigatorio: true, largo: true },
      { nome: 'regiao', rotulo: 'Região atendida', dica: 'Ex.: Zona Norte / Centro' },
      { nome: 'prazo_medio', rotulo: 'Prazo médio', dica: 'Ex.: 1 dia, 1–2 dias' },
      {
        nome: 'status',
        rotulo: 'Situação',
        tipo: 'select',
        obrigatorio: true,
        opcoes: [
          { valor: 'ativa', texto: 'Ativa' },
          { valor: 'pausada', texto: 'Em pausa' },
          { valor: 'inativa', texto: 'Inativa' },
        ],
      },
    ],

    paraFormulario: (t) => ({
      nome: t.nome,
      regiao: t.regiao,
      prazo_medio: t.prazo_medio,
      status: t.status,
    }),
  });
}
