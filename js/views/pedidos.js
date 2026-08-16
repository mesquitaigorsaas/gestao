// Reposição de insumos junto aos fornecedores.
import * as ui from '../ui.js';
import * as store from '../store.js';
import { atualizar, excluir } from '../store.js';
import { podeEditar } from '../auth.js';

// Para onde cada status pode ir. Recebido é ponto final:
// desfazer um recebimento estornaria entradas de estoque já lançadas.
const PROXIMO = {
  rascunho: [
    { para: 'enviado', texto: 'Marcar como enviado' },
    { para: 'cancelado', texto: 'Cancelar pedido' },
  ],
  enviado: [
    { para: 'transito', texto: 'Marcar em trânsito' },
    { para: 'recebido', texto: 'Confirmar recebimento' },
    { para: 'cancelado', texto: 'Cancelar pedido' },
  ],
  transito: [
    { para: 'recebido', texto: 'Confirmar recebimento' },
    { para: 'cancelado', texto: 'Cancelar pedido' },
  ],
  recebido: [],
  cancelado: [{ para: 'rascunho', texto: 'Reabrir como rascunho' }],
};

const totalDoPedido = (p) =>
  (p.itens || []).reduce((t, i) => t + Number(i.quantidade) * Number(i.preco_unitario || 0), 0);

export function montar(raiz) {
  const editavel = podeEditar('pedidos');
  const colunas = editavel ? 7 : 6;

  raiz.innerHTML = `
    <div class="panel-head">
      <div>
        <h1 class="panel-title">Pedidos</h1>
        <div class="panel-sub">Reposição de insumos junto aos fornecedores</div>
      </div>
      ${
        editavel
          ? `<div class="report-actions">
               <button class="btn" data-sugerir>Gerar a partir do estoque baixo</button>
               <button class="btn btn-primary" data-novo>+ Novo pedido</button>
             </div>`
          : ''
      }
    </div>

    <div class="card" data-sugestoes hidden style="margin-bottom:18px;">
      <h3>Sugestões automáticas — itens abaixo do mínimo</h3>
      <div data-lista-sugestoes></div>
    </div>

    <div class="toolbar">
      <div class="busca">
        <input type="search" placeholder="Buscar por número, fornecedor ou item…" aria-label="Buscar">
      </div>
      <span class="panel-sub toolbar-espaco" data-contador></span>
    </div>

    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Pedido</th><th>Fornecedor</th><th>Itens</th><th>Total</th>
            <th>Data</th><th>Status</th>${editavel ? '<th></th>' : ''}
          </tr>
        </thead>
        <tbody data-corpo>${ui.carregando(colunas)}</tbody>
      </table>
    </div>`;

  const corpo = raiz.querySelector('[data-corpo]');
  const contador = raiz.querySelector('[data-contador]');
  const caixaSugestoes = raiz.querySelector('[data-sugestoes]');
  const listaSugestoes = raiz.querySelector('[data-lista-sugestoes]');
  ui.ligarBusca(raiz.querySelector('.busca input'), corpo);

  let lista = [];
  let produtos = [];
  let fornecedores = [];

  async function recarregar() {
    corpo.innerHTML = ui.carregando(colunas);
    try {
      [lista, produtos, fornecedores] = await Promise.all([
        store.pedidos.listar(),
        store.produtos.ativos(),
        store.fornecedores.listar(),
      ]);
      desenhar();
    } catch (e) {
      corpo.innerHTML = ui.falhou(colunas, e.message);
    }
  }

  function resumoItens(p) {
    const itens = p.itens || [];
    if (!itens.length) return '<span class="item-sub">Sem itens</span>';
    const primeiro = itens[0];
    const resto = itens.length - 1;
    return (
      `${ui.esc(primeiro.produto?.nome || '—')} (${ui.numero(primeiro.quantidade)} un)` +
      (resto > 0 ? ` <span class="item-sub">+${resto} ${resto === 1 ? 'item' : 'itens'}</span>` : '')
    );
  }

  function desenhar() {
    if (!lista.length) {
      corpo.innerHTML = ui.vazio(colunas, 'Nenhum pedido registrado ainda.');
      contador.textContent = '';
      return;
    }

    corpo.innerHTML = lista
      .map(
        (p) => `<tr>
          <td data-label="Pedido" class="mono">#${p.numero}</td>
          <td data-label="Fornecedor">${ui.esc(p.fornecedor?.nome || '—')}</td>
          <td data-label="Itens">${resumoItens(p)}</td>
          <td data-label="Total" class="mono">${ui.moeda(totalDoPedido(p))}</td>
          <td data-label="Data" class="mono">${ui.data(p.data_pedido)}</td>
          <td data-label="Status">${ui.badge(p.status)}</td>
          ${
            editavel
              ? `<td data-label="Ações" class="celula-acoes">${ui.acoesLinha(p.id, {
                  editar: p.status !== 'recebido',
                  excluir: p.status !== 'recebido',
                  extras: [{ acao: 'ver', titulo: 'Ver detalhes', icone: '⤢' }],
                })}</td>`
              : `<td data-label="Ações" class="celula-acoes">
                   <div class="row-actions">
                     <button class="icon-btn" data-acao="ver" data-id="${p.id}" title="Ver detalhes">⤢</button>
                   </div>
                 </td>`
          }
        </tr>`
      )
      .join('');

    const abertos = lista.filter((p) => ['rascunho', 'enviado', 'transito'].includes(p.status)).length;
    contador.textContent = `${lista.length} ${lista.length === 1 ? 'pedido' : 'pedidos'} · ${abertos} em aberto`;
  }

  // ----------------------------------------------------------
  // Editor de pedido (com linhas de item que entram e saem)
  // ----------------------------------------------------------

  function abrirEditor(pedido, itensIniciais = []) {
    const ehNovo = !pedido;
    const itens = pedido
      ? pedido.itens.map((i) => ({
          produto_id: i.produto?.id,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
        }))
      : [...itensIniciais];

    if (!itens.length) itens.push({ produto_id: '', quantidade: 1, preco_unitario: 0 });

    const opcoesProduto = produtos
      .map((p) => `<option value="${p.id}">${ui.esc(p.nome)}</option>`)
      .join('');

    const html = `
      <div class="form-grid" style="margin-bottom:22px;">
        <label class="campo campo-largo">
          <span class="campo-rotulo">Fornecedor</span>
          <select data-fornecedor>
            <option value="">—</option>
            ${fornecedores
              .map(
                (f) =>
                  `<option value="${f.id}" ${pedido?.fornecedor?.id === f.id ? 'selected' : ''}>${ui.esc(f.nome)}</option>`
              )
              .join('')}
          </select>
        </label>
        <label class="campo campo-largo">
          <span class="campo-rotulo">Observação</span>
          <input type="text" data-observacao value="${ui.esc(pedido?.observacao || '')}"
                 placeholder="Opcional — condições, prazo combinado…">
        </label>
      </div>

      <span class="campo-rotulo" style="display:block; margin-bottom:12px;">Itens do pedido</span>
      <div data-itens></div>
      <button type="button" class="btn btn-pequeno" data-add-item>+ Adicionar item</button>

      <div class="itens-total">
        <span class="panel-sub" style="margin:0;">Total do pedido</span>
        <strong data-total>R$ 0,00</strong>
      </div>`;

    const { corpo: modalCorpo, fechar } = ui.painel({
      titulo: ehNovo ? 'Novo pedido' : `Editar pedido #${pedido.numero}`,
      subtitulo: 'Ao confirmar o recebimento, os itens entram no estoque automaticamente.',
      html,
      largura: '680px',
      acoes: [
        {
          texto: ehNovo ? 'Criar pedido' : 'Salvar alterações',
          classe: 'btn-primary',
          aoClicar: async () => salvar(),
        },
      ],
    });

    const areaItens = modalCorpo.querySelector('[data-itens]');
    const campoTotal = modalCorpo.querySelector('[data-total]');

    function linhaItem(item, indice) {
      const div = document.createElement('div');
      div.className = 'item-linha';
      div.innerHTML = `
        <label class="campo">
          <span class="campo-rotulo">Produto</span>
          <select data-produto>
            <option value="">Selecione…</option>
            ${opcoesProduto}
          </select>
        </label>
        <label class="campo">
          <span class="campo-rotulo">Qtd.</span>
          <input type="number" data-qtd min="0.01" step="0.01" value="${item.quantidade}">
        </label>
        <label class="campo">
          <span class="campo-rotulo">Preço un. (R$)</span>
          <input type="number" data-preco min="0" step="0.01" value="${item.preco_unitario || 0}">
        </label>
        <button type="button" class="icon-btn icon-btn-perigo item-remover" title="Remover item">✕</button>`;

      div.querySelector('[data-produto]').value = item.produto_id || '';

      // Ao escolher o produto, sugere o preço de venda cadastrado.
      div.querySelector('[data-produto]').addEventListener('change', (e) => {
        itens[indice].produto_id = e.target.value;
        const p = produtos.find((x) => x.id === e.target.value);
        const campoPreco = div.querySelector('[data-preco]');
        if (p && Number(campoPreco.value) === 0) {
          campoPreco.value = p.preco_venda;
          itens[indice].preco_unitario = Number(p.preco_venda);
          atualizarTotal();
        }
      });
      div.querySelector('[data-qtd]').addEventListener('input', (e) => {
        itens[indice].quantidade = Number(e.target.value);
        atualizarTotal();
      });
      div.querySelector('[data-preco]').addEventListener('input', (e) => {
        itens[indice].preco_unitario = Number(e.target.value);
        atualizarTotal();
      });
      div.querySelector('.item-remover').addEventListener('click', () => {
        itens.splice(indice, 1);
        if (!itens.length) itens.push({ produto_id: '', quantidade: 1, preco_unitario: 0 });
        redesenharItens();
      });

      return div;
    }

    function redesenharItens() {
      areaItens.innerHTML = '';
      itens.forEach((item, i) => areaItens.append(linhaItem(item, i)));
      atualizarTotal();
    }

    function atualizarTotal() {
      const total = itens.reduce(
        (t, i) => t + Number(i.quantidade || 0) * Number(i.preco_unitario || 0),
        0
      );
      campoTotal.textContent = ui.moeda(total);
    }

    modalCorpo.querySelector('[data-add-item]').addEventListener('click', () => {
      itens.push({ produto_id: '', quantidade: 1, preco_unitario: 0 });
      redesenharItens();
    });

    redesenharItens();

    async function salvar() {
      const validos = itens.filter((i) => i.produto_id && Number(i.quantidade) > 0);
      if (!validos.length) {
        ui.aviso('Adicione ao menos um item com produto e quantidade.', 'erro');
        return;
      }

      const dados = {
        fornecedor_id: modalCorpo.querySelector('[data-fornecedor]').value || null,
        observacao: modalCorpo.querySelector('[data-observacao]').value.trim() || null,
      };

      try {
        if (ehNovo) {
          await store.pedidos.criar({ ...dados, itens: validos });
          ui.aviso('Pedido criado.');
        } else {
          await atualizar('pedidos', pedido.id, dados);
          await store.pedidos.trocarItens(pedido.id, validos);
          ui.aviso('Pedido atualizado.');
        }
        fechar();
        recarregar();
      } catch (e) {
        ui.erro(e);
      }
    }
  }

  // ----------------------------------------------------------
  // Detalhes + mudança de status
  // ----------------------------------------------------------

  function abrirDetalhes(p) {
    const itens = p.itens || [];
    const html = `
      <div class="detalhe-grade">
        <div class="detalhe-item">
          <span class="campo-rotulo">Fornecedor</span>
          <strong>${ui.esc(p.fornecedor?.nome || '—')}</strong>
        </div>
        <div class="detalhe-item">
          <span class="campo-rotulo">Data do pedido</span>
          <strong class="mono">${ui.data(p.data_pedido)}</strong>
        </div>
        <div class="detalhe-item">
          <span class="campo-rotulo">Recebido em</span>
          <strong class="mono">${ui.data(p.data_recebimento)}</strong>
        </div>
        <div class="detalhe-item">
          <span class="campo-rotulo">Situação</span>
          <strong>${ui.badge(p.status)}</strong>
        </div>
        <div class="detalhe-item">
          <span class="campo-rotulo">Responsável</span>
          <strong>${ui.esc(p.responsavel?.nome || '—')}</strong>
        </div>
      </div>

      ${p.observacao ? `<p class="modal-mensagem" style="margin-bottom:18px;">${ui.esc(p.observacao)}</p>` : ''}

      <div class="table-card">
        <table>
          <thead><tr><th>Produto</th><th>Qtd.</th><th>Preço un.</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${
              itens.length
                ? itens
                    .map(
                      (i) => `<tr>
                        <td data-label="Produto" class="item-name">${ui.esc(i.produto?.nome || '—')}</td>
                        <td data-label="Qtd." class="mono">${ui.numero(i.quantidade)} un</td>
                        <td data-label="Preço un." class="mono">${ui.moeda(i.preco_unitario)}</td>
                        <td data-label="Subtotal" class="mono">${ui.moeda(i.quantidade * i.preco_unitario)}</td>
                      </tr>`
                    )
                    .join('')
                : ui.vazio(4, 'Pedido sem itens.')
            }
          </tbody>
        </table>
      </div>

      <div class="itens-total">
        <span class="panel-sub" style="margin:0;">Total</span>
        <strong>${ui.moeda(totalDoPedido(p))}</strong>
      </div>`;

    const acoes = editavel
      ? PROXIMO[p.status].map((t) => ({
          texto: t.texto,
          classe: t.para === 'recebido' ? 'btn-primary' : t.para === 'cancelado' ? 'btn-perigo' : '',
          aoClicar: async (fechar) => {
            if (t.para === 'recebido') {
              const ok = await ui.confirmar({
                titulo: 'Confirmar recebimento',
                mensagem:
                  `Confirmar o recebimento do pedido #${p.numero}? ` +
                  `Os ${itens.length} ${itens.length === 1 ? 'item entrará' : 'itens entrarão'} ` +
                  `no estoque automaticamente.`,
                textoConfirmar: 'Confirmar recebimento',
              });
              if (!ok) return;
            }
            try {
              await store.pedidos.mudarStatus(p.id, t.para);
              ui.aviso('Pedido atualizado.');
              fechar();
              recarregar();
            } catch (e) {
              ui.erro(e);
            }
          },
        }))
      : [];

    ui.painel({ titulo: `Pedido #${p.numero}`, html, largura: '680px', acoes });
  }

  // ----------------------------------------------------------
  // Sugestões de reposição
  // ----------------------------------------------------------

  async function mostrarSugestoes() {
    caixaSugestoes.hidden = false;
    listaSugestoes.innerHTML = '<p class="panel-sub"><span class="spinner"></span> Verificando o estoque…</p>';

    try {
      const sugestoes = await store.sugestoesDeReposicao();

      if (!sugestoes.length) {
        listaSugestoes.innerHTML =
          '<p class="panel-sub">Nenhum item abaixo do mínimo. Estoque em dia.</p>';
        return;
      }

      listaSugestoes.innerHTML =
        sugestoes
          .map(
            (s) => `<div class="alert-row">
              <span>${ui.esc(s.nome)} · repor ${ui.numero(s.repor)} un</span>
              ${ui.badge(s.situacao)}
            </div>`
          )
          .join('') +
        `<div class="report-actions" style="margin-top:16px;">
           <button class="btn btn-primary" data-criar-sugerido>Criar pedido com esses ${sugestoes.length} ${sugestoes.length === 1 ? 'item' : 'itens'}</button>
           <button class="btn" data-fechar-sugestoes>Dispensar</button>
         </div>`;

      listaSugestoes.querySelector('[data-criar-sugerido]').addEventListener('click', () => {
        abrirEditor(
          null,
          sugestoes.map((s) => ({
            produto_id: s.produto_id,
            quantidade: s.repor,
            preco_unitario: produtos.find((p) => p.id === s.produto_id)?.preco_venda || 0,
          }))
        );
      });
      listaSugestoes
        .querySelector('[data-fechar-sugestoes]')
        .addEventListener('click', () => (caixaSugestoes.hidden = true));
    } catch (e) {
      listaSugestoes.innerHTML = `<p class="panel-sub empty-erro">${ui.esc(e.message)}</p>`;
    }
  }

  // ----------------------------------------------------------

  if (editavel) {
    raiz.querySelector('[data-novo]').addEventListener('click', () => {
      if (!produtos.length) {
        ui.aviso('Cadastre produtos antes de montar um pedido.', 'erro');
        return;
      }
      abrirEditor(null);
    });
    raiz.querySelector('[data-sugerir]').addEventListener('click', mostrarSugestoes);
  }

  ui.aoAgir(corpo, {
    ver: (id) => abrirDetalhes(lista.find((p) => p.id === id)),
    editar: (id) => abrirEditor(lista.find((p) => p.id === id)),
    async excluir(id) {
      const p = lista.find((x) => x.id === id);
      const ok = await ui.confirmar({
        titulo: 'Excluir pedido',
        mensagem: `Excluir o pedido #${p.numero} e todos os seus itens?`,
        textoConfirmar: 'Excluir',
        perigoso: true,
      });
      if (!ok) return;
      try {
        await excluir('pedidos', id);
        ui.aviso('Pedido excluído.');
        recarregar();
      } catch (e) {
        ui.erro(e);
      }
    },
  });

  return { recarregar };
}
