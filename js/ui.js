// ============================================================
// Peças de interface reaproveitadas por todas as telas
// ============================================================

// ------------------------------------------------------------
// Formatação
// ------------------------------------------------------------

export const moeda = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const numero = (v) => {
  const n = Number(v || 0);
  // 18 em vez de 18,00 — mas 2,5 continua 2,5
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
};

export const data = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR') : '—');

export const dataHora = (iso) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

// "Hoje, 14:00" / "Ontem" / "12/08"
export function quando(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const hoje = new Date();
  const dia = (x) => x.toISOString().slice(0, 10);
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);

  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (dia(d) === dia(hoje)) return hora;
  if (dia(d) === dia(ontem)) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Escapa texto antes de jogar no HTML. Nome de produto com "<" ou
// aspas não pode virar marcação nem quebrar o atributo.
export const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ------------------------------------------------------------
// Avisos flutuantes
// ------------------------------------------------------------

let caixaDeAvisos;

export function aviso(mensagem, tipo = 'ok') {
  if (!caixaDeAvisos) {
    caixaDeAvisos = document.createElement('div');
    caixaDeAvisos.className = 'toast-wrap';
    document.body.appendChild(caixaDeAvisos);
  }

  const icones = { ok: '✓', erro: '!', info: 'i' };
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.innerHTML = `<span class="toast-icon">${icones[tipo] || 'i'}</span><span>${esc(mensagem)}</span>`;
  caixaDeAvisos.appendChild(t);

  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    t.addEventListener('transitionend', () => t.remove(), { once: true });
  }, 3600);
}

export const erro = (e) => aviso(e?.message || 'Algo deu errado.', 'erro');

// ------------------------------------------------------------
// Estados de tabela / lista
// ------------------------------------------------------------

export const carregando = (colunas = 1) =>
  `<tr><td colspan="${colunas}" class="empty-cell"><span class="spinner"></span> Carregando…</td></tr>`;

export const vazio = (colunas = 1, texto = 'Nenhum registro cadastrado ainda.') =>
  `<tr><td colspan="${colunas}" class="empty-cell">${esc(texto)}</td></tr>`;

export const falhou = (colunas = 1, texto = 'Não foi possível carregar.') =>
  `<tr><td colspan="${colunas}" class="empty-cell empty-erro">${esc(texto)}</td></tr>`;

// ------------------------------------------------------------
// Janela modal
// ------------------------------------------------------------

let modalAberto = null;

function fecharModal() {
  if (!modalAberto) return;
  const { fundo, focoAnterior } = modalAberto;
  fundo.classList.remove('show');
  fundo.addEventListener('transitionend', () => fundo.remove(), { once: true });
  document.body.style.overflow = '';
  modalAberto = null;
  focoAnterior?.focus?.();
}

function montarModal({ titulo, subtitulo, corpo, rodape, largura }) {
  fecharModal();

  const fundo = document.createElement('div');
  fundo.className = 'modal-backdrop';
  fundo.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(titulo)}"
         ${largura ? `style="max-width:${largura}"` : ''}>
      <div class="modal-head">
        <div>
          <h3 class="modal-title">${esc(titulo)}</h3>
          ${subtitulo ? `<p class="modal-sub">${esc(subtitulo)}</p>` : ''}
        </div>
        <button class="modal-close" type="button" aria-label="Fechar">✕</button>
      </div>
      <div class="modal-body"></div>
      <div class="modal-foot"></div>
    </div>`;

  fundo.querySelector('.modal-body').append(corpo);
  fundo.querySelector('.modal-foot').append(rodape);

  fundo.querySelector('.modal-close').addEventListener('click', fecharModal);
  fundo.addEventListener('mousedown', (e) => {
    if (e.target === fundo) fecharModal();
  });

  document.body.appendChild(fundo);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => fundo.classList.add('show'));

  modalAberto = { fundo, focoAnterior: document.activeElement };
  return fundo;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalAberto) fecharModal();
});

// ------------------------------------------------------------
// Formulário dentro do modal
// ------------------------------------------------------------
// Os campos são descritos por objetos, então cada tela só diz o que
// quer perguntar — a montagem, a validação e a leitura ficam aqui.
//
//   { nome, rotulo, tipo, obrigatorio, opcoes, dica, min, passo, largo }
//   tipo: texto | numero | moeda | data | datahora | select | area | senha | switch

/**
 * Encolhe a foto antes de enviar. Celular tira imagem de 4000px e 5 MB;
 * na tela ela aparece com menos de 100px. Reduzir aqui deixa o cadastro
 * rápido em internet ruim e o depósito de imagens enxuto.
 */
export function encolherImagem(arquivo, ladoMaximo = 900, qualidade = 0.82) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Esse arquivo não é uma imagem válida.'));
      img.onload = () => {
        const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height));

        // Já é pequena: manda o arquivo original e não perde qualidade à toa.
        if (escala === 1 && arquivo.size < 400_000) return resolve(arquivo);

        const tela = document.createElement('canvas');
        tela.width = Math.round(img.width * escala);
        tela.height = Math.round(img.height * escala);
        tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height);

        tela.toBlob(
          (blob) => {
            if (!blob) return resolve(arquivo);
            resolve(new File([blob], arquivo.name.replace(/\.\w+$/, '') + '.jpg', {
              type: 'image/jpeg',
            }));
          },
          'image/jpeg',
          qualidade
        );
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

function montarCampoImagem(campo, valor, estado) {
  const { nome, rotulo, dica } = campo;

  // O valor começa como está no banco: a url atual, ou nada.
  estado[nome] = { acao: 'manter', url: valor || null, arquivo: null };

  const wrap = document.createElement('div');
  wrap.className = 'campo campo-largo campo-imagem';
  wrap.innerHTML = `
    <span class="campo-rotulo">${esc(rotulo || nome)}</span>
    <div class="imagem-caixa">
      <div class="imagem-previa" data-previa>
        ${valor ? `<img src="${esc(valor)}" alt="">` : '<span class="imagem-vazia">Sem foto</span>'}
      </div>
      <div class="imagem-acoes">
        <button type="button" class="btn btn-pequeno" data-escolher>
          ${valor ? 'Trocar foto' : 'Escolher foto'}
        </button>
        <button type="button" class="btn btn-pequeno btn-sutil" data-remover ${valor ? '' : 'hidden'}>
          Remover
        </button>
        ${dica ? `<span class="campo-dica">${esc(dica)}</span>` : ''}
      </div>
    </div>
    <input type="file" accept="image/*" hidden data-arquivo>`;

  const entrada = wrap.querySelector('[data-arquivo]');
  const previa = wrap.querySelector('[data-previa]');
  const btnEscolher = wrap.querySelector('[data-escolher]');
  const btnRemover = wrap.querySelector('[data-remover]');

  btnEscolher.addEventListener('click', () => entrada.click());

  entrada.addEventListener('change', async () => {
    const arquivo = entrada.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
      aviso('Escolha um arquivo de imagem.', 'erro');
      entrada.value = '';
      return;
    }

    previa.innerHTML = '<span class="spinner"></span>';
    try {
      const menor = await encolherImagem(arquivo);
      estado[nome] = { acao: 'trocar', url: valor || null, arquivo: menor };

      const previsualizacao = URL.createObjectURL(menor);
      previa.innerHTML = `<img src="${previsualizacao}" alt="">`;
      previa.querySelector('img').addEventListener('load', () =>
        URL.revokeObjectURL(previsualizacao)
      );

      btnEscolher.textContent = 'Trocar foto';
      btnRemover.hidden = false;
    } catch (e) {
      erro(e);
      previa.innerHTML = '<span class="imagem-vazia">Sem foto</span>';
    } finally {
      entrada.value = '';
    }
  });

  btnRemover.addEventListener('click', () => {
    estado[nome] = { acao: 'remover', url: valor || null, arquivo: null };
    previa.innerHTML = '<span class="imagem-vazia">Sem foto</span>';
    btnEscolher.textContent = 'Escolher foto';
    btnRemover.hidden = true;
  });

  return wrap;
}

function montarCampo(campo, valor, estado) {
  const { nome, rotulo, tipo = 'texto', obrigatorio, opcoes = [], dica, min, passo, largo } = campo;

  if (tipo === 'imagem') return montarCampoImagem(campo, valor, estado);
  const id = `campo-${nome}`;
  const req = obrigatorio ? 'required' : '';
  const wrap = document.createElement('label');
  wrap.className = `campo ${largo ? 'campo-largo' : ''}`;

  let controle;
  if (tipo === 'select') {
    controle = `
      <select id="${id}" name="${nome}" ${req}>
        <option value="">${obrigatorio ? 'Selecione…' : '—'}</option>
        ${opcoes
          .map(
            (o) =>
              `<option value="${esc(o.valor)}" ${String(o.valor) === String(valor ?? '') ? 'selected' : ''}>${esc(o.texto)}</option>`
          )
          .join('')}
      </select>`;
  } else if (tipo === 'area') {
    controle = `<textarea id="${id}" name="${nome}" rows="3" ${req}>${esc(valor ?? '')}</textarea>`;
  } else if (tipo === 'switch') {
    controle = `
      <span class="switch">
        <input type="checkbox" id="${id}" name="${nome}" ${valor ? 'checked' : ''}>
        <span class="switch-trilho"><span class="switch-bola"></span></span>
      </span>`;
  } else {
    const tipoHtml =
      { numero: 'number', moeda: 'number', data: 'date', datahora: 'datetime-local', senha: 'password' }[
        tipo
      ] || 'text';
    const extras = [
      tipoHtml === 'number' ? `step="${passo ?? (tipo === 'moeda' ? '0.01' : '1')}"` : '',
      min !== undefined ? `min="${min}"` : tipoHtml === 'number' ? 'min="0"' : '',
      tipo === 'moeda' ? 'inputmode="decimal"' : '',
    ].join(' ');
    controle = `<input type="${tipoHtml}" id="${id}" name="${nome}" value="${esc(valor ?? '')}" ${extras} ${req}>`;
  }

  wrap.innerHTML = `
    <span class="campo-rotulo">${esc(rotulo || nome)}${obrigatorio ? ' <b>*</b>' : ''}</span>
    ${controle}
    ${dica ? `<span class="campo-dica">${esc(dica)}</span>` : ''}`;
  return wrap;
}

/**
 * Abre um formulário. Resolve com os valores preenchidos, ou com
 * null se a pessoa cancelar.
 *
 * onSalvar recebe os valores e pode gravar no banco; se lançar erro,
 * o modal continua aberto para a pessoa corrigir sem perder o que digitou.
 */
export function formulario({ titulo, subtitulo, campos, valores = {}, textoSalvar = 'Salvar', onSalvar }) {
  return new Promise((resolve) => {
    const form = document.createElement('form');
    form.className = 'form-grid';
    form.noValidate = false;

    // Campos de imagem não cabem em form.elements: guardam arquivo e
    // intenção (manter, trocar, remover) aqui do lado.
    const imagens = {};
    campos.forEach((c) => form.append(montarCampo(c, valores[c.nome], imagens)));

    const rodape = document.createElement('div');
    rodape.className = 'modal-acoes';
    rodape.innerHTML = `
      <button type="button" class="btn" data-cancelar>Cancelar</button>
      <button type="submit" class="btn btn-primary" data-salvar>${esc(textoSalvar)}</button>`;

    // O botão vive no rodapé, fora do <form>; o form attribute os liga.
    const btnSalvar = rodape.querySelector('[data-salvar]');
    form.id = `form-${Math.random().toString(36).slice(2, 8)}`;
    btnSalvar.setAttribute('form', form.id);

    rodape.querySelector('[data-cancelar]').addEventListener('click', () => {
      fecharModal();
      resolve(null);
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;

      const dados = {};
      for (const c of campos) {
        if (c.tipo === 'imagem') {
          dados[c.nome] = imagens[c.nome];
          continue;
        }
        const el = form.elements[c.nome];
        if (!el) continue;
        if (c.tipo === 'switch') dados[c.nome] = el.checked;
        else if (c.tipo === 'numero' || c.tipo === 'moeda')
          dados[c.nome] = el.value === '' ? null : Number(el.value);
        else dados[c.nome] = el.value === '' ? null : el.value;
      }

      btnSalvar.disabled = true;
      btnSalvar.innerHTML = '<span class="spinner"></span> Salvando…';
      try {
        if (onSalvar) await onSalvar(dados);
        fecharModal();
        resolve(dados);
      } catch (e) {
        erro(e);
        btnSalvar.disabled = false;
        btnSalvar.textContent = textoSalvar;
      }
    });

    montarModal({ titulo, subtitulo, corpo: form, rodape });
    form.querySelector('input,select,textarea')?.focus();
  });
}

/** Confirmação antes de algo irreversível. Resolve true/false. */
export function confirmar({
  titulo = 'Confirmar',
  mensagem,
  textoConfirmar = 'Confirmar',
  perigoso = false,
}) {
  return new Promise((resolve) => {
    const corpo = document.createElement('p');
    corpo.className = 'modal-mensagem';
    corpo.textContent = mensagem;

    const rodape = document.createElement('div');
    rodape.className = 'modal-acoes';
    rodape.innerHTML = `
      <button type="button" class="btn" data-nao>Cancelar</button>
      <button type="button" class="btn ${perigoso ? 'btn-perigo' : 'btn-primary'}" data-sim>${esc(textoConfirmar)}</button>`;

    rodape.querySelector('[data-nao]').addEventListener('click', () => {
      fecharModal();
      resolve(false);
    });
    rodape.querySelector('[data-sim]').addEventListener('click', () => {
      fecharModal();
      resolve(true);
    });

    montarModal({ titulo, corpo, rodape, largura: '440px' });
    rodape.querySelector('[data-sim]').focus();
  });
}

/** Modal de conteúdo livre (usado por detalhes de pedido, por exemplo). */
export function painel({ titulo, subtitulo, html, largura, acoes = [] }) {
  const corpo = document.createElement('div');
  corpo.innerHTML = html;

  const rodape = document.createElement('div');
  rodape.className = 'modal-acoes';
  rodape.innerHTML = `<button type="button" class="btn" data-fechar>Fechar</button>`;
  rodape.querySelector('[data-fechar]').addEventListener('click', fecharModal);

  acoes.forEach((a) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${a.classe || ''}`;
    b.textContent = a.texto;
    b.addEventListener('click', () => a.aoClicar(fecharModal));
    rodape.append(b);
  });

  montarModal({ titulo, subtitulo, corpo, rodape, largura });
  return { fechar: fecharModal, corpo };
}

export { fecharModal };

// ------------------------------------------------------------
// Etiquetas de situação
// ------------------------------------------------------------

const BADGES = {
  ok: ['badge-ok', 'Ok'],
  baixo: ['badge-baixo', 'Baixo'],
  critico: ['badge-critico', 'Crítico'],
  ativo: ['badge-ok', 'Ativo'],
  inativo: ['badge-neutro', 'Inativo'],
  ferias: ['badge-neutro', 'Férias'],
  ativa: ['badge-ok', 'Ativa'],
  pausada: ['badge-neutro', 'Em pausa'],
  rascunho: ['badge-neutro', 'Rascunho'],
  enviado: ['badge-baixo', 'Enviado'],
  transito: ['badge-baixo', 'Em trânsito'],
  recebido: ['badge-ok', 'Recebido'],
  cancelado: ['badge-critico', 'Cancelado'],
  pendente: ['badge-baixo', 'Pendente'],
  quitado: ['badge-ok', 'Quitado'],
  entrada: ['badge-ok', 'Entrada'],
  saida: ['badge-critico', 'Saída'],
  ajuste: ['badge-neutro', 'Ajuste'],
};

export function badge(chave, texto) {
  const [classe, rotulo] = BADGES[chave] || ['badge-neutro', chave];
  return `<span class="badge ${classe}">${esc(texto || rotulo)}</span>`;
}

/** Botões de editar/excluir que aparecem no fim de cada linha. */
export function acoesLinha(id, { editar = true, excluir = true, extras = [] } = {}) {
  return `<div class="row-actions">
    ${extras
      .map(
        (e) =>
          `<button class="icon-btn" data-acao="${esc(e.acao)}" data-id="${esc(id)}" title="${esc(e.titulo)}">${e.icone}</button>`
      )
      .join('')}
    ${editar ? `<button class="icon-btn" data-acao="editar" data-id="${esc(id)}" title="Editar">✎</button>` : ''}
    ${excluir ? `<button class="icon-btn icon-btn-perigo" data-acao="excluir" data-id="${esc(id)}" title="Excluir">🗑</button>` : ''}
  </div>`;
}

/** Liga um clique em qualquer [data-acao] dentro de um container. */
export function aoAgir(container, mapa) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-acao]');
    if (!btn || !container.contains(btn)) return;
    mapa[btn.dataset.acao]?.(btn.dataset.id, btn);
  });
}

/** Campo de busca que filtra as linhas visíveis de uma tabela. */
export function ligarBusca(input, corpoTabela) {
  input.addEventListener('input', () => {
    const termo = input.value.trim().toLowerCase();
    corpoTabela.querySelectorAll('tr').forEach((tr) => {
      if (tr.querySelector('.empty-cell')) return;
      tr.hidden = termo && !tr.textContent.toLowerCase().includes(termo);
    });
  });
}
