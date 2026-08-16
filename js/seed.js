// ============================================================
// Dados de demonstração
// ============================================================
// O sistema entregue ao cliente começa vazio. Estes dados existem
// para apresentar o painel funcionando a um possível comprador, e
// podem ser apagados por completo depois.
// ============================================================

import { sb } from './supabase.js';
import { inserir } from './store.js';

const PRODUTOS = [
  ['Farinha de trigo tipo 00', 'Farinhas',   'Saco 25kg',      89.9,  60, 18],
  ['Mussarela fatiada',        'Laticínios', 'Caixa 5kg',      142.0, 40,  9],
  ['Molho de tomate concentrado','Molhos',   'Balde 4kg',      38.5,  35, 22],
  ['Fermento biológico seco',  'Fermentos',  'Pacote 500g',    24.9,  50, 30],
  ['Azeite de oliva extra virgem','Óleos',   'Lata 5L',        96.0,  25, 64],
  ['Orégano desidratado',      'Temperos',   'Pacote 1kg',     32.0,  20, 37],
  ['Caixas de pizza 35cm',     'Embalagens', 'Fardo 50un',     68.0,  40, 140],
  ['Guardanapos personalizados','Embalagens','Pacote 500un',   45.0,  15, 60],
];

const FORNECEDORES = [
  ['Moinho Bragança',      'Farinhas',              '(35) 3421-8890', 3],
  ['Laticínios Vale',      'Queijos e laticínios',  '(35) 3422-1156', 2],
  ['Distribuidora Sabor',  'Molhos e temperos',     '(35) 3420-9012', 4],
  ['Embalatudo',           'Caixas e embalagens',   '(35) 3419-3345', 5],
];

const TRANSPORTADORAS = [
  ['Rota Norte Log.',  'Zona Norte / Centro',   '1 dia',    'ativa'],
  ['TransSul Express', 'Zona Sul',              '1–2 dias', 'ativa'],
  ['Veloz Cargas',     'Região Metropolitana',  '2 dias',   'pausada'],
];

const diasAtras = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const daquiA = (dias, hora = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
};

/** Preenche o banco com o cenário de exemplo. */
export async function popularDemo() {
  const produtos = await inserir(
    'produtos',
    PRODUTOS.map(([nome, categoria, unidade, preco_venda, estoque_minimo]) => ({
      nome, categoria, unidade, preco_venda, estoque_minimo,
    }))
  );

  const fornecedores = await inserir(
    'fornecedores',
    FORNECEDORES.map(([nome, fornece, contato, prazo_medio]) => ({
      nome, fornece, contato, prazo_medio,
    }))
  );

  await inserir(
    'transportadoras',
    TRANSPORTADORAS.map(([nome, regiao, prazo_medio, status]) => ({
      nome, regiao, prazo_medio, status,
    }))
  );

  // O saldo de cada produto nasce de uma entrada, não de um update:
  // assim o histórico bate com a quantidade que aparece na tela.
  const porNome = Object.fromEntries(produtos.map((p) => [p.nome, p.id]));
  await inserir(
    'movimentacoes',
    PRODUTOS.map(([nome, , , , , saldo]) => ({
      produto_id: porNome[nome],
      tipo: 'entrada',
      quantidade: saldo,
      observacao: 'Saldo inicial de demonstração',
    }))
  );

  // Duas saídas recentes, para a tela inicial não ficar sem atividade.
  await inserir('movimentacoes', [
    {
      produto_id: porNome['Mussarela fatiada'],
      tipo: 'saida',
      quantidade: 3,
      observacao: 'Venda — Pizzaria do Bairro',
    },
    {
      produto_id: porNome['Farinha de trigo tipo 00'],
      tipo: 'saida',
      quantidade: 5,
      observacao: 'Venda — Forno de Minas',
    },
  ]);

  // Um pedido em aberto com dois itens.
  const pedido = await inserir('pedidos', {
    fornecedor_id: fornecedores[0].id,
    status: 'enviado',
    data_pedido: diasAtras(2),
    observacao: 'Reposição semanal',
  });
  await inserir('pedido_itens', [
    { pedido_id: pedido.id, produto_id: porNome['Farinha de trigo tipo 00'], quantidade: 60, preco_unitario: 89.9 },
    { pedido_id: pedido.id, produto_id: porNome['Fermento biológico seco'], quantidade: 25, preco_unitario: 24.9 },
  ]);

  await inserir('lancamentos', [
    { descricao: `Pedido #${pedido.numero} — Moinho Bragança`, tipo: 'pagar', vencimento: daquiA(5).slice(0, 10), valor: 5016.5, status: 'pendente' },
    { descricao: 'Cliente — Pizzaria do Bairro', tipo: 'receber', vencimento: daquiA(2).slice(0, 10), valor: 2180.0, status: 'pendente' },
    { descricao: 'Cliente — Forno de Minas', tipo: 'receber', vencimento: diasAtras(3), valor: 2960.0, status: 'quitado' },
    { descricao: 'Aluguel do galpão', tipo: 'pagar', vencimento: diasAtras(8), valor: 3900.0, status: 'quitado' },
  ]);

  await inserir('eventos', [
    { titulo: 'Entrega — Rota Norte (5 clientes)', data_hora: daquiA(0, 14), tipo: 'entrega' },
    { titulo: 'Reunião com Moinho Bragança', data_hora: daquiA(1, 10), tipo: 'reuniao' },
    { titulo: 'Vencimento — aluguel do galpão', data_hora: daquiA(6, 9), tipo: 'vencimento' },
    { titulo: 'Inventário mensal de estoque', data_hora: daquiA(9, 8), tipo: 'inventario' },
  ]);
}

/**
 * Apaga o conteúdo operacional. A equipe cadastrada não é tocada:
 * quem tem acesso continua tendo.
 */
export async function limparTudo() {
  // A ordem respeita as chaves estrangeiras. Movimentações saem antes
  // dos produtos, e o estoque zera junto por causa do trigger de saldo.
  const ordem = [
    'pedido_itens',
    'movimentacoes',
    'lancamentos',
    'pedidos',
    'eventos',
    'produtos',
    'fornecedores',
    'transportadoras',
  ];

  for (const tabela of ordem) {
    const { error } = await sb.from(tabela).delete().gte('criado_em', '1900-01-01');
    // pedido_itens não tem criado_em; para ela, apaga por id.
    if (error?.code === '42703') {
      const { error: e2 } = await sb.from(tabela).delete().not('id', 'is', null);
      if (e2) throw new Error(`Não foi possível limpar ${tabela}: ${e2.message}`);
    } else if (error) {
      throw new Error(`Não foi possível limpar ${tabela}: ${error.message}`);
    }
  }
}

/** Há algum dado operacional no banco? */
export async function bancoVazio() {
  const { count, error } = await sb.from('produtos').select('id', { count: 'exact', head: true });
  return !error && count === 0;
}
