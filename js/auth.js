// ============================================================
// Login, sessão e permissões
// ============================================================

import { sb } from './supabase.js';
import { EMPRESA } from './config.js';
import { esc, aviso } from './ui.js';

// ------------------------------------------------------------
// O que cada cargo enxerga e altera
// ------------------------------------------------------------
// Esta tabela é o espelho das políticas de RLS do banco. Aqui ela
// serve para esconder o que a pessoa não usa; quem realmente barra
// a gravação é o banco — mexer no HTML pelo navegador não passa.

const ACESSO = {
  admin: {
    rotulo: 'Administrador',
    abas: '*',
    escreve: '*',
  },
  estoque: {
    rotulo: 'Estoque',
    abas: ['inicio', 'produtos', 'estoque', 'pedidos', 'fornecedores', 'agenda', 'relatorios'],
    escreve: ['produtos', 'estoque', 'pedidos', 'fornecedores', 'agenda'],
  },
  logistica: {
    rotulo: 'Logística',
    abas: ['inicio', 'estoque', 'pedidos', 'transportadoras', 'agenda', 'relatorios'],
    escreve: ['estoque', 'pedidos', 'transportadoras', 'agenda'],
  },
  financeiro: {
    rotulo: 'Financeiro',
    abas: ['inicio', 'pedidos', 'financeiro', 'agenda', 'relatorios'],
    escreve: ['financeiro', 'agenda'],
  },
};

export const CARGOS = Object.entries(ACESSO).map(([valor, a]) => ({ valor, texto: a.rotulo }));

let usuario = null; // { id, nome, cargo, setor, email }

export const usuarioAtual = () => usuario;
export const nomeDoCargo = (cargo) => ACESSO[cargo]?.rotulo || cargo;

export function podeVer(aba) {
  const regra = ACESSO[usuario?.cargo];
  if (!regra) return false;
  return regra.abas === '*' || regra.abas.includes(aba);
}

export function podeEditar(area) {
  const regra = ACESSO[usuario?.cargo];
  if (!regra) return false;
  return regra.escreve === '*' || regra.escreve.includes(area);
}

// ------------------------------------------------------------
// Sessão
// ------------------------------------------------------------

/** Recupera a sessão salva. Devolve o usuário, ou null se ninguém está logado. */
export async function recuperarSessao() {
  const { data } = await sb.auth.getSession();
  if (!data?.session) {
    usuario = null;
    return null;
  }
  return carregarPerfil(data.session.user);
}

async function carregarPerfil(authUser) {
  const { data: perfil, error } = await sb
    .from('perfis')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) {
    console.error('[auth] falha ao carregar o perfil:', error);
    throw new Error('Não foi possível carregar seu perfil. Fale com o administrador.');
  }
  if (!perfil) {
    // Conta existe no login mas não tem perfil — o trigger não rodou.
    await sb.auth.signOut();
    throw new Error('Seu acesso ainda não foi liberado. Peça ao administrador para cadastrar você.');
  }
  if (perfil.status === 'inativo') {
    await sb.auth.signOut();
    throw new Error('Seu acesso foi desativado. Fale com o administrador.');
  }

  usuario = { ...perfil, email: authUser.email };
  return usuario;
}

export async function sair() {
  await sb.auth.signOut();
  usuario = null;
  location.reload();
}

// ------------------------------------------------------------
// Tela de login
// ------------------------------------------------------------

const marcaSVG = `
  <div class="logo-mark">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10 L12 4 L20 10 L20 20 L4 20 Z" stroke="#e3a857" stroke-width="1.4" fill="none"/>
      <path d="M8 20 L8 13 L16 13 L16 20" stroke="#e3a857" stroke-width="1.4"/>
    </svg>
  </div>`;

/**
 * Mostra a tela de login e só resolve quando alguém entra.
 * Se o banco ainda não tem nenhum funcionário, oferece a criação
 * do primeiro acesso — que vira administrador.
 */
export function pedirLogin() {
  return new Promise((resolve) => {
    const tela = document.createElement('div');
    tela.className = 'login-tela';
    tela.innerHTML = `
      <div class="login-caixa">
        <div class="login-marca">
          ${marcaSVG}
          <div class="brand-text">
            <span class="brand-name">${esc(EMPRESA.nome)}</span>
            <span class="brand-tag">${esc(EMPRESA.ramo)}</span>
          </div>
        </div>

        <h2 data-titulo>Entrar no painel</h2>
        <p class="panel-sub" data-subtitulo>Use o e-mail cadastrado pela sua empresa.</p>

        <div class="login-erro" data-erro role="alert"></div>

        <form data-form novalidate>
          <label class="campo campo-nome" hidden>
            <span class="campo-rotulo">Seu nome <b>*</b></span>
            <input type="text" name="nome" autocomplete="name" placeholder="Ex.: Rafael Souza">
          </label>
          <label class="campo">
            <span class="campo-rotulo">E-mail <b>*</b></span>
            <input type="email" name="email" autocomplete="username" required placeholder="voce@empresa.com.br">
          </label>
          <label class="campo">
            <span class="campo-rotulo">Senha <b>*</b></span>
            <input type="password" name="senha" autocomplete="current-password" required minlength="6" placeholder="••••••••">
          </label>
          <button type="submit" class="btn btn-primary" data-enviar>Entrar</button>
        </form>

        <div class="login-rodape">
          <span data-rodape>Esqueceu a senha? Peça ao administrador para redefinir.</span>
        </div>
      </div>`;

    document.body.appendChild(tela);

    const form = tela.querySelector('[data-form]');
    const caixaErro = tela.querySelector('[data-erro]');
    const btn = tela.querySelector('[data-enviar]');
    const campoNome = tela.querySelector('.campo-nome');
    const titulo = tela.querySelector('[data-titulo]');
    const subtitulo = tela.querySelector('[data-subtitulo]');
    const rodape = tela.querySelector('[data-rodape]');

    let modoCadastro = false;

    const mostrarErro = (msg) => {
      caixaErro.textContent = msg;
      caixaErro.classList.add('show');
    };
    const limparErro = () => caixaErro.classList.remove('show');

    // Banco vazio? Então ninguém instalou ainda: oferece criar o dono.
    (async () => {
      const { count, error } = await sb
        .from('perfis')
        .select('id', { count: 'exact', head: true });
      if (!error && count === 0) entrarNoModoCadastro();
    })();

    function entrarNoModoCadastro() {
      modoCadastro = true;
      titulo.textContent = 'Primeiro acesso';
      subtitulo.textContent =
        'Nenhum funcionário cadastrado ainda. A conta criada agora será a de administrador.';
      campoNome.hidden = false;
      campoNome.querySelector('input').required = true;
      form.elements.senha.autocomplete = 'new-password';
      btn.textContent = 'Criar acesso de administrador';
      rodape.textContent = 'Depois de entrar, cadastre a equipe na aba Funcionários.';
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      limparErro();

      const email = form.elements.email.value.trim();
      const senha = form.elements.senha.value;
      const nome = form.elements.nome?.value.trim();

      btn.disabled = true;
      const textoOriginal = btn.textContent;
      btn.innerHTML = '<span class="spinner"></span> Aguarde…';

      try {
        if (modoCadastro) {
          const { data, error } = await sb.auth.signUp({
            email,
            password: senha,
            options: { data: { nome, cargo: 'admin', setor: 'Administrativo' } },
          });
          if (error) throw error;

          // Com confirmação de e-mail ligada, o signUp não devolve sessão.
          if (!data.session) {
            btn.disabled = false;
            btn.textContent = textoOriginal;
            mostrarErro(
              'Conta criada. Confirme o e-mail que enviamos e volte aqui para entrar. ' +
                'Para dispensar essa etapa, desligue "Confirm email" em Authentication → Providers no Supabase.'
            );
            return;
          }
          await carregarPerfil(data.user);
        } else {
          const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
          if (error) throw error;
          await carregarPerfil(data.user);
        }

        tela.style.opacity = '0';
        tela.style.transition = 'opacity .3s ease';
        setTimeout(() => tela.remove(), 300);
        resolve(usuario);
      } catch (err) {
        console.error('[auth]', err);
        mostrarErro(traduzirErroDeLogin(err));
        btn.disabled = false;
        btn.textContent = textoOriginal;
      }
    });

    form.elements.email.focus();
  });
}

function traduzirErroDeLogin(err) {
  const m = (err?.message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (m.includes('user already registered')) return 'Esse e-mail já tem cadastro. Tente entrar.';
  if (m.includes('password should be')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('failed to fetch')) return 'Sem conexão com o servidor. Verifique sua internet.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  return err?.message || 'Não foi possível entrar.';
}

// ------------------------------------------------------------
// Menu do usuário no topo
// ------------------------------------------------------------

export function montarMenuDoUsuario(container, { aoTrocarSenha } = {}) {
  const iniciais = usuario.nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const menu = document.createElement('div');
  menu.className = 'usuario-menu';
  menu.innerHTML = `
    <button class="usuario-btn" type="button" aria-haspopup="true" aria-expanded="false">
      <span class="usuario-avatar">${esc(iniciais)}</span>
      <span>
        <span class="usuario-nome">${esc(usuario.nome.split(' ')[0])}</span>
        <span class="usuario-cargo"> · ${esc(nomeDoCargo(usuario.cargo))}</span>
      </span>
    </button>
    <div class="usuario-lista" role="menu">
      <div class="usuario-lista-cabeca">
        <strong>${esc(usuario.nome)}</strong>
        <span>${esc(usuario.email)}</span>
      </div>
      <button class="usuario-item" type="button" data-senha role="menuitem">Trocar minha senha</button>
      <button class="usuario-item usuario-item-perigo" type="button" data-sair role="menuitem">Sair do sistema</button>
    </div>`;

  const btn = menu.querySelector('.usuario-btn');
  const lista = menu.querySelector('.usuario-lista');

  const fechar = () => {
    lista.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const abrindo = !lista.classList.contains('open');
    lista.classList.toggle('open', abrindo);
    btn.setAttribute('aria-expanded', String(abrindo));
  });
  document.addEventListener('click', fechar);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && fechar());

  menu.querySelector('[data-senha]').addEventListener('click', () => {
    fechar();
    aoTrocarSenha?.();
  });
  menu.querySelector('[data-sair]').addEventListener('click', sair);

  container.appendChild(menu);
}

export async function trocarSenha(novaSenha) {
  const { error } = await sb.auth.updateUser({ password: novaSenha });
  if (error) throw new Error(traduzirErroDeLogin(error));
  aviso('Senha alterada.');
}

/** Aplica o cargo à navegação: esconde as abas que não são do usuário. */
export function aplicarPermissoesNaNavegacao() {
  document.querySelectorAll('[data-tab]').forEach((el) => {
    el.hidden = !podeVer(el.dataset.tab);
  });
}
