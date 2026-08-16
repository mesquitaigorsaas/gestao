// Catálogo de itens vendidos às pizzarias.
import { telaCrud } from './crud.js';
import * as store from '../store.js';
import * as ui from '../ui.js';

export function montar(raiz) {
  return telaCrud({
    raiz,
    tabela: 'produtos',
    area: 'produtos',
    titulo: 'Produtos',
    subtitulo: 'Catálogo de itens vendidos às pizzarias',
    textoNovo: '+ Novo produto',
    buscaPlaceholder: 'Buscar por nome ou categoria…',
    vazio: 'Nenhum produto cadastrado. Comece pelo botão "Novo produto".',
    carregar: store.produtos.listar,
    rotuloDe: (p) => p.nome,

    colunas: [
      { rotulo: 'Produto', classe: 'item-name', valor: (p) => ui.esc(p.nome) },
      { rotulo: 'Categoria', valor: (p) => ui.esc(p.categoria || '—') },
      { rotulo: 'Preço de venda', classe: 'mono', valor: (p) => ui.moeda(p.preco_venda) },
      { rotulo: 'Unidade', valor: (p) => ui.esc(p.unidade || '—') },
      { rotulo: 'Mínimo', classe: 'mono', valor: (p) => ui.numero(p.estoque_minimo) },
      { rotulo: 'Status', valor: (p) => ui.badge(p.ativo ? 'ativo' : 'inativo') },
    ],

    campos: [
      { nome: 'nome', rotulo: 'Nome do produto', obrigatorio: true, largo: true },
      { nome: 'categoria', rotulo: 'Categoria', dica: 'Ex.: Farinhas, Laticínios, Embalagens' },
      { nome: 'unidade', rotulo: 'Unidade de venda', dica: 'Ex.: Saco 25kg, Caixa 5kg' },
      { nome: 'preco_venda', rotulo: 'Preço de venda (R$)', tipo: 'moeda' },
      {
        nome: 'estoque_minimo',
        rotulo: 'Estoque mínimo',
        tipo: 'numero',
        dica: 'Abaixo disso o item entra nos alertas',
      },
      { nome: 'ativo', rotulo: 'Produto ativo', tipo: 'switch' },
    ],

    // O saldo não vai ao formulário: ele só muda por movimentação de estoque.
    paraFormulario: (p) => ({
      nome: p.nome,
      categoria: p.categoria,
      unidade: p.unidade,
      preco_venda: p.preco_venda,
      estoque_minimo: p.estoque_minimo,
      ativo: p.ativo,
    }),
  });
}
