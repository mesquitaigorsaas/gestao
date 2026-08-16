// ============================================================
// Gerador de tela de cadastro
// ============================================================
// Várias abas são a mesma coisa: uma tabela, um botão "novo", e
// editar/excluir em cada linha. Em vez de escrever isso cinco
// vezes, cada aba descreve as suas colunas e campos e chama aqui.
// ============================================================

import * as ui from '../ui.js';
import { inserir, atualizar, excluir } from '../store.js';
import { podeEditar } from '../auth.js';

/**
 * @param {object} cfg
 * @param {HTMLElement} cfg.raiz        painel onde a tela é montada
 * @param {string}      cfg.tabela      tabela do banco
 * @param {string}      cfg.area        área de permissão (ver auth.js)
 * @param {string}      cfg.titulo
 * @param {string}      cfg.subtitulo
 * @param {string}      cfg.textoNovo   rótulo do botão de criação
 * @param {Array}       cfg.colunas     [{ rotulo, valor(r), classe, ocultarNoMobile }]
 * @param {Array|fn}    cfg.campos      campos do formulário (ou função async que os monta)
 * @param {fn}          cfg.carregar    async () => registros
 * @param {fn}          [cfg.paraFormulario] registro → valores do formulário
 * @param {fn}          [cfg.rotuloDe]  registro → nome usado nas confirmações
 * @param {string}      [cfg.vazio]     texto quando não há nada cadastrado
 */
export function telaCrud(cfg) {
  const {
    raiz,
    tabela,
    area,
    titulo,
    subtitulo,
    textoNovo,
    colunas,
    campos,
    carregar,
    paraFormulario = (r) => r,
    rotuloDe = (r) => r.nome,
    vazio = 'Nenhum registro cadastrado ainda.',
    buscaPlaceholder = 'Buscar…',
  } = cfg;

  const editavel = podeEditar(area);
  const totalColunas = colunas.length + (editavel ? 1 : 0);

  raiz.innerHTML = `
    <div class="panel-head">
      <div>
        <h1 class="panel-title">${ui.esc(titulo)}</h1>
        <div class="panel-sub">${ui.esc(subtitulo)}</div>
      </div>
      ${editavel ? `<button class="btn btn-primary" data-novo>${ui.esc(textoNovo)}</button>` : ''}
    </div>

    <div class="toolbar">
      <div class="busca">
        <input type="search" placeholder="${ui.esc(buscaPlaceholder)}" aria-label="Buscar">
      </div>
      <span class="panel-sub toolbar-espaco" data-contador></span>
    </div>

    <div class="table-card">
      <table>
        <thead>
          <tr>
            ${colunas.map((c) => `<th>${ui.esc(c.rotulo)}</th>`).join('')}
            ${editavel ? '<th></th>' : ''}
          </tr>
        </thead>
        <tbody data-corpo>${ui.carregando(totalColunas)}</tbody>
      </table>
    </div>`;

  const corpo = raiz.querySelector('[data-corpo]');
  const contador = raiz.querySelector('[data-contador]');
  const busca = raiz.querySelector('.busca input');

  ui.ligarBusca(busca, corpo);

  let registros = [];

  async function montarCampos() {
    return typeof campos === 'function' ? await campos() : campos;
  }

  async function recarregar() {
    corpo.innerHTML = ui.carregando(totalColunas);
    try {
      registros = await carregar();
      desenhar();
    } catch (e) {
      console.error(e);
      corpo.innerHTML = ui.falhou(totalColunas, e.message);
      contador.textContent = '';
    }
  }

  function desenhar() {
    if (!registros.length) {
      corpo.innerHTML = ui.vazio(totalColunas, vazio);
      contador.textContent = '';
      return;
    }

    corpo.innerHTML = registros
      .map(
        (r) => `<tr>
          ${colunas
            .map(
              (c) =>
                `<td data-label="${ui.esc(c.rotulo)}" class="${c.classe || ''}">${c.valor(r)}</td>`
            )
            .join('')}
          ${editavel ? `<td data-label="Ações" class="celula-acoes">${ui.acoesLinha(r.id)}</td>` : ''}
        </tr>`
      )
      .join('');

    contador.textContent = `${registros.length} ${registros.length === 1 ? 'registro' : 'registros'}`;
    if (busca.value) busca.dispatchEvent(new Event('input'));
  }

  if (editavel) {
    raiz.querySelector('[data-novo]').addEventListener('click', async () => {
      const ok = await ui.formulario({
        titulo: textoNovo.replace(/^\+\s*/, ''),
        campos: await montarCampos(),
        textoSalvar: 'Cadastrar',
        onSalvar: (dados) => inserir(tabela, dados),
      });
      if (ok) {
        ui.aviso('Cadastrado com sucesso.');
        recarregar();
      }
    });

    ui.aoAgir(corpo, {
      async editar(id) {
        const reg = registros.find((r) => String(r.id) === String(id));
        if (!reg) return;
        const ok = await ui.formulario({
          titulo: `Editar ${rotuloDe(reg)}`,
          campos: await montarCampos(),
          valores: paraFormulario(reg),
          onSalvar: (dados) => atualizar(tabela, id, dados),
        });
        if (ok) {
          ui.aviso('Alterações salvas.');
          recarregar();
        }
      },

      async excluir(id) {
        const reg = registros.find((r) => String(r.id) === String(id));
        if (!reg) return;
        const confirmado = await ui.confirmar({
          titulo: 'Excluir registro',
          mensagem: `Excluir "${rotuloDe(reg)}" de vez? Essa ação não pode ser desfeita.`,
          textoConfirmar: 'Excluir',
          perigoso: true,
        });
        if (!confirmado) return;
        try {
          await excluir(tabela, id);
          ui.aviso('Registro excluído.');
          recarregar();
        } catch (e) {
          ui.erro(e);
        }
      },
    });
  }

  return { recarregar };
}
