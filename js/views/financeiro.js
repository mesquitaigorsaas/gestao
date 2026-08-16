// Contas a pagar e a receber.
import * as ui from '../ui.js';
import * as store from '../store.js';
import { inserir, atualizar, excluir } from '../store.js';
import { podeEditar } from '../auth.js';

const hoje = () => new Date().toISOString().slice(0, 10);

const campos = [
  { nome: 'descricao', rotulo: 'Descrição', obrigatorio: true, largo: true },
  {
    nome: 'tipo',
    rotulo: 'Tipo',
    tipo: 'select',
    obrigatorio: true,
    opcoes: [
      { valor: 'pagar', texto: 'A pagar' },
      { valor: 'receber', texto: 'A receber' },
    ],
  },
  { nome: 'valor', rotulo: 'Valor (R$)', tipo: 'moeda', obrigatorio: true },
  { nome: 'vencimento', rotulo: 'Vencimento', tipo: 'data', obrigatorio: true },
  {
    nome: 'status',
    rotulo: 'Situação',
    tipo: 'select',
    obrigatorio: true,
    opcoes: [
      { valor: 'pendente', texto: 'Pendente' },
      { valor: 'quitado', texto: 'Quitado' },
      { valor: 'cancelado', texto: 'Cancelado' },
    ],
  },
];

export function montar(raiz) {
  const editavel = podeEditar('financeiro');
  const colunas = editavel ? 7 : 6;

  raiz.innerHTML = `
    <div class="panel-head">
      <div>
        <h1 class="panel-title">Financeiro</h1>
        <div class="panel-sub">Contas, entradas e saídas do mês</div>
      </div>
      ${editavel ? '<button class="btn btn-primary" data-novo>+ Novo lançamento</button>' : ''}
    </div>

    <div class="kpi-grid kpi-grid-3">
      <div class="kpi">
        <div class="kpi-label">Receitas do mês</div>
        <div class="kpi-value" data-receitas>—</div>
        <div class="kpi-delta" data-receitas-sub></div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Despesas do mês</div>
        <div class="kpi-value" data-despesas>—</div>
        <div class="kpi-delta down" data-despesas-sub></div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Saldo</div>
        <div class="kpi-value" data-saldo>—</div>
        <div class="kpi-delta" data-saldo-sub></div>
      </div>
    </div>

    <div class="toolbar">
      <div class="busca">
        <input type="search" placeholder="Buscar lançamento…" aria-label="Buscar">
      </div>
      <span class="panel-sub toolbar-espaco" data-contador></span>
    </div>

    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Descrição</th><th>Tipo</th><th>Vencimento</th><th>Valor</th>
            <th>Status</th><th>Responsável</th>${editavel ? '<th></th>' : ''}
          </tr>
        </thead>
        <tbody data-corpo>${ui.carregando(colunas)}</tbody>
      </table>
    </div>`;

  const corpo = raiz.querySelector('[data-corpo]');
  const contador = raiz.querySelector('[data-contador]');
  ui.ligarBusca(raiz.querySelector('.busca input'), corpo);

  let lista = [];

  async function recarregar() {
    corpo.innerHTML = ui.carregando(colunas);
    try {
      lista = await store.lancamentos.listar();
      desenhar();
    } catch (e) {
      corpo.innerHTML = ui.falhou(colunas, e.message);
    }
  }

  function desenhar() {
    // KPIs do mês corrente
    const mes = new Date().toISOString().slice(0, 7);
    const doMes = lista.filter((l) => l.vencimento?.startsWith(mes) && l.status !== 'cancelado');
    const soma = (t) =>
      doMes.filter((l) => l.tipo === t).reduce((s, l) => s + Number(l.valor || 0), 0);

    const receitas = soma('receber');
    const despesas = soma('pagar');
    const pendentes = (t) =>
      doMes.filter((l) => l.tipo === t && l.status === 'pendente').length;

    raiz.querySelector('[data-receitas]').textContent = ui.moeda(receitas);
    raiz.querySelector('[data-despesas]').textContent = ui.moeda(despesas);
    raiz.querySelector('[data-saldo]').textContent = ui.moeda(receitas - despesas);
    raiz.querySelector('[data-receitas-sub]').textContent = `${pendentes('receber')} a receber`;
    raiz.querySelector('[data-despesas-sub]').textContent = `${pendentes('pagar')} a pagar`;

    const saldoSub = raiz.querySelector('[data-saldo-sub]');
    saldoSub.textContent = receitas - despesas >= 0 ? 'Positivo' : 'Negativo';
    saldoSub.classList.toggle('down', receitas - despesas < 0);

    if (!lista.length) {
      corpo.innerHTML = ui.vazio(colunas, 'Nenhum lançamento registrado ainda.');
      contador.textContent = '';
      return;
    }

    const atrasado = (l) => l.status === 'pendente' && l.vencimento < hoje();

    corpo.innerHTML = lista
      .map(
        (l) => `<tr>
          <td data-label="Descrição">${ui.esc(l.descricao)}</td>
          <td data-label="Tipo">${l.tipo === 'pagar' ? 'Pagar' : 'Receber'}</td>
          <td data-label="Vencimento" class="mono"
              style="${atrasado(l) ? 'color:var(--alert);' : ''}">
            ${ui.data(l.vencimento)}${atrasado(l) ? ' ⚠' : ''}
          </td>
          <td data-label="Valor" class="mono"
              style="color:${l.tipo === 'receber' ? 'var(--teal)' : 'var(--alert)'};">
            ${l.tipo === 'receber' ? '+' : '−'} ${ui.moeda(l.valor)}
          </td>
          <td data-label="Status">${ui.badge(l.status)}</td>
          <td data-label="Responsável"><span class="user-chip">${ui.esc(l.responsavel?.nome || '—')}</span></td>
          ${
            editavel
              ? `<td data-label="Ações" class="celula-acoes">${ui.acoesLinha(l.id, {
                  extras:
                    l.status === 'pendente'
                      ? [{ acao: 'quitar', titulo: 'Marcar como quitado', icone: '✓' }]
                      : [],
                })}</td>`
              : ''
          }
        </tr>`
      )
      .join('');

    const emAtraso = lista.filter(atrasado).length;
    contador.textContent =
      `${lista.length} ${lista.length === 1 ? 'lançamento' : 'lançamentos'}` +
      (emAtraso ? ` · ${emAtraso} em atraso` : '');
  }

  if (editavel) {
    raiz.querySelector('[data-novo]').addEventListener('click', async () => {
      const ok = await ui.formulario({
        titulo: 'Novo lançamento',
        campos,
        valores: { tipo: 'pagar', status: 'pendente', vencimento: hoje() },
        textoSalvar: 'Lançar',
        onSalvar: (d) => inserir('lancamentos', d),
      });
      if (ok) {
        ui.aviso('Lançamento registrado.');
        recarregar();
      }
    });

    ui.aoAgir(corpo, {
      async quitar(id) {
        try {
          await atualizar('lancamentos', id, { status: 'quitado' });
          ui.aviso('Lançamento quitado.');
          recarregar();
        } catch (e) {
          ui.erro(e);
        }
      },

      async editar(id) {
        const l = lista.find((x) => x.id === id);
        const ok = await ui.formulario({
          titulo: 'Editar lançamento',
          campos,
          valores: {
            descricao: l.descricao,
            tipo: l.tipo,
            valor: l.valor,
            vencimento: l.vencimento,
            status: l.status,
          },
          onSalvar: (d) => atualizar('lancamentos', id, d),
        });
        if (ok) {
          ui.aviso('Alterações salvas.');
          recarregar();
        }
      },

      async excluir(id) {
        const l = lista.find((x) => x.id === id);
        const ok = await ui.confirmar({
          titulo: 'Excluir lançamento',
          mensagem: `Excluir "${l.descricao}"?`,
          textoConfirmar: 'Excluir',
          perigoso: true,
        });
        if (!ok) return;
        try {
          await excluir('lancamentos', id);
          ui.aviso('Lançamento excluído.');
          recarregar();
        } catch (e) {
          ui.erro(e);
        }
      },
    });
  }

  return { recarregar };
}
