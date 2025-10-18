// biome-ignore assist/source/organizeImports: fix it latter
import { DBFFile } from 'dbffile';
import path from 'node:path';
import { knex } from '../knex.js';
import { fileExists } from '../utils/fs.js';

export type StoreOptions = {
  override?: boolean;
};

/**
 * Stores data from a .dbf file into a postgres database.
 * @param filepath The path to the .dbc file.
 * @param opts Storage options.
 */
export async function store(filepath: string, opts?: StoreOptions): Promise<void> {
  if (!fileExists(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }

  await knex.schema.createSchemaIfNotExists('siasus_data');

  await knex.transaction(async (trx) => {
    const tableName = path.basename(filepath).slice(0, -4);

    if (await trx.schema.withSchema('siasus_data').hasTable(tableName)) {
      if (opts?.override) {
        await trx.schema.withSchema('siasus_data').dropTable(tableName);
      } else {
        throw new Error(`Table ${tableName} already exists. Use override option to replace it.`);
      }
    }

    await trx.schema.withSchema('siasus_data').createTable(tableName, (table) => {
      table.increments('id').primary();
      table
        .string('PA_CODUNI', 7)
        .comment(
          'Código do Estabelecimento no CNES (Cadastro Nacional de Estabelecimentos de Saúde)',
        );
      table
        .string('PA_GESTAO', 6)
        .comment(
          'Código da Unidade da Federação7 (IBGE) + Código do Município (IBGE) do Gestor, ou UF0000 se o estabelecimento estiver sob Gestão Estadual',
        );
      table
        .string('PA_CONDIC', 2)
        .comment('Sigla do Tipo de Gestão no qual o Estado ou Município está habilitado');
      table
        .string('PA_UFMUN', 6)
        .comment(
          'Unidade da Federação + Código do Município onde está localizado o estabelecimento',
        );
      table.string('PA_REGCT', 4).comment('Código da Regra Contratual');
      table.string('PA_INCOUT', 4).comment('Incremento Outros');
      table.string('PA_INCURG', 4).comment('Incremento Urgência');
      table.string('PA_TPUPS', 2).comment('Tipo de Estabelecimento');
      table.string('PA_TIPPRE', 2).comment('Tipo de Prestador');
      table.string('PA_MN_IND', 1).comment('Estabelecimento Mantido / Individual');
      table.string('PA_CNPJCPF', 14).comment('CNPJ do Estabelecimento executante');
      table
        .string('PA_CNPJMNT', 14)
        .comment('CNPJ da Mantenedora do estabelecimento ou zeros, caso não a tenha');
      table
        .string('PA_CNPJ_CC', 14)
        .comment(
          'CNPJ do Órgão que recebeu pela produção por cessão de crédito ou zeros, caso não o tenha',
        );
      table.string('PA_MVM', 6).comment('Data de Processamento / Movimento (AAAAMM)');
      table
        .string('PA_CMP', 6)
        .comment('Data da Realização do Procedimento / Competência (AAAAMM)');
      table.string('PA_PROC_ID', 10).comment('Código do Procedimento Ambulatorial');
      table.string('PA_TPFIN', 2).comment('Tipo de Financiamento da produção');
      table.string('PA_SUBFIN', 4).comment('Subtipo de Financiamento da produção');
      table.string('PA_NIVCPL', 1).comment('Complexidade do Procedimento');
      table
        .string('PA_DOCORIG', 1)
        .comment('Instrumento de Registro (conforme explicado na página 2)');
      table
        .string('PA_AUTORIZ', 13)
        .comment(
          'Número da APAC ou número de autorização do BPA-I, conforme o caso. No BPA-I, não é obrigatório, portanto, não é criticado. Lei de formação: UFAATsssssssd, onde: UF – Unid. da Federação, AA – ano, T – tipo, sssssss – sequencial, d – dígito',
        );
      table
        .string('PA_CNSMED', 15)
        .comment('Número do CNS (Cartão Nacional de Saúde) do profissional de saúde executante');
      table
        .string('PA_CBOCOD', 6)
        .comment(
          'Código da Ocupação do profissional na Classificação Brasileira de Ocupações8 (Ministério do Trabalho)',
        );
      table.string('PA_MOTSAI', 2).comment('Motivo de saída ou zeros, caso não tenha');
      table.string('PA_OBITO', 1).comment('Indicador de Óbito (APAC)');
      table.string('PA_ENCERR', 1).comment('Indicador de Encerramento (APAC)');
      table.string('PA_PERMAN', 1).comment('Indicador de Permanência (APAC)');
      table.string('PA_ALTA', 1).comment('Indicador de Alta (APAC)');
      table.string('PA_TRANSF', 1).comment('Indicador de Transferência (APAC)');
      table.string('PA_CIDPRI', 4).comment('CID Principal (APAC ou BPA-I)');
      table.string('PA_CIDSEC', 4).comment('CID Secundário (APAC)');
      table.string('PA_CIDCAS', 4).comment('CID Causas Associadas (APAC)');
      table.string('PA_CATEND', 2).comment('Caráter de Atendimento (APAC ou BPA-I)');
      table.string('PA_IDADE', 3).comment('Idade do paciente em anos');
      table
        .string('IDADEMIN', 3)
        .comment('Idade mínima do paciente para realização do procedimento');
      table
        .string('IDADEMAX', 3)
        .comment('Idade máxima do paciente para realização do procedimento');
      table
        .string('PA_FLIDADE', 1)
        .comment(
          'Compatibilidade com a faixa de idade do procedimento (SIGTAP – Sistema de Gerenciamento da Tabela de Procedimentos do SUS): 0 = Idade não exigida; 1 = Idade compatível com o SIGTAP; 2 = Idade fora da faixa do SIGTAP; 3 = Idade inexistente; 4 = Idade EM BRANCO',
        );
      table.string('PA_SEXO', 1).comment('Sexo do paciente');
      table
        .string('PA_RACACOR', 2)
        .comment(
          'Raça/Cor do paciente: 01 - Branca, 02 - Preta, 03 - Parda, 04 - Amarela, 05 - Indígena, 99 - Sem informação',
        );
      table
        .string('PA_MUNPCN', 6)
        .comment(
          'Código da Unidade da Federação + Código do Município de residência do paciente ou do estabelecimento, caso não se tenha a identificação do paciente, o que ocorre no (BPA)',
        );
      table.integer('PA_QTDPRO', 11).comment('Quantidade Produzida (APRESENTADA)');
      table.integer('PA_QTDAPR', 11).comment('Quantidade Aprovada do procedimento');
      table.float('PA_VALPRO', 20, 2).comment('Valor Produzido (APRESENTADO)');
      table.float('PA_VALAPR', 20, 2).comment('Valor Aprovado do procedimento');
      table
        .string('PA_UFDIF', 1)
        .comment(
          'Indica se a UF de residência do paciente é diferente da UF de localização do estabelecimento: 0 = mesma UF; 1 = UF diferente',
        );
      table
        .string('PA_MNDIF', 1)
        .comment(
          'Indica se o município de residência do paciente é diferente do município de localização do estabelecimento: 0 = mesmo município; 1 = município diferente',
        );
      table
        .float('PA_DIF_VAL', 20, 2)
        .comment(
          'Diferença do Valor Unitário do procedimento praticado na Tabela Unificada com Valor Unitário praticado pelo Gestor da Produção, multiplicado pela Quantidade Aprovada',
        );
      table.float('NU_VPA_TOT', 20, 2).comment('Valor Unitário do Procedimento da Tabela VPA');
      table.float('NU_PA_TOT', 20, 2).comment('Valor Unitário do Procedimento da Tabela SIGTAP');
      table
        .string('PA_INDICA', 1)
        .comment(
          'Indicativo de situação da produção produzida: 0 = não aprovado; 5 = aprovado total; 6 = aprovado parcial',
        );
      table.string('PA_CODOCO', 1).comment('Código de Ocorrência');
      table.string('PA_FLQT', 1).comment('Indicador de erro de Quantidade Produzida');
      table.string('PA_FLER', 1).comment('Indicador de erro de corpo da APAC');
      table.string('PA_ETNIA', 4).comment('Etnia do paciente');
      table.float('PA_VL_CF', 20, 2).comment('Valor do Complemento Federal');
      table.float('PA_VL_CL', 20, 2).comment('Valor do Complemento Local');
      table.float('PA_VL_INC', 20, 2).comment('Valor do Incremento');
      table
        .string('PA_SRV_C', 6)
        .comment('Código do Serviço Especializado / Classificação CBO (de acordo com o CNES)');
      table
        .string('PA_INE', 10)
        .comment(
          'Código de Identificação Nacional de Equipes10, para registrar a atuação das equipes na execução de ações de saúde',
        );
      table.string('PA_NAT_JUR', 4).comment('Código da Natureza Juridica');
    });

    for await (const record of await DBFFile.open(filepath)) {
      await trx.withSchema('siasus_data').table(tableName).insert(record);
    }
  });
}
