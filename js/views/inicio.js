// Visão geral — todos os números vêm do banco.
import * as ui from '../ui.js';
import * as store from '../store.js';
import { usuarioAtual, podeVer } from '../auth.js';

const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
               'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function montar(raiz, { irPara } = {}) {
  const hoje = new Date();
  const primeiroNome = usuarioAtual()?.nome.split(' ')[0] || '';

  raiz.innerHTML = `
    <div class="panel-head">
      <div>
        <h1 class="panel-title">${saudacao()}, ${ui.esc(primeiroNome)}</h1>
        <div class="panel-sub">
          ${DIAS[hoje.getDay()]}, ${hoje.getDate()} de ${MESES[hoje.getMonth()]} — resumo das operações
        </div>
      </div>
      <div class="report-actions">
        <button class="btn" data-atualizar>Atualizar</button>
        ${podeVer('pedidos') ? '<button class="btn btn-primary" data-novo-pedido>+ Novo pedido</button>' : ''}
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">Itens em estoque crítico</div>
        <div class="kpi-value" data-criticos>—</div>
        <div class="kpi-delta" data-criticos-sub></div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Pedidos em aberto</div>
        <div class="kpi-value" data-pedidos>—</div>
        <div class="kpi-delta" data-pedidos-sub></div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Receitas do mês</div>
        <div class="kpi-value" data-receitas>—</div>
        <div class="kpi-delta" data-receitas-sub></div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Saldo do mês</div>
        <div class="kpi-value" data-saldo>—</div>
        <div class="kpi-delta" data-saldo-sub></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>Alertas de estoque</h3>
        <div data-alertas><p class="panel-sub"><span class="spinner"></span> Carregando…</p></div>
      </div>
      <div class="card">
        <h3>Atividade recente</h3>
        <div data-atividade><p class="panel-sub"><span class="spinner"></span> Carregando…</p></div>
      </div>
    </div>`;

  const $ = (sel) => raiz.querySelector(sel);

  async function recarregar() {
    try {
      const r = await store.resumoInicial();

      $('[data-criticos]').textContent = r.criticos;
      $('[data-criticos-sub]').textContent = r.baixos
        ? `+ ${r.baixos} em nível baixo`
        : 'Nenhum item em nível baixo';
      $('[data-criticos-sub]').classList.toggle('down', r.criticos > 0);

      $('[data-pedidos]').textContent = r.pedidosAbertos;
      $('[data-pedidos-sub]').textContent = `${r.emTransito} em trânsito`;

      $('[data-receitas]').textContent = ui.moeda(r.receitas);
      $('[data-receitas-sub]').textContent = `${ui.moeda(r.despesas)} em despesas`;

      $('[data-saldo]').textContent = ui.moeda(r.saldo);
      const saldoSub = $('[data-saldo-sub]');
      saldoSub.textContent = r.saldo >= 0 ? 'Positivo' : 'Negativo';
      saldoSub.classList.toggle('down', r.saldo < 0);

      // Alertas
      $('[data-alertas]').innerHTML = r.alertas.length
        ? r.alertas
            .map(
              (i) => `<div class="alert-row">
                <span>${ui.esc(i.nome)} <span class="item-sub">${ui.esc(i.unidade || '')}</span></span>
                ${ui.badge(i.situacao)}
              </div>`
            )
            .join('')
        : '<p class="panel-sub">Nenhum produto cadastrado ainda.</p>';

      // Atividade
      $('[data-atividade]').innerHTML = r.movimentos.length
        ? r.movimentos
            .map(
              (m) => `<div class="activity-row">
                <span class="activity-dot" style="background:${m.tipo === 'entrada' ? 'var(--teal)' : 'var(--alert)'};"></span>
                <span>${m.tipo === 'entrada' ? 'Entrada' : 'Saída'} — ${ui.esc(m.produto)} (${ui.numero(m.quantidade)} un)</span>
                <span class="user-chip">${ui.esc(m.responsavel)}</span>
                <span class="activity-time">${ui.quando(m.criado_em)}</span>
              </div>`
            )
            .join('')
        : '<p class="panel-sub">Nenhuma movimentação registrada ainda.</p>';
    } catch (e) {
      $('[data-alertas]').innerHTML = `<p class="panel-sub empty-erro">${ui.esc(e.message)}</p>`;
      $('[data-atividade]').innerHTML = '';
    }
  }

  $('[data-atualizar]').addEventListener('click', recarregar);
  $('[data-novo-pedido]')?.addEventListener('click', () => irPara?.('pedidos'));

  return { recarregar };
}
