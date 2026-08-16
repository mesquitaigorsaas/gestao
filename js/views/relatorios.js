// Relatórios por período, com exportação em CSV e PDF.
import * as ui from '../ui.js';
import * as store from '../store.js';
import { EMPRESA } from '../config.js';

// Cada relatório diz de onde vêm os dados e como virar linha de tabela.
// Assim, incluir um relatório novo é acrescentar uma entrada aqui.
const RELATORIOS = {
  estoque: {
    titulo: 'Relatório de Estoque',
    descricao: 'Entradas, saídas e ajustes de inventário',
    colunas: ['Data', 'Descrição', 'Quantidade', 'Responsável'],
    async buscar(de, ate) {
      const movs = await store.estoque.historicoPorPeriodo(de, ate);
      return movs.map((m) => ({
        data: m.criado_em,
        celulas: [
          ui.dataHora(m.criado_em),
          `${m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'saida' ? 'Saída' : 'Ajuste'} — ${m.produto}` +
            (m.observacao ? ` (${m.observacao})` : ''),
          `${m.tipo === 'entrada' ? '+' : '−'}${ui.numero(m.quantidade)} un`,
          m.responsavel,
        ],
      }));
    },
  },

  pedidos: {
    titulo: 'Relatório de Pedidos',
    descricao: 'Compras junto aos fornecedores',
    colunas: ['Data', 'Descrição', 'Valor', 'Responsável'],
    async buscar(de, ate) {
      const lista = await store.pedidos.listar();
      return lista
        .filter((p) => (!de || p.data_pedido >= de) && (!ate || p.data_pedido <= ate))
        .map((p) => {
          const total = (p.itens || []).reduce(
            (t, i) => t + Number(i.quantidade) * Number(i.preco_unitario || 0),
            0
          );
          return {
            data: p.data_pedido,
            celulas: [
              ui.data(p.data_pedido),
              `#${p.numero} — ${p.fornecedor?.nome || 'sem fornecedor'} ` +
                `(${(p.itens || []).length} ${(p.itens || []).length === 1 ? 'item' : 'itens'}, ${p.status})`,
              ui.moeda(total),
              p.responsavel?.nome || '—',
            ],
          };
        });
    },
  },

  financeiro: {
    titulo: 'Relatório Financeiro',
    descricao: 'Contas a pagar e a receber',
    colunas: ['Vencimento', 'Descrição', 'Valor', 'Responsável'],
    async buscar(de, ate) {
      const lista = await store.lancamentos.listar();
      return lista
        .filter((l) => (!de || l.vencimento >= de) && (!ate || l.vencimento <= ate))
        .map((l) => ({
          data: l.vencimento,
          celulas: [
            ui.data(l.vencimento),
            `${l.descricao} (${l.status})`,
            `${l.tipo === 'receber' ? '+' : '−'} ${ui.moeda(l.valor)}`,
            l.responsavel?.nome || '—',
          ],
        }));
    },
  },
};

export function montar(raiz) {
  raiz.innerHTML = `
    <div class="panel-head">
      <div>
        <h1 class="panel-title">Relatórios</h1>
        <div class="panel-sub">Visualize no sistema ou exporte por período</div>
      </div>
    </div>

    <div class="grid-2 grid-3">
      ${Object.entries(RELATORIOS)
        .map(
          ([chave, r]) => `<div class="card report-card">
            <h3>${ui.esc(r.titulo.replace('Relatório de ', '').replace('Relatório ', ''))}</h3>
            <p class="panel-sub report-desc">${ui.esc(r.descricao)}</p>
            <div class="report-actions">
              <button class="btn" data-ver="${chave}">Visualizar no sistema</button>
              <button class="btn" data-pdf="${chave}">Exportar PDF</button>
            </div>
          </div>`
        )
        .join('')}
    </div>

    <div class="report-viewer" id="reportViewer" hidden>
      <div class="card">
        <div class="report-viewer-head">
          <div>
            <h3 data-titulo>Relatório</h3>
            <p class="panel-sub" data-empresa style="margin-top:2px;"></p>
          </div>
          <div class="filter-row">
            <label class="field">De <input type="date" data-de></label>
            <label class="field">Até <input type="date" data-ate></label>
            <button class="btn" data-aplicar>Aplicar filtro</button>
            <button class="btn" data-csv>Exportar CSV</button>
            <button class="btn btn-primary" data-imprimir>Exportar PDF</button>
          </div>
        </div>
        <p class="report-count" data-contagem></p>
        <div class="table-card">
          <table>
            <thead><tr data-cabecalho></tr></thead>
            <tbody data-corpo></tbody>
          </table>
        </div>
      </div>
    </div>`;

  const visor = raiz.querySelector('#reportViewer');
  const cabecalho = raiz.querySelector('[data-cabecalho]');
  const corpo = raiz.querySelector('[data-corpo]');
  const contagem = raiz.querySelector('[data-contagem]');
  const campoDe = raiz.querySelector('[data-de]');
  const campoAte = raiz.querySelector('[data-ate]');

  let atual = null;
  let linhas = [];

  async function abrir(chave) {
    atual = chave;
    const r = RELATORIOS[chave];

    visor.hidden = false;
    raiz.querySelector('[data-titulo]').textContent = r.titulo;
    raiz.querySelector('[data-empresa]').textContent =
      `${EMPRESA.nome} · emitido em ${new Date().toLocaleDateString('pt-BR')}`;

    cabecalho.innerHTML = r.colunas.map((c) => `<th>${ui.esc(c)}</th>`).join('');
    corpo.innerHTML = ui.carregando(r.colunas.length);
    contagem.textContent = '';

    try {
      linhas = await r.buscar(campoDe.value || null, campoAte.value || null);

      corpo.innerHTML = linhas.length
        ? linhas
            .map(
              (l) => `<tr>${l.celulas
                .map(
                  (c, i) =>
                    `<td data-label="${ui.esc(r.colunas[i])}" class="${i === 0 || i === 2 ? 'mono' : ''}">` +
                    (i === 3 ? `<span class="user-chip">${ui.esc(c)}</span>` : ui.esc(c)) +
                    `</td>`
                )
                .join('')}</tr>`
            )
            .join('')
        : ui.vazio(r.colunas.length, 'Nenhum registro no período selecionado.');

      const periodo =
        campoDe.value || campoAte.value
          ? ` no período de ${campoDe.value ? ui.data(campoDe.value) : 'início'} a ${campoAte.value ? ui.data(campoAte.value) : 'hoje'}`
          : '';
      contagem.textContent = `${linhas.length} ${linhas.length === 1 ? 'registro' : 'registros'}${periodo} — cada linha mostra quem fez o lançamento.`;

      visor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      corpo.innerHTML = ui.falhou(r.colunas.length, e.message);
    }
  }

  raiz.querySelectorAll('[data-ver]').forEach((b) =>
    b.addEventListener('click', () => abrir(b.dataset.ver))
  );

  raiz.querySelectorAll('[data-pdf]').forEach((b) =>
    b.addEventListener('click', async () => {
      await abrir(b.dataset.pdf);
      setTimeout(() => window.print(), 250);
    })
  );

  raiz.querySelector('[data-aplicar]').addEventListener('click', () => atual && abrir(atual));
  raiz.querySelector('[data-imprimir]').addEventListener('click', () => window.print());

  raiz.querySelector('[data-csv]').addEventListener('click', () => {
    if (!atual) return;
    const r = RELATORIOS[atual];

    const csv = [r.colunas, ...linhas.map((l) => l.celulas)]
      .map((linha) => linha.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    // O BOM faz o Excel em português abrir o arquivo já com os acentos certos.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${atual}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    ui.aviso('Arquivo CSV gerado.');
  });

  return { recarregar: () => atual && abrir(atual) };
}
