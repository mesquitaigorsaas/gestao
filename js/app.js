// ============================================================
// Grão Central — inicialização e navegação
// ============================================================

import { configurado } from './supabase.js';
import { EMPRESA, DEMO } from './config.js';
import * as ui from './ui.js';
import {
  recuperarSessao,
  pedirLogin,
  entrarComoDemonstracao,
  usuarioAtual,
  podeVer,
  aplicarPermissoesNaNavegacao,
  montarMenuDoUsuario,
  trocarSenha,
} from './auth.js';
import { popularDemo, limparTudo, bancoVazio } from './seed.js';

// Cada aba carrega o seu módulo só quando é aberta pela primeira vez.
const VIEWS = {
  inicio: () => import('./views/inicio.js'),
  produtos: () => import('./views/produtos.js'),
  estoque: () => import('./views/estoque.js'),
  pedidos: () => import('./views/pedidos.js'),
  fornecedores: () => import('./views/fornecedores.js'),
  transportadoras: () => import('./views/transportadoras.js'),
  financeiro: () => import('./views/financeiro.js'),
  agenda: () => import('./views/agenda.js'),
  funcionarios: () => import('./views/funcionarios.js'),
  relatorios: () => import('./views/relatorios.js'),
};

const montadas = new Map(); // aba → { recarregar }

// ------------------------------------------------------------
// Relógio do topo
// ------------------------------------------------------------
function iniciarRelogio() {
  const relogio = document.getElementById('clock');
  if (!relogio) return;
  const tick = () => (relogio.textContent = new Date().toLocaleTimeString('pt-BR'));
  tick();
  setInterval(tick, 1000);
}

// ------------------------------------------------------------
// Navegação
// ------------------------------------------------------------

async function abrirAba(aba, { forcar = false } = {}) {
  if (!podeVer(aba)) return;

  document
    .querySelectorAll('.tab-link')
    .forEach((l) => l.classList.toggle('active', l.dataset.tab === aba));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === aba));

  const painel = document.getElementById(aba);
  if (!painel) return;

  if (montadas.has(aba)) {
    if (forcar) montadas.get(aba).recarregar?.();
    return;
  }

  try {
    const modulo = await VIEWS[aba]();
    const instancia = modulo.montar(painel, { irPara: abrirAba });
    montadas.set(aba, instancia || {});
    await instancia?.recarregar?.();
  } catch (e) {
    console.error(`[app] falha ao abrir a aba ${aba}:`, e);
    painel.innerHTML = `
      <div class="card">
        <h3>Não foi possível abrir esta tela</h3>
        <p class="panel-sub">${ui.esc(e.message)}</p>
      </div>`;
  }

  if (location.hash.slice(1) !== aba) history.replaceState(null, '', `#${aba}`);
}

function ligarNavegacao() {
  document.querySelectorAll('.tab-link').forEach((link) => {
    link.addEventListener('click', () => {
      abrirAba(link.dataset.tab);
      fecharMenuMobile();
    });
  });

  const botao = document.getElementById('hamburgerBtn');
  const painel = document.getElementById('mobileNav');
  const fechar = document.getElementById('mobileNavClose');

  botao?.addEventListener('click', () => {
    const abrindo = !painel.classList.contains('open');
    painel.classList.toggle('open', abrindo);
    botao.classList.toggle('open', abrindo);
    botao.setAttribute('aria-expanded', String(abrindo));
    document.body.style.overflow = abrindo ? 'hidden' : '';
  });
  fechar?.addEventListener('click', fecharMenuMobile);
  painel?.addEventListener('click', (e) => e.target === painel && fecharMenuMobile());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && fecharMenuMobile());

  // Voltar/avançar do navegador troca de aba.
  addEventListener('hashchange', () => {
    const aba = location.hash.slice(1);
    if (VIEWS[aba]) abrirAba(aba);
  });
}

function fecharMenuMobile() {
  const painel = document.getElementById('mobileNav');
  const botao = document.getElementById('hamburgerBtn');
  painel?.classList.remove('open');
  botao?.classList.remove('open');
  botao?.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

// ------------------------------------------------------------
// Dados de demonstração (só administrador)
// ------------------------------------------------------------

function itensDeDemonstracao() {
  // Na demonstração estes itens não existem: eles gravam no banco, e
  // aqui não há banco. Voltam sozinhos quando DEMO for desligado.
  if (DEMO) return [];
  if (usuarioAtual()?.cargo !== 'admin') return [];

  return [
    {
      texto: 'Preencher com dados de demonstração',
      async aoClicar() {
        if (!(await bancoVazio())) {
          const ok = await ui.confirmar({
            titulo: 'Já existem dados',
            mensagem:
              'O sistema já tem informações cadastradas. Os dados de demonstração serão ' +
              'somados ao que já está lá. Continuar mesmo assim?',
            textoConfirmar: 'Continuar',
          });
          if (!ok) return;
        }
        try {
          ui.aviso('Preenchendo…', 'info');
          await popularDemo();
          ui.aviso('Dados de demonstração criados.');
          recarregarTudo();
        } catch (e) {
          ui.erro(e);
        }
      },
    },
    {
      texto: 'Limpar todos os dados',
      perigoso: true,
      async aoClicar() {
        const ok = await ui.confirmar({
          titulo: 'Limpar o sistema',
          mensagem:
            'Isso apaga produtos, estoque, pedidos, financeiro e agenda de forma definitiva. ' +
            'A equipe cadastrada e os acessos continuam. Não há como desfazer.',
          textoConfirmar: 'Apagar tudo',
          perigoso: true,
        });
        if (!ok) return;
        try {
          await limparTudo();
          ui.aviso('Sistema limpo.');
          recarregarTudo();
        } catch (e) {
          ui.erro(e);
        }
      },
    },
  ];
}

function recarregarTudo() {
  montadas.forEach((v) => v.recarregar?.());
}

// ------------------------------------------------------------
// Partida
// ------------------------------------------------------------

function avisarConfiguracaoPendente() {
  const faixa = document.createElement('div');
  faixa.className = 'faixa-config';
  faixa.innerHTML = `
    <b>Sistema ainda não conectado ao banco.</b>
    Abra <code>js/config.js</code> e preencha <code>SUPABASE_URL</code> e
    <code>SUPABASE_ANON_KEY</code> com os dados do projeto Supabase desta empresa.
    O passo a passo está no <code>README.md</code>.`;
  document.querySelector('.app')?.prepend(faixa);
  document.getElementById('boot')?.remove();
}

async function iniciar() {
  document.title = `${EMPRESA.nome} — Painel de Gestão`;

  // Numa demonstração não há banco para configurar nem login a fazer:
  // entra direto, com os dados de exemplo do js/store.js.
  if (!DEMO && !configurado) {
    avisarConfiguracaoPendente();
    return;
  }

  iniciarRelogio();
  ligarNavegacao();

  if (DEMO) {
    entrarComoDemonstracao();
    document.getElementById('boot')?.remove();
  } else {
    try {
      let usuario = await recuperarSessao();
      document.getElementById('boot')?.remove();
      if (!usuario) usuario = await pedirLogin();
    } catch (e) {
      document.getElementById('boot')?.remove();
      ui.erro(e);
      await pedirLogin();
    }
  }

  aplicarPermissoesNaNavegacao();

  montarMenuDoUsuario(document.getElementById('areaUsuario'), {
    itensExtras: itensDeDemonstracao(),
    aoTrocarSenha: async () => {
      await ui.formulario({
        titulo: 'Trocar minha senha',
        campos: [
          {
            nome: 'senha',
            rotulo: 'Nova senha',
            tipo: 'senha',
            obrigatorio: true,
            largo: true,
            dica: 'Mínimo de 6 caracteres',
          },
        ],
        textoSalvar: 'Trocar senha',
        onSalvar: async (d) => {
          if (d.senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
          await trocarSenha(d.senha);
        },
      });
    },
  });

  // Abre a aba do endereço (#estoque), se a pessoa tiver acesso.
  const pedida = location.hash.slice(1);
  const inicial = VIEWS[pedida] && podeVer(pedida) ? pedida : podeVer('inicio') ? 'inicio' : null;

  if (inicial) {
    abrirAba(inicial);
  } else {
    // Cargo sem nenhuma aba liberada — não deveria acontecer, mas avisa.
    document.querySelector('.content').innerHTML = `
      <div class="card">
        <h3>Sem telas liberadas</h3>
        <p class="panel-sub">Seu cargo não tem acesso a nenhuma área. Fale com o administrador.</p>
      </div>`;
  }
}

iniciar();
