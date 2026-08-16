// Saldo atual dos insumos e o registro de tudo que entra e sai.
import * as ui from '../ui.js';
import * as store from '../store.js';
import { podeEditar } from '../auth.js';

const CORES = { critico: 'var(--alert)', baixo: 'var(--amber)', ok: 'var(--teal)' };

export function montar(raiz) {
  const editavel = podeEditar('estoque');
  const colunas = editavel ? 6 : 5;

  raiz.innerHTML = `
    <div class="panel-head">
      <div>
        <h1 class="panel-title">Estoque</h1>
        <div class="panel-sub">Níveis atuais de insumos e embalagens</div>
      </div>
      <div class="report-actions">
        <button class="btn" data-atualizar>Atualizar</button>
        ${editavel ? '<button class="btn btn-primary" data-movimentar>Registrar movimentação</button>' : ''}
      </div>
    </div>

    <div class="toolbar">
      <div class="busca">
        <input type="search" placeholder="Buscar item…" aria-label="Buscar item">
      </div>
      <span class="panel-sub toolbar-espaco" data-resumo></span>
    </div>

    <div class="table-card" style="margin-bottom:18px;">
      <table>
        <thead>
          <tr>
            <th>Item</th><th>Quantidade</th><th>Nível</th><th>Mínimo</th><th>Status</th>
            ${editavel ? '<th></th>' : ''}
          </tr>
        </thead>
        <tbody data-corpo>${ui.carregando(colunas)}</tbody>
      </table>
    </div>

    <div class="card">
      <h3>Últimas movimentações</h3>
      <div data-historico><p class="panel-sub"><span class="spinner"></span> Carregando…</p></div>
    </div>`;

  const corpo = raiz.querySelector('[data-corpo]');
  const resumo = raiz.querySelector('[data-resumo]');
  const historico = raiz.querySelector('[data-historico]');
  ui.ligarBusca(raiz.querySelector('.busca input'), corpo);

  let itens = [];

  async function recarregar() {
    corpo.innerHTML = ui.carregando(colunas);
    try {
      const [lista, movs] = await Promise.all([store.estoque.listar(), store.estoque.historico(8)]);
      itens = lista;
      desenhar();
      desenharHistorico(movs);
    } catch (e) {
      corpo.innerHTML = ui.falhou(colunas, e.message);
      historico.innerHTML = `<p class="panel-sub empty-erro">${ui.esc(e.message)}</p>`;
    }
  }

  function desenhar() {
    if (!itens.length) {
      corpo.innerHTML = ui.vazio(
        colunas,
        'Nenhum produto ativo. Cadastre itens na aba Produtos para acompanhar o estoque.'
      );
      resumo.textContent = '';
      return;
    }

    corpo.innerHTML = itens
      .map(
        (i) => `<tr>
          <td data-label="Item">
            <div class="item-name">${ui.esc(i.nome)}</div>
            <div class="item-sub">${ui.esc(i.unidade || i.categoria || '')}</div>
          </td>
          <td data-label="Quantidade" class="mono">${ui.numero(i.quantidade)} un</td>
          <td data-label="Nível">
            <div class="bar-track">
              <div class="bar-fill" style="width:${i.percentual}%;background:${CORES[i.situacao]};"></div>
            </div>
          </td>
          <td data-label="Mínimo" class="mono">${ui.numero(i.estoque_minimo)} un</td>
          <td data-label="Status">${ui.badge(i.situacao)}</td>
          ${
            editavel
              ? `<td data-label="Ações" class="celula-acoes">
                   <div class="row-actions">
                     <button class="icon-btn" data-acao="entrada" data-id="${i.id}" title="Registrar entrada">+</button>
                     <button class="icon-btn" data-acao="saida" data-id="${i.id}" title="Registrar saída">−</button>
                     <button class="icon-btn" data-acao="ajuste" data-id="${i.id}" title="Ajuste de inventário">⚖</button>
                   </div>
                 </td>`
              : ''
          }
        </tr>`
      )
      .join('');

    const criticos = itens.filter((i) => i.situacao === 'critico').length;
    const baixos = itens.filter((i) => i.situacao === 'baixo').length;
    resumo.textContent = criticos || baixos
      ? `${criticos} em nível crítico · ${baixos} baixo`
      : 'Todos os itens acima do mínimo';
  }

  function desenharHistorico(movs) {
    if (!movs.length) {
      historico.innerHTML = '<p class="panel-sub">Nenhuma movimentação registrada ainda.</p>';
      return;
    }
    historico.innerHTML = movs
      .map(
        (m) => `<div class="activity-row">
          <span class="activity-dot" style="background:${m.tipo === 'entrada' ? 'var(--teal)' : 'var(--alert)'};"></span>
          <span>${ui.badge(m.tipo)} ${ui.esc(m.produto)} (${ui.numero(m.quantidade)} un)</span>
          <span class="user-chip">${ui.esc(m.responsavel)}</span>
          <span class="activity-time">${ui.quando(m.criado_em)}</span>
        </div>`
      )
      .join('');
  }

  // ----- movimentar -----

  const ROTULOS = {
    entrada: { titulo: 'Registrar entrada', texto: 'Dar entrada', dica: 'Quantidade que chegou' },
    saida: { titulo: 'Registrar saída', texto: 'Dar baixa', dica: 'Quantidade que saiu' },
    ajuste: {
      titulo: 'Ajuste de inventário',
      texto: 'Ajustar',
      dica: 'Quantidade a subtrair — perda, quebra ou correção de contagem',
    },
  };

  async function abrirMovimentacao(tipo, produtoId) {
    const r = ROTULOS[tipo];
    const item = itens.find((i) => i.id === produtoId);

    const ok = await ui.formulario({
      titulo: r.titulo,
      subtitulo: item
        ? `${item.nome} — saldo atual: ${ui.numero(item.quantidade)} un`
        : 'Escolha o item e a quantidade.',
      textoSalvar: r.texto,
      campos: [
        {
          nome: 'produto_id',
          rotulo: 'Item',
          tipo: 'select',
          obrigatorio: true,
          largo: true,
          opcoes: itens.map((i) => ({
            valor: i.id,
            texto: `${i.nome} — ${ui.numero(i.quantidade)} un`,
          })),
        },
        {
          nome: 'quantidade',
          rotulo: 'Quantidade',
          tipo: 'numero',
          obrigatorio: true,
          min: 0.01,
          passo: '0.01',
          dica: r.dica,
        },
        { nome: 'observacao', rotulo: 'Observação', dica: 'Opcional' },
      ],
      valores: { produto_id: produtoId || '' },
      onSalvar: async (d) => {
        if (tipo !== 'entrada') {
          const alvo = itens.find((i) => i.id === d.produto_id);
          if (alvo && Number(d.quantidade) > Number(alvo.quantidade)) {
            throw new Error(
              `Saldo insuficiente: ${alvo.nome} tem ${ui.numero(alvo.quantidade)} un em estoque.`
            );
          }
        }
        await store.estoque.movimentar({ ...d, tipo });
      },
    });

    if (ok) {
      ui.aviso('Movimentação registrada.');
      recarregar();
    }
  }

  raiz.querySelector('[data-atualizar]').addEventListener('click', recarregar);

  if (editavel) {
    raiz
      .querySelector('[data-movimentar]')
      .addEventListener('click', () => abrirMovimentacao('entrada', null));

    ui.aoAgir(corpo, {
      entrada: (id) => abrirMovimentacao('entrada', id),
      saida: (id) => abrirMovimentacao('saida', id),
      ajuste: (id) => abrirMovimentacao('ajuste', id),
    });
  }

  return { recarregar };
}
