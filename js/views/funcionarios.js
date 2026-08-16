// Equipe com acesso ao painel. Só o administrador mexe aqui.
import * as ui from '../ui.js';
import * as store from '../store.js';
import { atualizar, excluir } from '../store.js';
import { CARGOS, criarFuncionario, nomeDoCargo, usuarioAtual, podeEditar } from '../auth.js';

const SITUACOES = [
  { valor: 'ativo', texto: 'Ativo' },
  { valor: 'ferias', texto: 'Férias' },
  { valor: 'inativo', texto: 'Inativo (sem acesso)' },
];

export function montar(raiz) {
  const euSouAdmin = podeEditar('*') || usuarioAtual()?.cargo === 'admin';
  const colunas = 5;

  raiz.innerHTML = `
    <div class="panel-head">
      <div>
        <h1 class="panel-title">Funcionários</h1>
        <div class="panel-sub">Quem tem acesso ao painel e o que cada um pode fazer</div>
      </div>
      ${euSouAdmin ? '<button class="btn btn-primary" data-novo>+ Novo funcionário</button>' : ''}
    </div>

    <div class="toolbar">
      <div class="busca">
        <input type="search" placeholder="Buscar por nome ou cargo…" aria-label="Buscar">
      </div>
      <span class="panel-sub toolbar-espaco" data-contador></span>
    </div>

    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Nome</th><th>Cargo</th><th>Setor</th><th>Situação</th>
            ${euSouAdmin ? '<th></th>' : ''}
          </tr>
        </thead>
        <tbody data-corpo>${ui.carregando(colunas)}</tbody>
      </table>
    </div>

    <div class="card" style="margin-top:18px;">
      <h3>O que cada cargo pode fazer</h3>
      <div class="alert-row"><span><b>Administrador</b> — acesso total, inclusive a esta tela</span></div>
      <div class="alert-row"><span><b>Estoque</b> — produtos, estoque, pedidos e fornecedores</span></div>
      <div class="alert-row"><span><b>Logística</b> — pedidos, transportadoras e movimentação de estoque</span></div>
      <div class="alert-row"><span><b>Financeiro</b> — lançamentos, contas a pagar e a receber</span></div>
      <div class="alert-row"><span class="panel-sub" style="margin:0;">A agenda e os relatórios ficam disponíveis para todos os cargos.</span></div>
    </div>`;

  const corpo = raiz.querySelector('[data-corpo]');
  const contador = raiz.querySelector('[data-contador]');
  ui.ligarBusca(raiz.querySelector('.busca input'), corpo);

  let equipe = [];

  async function recarregar() {
    corpo.innerHTML = ui.carregando(colunas);
    try {
      equipe = await store.funcionarios.listar();
      desenhar();
    } catch (e) {
      corpo.innerHTML = ui.falhou(colunas, e.message);
    }
  }

  function desenhar() {
    if (!equipe.length) {
      corpo.innerHTML = ui.vazio(colunas, 'Nenhum funcionário cadastrado.');
      contador.textContent = '';
      return;
    }

    const eu = usuarioAtual()?.id;
    corpo.innerHTML = equipe
      .map(
        (f) => `<tr>
          <td data-label="Nome" class="item-name">
            ${ui.esc(f.nome)}${f.id === eu ? ' <span class="usuario-cargo">(você)</span>' : ''}
          </td>
          <td data-label="Cargo">${ui.esc(nomeDoCargo(f.cargo))}</td>
          <td data-label="Setor">${ui.esc(f.setor || '—')}</td>
          <td data-label="Situação">${ui.badge(f.status)}</td>
          ${
            euSouAdmin
              ? `<td data-label="Ações" class="celula-acoes">${ui.acoesLinha(f.id, {
                  excluir: f.id !== eu, // ninguém remove o próprio acesso
                })}</td>`
              : ''
          }
        </tr>`
      )
      .join('');

    contador.textContent = `${equipe.length} ${equipe.length === 1 ? 'pessoa' : 'pessoas'}`;
  }

  if (euSouAdmin) {
    raiz.querySelector('[data-novo]').addEventListener('click', async () => {
      const ok = await ui.formulario({
        titulo: 'Novo funcionário',
        subtitulo: 'A pessoa entra no sistema com o e-mail e a senha definidos aqui.',
        textoSalvar: 'Criar acesso',
        campos: [
          { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true, largo: true },
          { nome: 'email', rotulo: 'E-mail de acesso', obrigatorio: true, largo: true },
          {
            nome: 'senha',
            rotulo: 'Senha provisória',
            tipo: 'senha',
            obrigatorio: true,
            dica: 'Mínimo de 6 caracteres. A pessoa pode trocar depois pelo menu do topo.',
          },
          { nome: 'cargo', rotulo: 'Cargo', tipo: 'select', obrigatorio: true, opcoes: CARGOS },
          { nome: 'setor', rotulo: 'Setor', dica: 'Ex.: Estoque, Logística' },
        ],
        valores: { cargo: 'estoque', setor: 'Operação' },
        onSalvar: (d) => criarFuncionario(d),
      });
      if (ok) {
        ui.aviso('Acesso criado.');
        recarregar();
      }
    });

    ui.aoAgir(corpo, {
      async editar(id) {
        const f = equipe.find((x) => x.id === id);
        if (!f) return;
        const ok = await ui.formulario({
          titulo: `Editar ${f.nome}`,
          campos: [
            { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true, largo: true },
            { nome: 'cargo', rotulo: 'Cargo', tipo: 'select', obrigatorio: true, opcoes: CARGOS },
            { nome: 'setor', rotulo: 'Setor' },
            { nome: 'status', rotulo: 'Situação', tipo: 'select', obrigatorio: true, opcoes: SITUACOES },
          ],
          valores: { nome: f.nome, cargo: f.cargo, setor: f.setor, status: f.status },
          onSalvar: (d) => atualizar('perfis', id, d),
        });
        if (ok) {
          ui.aviso('Alterações salvas.');
          recarregar();
        }
      },

      async excluir(id) {
        const f = equipe.find((x) => x.id === id);
        if (!f) return;
        const confirmado = await ui.confirmar({
          titulo: 'Remover funcionário',
          mensagem:
            `Remover ${f.nome} da equipe? A pessoa perde o acesso ao painel, mas os lançamentos ` +
            `que ela já fez continuam no histórico.`,
          textoConfirmar: 'Remover',
          perigoso: true,
        });
        if (!confirmado) return;
        try {
          // Só o perfil sai; a conta de login continua existindo no
          // Supabase e pode ser apagada de vez pelo painel de lá.
          await excluir('perfis', id);
          ui.aviso('Funcionário removido.');
          recarregar();
        } catch (e) {
          ui.erro(e);
        }
      },
    });
  }

  return { recarregar };
}
