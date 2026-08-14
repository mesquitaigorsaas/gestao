// Dados de exemplo — quando houver backend, isso vira uma chamada de API
// (ex: fetch('/api/relatorios/estoque?de=...&ate=...'))

const RELATORIOS = {
  estoque: {
    titulo: "Relatório de Estoque",
    registros: [
      { data: "2026-08-01", descricao: "Entrada — Farinha tipo 00 (60 un)", valor: "+60 un", usuario: "Camila Torres" },
      { data: "2026-08-02", descricao: "Saída — Mussarela fatiada (12 un)", valor: "-12 un", usuario: "Diego Lima" },
      { data: "2026-08-04", descricao: "Entrada — Azeite extra virgem (24 un)", valor: "+24 un", usuario: "Camila Torres" },
      { data: "2026-08-06", descricao: "Saída — Farinha tipo 00 (30 un)", valor: "-30 un", usuario: "Camila Torres" },
      { data: "2026-08-08", descricao: "Entrada — Caixas de pizza 35cm (200 un)", valor: "+200 un", usuario: "Rafael Souza" },
      { data: "2026-08-10", descricao: "Saída — Molho de tomate (8 un)", valor: "-8 un", usuario: "Diego Lima" },
      { data: "2026-08-12", descricao: "Ajuste de inventário — Orégano", valor: "-2 un", usuario: "Camila Torres" },
      { data: "2026-08-13", descricao: "Saída — Mussarela fatiada (9 un)", valor: "-9 un", usuario: "Diego Lima" },
    ]
  },
  vendas: {
    titulo: "Relatório de Vendas",
    registros: [
      { data: "2026-08-01", descricao: "Pizzaria do Bairro — pedido #884", valor: "R$ 1.240,00", usuario: "Rafael Souza" },
      { data: "2026-08-03", descricao: "Forno de Minas — pedido #885", valor: "R$ 2.960,00", usuario: "Bianca Reis" },
      { data: "2026-08-05", descricao: "Pizza Real — pedido #886", valor: "R$ 980,00", usuario: "Rafael Souza" },
      { data: "2026-08-07", descricao: "Pizzaria do Bairro — pedido #887", valor: "R$ 1.510,00", usuario: "Bianca Reis" },
      { data: "2026-08-09", descricao: "Sabor & Cia — pedido #888", valor: "R$ 3.220,00", usuario: "Rafael Souza" },
      { data: "2026-08-11", descricao: "Forno de Minas — pedido #889", valor: "R$ 2.180,00", usuario: "Bianca Reis" },
      { data: "2026-08-13", descricao: "Pizza Real — pedido #890", valor: "R$ 1.760,00", usuario: "Rafael Souza" },
    ]
  },
  financeiro: {
    titulo: "Relatório Financeiro",
    registros: [
      { data: "2026-08-05", descricao: "Aluguel do galpão", valor: "- R$ 3.900,00", usuario: "Rafael Souza" },
      { data: "2026-08-06", descricao: "Recebimento — Pizzaria do Bairro", valor: "+ R$ 1.240,00", usuario: "Bianca Reis" },
      { data: "2026-08-08", descricao: "Pagamento — Embalatudo", valor: "- R$ 2.100,00", usuario: "Bianca Reis" },
      { data: "2026-08-10", descricao: "Recebimento — Forno de Minas", valor: "+ R$ 2.960,00", usuario: "Bianca Reis" },
      { data: "2026-08-12", descricao: "Pagamento — Moinho Bragança", valor: "- R$ 4.320,00", usuario: "Bianca Reis" },
      { data: "2026-08-13", descricao: "Recebimento — Pizza Real", valor: "+ R$ 980,00", usuario: "Bianca Reis" },
    ]
  }
};
