// ============================================================
// MODO DEMONSTRAÇÃO — dados de mentira, guardados na memória
// ============================================================
// Este arquivo existe para o sistema poder ser mostrado a um possível
// comprador sem depender de banco de dados nenhum. Não há Supabase,
// não há conta para criar, não há projeto para pausar ou expirar: a
// pessoa abre o endereço e o painel está cheio de vida.
//
// Tudo o que se vê aqui é inventado — uma distribuidora de insumos
// para pizzarias, com produtos, pedidos e contas plausíveis.
//
// As telas não sabem de nada disso. Elas continuam chamando
// produtos.listar(), pedidos.listar() e companhia exatamente como
// antes; só a origem dos dados mudou.
//
// ------------------------------------------------------------
// QUANDO CHEGAR UM CLIENTE DE VERDADE:
//
//   1. Renomeie este arquivo para  store-demo.js
//   2. Renomeie  store-banco.js    para  store.js
//   3. Em js/config.js, ponha o endereço e a chave do Supabase dele
//
// O store-banco.js é a versão que fala com o banco e continua
// intacta, ao lado deste arquivo.
// ============================================================

// ------------------------------------------------------------
// Datas relativas: os dados precisam parecer de hoje, seja qual for
// o dia em que a demonstração for aberta.
// ------------------------------------------------------------
const diasAtras = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const horasAtras = (n) => {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
};

const daquiA = (dias, hora = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
};

// ------------------------------------------------------------
// A EQUIPE
// ------------------------------------------------------------
const PERFIS = [
  { id: 'u1', nome: 'Igor Mesquita',    cargo: 'admin',      setor: 'Diretoria', status: 'ativo',  criado_em: diasAtras(300) },
  { id: 'u2', nome: 'Carla Meneghetti', cargo: 'estoque',    setor: 'Almoxarifado', status: 'ativo', criado_em: diasAtras(210) },
  { id: 'u3', nome: 'Rafael Prado',     cargo: 'logistica',  setor: 'Expedição', status: 'ativo',  criado_em: diasAtras(180) },
  { id: 'u4', nome: 'Denise Ramos',     cargo: 'financeiro', setor: 'Financeiro', status: 'ativo', criado_em: diasAtras(95) },
  { id: 'u5', nome: 'Bruno Tavares',    cargo: 'estoque',    setor: 'Almoxarifado', status: 'ferias', criado_em: diasAtras(60) },
];

// ------------------------------------------------------------
// PRODUTOS
// A quantidade de cada um foi escolhida para a tela inicial ter as
// três situações: crítico, baixo e normal. Painel em que está tudo
// verde não mostra para que serve o sistema.
// ------------------------------------------------------------
const PRODUTOS = [
  { id: 'p1', nome: 'Farinha de trigo tipo 00',    categoria: 'Farinhas',   unidade: 'Saco 25kg',     preco_venda: 89.9,  quantidade: 18,  estoque_minimo: 60 },
  { id: 'p2', nome: 'Mussarela fatiada',           categoria: 'Laticínios', unidade: 'Caixa 5kg',     preco_venda: 142.0, quantidade: 9,   estoque_minimo: 40 },
  { id: 'p3', nome: 'Molho de tomate concentrado', categoria: 'Molhos',     unidade: 'Balde 4kg',     preco_venda: 38.5,  quantidade: 22,  estoque_minimo: 35 },
  { id: 'p4', nome: 'Fermento biológico seco',     categoria: 'Fermentos',  unidade: 'Pacote 500g',   preco_venda: 24.9,  quantidade: 30,  estoque_minimo: 50 },
  { id: 'p5', nome: 'Azeite de oliva extra virgem',categoria: 'Óleos',      unidade: 'Lata 5L',       preco_venda: 96.0,  quantidade: 64,  estoque_minimo: 25 },
  { id: 'p6', nome: 'Orégano desidratado',         categoria: 'Temperos',   unidade: 'Pacote 1kg',    preco_venda: 32.0,  quantidade: 37,  estoque_minimo: 20 },
  { id: 'p7', nome: 'Caixas de pizza 35cm',        categoria: 'Embalagens', unidade: 'Fardo 50un',    preco_venda: 68.0,  quantidade: 140, estoque_minimo: 40 },
  { id: 'p8', nome: 'Guardanapos personalizados',  categoria: 'Embalagens', unidade: 'Pacote 500un',  preco_venda: 45.0,  quantidade: 60,  estoque_minimo: 15 },
  { id: 'p9', nome: 'Calabresa fatiada',           categoria: 'Frios',      unidade: 'Peça 3kg',      preco_venda: 78.5,  quantidade: 12,  estoque_minimo: 30 },
  { id: 'p10',nome: 'Champignon em conserva',      categoria: 'Conservas',  unidade: 'Vidro 2kg',     preco_venda: 41.0,  quantidade: 28,  estoque_minimo: 18 },
].map((p) => ({ ...p, imagem_url: null, ativo: true, criado_em: diasAtras(240) }));

// ------------------------------------------------------------
// FORNECEDORES E TRANSPORTADORAS
// ------------------------------------------------------------
const FORNECEDORES = [
  { id: 'f1', nome: 'Moinho Bragança',     fornece: 'Farinhas',             contato: '(35) 3421-8890', prazo_medio: 3 },
  { id: 'f2', nome: 'Laticínios Vale',     fornece: 'Queijos e laticínios', contato: '(35) 3422-1156', prazo_medio: 2 },
  { id: 'f3', nome: 'Distribuidora Sabor', fornece: 'Molhos e temperos',    contato: '(35) 3420-9012', prazo_medio: 4 },
  { id: 'f4', nome: 'Embalatudo',          fornece: 'Caixas e embalagens',  contato: '(35) 3419-3345', prazo_medio: 5 },
  { id: 'f5', nome: 'Frigorífico Sul',     fornece: 'Frios e embutidos',    contato: '(35) 3418-7724', prazo_medio: 2 },
].map((f) => ({ ...f, ativo: true, criado_em: diasAtras(220) }));

const TRANSPORTADORAS = [
  { id: 't1', nome: 'Rota Norte Log.',  regiao: 'Zona Norte / Centro',  prazo_medio: '1 dia',    status: 'ativa' },
  { id: 't2', nome: 'TransSul Express', regiao: 'Zona Sul',             prazo_medio: '1–2 dias', status: 'ativa' },
  { id: 't3', nome: 'Veloz Cargas',     regiao: 'Região Metropolitana', prazo_medio: '2 dias',   status: 'pausada' },
].map((t) => ({ ...t, criado_em: diasAtras(200) }));

// ------------------------------------------------------------
// MOVIMENTAÇÕES DE ESTOQUE
// ------------------------------------------------------------
const MOVIMENTACOES = [
  { id: 'm1',  produto: 'p1', tipo: 'saida',   quantidade: 5,  observacao: 'Venda — Forno de Minas',       usuario: 'u2', criado_em: horasAtras(3) },
  { id: 'm2',  produto: 'p2', tipo: 'saida',   quantidade: 3,  observacao: 'Venda — Pizzaria do Bairro',   usuario: 'u2', criado_em: horasAtras(6) },
  { id: 'm3',  produto: 'p9', tipo: 'saida',   quantidade: 4,  observacao: 'Venda — Cantina Bella Massa',  usuario: 'u3', criado_em: horasAtras(9) },
  { id: 'm4',  produto: 'p7', tipo: 'entrada', quantidade: 80, observacao: 'Pedido #1043 recebido',        usuario: 'u2', criado_em: horasAtras(26) },
  { id: 'm5',  produto: 'p3', tipo: 'saida',   quantidade: 8,  observacao: 'Venda — Pizzaria Nápoles',     usuario: 'u3', criado_em: horasAtras(30) },
  { id: 'm6',  produto: 'p5', tipo: 'entrada', quantidade: 40, observacao: 'Pedido #1042 recebido',        usuario: 'u2', criado_em: horasAtras(52) },
  { id: 'm7',  produto: 'p4', tipo: 'saida',   quantidade: 10, observacao: 'Venda — Forno de Minas',       usuario: 'u2', criado_em: horasAtras(74) },
  { id: 'm8',  produto: 'p6', tipo: 'ajuste',  quantidade: 2,  observacao: 'Contagem do inventário',       usuario: 'u1', criado_em: horasAtras(96) },
  { id: 'm9',  produto: 'p10',tipo: 'entrada', quantidade: 24, observacao: 'Pedido #1041 recebido',        usuario: 'u2', criado_em: horasAtras(120) },
  { id: 'm10', produto: 'p8', tipo: 'saida',   quantidade: 6,  observacao: 'Venda — Cantina Bella Massa',  usuario: 'u3', criado_em: horasAtras(144) },
  { id: 'm11', produto: 'p2', tipo: 'entrada', quantidade: 30, observacao: 'Pedido #1040 recebido',        usuario: 'u2', criado_em: horasAtras(168) },
  { id: 'm12', produto: 'p1', tipo: 'entrada', quantidade: 50, observacao: 'Saldo inicial',                usuario: 'u1', criado_em: horasAtras(400) },
];

// ------------------------------------------------------------
// PEDIDOS DE COMPRA
// ------------------------------------------------------------
const PEDIDOS = [
  { id: 'o1', numero: 1045, fornecedor: 'f1', status: 'enviado',  data_pedido: diasAtras(2),  data_recebimento: null,          observacao: 'Reposição semanal de farinha',  usuario: 'u2',
    itens: [ { id: 'i1', produto: 'p1', quantidade: 60, preco_unitario: 89.9 },
             { id: 'i2', produto: 'p4', quantidade: 25, preco_unitario: 24.9 } ] },

  { id: 'o2', numero: 1044, fornecedor: 'f2', status: 'transito', data_pedido: diasAtras(3),  data_recebimento: null,          observacao: 'Urgente — mussarela em nível crítico', usuario: 'u2',
    itens: [ { id: 'i3', produto: 'p2', quantidade: 45, preco_unitario: 142.0 } ] },

  { id: 'o3', numero: 1043, fornecedor: 'f4', status: 'recebido', data_pedido: diasAtras(6),  data_recebimento: diasAtras(1),  observacao: null,                            usuario: 'u3',
    itens: [ { id: 'i4', produto: 'p7', quantidade: 80, preco_unitario: 68.0 },
             { id: 'i5', produto: 'p8', quantidade: 30, preco_unitario: 45.0 } ] },

  { id: 'o4', numero: 1042, fornecedor: 'f3', status: 'recebido', data_pedido: diasAtras(9),  data_recebimento: diasAtras(2),  observacao: null,                            usuario: 'u2',
    itens: [ { id: 'i6', produto: 'p5', quantidade: 40, preco_unitario: 96.0 },
             { id: 'i7', produto: 'p6', quantidade: 20, preco_unitario: 32.0 } ] },

  { id: 'o5', numero: 1046, fornecedor: 'f5', status: 'rascunho', data_pedido: diasAtras(0),  data_recebimento: null,          observacao: 'Montando com base na sugestão do sistema', usuario: 'u1',
    itens: [ { id: 'i8', produto: 'p9', quantidade: 48, preco_unitario: 78.5 } ] },
].map((p) => ({ ...p, criado_em: p.data_pedido }));

// ------------------------------------------------------------
// FINANCEIRO
// ------------------------------------------------------------
const LANCAMENTOS = [
  { id: 'l1', descricao: 'Pedido #1045 — Moinho Bragança',   tipo: 'pagar',   vencimento: daquiA(5).slice(0, 10),  valor: 6016.50, status: 'pendente', usuario: 'u4' },
  { id: 'l2', descricao: 'Pedido #1044 — Laticínios Vale',   tipo: 'pagar',   vencimento: daquiA(9).slice(0, 10),  valor: 6390.00, status: 'pendente', usuario: 'u4' },
  { id: 'l3', descricao: 'Cliente — Pizzaria do Bairro',     tipo: 'receber', vencimento: daquiA(2).slice(0, 10),  valor: 2180.00, status: 'pendente', usuario: 'u4' },
  { id: 'l4', descricao: 'Cliente — Cantina Bella Massa',    tipo: 'receber', vencimento: daquiA(6).slice(0, 10),  valor: 3420.00, status: 'pendente', usuario: 'u4' },
  { id: 'l5', descricao: 'Cliente — Forno de Minas',         tipo: 'receber', vencimento: diasAtras(3),            valor: 2960.00, status: 'quitado',  usuario: 'u4' },
  { id: 'l6', descricao: 'Cliente — Pizzaria Nápoles',       tipo: 'receber', vencimento: diasAtras(6),            valor: 4115.00, status: 'quitado',  usuario: 'u4' },
  { id: 'l7', descricao: 'Aluguel do galpão',                tipo: 'pagar',   vencimento: diasAtras(8),            valor: 3900.00, status: 'quitado',  usuario: 'u4' },
  { id: 'l8', descricao: 'Energia elétrica',                 tipo: 'pagar',   vencimento: daquiA(11).slice(0, 10), valor: 1240.00, status: 'pendente', usuario: 'u4' },
  { id: 'l9', descricao: 'Combustível da frota',             tipo: 'pagar',   vencimento: diasAtras(1),            valor: 1870.00, status: 'quitado',  usuario: 'u3' },
].map((l) => ({ ...l, pedido_id: null, criado_em: diasAtras(10) }));

// ------------------------------------------------------------
// AGENDA
// ------------------------------------------------------------
const EVENTOS = [
  { id: 'e1', titulo: 'Entrega — Rota Norte (5 clientes)',  data_hora: daquiA(0, 14), tipo: 'entrega',    descricao: 'Sai às 14h do galpão',            usuario: 'u3' },
  { id: 'e2', titulo: 'Reunião com Moinho Bragança',        data_hora: daquiA(1, 10), tipo: 'reuniao',    descricao: 'Renegociar prazo de pagamento',   usuario: 'u1' },
  { id: 'e3', titulo: 'Chegada do pedido #1044',            data_hora: daquiA(2, 9),  tipo: 'entrega',    descricao: 'Conferir a mussarela na chegada',  usuario: 'u2' },
  { id: 'e4', titulo: 'Vencimento — Pizzaria do Bairro',    data_hora: daquiA(2, 8),  tipo: 'vencimento', descricao: null,                              usuario: 'u4' },
  { id: 'e5', titulo: 'Vencimento — aluguel do galpão',     data_hora: daquiA(6, 9),  tipo: 'vencimento', descricao: null,                              usuario: 'u4' },
  { id: 'e6', titulo: 'Inventário mensal de estoque',       data_hora: daquiA(9, 8),  tipo: 'inventario', descricao: 'Contagem completa, galpão fechado', usuario: 'u2' },
].map((e) => ({ ...e, criado_em: diasAtras(5) }));

// ------------------------------------------------------------
// Atalhos para montar as respostas
// ------------------------------------------------------------
const clonar = (v) => JSON.parse(JSON.stringify(v));
const acharProduto = (id) => PRODUTOS.find((p) => p.id === id);
const acharPerfil = (id) => PERFIS.find((u) => u.id === id);
const resumido = (obj) => (obj ? { id: obj.id, nome: obj.nome } : null);

const TABELAS = {
  perfis: PERFIS,
  produtos: PRODUTOS,
  fornecedores: FORNECEDORES,
  transportadoras: TRANSPORTADORAS,
  lancamentos: LANCAMENTOS,
  eventos: EVENTOS,
  pedidos: PEDIDOS,
};

// ------------------------------------------------------------
// A trava
// ------------------------------------------------------------
// Toda tentativa de gravar para aqui. A mensagem não é um erro
// técnico: é o convite para a conversa, aparecendo no momento exato
// em que a pessoa quis usar o sistema de verdade.
// ------------------------------------------------------------
export class ErroDeDemonstracao extends Error {
  constructor() {
    super(
      'Esta é uma demonstração — as alterações não são salvas. ' +
        'Para ter o sistema com os dados da sua empresa, fale comigo pelo WhatsApp (31) 99934-7032.'
    );
    this.name = 'ErroDeDemonstracao';
  }
}

const bloquear = () => {
  throw new ErroDeDemonstracao();
};

// ------------------------------------------------------------
// CRUD genérico — leitura funciona, escrita não
// ------------------------------------------------------------
export async function listar(tabela, { ordenar, crescente = true, filtros } = {}) {
  let linhas = clonar(TABELAS[tabela] ?? []);

  if (filtros) {
    linhas = linhas.filter((l) =>
      Object.entries(filtros).every(([campo, valor]) => l[campo] === valor)
    );
  }

  if (ordenar) {
    linhas.sort((a, b) => {
      const x = a[ordenar], y = b[ordenar];
      if (x === y) return 0;
      return (x > y ? 1 : -1) * (crescente ? 1 : -1);
    });
  }

  return linhas;
}

export async function inserir() { bloquear(); }
export async function atualizar() { bloquear(); }
export async function excluir() { bloquear(); }

export const arquivos = {
  async enviarImagem() { bloquear(); },
  async apagarImagem() { /* nada a apagar numa demonstração */ },
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
  /**
   * Repete a conta que o banco fazia na vw_estoque: a situação
   * (ok / baixo / crítico) e o quanto a barra deve encher.
   */
  async listar() {
    return PRODUTOS.filter((p) => p.ativo).map((p) => {
      const minimo = Number(p.estoque_minimo);
      const qtd = Number(p.quantidade);

      const situacao =
        minimo === 0 ? 'ok'
        : qtd <= minimo * 0.5 ? 'critico'
        : qtd <= minimo ? 'baixo'
        : 'ok';

      const percentual = minimo === 0 ? 100 : Math.min(Math.round((qtd / (minimo * 2)) * 100), 100);

      return {
        id: p.id,
        nome: p.nome,
        categoria: p.categoria,
        unidade: p.unidade,
        imagem_url: p.imagem_url,
        quantidade: qtd,
        estoque_minimo: minimo,
        situacao,
        percentual,
      };
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  },

  async movimentar() { bloquear(); },

  /** Espelha a vw_movimentacoes: mais recentes primeiro. */
  async historico(limite = 50) {
    return MOVIMENTACOES
      .map((m) => ({
        id: m.id,
        criado_em: m.criado_em,
        tipo: m.tipo,
        quantidade: m.quantidade,
        observacao: m.observacao,
        produto: acharProduto(m.produto)?.nome ?? '—',
        unidade: acharProduto(m.produto)?.unidade ?? '',
        responsavel: acharPerfil(m.usuario)?.nome ?? 'Sistema',
      }))
      .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1))
      .slice(0, limite);
  },

  async historicoPorPeriodo(de, ate) {
    const todos = await estoque.historico(9999);
    return todos.filter((m) => {
      const dia = m.criado_em.slice(0, 10);
      if (de && dia < de) return false;
      if (ate && dia > ate) return false;
      return true;
    });
  },
};

export const pedidos = {
  /** Monta o pedido com fornecedor, responsável e itens, como o banco fazia. */
  async listar() {
    return PEDIDOS
      .map((p) => ({
        id: p.id,
        numero: p.numero,
        status: p.status,
        data_pedido: p.data_pedido,
        data_recebimento: p.data_recebimento,
        observacao: p.observacao,
        fornecedor: resumido(FORNECEDORES.find((f) => f.id === p.fornecedor)),
        responsavel: resumido(acharPerfil(p.usuario)),
        itens: p.itens.map((i) => ({
          id: i.id,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          produto: (() => {
            const prod = acharProduto(i.produto);
            return prod ? { id: prod.id, nome: prod.nome, unidade: prod.unidade } : null;
          })(),
        })),
      }))
      .sort((a, b) => b.numero - a.numero);
  },

  async criar() { bloquear(); },
  async trocarItens() { bloquear(); },
  async mudarStatus() { bloquear(); },
};

export const lancamentos = {
  async listar() {
    return LANCAMENTOS
      .map((l) => ({ ...clonar(l), responsavel: resumido(acharPerfil(l.usuario)) }))
      .sort((a, b) => (a.vencimento > b.vencimento ? 1 : -1));
  },
};

export const eventos = {
  async listar() {
    return EVENTOS
      .map((e) => ({ ...clonar(e), responsavel: resumido(acharPerfil(e.usuario)) }))
      .sort((a, b) => (a.data_hora > b.data_hora ? 1 : -1));
  },
};

// ------------------------------------------------------------
// Números da tela inicial
// ------------------------------------------------------------
// Igual à versão do banco: tudo sai das consultas acima, então não há
// número inventado à parte que possa discordar do resto da tela.
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
