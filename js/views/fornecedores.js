// Quem abastece o Grão Central.
import { telaCrud } from './crud.js';
import * as store from '../store.js';
import * as ui from '../ui.js';

export function montar(raiz) {
  return telaCrud({
    raiz,
    tabela: 'fornecedores',
    area: 'fornecedores',
    titulo: 'Fornecedores',
    subtitulo: 'Quem abastece o Grão Central',
    textoNovo: '+ Novo fornecedor',
    buscaPlaceholder: 'Buscar por nome ou produto…',
    vazio: 'Nenhum fornecedor cadastrado ainda.',
    carregar: store.fornecedores.listar,

    colunas: [
      { rotulo: 'Fornecedor', classe: 'item-name', valor: (f) => ui.esc(f.nome) },
      { rotulo: 'Fornece', valor: (f) => ui.esc(f.fornece || '—') },
      { rotulo: 'Contato', classe: 'mono', valor: (f) => ui.esc(f.contato || '—') },
      {
        rotulo: 'Prazo médio',
        valor: (f) => (f.prazo_medio ? `${f.prazo_medio} ${f.prazo_medio === 1 ? 'dia' : 'dias'}` : '—'),
      },
      { rotulo: 'Status', valor: (f) => ui.badge(f.ativo ? 'ativo' : 'inativo') },
    ],

    campos: [
      { nome: 'nome', rotulo: 'Nome do fornecedor', obrigatorio: true, largo: true },
      { nome: 'fornece', rotulo: 'O que fornece', dica: 'Ex.: Queijos e laticínios' },
      { nome: 'contato', rotulo: 'Telefone ou e-mail' },
      { nome: 'prazo_medio', rotulo: 'Prazo médio de entrega (dias)', tipo: 'numero' },
      { nome: 'ativo', rotulo: 'Fornecedor ativo', tipo: 'switch' },
    ],

    paraFormulario: (f) => ({
      nome: f.nome,
      fornece: f.fornece,
      contato: f.contato,
      prazo_medio: f.prazo_medio,
      ativo: f.ativo,
    }),
  });
}
