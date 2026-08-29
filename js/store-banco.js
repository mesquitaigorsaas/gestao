// ============================================================
// Acesso aos dados
// ============================================================
// Toda leitura e escrita do painel passa por aqui. As telas nunca
// falam direto com o Supabase — assim, se um dia o banco mudar,
// só este arquivo muda junto.
// ============================================================

import { sb } from './supabase.js';

// ------------------------------------------------------------
// Erros
// ------------------------------------------------------------
// O Postgres devolve mensagens técnicas ("new row violates row-level
// security policy"). Aqui elas viram frases que o usuário entende.

const MENSAGENS = {
  '42501': 'Seu cargo não permite fazer essa alteração.',
  '23505': 'Já existe um registro com esse valor.',
  '23503': 'Esse registro está em uso em outro lugar do sistema e não pode ser excluído.',
  '23514': 'Algum valor informado está fora do permitido.',
  '23502': 'Preencha todos os campos obrigatórios.',
};

class ErroDeDados extends Error {
  constructor(erro, acao) {
    const amigavel =
      MENSAGENS[erro?.code] ||
      (erro?.message?.includes('Failed to fetch')
        ? 'Sem conexão com o servidor. Verifique sua internet.'
        : `Não foi possível ${acao}.`);
    super(amigavel);
    this.name = 'ErroDeDados';
    this.original = erro;
  }
}

function conferir({ data, error }, acao) {
  if (error) {
    console.error(`[store] falha ao ${acao}:`, error);
    throw new ErroDeDados(error, acao);
  }
  return data;
}

// ------------------------------------------------------------
// CRUD genérico
// ------------------------------------------------------------

export async function listar(tabela, { colunas = '*', ordenar, crescente = true, filtros } = {}) {
  let q = sb.from(tabela).select(colunas);
  if (filtros) for (const [campo, valor] of Object.entries(filtros)) q = q.eq(campo, valor);
  if (ordenar) q = q.order(ordenar, { ascending: crescente });
  return conferir(await q, `carregar ${tabela}`) ?? [];
}

export async function inserir(tabela, dados) {
  const linhas = conferir(await sb.from(tabela).insert(dados).select(), `salvar em ${tabela}`);
  return Array.isArray(dados) ? linhas : linhas?.[0];
}

export async function atualizar(tabela, id, dados) {
  const linhas = conferir(
    await sb.from(tabela).update(dados).eq('id', id).select(),
    `atualizar ${tabela}`
  );
  return linhas?.[0];
}

export async function excluir(tabela, id) {
  conferir(await sb.from(tabela).delete().eq('id', id), `excluir de ${tabela}`);
}

// ------------------------------------------------------------
// Imagens
// ------------------------------------------------------------

export const arquivos = {
  /**
   * Envia a imagem e devolve o endereço público dela.
   * O nome do arquivo é sorteado para que duas fotos com o mesmo nome
   * ("foto.jpg", vindo de dois celulares) não briguem entre si.
   */
  async enviarImagem(deposito, arquivo) {
    const extensao = (arquivo.name.split('.').pop() || 'jpg').toLowerCase();
    const nome = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extensao}`;

    const { error } = await sb.storage.from(deposito).upload(nome, arquivo, {
      cacheControl: '31536000',
      upsert: false,
    });

    if (error) {
      console.error('[store] falha ao enviar imagem:', error);
      if (error.message?.includes('row-level security') || error.statusCode === '403')
        throw new Error('Seu cargo não permite enviar imagens.');
      if (error.message?.includes('exceeded') || error.statusCode === '413')
        throw new Error('A imagem é grande demais. Use uma foto de até 5 MB.');
      if (error.message?.includes('Bucket not found'))
        throw new Error('O depósito de imagens não existe. Rode a correção 002 no banco.');
      throw new Error('Não foi possível enviar a imagem.');
    }

    const { data } = sb.storage.from(deposito).getPublicUrl(nome);
    return data.publicUrl;
  },

  /** Apaga a imagem antiga para não deixar lixo acumulado no depósito. */
  async apagarImagem(deposito, url) {
    if (!url) return;
    const marca = `/${deposito}/`;
    const posicao = url.indexOf(marca);
    if (posicao === -1) return;

    const caminho = url.slice(posicao + marca.length).split('?')[0];
    // Falha aqui não interrompe nada: a foto nova já está salva, e uma
    // imagem órfã no depósito é bem menos grave que travar o cadastro.
    const { error } = await sb.storage.from(deposito).remove([decodeURIComponent(caminho)]);
    if (error) console.warn('[store] não foi possível apagar a imagem antiga:', error);
  },
};

// ------------------------------------------------------------
// Consultas do dia a dia
// ------------------------------------------------------------

export const produtos = {
  listar: () => listar('produtos', { ordenar: 'nome' }),
  ativos: () => listar('produtos', { ordenar: 'nome', filtros: { ativo: true } }),
};

export const fornecedores = {
  listar: () => listar('fornecedores', { ordenar: 'nome' }),
};

export const transportadoras = {
  listar: () => listar('transportadoras', { ordenar: 'nome' }),
};

export const funcionarios = {
  listar: () => listar('perfis', { ordenar: 'nome' }),
};

export const estoque = {
  // vw_estoque já traz a situação (ok/baixo/crítico) e o percentual
  // da barra calculados no banco, para não repetir essa regra no front.
  listar: () => listar('vw_estoque', { ordenar: 'nome' }),

  async movimentar({ produto_id, tipo, quantidade, observacao }) {
    return inserir('movimentacoes', { produto_id, tipo, quantidade, observacao });
  },

  async historico(limite = 50) {
    const dados = conferir(
      await sb.from('vw_movimentacoes').select('*').limit(limite),
      'carregar o histórico de movimentações'
    );
    return dados ?? [];
  },

  async historicoPorPeriodo(de, ate) {
    let q = sb.from('vw_movimentacoes').select('*');
    if (de) q = q.gte('criado_em', `${de}T00:00:00`);
    if (ate) q = q.lte('criado_em', `${ate}T23:59:59`);
    return conferir(await q, 'filtrar as movimentações') ?? [];
  },
};

export const pedidos = {
  async listar() {
    const dados = conferir(
      await sb
        .from('pedidos')
        .select(
          `id, numero, status, data_pedido, data_recebimento, observacao,
           fornecedor:fornecedores ( id, nome ),
           responsavel:perfis ( id, nome ),
           itens:pedido_itens ( id, quantidade, preco_unitario,
                                produto:produtos ( id, nome, unidade ) )`
        )
        .order('numero', { ascending: false }),
      'carregar os pedidos'
    );
    return dados ?? [];
  },

  async criar({ fornecedor_id, observacao, status = 'rascunho', itens = [] }) {
    const pedido = await inserir('pedidos', { fornecedor_id, observacao, status });
    if (itens.length) {
      await inserir(
        'pedido_itens',
        itens.map((i) => ({ ...i, pedido_id: pedido.id }))
      );
    }
    return pedido;
  },

  async trocarItens(pedido_id, itens) {
    conferir(
      await sb.from('pedido_itens').delete().eq('pedido_id', pedido_id),
      'atualizar os itens do pedido'
    );
    if (itens.length) {
      await inserir(
        'pedido_itens',
        itens.map((i) => ({ ...i, pedido_id }))
      );
    }
  },

  // Ao virar "recebido", o banco lança as entradas de estoque sozinho.
  mudarStatus: (id, status) => atualizar('pedidos', id, { status }),
};

export const lancamentos = {
  async listar() {
    const dados = conferir(
      await sb
        .from('lancamentos')
        .select('*, responsavel:perfis ( id, nome )')
        .order('vencimento', { ascending: true }),
      'carregar o financeiro'
    );
    return dados ?? [];
  },
};

export const eventos = {
  async listar() {
    const dados = conferir(
      await sb
        .from('eventos')
        .select('*, responsavel:perfis ( id, nome )')
        .order('data_hora', { ascending: true }),
      'carregar a agenda'
    );
    return dados ?? [];
  },
};

// ------------------------------------------------------------
// Números da tela inicial
// ------------------------------------------------------------

export async function resumoInicial() {
  const [itensEstoque, listaPedidos, financeiro, movimentos] = await Promise.all([
    estoque.listar(),
    pedidos.listar(),
    lancamentos.listar(),
    estoque.historico(6),
  ]);

  const criticos = itensEstoque.filter((i) => i.situacao === 'critico');
  const baixos = itensEstoque.filter((i) => i.situacao === 'baixo');
  const emAberto = listaPedidos.filter((p) => ['rascunho', 'enviado', 'transito'].includes(p.status));

  const mes = new Date().toISOString().slice(0, 7);
  const doMes = (l) => l.vencimento?.startsWith(mes);
  const somar = (arr) => arr.reduce((t, l) => t + Number(l.valor || 0), 0);

  const receitas = somar(financeiro.filter((l) => l.tipo === 'receber' && doMes(l)));
  const despesas = somar(financeiro.filter((l) => l.tipo === 'pagar' && doMes(l)));

  return {
    criticos: criticos.length,
    baixos: baixos.length,
    pedidosAbertos: emAberto.length,
    emTransito: listaPedidos.filter((p) => p.status === 'transito').length,
    receitas,
    despesas,
    saldo: receitas - despesas,
    alertas: [...criticos, ...baixos, ...itensEstoque.filter((i) => i.situacao === 'ok')].slice(0, 5),
    movimentos,
  };
}

// ------------------------------------------------------------
// Sugestão de reposição
// ------------------------------------------------------------
// Itens abaixo do mínimo, com a quantidade que falta para voltar
// ao dobro do mínimo (uma folga de segurança, não só o mínimo).

export async function sugestoesDeReposicao() {
  const itens = await estoque.listar();
  return itens
    .filter((i) => i.situacao !== 'ok')
    .map((i) => ({
      produto_id: i.id,
      nome: i.nome,
      unidade: i.unidade,
      situacao: i.situacao,
      repor: Math.max(Math.ceil(Number(i.estoque_minimo) * 2 - Number(i.quantidade)), 1),
    }));
}
