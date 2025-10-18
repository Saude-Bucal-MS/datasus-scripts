
# Saude Bucal MS - Datasus scripts

Repositório com utilitários mínimos em TypeScript (ESM) para baixar, descompactar e carregar conjuntos de dados públicos do SIASUS (Datasus).

## Objetivo

Fornecer utilitários simples e reprodutíveis para baixar, descompactar e preparar arquivos DBC/DBF do Datasus para processamento posterior. O projeto inclui um CLI básico e bibliotecas auxiliares em `deps/` para suportar fluxos nativos quando necessário.

## Requisitos

- Node.js >= 22
- yarn

## Instalação

Instale as dependências:

```bash
yarn install
```

Build (compila TypeScript e aplica aliases):

```bash
yarn build
```

Lint/checagens:

```bash
yarn check
yarn check:fix
```

Testes:

```bash
yarn test
```

## Estrutura do projeto

- `package.json` — scripts e dependências
- `tsconfig.json` — configuração do TypeScript
- `biome.json` — configuração do linter/formatter
- `src/` — código-fonte
  - `src/cli.ts` — interface de linha de comando (wrapper)
  - `src/lib` — funções fundamentais para os processos providos
  - `src/utils` — classes utilitarias e helpers
- `deps/` — dependências nativas/extras

## Uso do CLI (exemplos)

Os exemplos abaixo assumem uso em desenvolvimento (`yarn dev ...`) ou execução da build (`yarn cli ...`).

```bash
# Baixar um arquivo para um diretório
yarn dev download 2501

# Descompactar um arquivo para um diretório
yarn dev uncompress 2501
```

## Boas práticas / Gates de qualidade

- Build: `yarn build` (deve gerar `dist/`)
- Lint/static: `yarn check`
- Testes: `yarn test`

## Como contribuir

1. Crie uma branch de feature/bugfix
2. Siga Conventional Commits (`git cz` pode ajudar)
3. Rode `yarn check` e `yarn test` antes de abrir PR
