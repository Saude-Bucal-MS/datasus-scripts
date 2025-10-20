
# Saude Bucal MS - Datasus scripts

Repositório com utilitários mínimos em TypeScript (ESM) para baixar, descompactar e carregar conjuntos de dados públicos do SIASUS (DATASUS).

## Objetivo

Fornecer utilitários simples e reprodutíveis para baixar arquivos `.dbc` do DATASUS, descompactá-los em `.dbf` e transformar em bancos SQLite prontos para análise. O projeto oferece um CLI em `src/cli.ts` que orquestra os passos: Download -> Uncompress -> Transform.

## Requisitos

- Node.js >= 22
- yarn
- Docker (opcional)

## Instalação rápida

Instale dependências e faça build:

```bash
yarn install
yarn build
```

Lint e testes (opcional):

```bash
yarn check
yarn check:fix
yarn test
```

## Estrutura importante

- `src/cli.ts` — CLI principal (comandos: `single`, `period`)
- `src/lib` — implementações de download, descompressão e transformação
- `src/utils` — helpers e tratamento de erros
- `data/` — diretório padrão de saída usado pelo CLI

## Como usar o CLI

O CLI expõe dois fluxos principais:

- `single <PAUFYYMM>` — executa download, descompressão e transformação para um único arquivo (ex.: `PAMS2501`).
- `period` — executa os passos para um intervalo (mês/ano) usando um prefixo e um intervalo YYYYMM.

Em desenvolvimento você pode usar `yarn dev` (ou `node` apontando para o TS executado via ts-node/efeitos de dev); após o build, use o binário gerado (geralmente `dist/` ou `yarn cli ...` dependendo dos scripts). Abaixo usamos `yarn cli` como exemplo de execução empacotada e `yarn dev` como exemplo de desenvolvimento.

Principais opções globais (disponíveis para `single` e `period`):

- `--workdir <dir>`: Diretório de saída. Padrão `./data`. Também pode ser definido pela variável de ambiente `PET_WORKDIR`.
- `--override`: Força sobrescrever dados existentes (por padrão false).
- `--keep-files`: Mantém os arquivos intermediários `.dbc` e `.dbf` no diretório de saída (por padrão false).

Exemplos — Single

Em desenvolvimento (quando há um script `dev` que executa `ts-node`):

```bash
# roda ETL para um arquivo PAMS2501 e salva em ./data
yarn dev single PAMS2501 --workdir ./data
```

Após build (ex.: `yarn build` produz `dist/`/bin):

```bash
# usando o binário empacotado
yarn cli single PAMS2501 --workdir ./data --keep-files
```

Exemplos — Period

O comando `period` aceita opções para prefixo (PAUF), intervalo `--since YYYYMM`, `--until YYYYMM` e `--concurrency <number>`.

```bash
# baixa todos os meses entre 2020-01 e 2020-06 com prefixo PAMS (PAMS2001..PAMS2006)
yarn cli period --prefix PAMS --since 202001 --until 202006 --concurrency 2 --workdir ./data
```

Notas sobre o formato PAUFYYMM

- Os identificadores aceitos pelo CLI seguem o formato `PAUFYYMM`, por exemplo `PAMS2501`.
- O prefixo deve ter a forma `PA[A-Z]{2}` (ex.: `PAMS`).
- As checagens internas também rejeitam datas anteriores a 2008 e meses inválidos.

Comportamento e mensagens importantes

- Se o arquivo `.sqlite` de destino já existir e `--override` não for passado, o processo pula a execução para aquele PAUFYYMM.
- Se o `.dbc` ou `.dbf` já existirem no diretório temporário e `--override` não for passado, os passos de download/descompressão serão pulados (logado como aviso).
- Código de erro 550 é tratado como "arquivo não existe no servidor" e é logado como aviso (não faz o processo falhar).

Exemplo avançado com variáveis de ambiente

```bash
# define diretório de trabalho via variável de ambiente
PET_WORKDIR=/mnt/data/datasus yarn cli single PAMS2501 --override
```

## Dicas de solução de problemas

- Erro 550 ao baixar: indica que o arquivo não está disponível no servidor para aquele mês. Ajuste o intervalo ou pule esse PAUFYYMM.
- Arquivo `.sqlite` já existe: re-execute com `--override` se quiser recriar.
- Permissões de diretório: se o CLI não conseguir mover arquivos para o `--workdir`, verifique permissões ou use um diretório com permissão de escrita.

## Uso via Docker

Uma imagem de container deste projeto está publicada no GitHub Packages (GitHub Container Registry): `ghcr.io/saude-bucal-ms/datasus-scripts`

Exemplos básicos:

```bash
# monta ./data no host para /data no container
docker run --rm -v $(pwd)/data:/data ghcr.io/saude-bucal-ms/datasus-scripts --workdir /data single PAMS2501 
```

Para mais opções (*help*):

```bash
docker run --rm -v $(pwd)/data:/data ghcr.io/saude-bucal-ms/datasus-scripts --workdir /data --help
```

## Boas práticas / Gates de qualidade

- Build: `yarn build` (deve gerar `dist/`)
- Lint/static: `yarn check`
- Testes: `yarn test`

## Como contribuir

1. Crie uma branch de feature/bugfix
2. Siga Conventional Commits (`git cz` pode ajudar)
3. Rode `yarn check` e `yarn test` antes de abrir PR
