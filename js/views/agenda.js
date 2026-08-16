// Compromissos, entregas e vencimentos.
import * as ui from '../ui.js';
import * as store from '../store.js';
import { inserir, atualizar, excluir } from '../store.js';
import { podeEditar } from '../auth.js';

const TIPOS = [
  { valor: 'entrega', texto: 'Entrega' },
  { valor: 'reuniao', texto: 'Reunião' },
  { valor: 'vencimento', texto: 'Vencimento' },
  { valor: 'inventario', texto: 'Inventário' },
  { valor: 'geral', texto: 'Outro' },
];

const COR = {
  entrega: 'var(--amber)',
  reuniao: 'var(--teal)',
  vencimento: 'var(--alert)',
  inventario: 'var(--text-faint)',
  geral: 'var(--text-faint)',
};

const campos = [
  { nome: 'titulo', rotulo: 'Compromisso', obrigatorio: true, largo: true },
  { nome: 'data_hora', rotulo: 'Data e hora', tipo: 'datahora', obrigatorio: true },
  { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', obrigatorio: true, opcoes: TIPOS },
  { nome: 'descricao', rotulo: 'Detalhes', tipo: 'area', largo: true },
];

// O input datetime-local trabalha em horário local sem fuso; o banco
// guarda com fuso. Estas duas funções fazem a ponte.
const paraCampo = (iso) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const doCampo = (valor) => new Date(valor).toISOString();

export function montar(raiz) {
  const editavel = podeEditar('agenda');

  raiz.innerHTML = `
    <div class="panel-head">
      <div>
        <h1 class="panel-title">Agenda</h1>
        <div class="panel-sub">Compromissos e entregas da equipe</div>
      </div>
      ${editavel ? '<button class="btn btn-primary" data-novo>+ Novo evento</button>' : ''}
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>Próximos compromissos</h3>
        <div data-proximos><p class="panel-sub"><span class="spinner"></span> Carregando…</p></div>
      </div>
      <div class="card">
        <h3>Já passaram</h3>
        <div data-passados><p class="panel-sub">—</p></div>
      </div>
    </div>`;

  const areaProximos = raiz.querySelector('[data-proximos]');
  const areaPassados = raiz.querySelector('[data-passados]');

  let lista = [];

  async function recarregar() {
    try {
      lista = await store.eventos.listar();
      desenhar();
    } catch (e) {
      areaProximos.innerHTML = `<p class="panel-sub empty-erro">${ui.esc(e.message)}</p>`;
    }
  }

  function linha(e) {
    return `<div class="activity-row">
      <span class="activity-dot" style="background:${COR[e.tipo]};"></span>
      <span>
        ${ui.esc(e.titulo)}
        ${e.descricao ? `<div class="item-sub">${ui.esc(e.descricao)}</div>` : ''}
      </span>
      <span class="activity-time">${ui.dataHora(e.data_hora)}</span>
      ${
        editavel
          ? `<span class="row-actions">
               <button class="icon-btn" data-acao="editar" data-id="${e.id}" title="Editar">✎</button>
               <button class="icon-btn icon-btn-perigo" data-acao="excluir" data-id="${e.id}" title="Excluir">🗑</button>
             </span>`
          : ''
      }
    </div>`;
  }

  function desenhar() {
    const agora = new Date().toISOString();
    const proximos = lista.filter((e) => e.data_hora >= agora);
    const passados = lista.filter((e) => e.data_hora < agora).reverse().slice(0, 10);

    areaProximos.innerHTML = proximos.length
      ? proximos.map(linha).join('')
      : '<p class="panel-sub">Nenhum compromisso marcado.</p>';

    areaPassados.innerHTML = passados.length
      ? passados.map(linha).join('')
      : '<p class="panel-sub">Nada no histórico ainda.</p>';
  }

  if (editavel) {
    raiz.querySelector('[data-novo]').addEventListener('click', async () => {
      const ok = await ui.formulario({
        titulo: 'Novo evento',
        campos,
        valores: { tipo: 'geral', data_hora: paraCampo(new Date().toISOString()) },
        textoSalvar: 'Agendar',
        onSalvar: (d) => inserir('eventos', { ...d, data_hora: doCampo(d.data_hora) }),
      });
      if (ok) {
        ui.aviso('Evento agendado.');
        recarregar();
      }
    });

    const agir = {
      async editar(id) {
        const e = lista.find((x) => x.id === id);
        const ok = await ui.formulario({
          titulo: 'Editar evento',
          campos,
          valores: {
            titulo: e.titulo,
            data_hora: paraCampo(e.data_hora),
            tipo: e.tipo,
            descricao: e.descricao,
          },
          onSalvar: (d) => atualizar('eventos', id, { ...d, data_hora: doCampo(d.data_hora) }),
        });
        if (ok) {
          ui.aviso('Alterações salvas.');
          recarregar();
        }
      },

      async excluir(id) {
        const e = lista.find((x) => x.id === id);
        const ok = await ui.confirmar({
          titulo: 'Excluir evento',
          mensagem: `Excluir "${e.titulo}" da agenda?`,
          textoConfirmar: 'Excluir',
          perigoso: true,
        });
        if (!ok) return;
        try {
          await excluir('eventos', id);
          ui.aviso('Evento excluído.');
          recarregar();
        } catch (err) {
          ui.erro(err);
        }
      },
    };

    ui.aoAgir(areaProximos, agir);
    ui.aoAgir(areaPassados, agir);
  }

  return { recarregar };
}
