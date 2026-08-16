# Grão Central — Painel de Gestão

Sistema de gestão para distribuidoras de insumos: estoque, pedidos, fornecedores,
transportadoras, financeiro, agenda e relatórios.

O sistema é vendido por empresa. Cada cliente recebe uma instalação própria, com o
seu banco de dados separado — os dados de um cliente nunca encostam nos de outro.

---

## Como funciona por dentro

O site é estático (HTML, CSS e JavaScript puro, sem build), então pode ser hospedado
no GitHub Pages ou em qualquer servidor comum. Os dados ficam no **Supabase**, que
cuida do banco Postgres e do login.

```
grao-central/
├── index.html            → a casca: topo, abas e as seções vazias
├── supabase/
│   └── schema.sql        → o banco inteiro: tabelas, permissões e automações
├── css/
│   ├── style.css         → tema, layout e responsividade
│   └── componentes.css   → login, modais, formulários e avisos
└── js/
    ├── config.js         → onde entram as credenciais do cliente
    ├── supabase.js       → conexão
    ├── store.js          → toda leitura e escrita no banco
    ├── auth.js           → login, sessão e permissões por cargo
    ├── ui.js             → modais, formulários, avisos, formatação
    ├── seed.js           → dados de demonstração
    ├── app.js            → inicialização e navegação
    └── views/            → uma tela por aba
```

---

## Instalar para uma empresa nova

### 1. Criar o banco

1. Crie um projeto em [supabase.com](https://supabase.com) (o plano gratuito atende
   bem uma empresa pequena).
2. Abra **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e execute.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.

> A chave `anon` é pública de propósito: ela só consegue fazer o que as políticas de
> segurança do banco permitem. **Nunca** use a chave `service_role` no site — essa
> ignora todas as regras.

### 2. Conectar o site

Abra `js/config.js` e preencha:

```js
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGci...';
```

No mesmo arquivo dá para trocar o nome e o ramo da empresa, que aparecem no topo do
painel e no cabeçalho dos relatórios.

### 3. Facilitar o primeiro acesso (opcional)

Em **Authentication → Providers → Email**, desligue **Confirm email**. Sem isso, cada
funcionário cadastrado precisa clicar em um link de confirmação antes de conseguir
entrar.

### 4. Criar o administrador

Abra o site. Como ainda não existe ninguém cadastrado, a tela de login oferece o
**primeiro acesso** — a conta criada aí vira administradora. Depois é só cadastrar a
equipe pela aba **Funcionários**.

---

## Cargos

O cargo define o que a pessoa vê e o que pode alterar. As regras valem no banco, não
só na tela: mexer no HTML pelo navegador não libera nada.

| Cargo | Enxerga | Altera |
|---|---|---|
| **Administrador** | tudo | tudo, inclusive a equipe |
| **Estoque** | início, produtos, estoque, pedidos, fornecedores, agenda, relatórios | produtos, estoque, pedidos, fornecedores |
| **Logística** | início, estoque, pedidos, transportadoras, agenda, relatórios | movimentação de estoque, pedidos, transportadoras |
| **Financeiro** | início, pedidos, financeiro, agenda, relatórios | lançamentos financeiros |

---

## O que o sistema faz

- **Produtos** — catálogo com preço, unidade de venda e estoque mínimo.
- **Estoque** — saldo em tempo real, com entrada, saída e ajuste de inventário. Toda
  movimentação fica registrada com data e autor, e o sistema recusa uma saída maior
  que o saldo.
- **Pedidos** — montagem com vários itens e total calculado, fluxo de rascunho →
  enviado → em trânsito → recebido. **Ao confirmar o recebimento, os itens entram no
  estoque sozinhos.** O botão _Gerar a partir do estoque baixo_ monta o pedido com
  tudo que está abaixo do mínimo.
- **Fornecedores e Transportadoras** — cadastro com contato, prazo e situação.
- **Financeiro** — contas a pagar e a receber, com destaque para o que está vencido e
  totais do mês.
- **Agenda** — compromissos separados entre o que vem pela frente e o que já passou.
- **Funcionários** — criação de acessos e troca de cargo (só o administrador).
- **Relatórios** — estoque, pedidos e financeiro, com filtro por período e exportação
  em CSV e PDF.
- **Visão geral** — os números vêm todos do banco, nada é fixo.

O nome de quem está logado preenche sozinho a coluna **Responsável** em movimentações,
pedidos e lançamentos. Isso é carimbado pelo banco, não pelo navegador.

---

## Dados de demonstração

Entrando como administrador, o menu do usuário (canto superior direito) tem:

- **Preencher com dados de demonstração** — cria produtos, fornecedores, estoque,
  um pedido em aberto, lançamentos e compromissos, para mostrar o sistema funcionando.
- **Limpar todos os dados** — apaga tudo isso. A equipe cadastrada permanece.

---

## Rodar na sua máquina

O sistema usa módulos JavaScript, que o navegador bloqueia quando o arquivo é aberto
com duplo clique (`file://`). Então é preciso um servidor local. No VS Code, instale a
extensão **Live Server** e clique em **Go Live** com o `index.html` aberto.

Pela linha de comando, dentro da pasta `grao-central`:

```bash
python -m http.server 5500
```

E abra `http://localhost:5500`.

---

## Publicar

O site é estático: suba a pasta e pronto. Hoje está no GitHub Pages, em
[mesquitaigorsaas.github.io/gestao](https://mesquitaigorsaas.github.io/gestao/).

Para um cliente novo, o caminho é duplicar o repositório, trocar o `js/config.js`
pelas credenciais do Supabase dele e publicar em um endereço próprio.
