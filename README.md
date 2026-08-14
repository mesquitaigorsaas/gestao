# Grão Central — Painel de Gestão (protótipo de layout)

Protótipo de front-end para o SaaS de insumos para pizzarias. Ainda não tem backend/banco de dados — os dados são mockados em `js/data.js` para você já visualizar o layout funcionando.

## Estrutura

```
grao-central/
├── index.html        → estrutura de todas as abas/telas
├── css/
│   └── style.css      → todo o visual (tema, cores, responsividade, impressão)
└── js/
    ├── data.js         → dados de exemplo dos relatórios (troque por uma API depois)
    └── app.js           → navegação entre abas, relógio, filtro de relatórios, exportação
```

## Como abrir

1. Extraia a pasta `grao-central`.
2. Abra a pasta no VS Code (`File > Open Folder`).
3. Instale a extensão **Live Server** (opcional, mas recomendado) e clique em "Go Live" com o `index.html` aberto — ou simplesmente dê duplo clique no `index.html` para abrir direto no navegador.

## O que já funciona

- Navegação entre as 9 abas (Início, Estoque, Pedidos, Fornecedores, Transportadoras, Financeiro, Agenda, Funcionários, Relatórios).
- Aba **Relatórios**: "Visualizar no sistema" mostra a movimentação em tabela, com filtro **De / Até** por data e coluna **Responsável** (quem fez a movimentação).
- **Exportar CSV**: gera um arquivo `.csv` real com os dados filtrados.
- **Exportar PDF**: usa a função de impressão do navegador (Salvar como PDF), já escondendo o resto da tela e mostrando só a tabela do relatório.
- Responsivo até telas pequenas de celular.

## Próximos passos sugeridos

- Conectar `js/data.js` a uma API real (backend + banco de dados).
- Sistema de login para saber automaticamente qual usuário está fazendo cada movimentação (hoje isso é mockado).
- CRUD completo em cada aba (cadastrar/editar/excluir fornecedores, itens de estoque, etc).
